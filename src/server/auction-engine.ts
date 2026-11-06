/**
 * Server-authoritative auction engine, scoped per Room.
 * Every mutation goes through here; the Room row is the single source of truth for that auction.
 * A per-room mutex serialises mutations so concurrent bids / RTM decisions can't race.
 *
 * The auction runs itself; the host only starts, pauses/resumes, undoes and ends it.
 * State machine:
 *   WAITING → (start) PLAYER_LIVE ⇄ PAUSED
 *   PLAYER_LIVE → (clock ends) SOLD | RTM_OFFER → RTM_RAISE → RTM_MATCH → SOLD,  or UNSOLD when nobody bid
 *   SOLD/UNSOLD → (after nextPlayerGapSeconds) next PLAYER_LIVE … → COMPLETED when the queue is empty
 */
import { Prisma, AuctionState } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minNextBid } from "@/lib/rules";
import type { AuctionSnapshot, BidSnapshot, SocketEvent, RtmAction } from "@/types/auction";

export class AuctionError extends Error {
  constructor(message: string, public code = "INVALID") { super(message); }
}

type Emitter = (roomId: string, event: SocketEvent, payload: unknown) => void;
type Db = Prisma.TransactionClient | typeof prisma;
/** Next.js bundles this module separately for API routes from the copy loaded by the custom server, so shared state lives on globalThis. */
const G = globalThis as unknown as { __ipl?: { emit: Emitter; chains: Map<string, Promise<unknown>>; timers: Map<string, NodeJS.Timeout>; rtmTimers: Map<string, NodeJS.Timeout>; nextTimers?: Map<string, NodeJS.Timeout> } };
G.__ipl ??= { emit: () => {}, chains: new Map(), timers: new Map(), rtmTimers: new Map() };
G.__ipl.nextTimers ??= new Map();
const shared = G.__ipl;
const emit: Emitter = (r, e, p) => shared.emit(r, e, p);
export function setEmitter(fn: Emitter) { shared.emit = fn; }

// ---- per-room mutex ---------------------------------------------------------
function withLock<T>(roomId: string, fn: () => Promise<T>): Promise<T> {
  const prev = shared.chains.get(roomId) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  shared.chains.set(roomId, run.catch(() => {}));
  return run;
}

// ---- helpers --------------------------------------------------------------
export async function getRoom(roomId: string, db: Db = prisma) { return db.room.findUniqueOrThrow({ where: { id: roomId } }); }
type RoomRow = Awaited<ReturnType<typeof getRoom>>;

const CLEAR_RTM = { rtmTeamId: null, rtmBidderTeamId: null, rtmFinalAmount: null, rtmDeadlineAt: null };
const CLEAR_TIMER = { timerRunning: false, timerEndsAt: null, timerRemainingMs: null };
const CLEAR_PLAYER = { currentPlayerId: null, currentBid: 0, highestTeamId: null, highestBidId: null, nextPlayerAt: null, ...CLEAR_TIMER, ...CLEAR_RTM };
/** Spread into room updates. A getter so `lastActiveAt` is the time of the write, not of module load. */
const touch = { get lastActiveAt() { return new Date(); }, version: { increment: 1 } as const };

function clearTimer(roomId: string) { const t = shared.timers.get(roomId); if (t) clearTimeout(t); shared.timers.delete(roomId); }
function scheduleTimerEnd(roomId: string, endsAt: Date) {
  clearTimer(roomId);
  shared.timers.set(roomId, setTimeout(() => { onTimerExpired(roomId).catch(console.error); }, Math.max(0, endsAt.getTime() - Date.now()) + 20));
}
function clearRtmTimer(roomId: string) { const t = shared.rtmTimers.get(roomId); if (t) clearTimeout(t); shared.rtmTimers.delete(roomId); }
function scheduleRtmDeadline(roomId: string, at: Date) {
  clearRtmTimer(roomId);
  shared.rtmTimers.set(roomId, setTimeout(() => { onRtmDeadline(roomId).catch(console.error); }, Math.max(0, at.getTime() - Date.now()) + 20));
}

function clearNext(roomId: string) { const t = shared.nextTimers!.get(roomId); if (t) clearTimeout(t); shared.nextTimers!.delete(roomId); }
function scheduleNext(roomId: string, at: Date) {
  clearNext(roomId);
  shared.nextTimers!.set(roomId, setTimeout(() => { onNextDue(roomId).catch(console.error); }, Math.max(0, at.getTime() - Date.now()) + 20));
}
/** After SOLD/UNSOLD, show the result for a few seconds, then bring up the next player automatically. */
async function armNextUnlocked(roomId: string) {
  const r = await getRoom(roomId);
  const at = new Date(Date.now() + Math.max(1, r.nextPlayerGapSeconds) * 1000);
  await prisma.room.update({ where: { id: roomId }, data: { nextPlayerAt: at } });
  scheduleNext(roomId, at);
}
async function onNextDue(roomId: string) {
  await withLock(roomId, async () => {
    const r = await getRoom(roomId);
    if ((r.state !== "SOLD" && r.state !== "UNSOLD") || !r.nextPlayerAt) return;
    if (r.nextPlayerAt.getTime() > Date.now()) { scheduleNext(roomId, r.nextPlayerAt); return; }
    await advanceUnlocked(roomId);
  });
}
/** Bring up the next queued player. When the queue runs out, unsold players get one more round (if enabled); then the auction completes. */
async function advanceUnlocked(roomId: string) {
  clearNext(roomId);
  let next = await pickNextPlayerId(roomId);
  if (!next) {
    const r = await getRoom(roomId);
    const alreadyReentered = await prisma.auctionEvent.count({ where: { roomId, type: "UNSOLD_REENTRY" } });
    if (r.unsoldReentry && !alreadyReentered) {
      const back = await prisma.player.updateMany({ where: { roomId, status: "UNSOLD" }, data: { status: "WAITING" } });
      if (back.count) { await log(roomId, "UNSOLD_REENTRY", { payload: { count: back.count } }); next = await pickNextPlayerId(roomId); }
    }
  }
  if (!next) {
    clearTimer(roomId); clearRtmTimer(roomId);
    await prisma.room.update({ where: { id: roomId }, data: { state: "COMPLETED", completedAt: new Date(), ...CLEAR_PLAYER, ...touch } });
    await log(roomId, "AUCTION_COMPLETED", { payload: { reason: "queue empty" } });
    await broadcast(roomId, "auction:completed");
    return;
  }
  await startPlayerUnlocked(await getRoom(roomId), next);
}

async function onTimerExpired(roomId: string) {
  await withLock(roomId, async () => {
    const r = await getRoom(roomId);
    if (r.state !== "PLAYER_LIVE" || !r.timerRunning || !r.timerEndsAt) return;
    if (r.timerEndsAt.getTime() > Date.now()) { scheduleTimerEnd(roomId, r.timerEndsAt); return; }
    await prisma.room.update({ where: { id: roomId }, data: { timerRunning: false, timerRemainingMs: 0, ...touch } });
    // The hammer falls when the clock ends: highest bidder wins (after any RTM window); no bids = unsold. There is no manual SELL.
    const fresh = await getRoom(roomId);
    if (fresh.currentBid > 0) await resolveSaleUnlocked(fresh); else await markUnsoldUnlocked(fresh);
  });
}

/** When an RTM decision window lapses, the default (least surprising) outcome applies. */
async function onRtmDeadline(roomId: string) {
  await withLock(roomId, async () => {
    const r = await getRoom(roomId);
    if (!r.rtmDeadlineAt || r.rtmDeadlineAt.getTime() > Date.now()) { if (r.rtmDeadlineAt) scheduleRtmDeadline(roomId, r.rtmDeadlineAt); return; }
    if (r.state === "RTM_OFFER") await rtmActionUnlocked(r, "RTM_PASS", null, "timeout");
    else if (r.state === "RTM_RAISE") await rtmActionUnlocked(r, "RTM_KEEP", null, "timeout");
    else if (r.state === "RTM_MATCH") await rtmActionUnlocked(r, "RTM_DECLINE", null, "timeout");
  });
}

/** Re-arm timers for every room after a server restart. */
export async function resumeTimersOnBoot() {
  const rooms = await prisma.room.findMany({ where: { OR: [{ timerRunning: true }, { rtmDeadlineAt: { not: null } }, { nextPlayerAt: { not: null } }] }, select: { id: true, state: true, timerRunning: true, timerEndsAt: true, rtmDeadlineAt: true, nextPlayerAt: true } });
  for (const r of rooms) {
    if ((r.state === "SOLD" || r.state === "UNSOLD") && r.nextPlayerAt) scheduleNext(r.id, r.nextPlayerAt);
    if (r.state === "PLAYER_LIVE" && r.timerRunning && r.timerEndsAt) scheduleTimerEnd(r.id, r.timerEndsAt);
    if (["RTM_OFFER", "RTM_RAISE", "RTM_MATCH"].includes(r.state) && r.rtmDeadlineAt) scheduleRtmDeadline(r.id, r.rtmDeadlineAt);
  }
}

// ---- RTM eligibility ------------------------------------------------------
type TeamRow = Prisma.TeamGetPayload<object>;
type PlayerRow = Prisma.PlayerGetPayload<object>;

function canRtm(team: TeamRow | null | undefined, player: PlayerRow, amount: number, r: RoomRow, highestTeamId: string | null) {
  if (!team?.ownerId) return false; // only a franchise with a manager can exercise RTM — nobody bids or matches on behalf of an unclaimed team
  if (!r.rtmEnabled || !team) return false;
  if (highestTeamId && highestTeamId === team.id) return false;
  if (team.rtmUsed >= team.rtmTotal) return false;
  if (team.purse < amount) return false;
  if (team.squadCount >= r.maxSquadSize) return false;
  if (player.overseas && team.overseasCount >= r.maxOverseas) return false;
  return true;
}

// ---- snapshot -------------------------------------------------------------
export async function getSnapshot(roomId: string): Promise<AuctionSnapshot> {
  const r = await prisma.room.findUniqueOrThrow({ where: { id: roomId }, include: { host: { select: { name: true } } } });
  const [teams, counts, memberCount, p, bids] = await Promise.all([
    prisma.team.findMany({ where: { roomId }, orderBy: { sortOrder: "asc" } }),
    prisma.player.groupBy({ by: ["status"], where: { roomId }, _count: { _all: true } }),
    prisma.roomMember.count({ where: { roomId } }),
    r.currentPlayerId ? prisma.player.findUnique({ where: { id: r.currentPlayerId } }) : null,
    r.currentPlayerId ? prisma.bid.findMany({ where: { playerId: r.currentPlayerId }, include: { team: { select: { name: true, abbreviation: true, color: true } } }, orderBy: { createdAt: "desc" }, take: 60 }) : [],
  ]);
  const host = r;
  const c = (st: string) => counts.find((x) => x.status === st)?._count._all ?? 0;
  const byId = (id: string | null) => (id ? teams.find((t) => t.id === id) ?? null : null);
  const highest = byId(r.highestTeamId); const prev = p ? byId(p.previousTeamId) : null;
  const rtmTeam = byId(r.rtmTeamId), bidder = byId(r.rtmBidderTeamId);
  const total = counts.reduce((n, x) => n + x._count._all, 0);
  return {
    roomId: r.id, roomCode: r.code, roomName: r.name, hostId: r.hostId, hostName: host?.host.name ?? "", isPublic: r.isPublic,
    state: r.state,
    currentPlayer: p && {
      id: p.id, name: p.name, photoUrl: p.photoUrl, role: p.role, nationality: p.nationality, overseas: p.overseas, capped: p.capped, set: p.set,
      basePrice: p.basePrice, rating: p.rating, status: p.status, matches: p.matches, runs: p.runs, wickets: p.wickets,
      average: p.average, strikeRate: p.strikeRate, economy: p.economy, highScore: p.highScore, bestBowling: p.bestBowling,
      previousTeamId: p.previousTeamId, previousTeamName: prev?.name ?? null, previousTeamAbbr: prev?.abbreviation ?? null,
      rtmAvailable: canRtm(prev, p, Math.max(r.currentBid, p.basePrice), r, r.highestTeamId),
    },
    currentBid: r.currentBid,
    highestTeamId: r.highestTeamId,
    highestTeamName: highest?.name ?? null,
    timerEndsAt: r.timerEndsAt?.getTime() ?? null,
    timerRemainingMs: r.timerRemainingMs,
    timerRunning: r.timerRunning,
    timerSeconds: r.timerSeconds,
    rtmTimerSeconds: r.rtmTimerSeconds,
    bidIncrement: r.bidIncrement,
    autoSell: r.autoSell,
    nextPlayerAt: r.nextPlayerAt?.getTime() ?? null,
    nextPlayerGapSeconds: r.nextPlayerGapSeconds,
    rtm: rtmTeam && bidder ? {
      teamId: rtmTeam.id, teamName: rtmTeam.name, teamAbbr: rtmTeam.abbreviation, teamColor: rtmTeam.color,
      bidderTeamId: bidder.id, bidderTeamName: bidder.name, bidderTeamAbbr: bidder.abbreviation, bidderTeamColor: bidder.color,
      finalAmount: r.rtmFinalAmount ?? r.currentBid, deadlineAt: r.rtmDeadlineAt?.getTime() ?? null,
    } : null,
    teams: teams.map((t) => ({
      id: t.id, name: t.name, abbreviation: t.abbreviation, color: t.color, color2: t.color2, logoUrl: t.logoUrl, ownerName: t.ownerName, ownerId: t.ownerId,
      purse: t.purse, spent: t.spent, squadCount: t.squadCount, maxSquad: r.maxSquadSize, overseasCount: t.overseasCount, maxOverseas: r.maxOverseas,
      rtmTotal: t.rtmTotal, rtmUsed: t.rtmUsed,
    })),
    bids: bids.map<BidSnapshot>((b) => ({ id: b.id, teamId: b.teamId, teamName: b.team.name, abbreviation: b.team.abbreviation, color: b.team.color, amount: b.amount, kind: b.kind, createdAt: b.createdAt.toISOString() })),
    playersRemaining: c("POOL") + c("WAITING"),
    totalPlayers: total,
    soldCount: c("SOLD"),
    unsoldCount: c("UNSOLD"),
    memberCount,
    serverTime: Date.now(),
    version: r.version,
  };
}

async function broadcast(roomId: string, event: SocketEvent, payload: unknown = {}) {
  const snap = await getSnapshot(roomId);
  emit(roomId, event, { ...(payload as object), snapshot: snap });
}
export const emitSnapshot = (roomId: string, event: SocketEvent, payload: object = {}) => broadcast(roomId, event, payload);

async function log(roomId: string, type: string, data: Partial<Prisma.AuctionEventUncheckedCreateInput> = {}, db: Db = prisma) {
  return db.auctionEvent.create({ data: { roomId, type, ...data } });
}
function assertState(state: AuctionState, allowed: AuctionState[], what: string) {
  if (!allowed.includes(state)) throw new AuctionError(`Cannot ${what} while auction is ${state.replace("_", " ")}`, "BAD_STATE");
}

// ---- auction lifecycle ----------------------------------------------------
/** Write a whole queue order in a few statements (one CASE update per 500 rows) instead of one UPDATE per player. */
async function writeQueueOrder(ids: string[], db: Db = prisma) {
  for (let off = 0; off < ids.length; off += 500) {
    const chunk = ids.slice(off, off + 500);
    const cases = Prisma.join(chunk.map((id, i) => Prisma.sql`WHEN ${id} THEN ${off + i + 1}`), " ");
    await db.$executeRaw`UPDATE Player SET queueOrder = CASE id ${cases} END WHERE id IN (${Prisma.join(chunk)})`;
  }
}
/** Sort key for set names: Marquee first, then capped "Set N", then uncapped sets, then anything else. */
export function setRank(set: string) {
  const n = Number(set.match(/(\d+)\s*$/)?.[1] ?? 0);
  if (/marquee/i.test(set)) return n;
  if (/uncapped/i.test(set)) return 200 + n;
  const m = set.match(/^Set\s+(\d+)/i);
  if (m) return 10 + Number(m[1]);
  return 100 + n;
}
async function shuffleWaitingQueue(roomId: string, db: Db = prisma) {
  const pool = await db.player.findMany({ where: { roomId, status: { in: ["POOL", "WAITING"] } }, select: { id: true } });
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  await writeQueueOrder(pool.map((p) => p.id), db);
  return pool.length;
}
export const shuffleQueue = (roomId: string) => withLock(roomId, async () => {
  const n = await shuffleWaitingQueue(roomId);
  await log(roomId, "QUEUE_SHUFFLED", { payload: { count: n } });
  await broadcast(roomId, "state:sync");
  return n;
});

/** Order the queue by set (Marquee first) — the way the real auction runs. */
export const orderQueueBySet = (roomId: string) => withLock(roomId, async () => {
  const pool = await prisma.player.findMany({ where: { roomId, status: { in: ["POOL", "WAITING"] } }, select: { id: true, set: true, basePrice: true, rating: true } });
  pool.sort((x, y) => setRank(x.set) - setRank(y.set) || x.set.localeCompare(y.set) || y.basePrice - x.basePrice || (y.rating ?? 0) - (x.rating ?? 0));
  await writeQueueOrder(pool.map((p) => p.id));
  await log(roomId, "QUEUE_ORDERED_BY_SET", { payload: { count: pool.length } });
  await broadcast(roomId, "state:sync");
  return pool.length;
});

export const startAuction = (roomId: string) => withLock(roomId, async () => {
  const r = await getRoom(roomId);
  assertState(r.state, ["WAITING"], "start auction");
  await prisma.$transaction([
    prisma.room.update({ where: { id: roomId }, data: { state: "LIVE", startedAt: new Date(), ...touch } }),
    prisma.player.updateMany({ where: { roomId, status: "POOL" }, data: { status: "WAITING" } }),
  ]);
  await log(roomId, "AUCTION_STARTED");
  await broadcast(roomId, "auction:started");
  await advanceUnlocked(roomId); // first player comes straight up — there is no NEXT button
});

export const pauseAuction = (roomId: string) => withLock(roomId, async () => {
  const r = await getRoom(roomId);
  assertState(r.state, ["LIVE", "PLAYER_LIVE", "SOLD", "UNSOLD"], "pause");
  const remaining = r.timerRunning && r.timerEndsAt ? Math.max(0, r.timerEndsAt.getTime() - Date.now()) : r.timerRemainingMs;
  clearTimer(roomId); clearNext(roomId);
  await prisma.room.update({ where: { id: roomId }, data: { state: "PAUSED", timerRunning: false, timerRemainingMs: remaining, timerEndsAt: null, nextPlayerAt: null, ...touch } });
  await log(roomId, "AUCTION_PAUSED", { payload: { previousState: r.state } });
  await broadcast(roomId, "auction:paused");
});

export const resumeAuction = (roomId: string) => withLock(roomId, async () => {
  const r = await getRoom(roomId);
  assertState(r.state, ["PAUSED"], "resume");
  const cur = r.currentPlayerId ? await prisma.player.findUnique({ where: { id: r.currentPlayerId }, select: { status: true } }) : null;
  await log(roomId, "AUCTION_RESUMED");
  if (cur?.status === "LIVE") {
    // Paused mid-bidding: continue the clock where it stopped (at least 5 s so nobody is caught out).
    const ms = Math.max(5000, r.timerRemainingMs ?? r.timerSeconds * 1000);
    const endsAt = new Date(Date.now() + ms);
    await prisma.room.update({ where: { id: roomId }, data: { state: "PLAYER_LIVE", timerEndsAt: endsAt, timerRunning: true, timerRemainingMs: null, ...touch } });
    scheduleTimerEnd(roomId, endsAt);
    await broadcast(roomId, "auction:resumed");
  } else {
    // Paused between players (or before the first): bring up the next one.
    await prisma.room.update({ where: { id: roomId }, data: { state: "LIVE", ...CLEAR_PLAYER, ...touch } });
    await advanceUnlocked(roomId);
  }
});

/** The room creator can end the auction at ANY point. A lot still on the block (bidding or RTM) is voided: its bids are discarded and the player goes back to the pool unsold. */
export const completeAuction = (roomId: string) => withLock(roomId, async () => {
  const r = await getRoom(roomId);
  if (r.state === "COMPLETED") throw new AuctionError("Auction is already completed", "COMPLETED");
  if (r.state === "WAITING") throw new AuctionError("Auction has not started", "NOT_STARTED");
  clearTimer(roomId); clearRtmTimer(roomId); clearNext(roomId);
  const voided = r.currentPlayerId && (r.state === "PLAYER_LIVE" || r.state.startsWith("RTM")) ? r.currentPlayerId : null;
  await prisma.$transaction([
    ...(voided ? [prisma.bid.deleteMany({ where: { playerId: voided } }), prisma.player.update({ where: { id: voided }, data: { status: "POOL" } })] : []),
    prisma.room.update({ where: { id: roomId }, data: { state: "COMPLETED", completedAt: new Date(), ...CLEAR_PLAYER, ...touch } }),
  ]);
  await log(roomId, "AUCTION_COMPLETED", voided ? { playerId: voided } : {});
  await broadcast(roomId, "auction:completed");
});

/** Host reset back to WAITING (keeps players/teams/members, wipes sales, bids and RTM usage). */
export const resetAuction = (roomId: string) => withLock(roomId, async () => {
  clearTimer(roomId); clearRtmTimer(roomId); clearNext(roomId);
  await prisma.$transaction(async (tx) => {
    await tx.squadPlayer.deleteMany({ where: { roomId } });
    await tx.bid.deleteMany({ where: { roomId } });
    await tx.auctionEvent.deleteMany({ where: { roomId } });
    await tx.player.updateMany({ where: { roomId, status: { not: "POOL" } }, data: { status: "POOL", soldPrice: null, soldToId: null, soldAt: null } });
    const teams = await tx.team.findMany({ where: { roomId } });
    for (const t of teams) await tx.team.update({ where: { id: t.id }, data: { purse: t.startingPurse, spent: 0, squadCount: 0, overseasCount: 0, rtmUsed: 0 } });
    await tx.room.update({ where: { id: roomId }, data: { state: "WAITING", ...CLEAR_PLAYER, startedAt: null, completedAt: null, ...touch } });
  });
  await broadcast(roomId, "state:sync");
});

// ---- player lifecycle -----------------------------------------------------
async function pickNextPlayerId(roomId: string): Promise<string | null> {
  const p = await prisma.player.findFirst({ where: { roomId, status: "WAITING" }, orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }] });
  return p?.id ?? null;
}

async function startPlayerUnlocked(r: RoomRow, id: string) {
  const endsAt = new Date(Date.now() + r.timerSeconds * 1000); // the clock always runs — selling is automatic
  clearTimer(r.id); clearNext(r.id);
  await prisma.$transaction([
    prisma.player.update({ where: { id }, data: { status: "LIVE" } }),
    prisma.room.update({ where: { id: r.id }, data: { state: "PLAYER_LIVE", ...CLEAR_PLAYER, currentPlayerId: id, timerEndsAt: endsAt, timerRunning: !!endsAt, ...touch } }),
  ]);
  if (endsAt) scheduleTimerEnd(r.id, endsAt);
  await log(r.id, "PLAYER_STARTED", { playerId: id });
  await broadcast(r.id, "player:started", { playerId: id });
}

export const startPlayer = (roomId: string, playerId?: string) => withLock(roomId, async () => {
  const r = await getRoom(roomId);
  assertState(r.state, ["LIVE", "SOLD", "UNSOLD"], "start a player");
  const id = playerId ?? (await pickNextPlayerId(roomId));
  if (!id) throw new AuctionError("No players remaining in the queue", "EMPTY_QUEUE");
  const p = await prisma.player.findUnique({ where: { id } });
  if (!p || p.roomId !== roomId) throw new AuctionError("Player not found", "NOT_FOUND");
  if (p.status !== "WAITING" && p.status !== "POOL") throw new AuctionError(`Player is ${p.status}, not available`, "BAD_PLAYER_STATE");
  await startPlayerUnlocked(r, id);
});

export const startTimer = (roomId: string) => withLock(roomId, async () => {
  const r = await getRoom(roomId);
  assertState(r.state, ["PLAYER_LIVE"], "start timer");
  const ms = r.timerRemainingMs && r.timerRemainingMs > 0 ? r.timerRemainingMs : r.timerSeconds * 1000;
  const endsAt = new Date(Date.now() + ms);
  await prisma.room.update({ where: { id: roomId }, data: { timerEndsAt: endsAt, timerRunning: true, timerRemainingMs: null, ...touch } });
  scheduleTimerEnd(roomId, endsAt);
  await broadcast(roomId, "timer:updated", { action: "start" });
});

export const resetTimer = (roomId: string) => withLock(roomId, async () => {
  const r = await getRoom(roomId);
  assertState(r.state, ["PLAYER_LIVE", "PAUSED"], "reset timer");
  clearTimer(roomId);
  if (r.state === "PLAYER_LIVE") {
    const endsAt = new Date(Date.now() + r.timerSeconds * 1000);
    await prisma.room.update({ where: { id: roomId }, data: { timerEndsAt: endsAt, timerRunning: true, timerRemainingMs: null, ...touch } });
    scheduleTimerEnd(roomId, endsAt);
  } else {
    await prisma.room.update({ where: { id: roomId }, data: { timerEndsAt: null, timerRunning: false, timerRemainingMs: r.timerSeconds * 1000, ...touch } });
  }
  await broadcast(roomId, "timer:updated", { action: "reset" });
});

export const pauseTimer = (roomId: string) => withLock(roomId, async () => {
  const r = await getRoom(roomId);
  assertState(r.state, ["PLAYER_LIVE"], "pause timer");
  if (!r.timerRunning || !r.timerEndsAt) return;
  clearTimer(roomId);
  await prisma.room.update({ where: { id: roomId }, data: { timerRunning: false, timerEndsAt: null, timerRemainingMs: Math.max(0, r.timerEndsAt.getTime() - Date.now()), ...touch } });
  await broadcast(roomId, "timer:updated", { action: "pause" });
});

// ---- bidding --------------------------------------------------------------
export interface BidInput { roomId: string; userId: string; teamId: string; amount?: number }

export const placeBid = (input: BidInput, onCommitted?: () => void) => withLock(input.roomId, async () => {
  const [r, user, team] = await Promise.all([getRoom(input.roomId), prisma.user.findUnique({ where: { id: input.userId } }), prisma.team.findUnique({ where: { id: input.teamId } })]);
  if (!user) throw new AuctionError("Not authenticated", "UNAUTHENTICATED");
  if (!team || team.roomId !== r.id) throw new AuctionError("Team not found", "NOT_FOUND");
  // crickauction rule: ONLY the manager who claimed a franchise can bid, and only for that franchise. The host never bids on anyone's behalf.
  if (!team.ownerId) throw new AuctionError(`${team.name} has no manager yet — claim it in the lobby to bid`, "FORBIDDEN");
  if (team.ownerId !== user.id) throw new AuctionError(`Only the manager of ${team.name} can bid for it`, "FORBIDDEN");
  if (r.state === "PAUSED") throw new AuctionError("Auction is paused", "PAUSED");
  if (r.state === "COMPLETED") throw new AuctionError("Auction is completed", "COMPLETED");
  if (r.state.startsWith("RTM")) throw new AuctionError("Bidding closed — RTM decision in progress", "RTM");
  if (r.state !== "PLAYER_LIVE" || !r.currentPlayerId) throw new AuctionError("No player is live", "NO_PLAYER");
  if (!r.timerRunning && r.timerRemainingMs === 0) throw new AuctionError("Time is up for this player", "TIMER_EXPIRED");
  const player = await prisma.player.findUnique({ where: { id: r.currentPlayerId } });
  if (!player || player.status !== "LIVE") throw new AuctionError("Player is not live", "PLAYER_NOT_LIVE");
  if (team.squadCount >= r.maxSquadSize) throw new AuctionError(`Squad full (${r.maxSquadSize}/${r.maxSquadSize})`, "SQUAD_FULL");
  if (player.overseas && team.overseasCount >= r.maxOverseas) throw new AuctionError(`Overseas quota full (${r.maxOverseas})`, "OVERSEAS_FULL");
  if (r.highestTeamId === team.id) throw new AuctionError("You are already the highest bidder", "ALREADY_HIGHEST");

  const minNext = minNextBid(r.currentBid, player.basePrice, r.bidIncrement);
  const amount = input.amount ?? minNext;
  if (!Number.isInteger(amount) || amount % 5 !== 0) throw new AuctionError("Bids must be in multiples of ₹5 L", "BAD_INCREMENT");
  if (amount < minNext) throw new AuctionError(`Bid must be at least ${minNext} L`, "TOO_LOW");
  if (amount > team.purse) throw new AuctionError("Insufficient purse", "INSUFFICIENT_PURSE");

  const timered = r.timerRunning;
  const endsAt = new Date(Date.now() + r.timerSeconds * 1000);
  const bid = await prisma.$transaction(async (tx) => {
    const fresh = await tx.room.findUniqueOrThrow({ where: { id: r.id } });
    if (fresh.version !== r.version) throw new AuctionError("Auction state changed, retry", "CONFLICT");
    const b = await tx.bid.create({ data: { roomId: r.id, playerId: player.id, teamId: team.id, userId: user.id, amount } });
    await tx.room.update({ where: { id: r.id }, data: { currentBid: amount, highestTeamId: team.id, highestBidId: b.id, ...(timered ? { timerEndsAt: endsAt, timerRunning: true, timerRemainingMs: null } : {}), ...touch } });
    return b;
  });
  if (timered) scheduleTimerEnd(r.id, endsAt);
  onCommitted?.();
  await broadcast(r.id, "bid:accepted", { bidId: bid.id, teamId: team.id, teamName: team.name, amount, playerId: player.id, previousHighestTeamId: r.highestTeamId });
  return bid;
});

// ---- sell / RTM / unsold / skip -------------------------------------------
async function finalizeSaleUnlocked(r: RoomRow, teamId: string, amount: number, viaRtm: boolean, extra: Record<string, unknown> = {}) {
  clearTimer(r.id); clearRtmTimer(r.id);
  const result = await prisma.$transaction(async (tx) => {
    const [team] = await tx.$queryRaw<{ id: string; purse: number; squadCount: number; overseasCount: number; rtmUsed: number; rtmTotal: number }[]>`SELECT id, purse, squadCount, overseasCount, rtmUsed, rtmTotal FROM Team WHERE id = ${teamId} FOR UPDATE`;
    const [player] = await tx.$queryRaw<{ id: string; status: string; name: string; overseas: number | boolean }[]>`SELECT id, status, name, overseas FROM Player WHERE id = ${r.currentPlayerId} FOR UPDATE`;
    if (!team || !player) throw new AuctionError("Record missing", "NOT_FOUND");
    if (player.status !== "LIVE") throw new AuctionError("Player already processed", "DOUBLE_SELL");
    if (team.purse < amount) throw new AuctionError("Team purse insufficient", "INSUFFICIENT_PURSE");
    if (team.squadCount >= r.maxSquadSize) throw new AuctionError("Squad full", "SQUAD_FULL");
    const overseas = !!player.overseas;
    if (overseas && team.overseasCount >= r.maxOverseas) throw new AuctionError("Overseas quota full", "OVERSEAS_FULL");
    if (viaRtm && team.rtmUsed >= team.rtmTotal) throw new AuctionError("No RTM cards left", "NO_RTM");
    if (await tx.squadPlayer.findUnique({ where: { playerId: player.id } })) throw new AuctionError("Player already in a squad", "DOUBLE_SELL");

    await tx.squadPlayer.create({ data: { roomId: r.id, teamId: team.id, playerId: player.id, price: amount, viaRtm } });
    const t = await tx.team.update({ where: { id: team.id }, data: { purse: { decrement: amount }, spent: { increment: amount }, squadCount: { increment: 1 }, ...(overseas ? { overseasCount: { increment: 1 } } : {}), ...(viaRtm ? { rtmUsed: { increment: 1 } } : {}) } });
    if (t.purse < 0) throw new AuctionError("Purse would go negative", "NEGATIVE_PURSE");
    await tx.player.update({ where: { id: player.id }, data: { status: "SOLD", soldPrice: amount, soldToId: team.id, soldAt: new Date() } });
    const ev = await log(r.id, "PLAYER_SOLD", { playerId: player.id, teamId: team.id, amount, payload: { viaRtm, overseas, bidderTeamId: r.rtmBidderTeamId ?? r.highestTeamId, rtmTeamId: r.rtmTeamId, ...extra } }, tx);
    await tx.room.update({ where: { id: r.id }, data: { state: "SOLD", currentBid: amount, highestTeamId: team.id, ...CLEAR_TIMER, ...CLEAR_RTM, ...touch } });
    return { eventId: ev.id, playerName: player.name, teamName: t.name, teamAbbr: t.abbreviation, teamColor: t.color, amount, teamId: team.id, playerId: player.id, viaRtm };
  });
  await armNextUnlocked(r.id);
  await broadcast(r.id, "player:sold", result);
  emit(r.id, "team:squadUpdated", { teamId: result.teamId });
  return result;
}

async function resolveSaleUnlocked(r: RoomRow) {
  assertState(r.state, ["PLAYER_LIVE"], "sell");
  if (!r.currentPlayerId || !r.highestTeamId || r.currentBid <= 0) throw new AuctionError("No winning bid — mark UNSOLD instead", "NO_BID");
  const player = await prisma.player.findUniqueOrThrow({ where: { id: r.currentPlayerId } });
  const prev = player.previousTeamId ? await prisma.team.findUnique({ where: { id: player.previousTeamId } }) : null;
  if (canRtm(prev, player, r.currentBid, r, r.highestTeamId)) {
    clearTimer(r.id);
    const deadline = new Date(Date.now() + r.rtmTimerSeconds * 1000);
    await prisma.room.update({ where: { id: r.id }, data: { state: "RTM_OFFER", ...CLEAR_TIMER, rtmTeamId: prev!.id, rtmBidderTeamId: r.highestTeamId, rtmFinalAmount: r.currentBid, rtmDeadlineAt: deadline, ...touch } });
    await log(r.id, "RTM_OFFERED", { playerId: player.id, teamId: prev!.id, amount: r.currentBid, payload: { bidderTeamId: r.highestTeamId } });
    scheduleRtmDeadline(r.id, deadline);
    await broadcast(r.id, "rtm:offer", { playerId: player.id, teamId: prev!.id, bidderTeamId: r.highestTeamId, amount: r.currentBid });
    return { rtm: true };
  }
  return finalizeSaleUnlocked(r, r.highestTeamId, r.currentBid, false);
}

export interface RtmInput { roomId: string; userId: string; action: RtmAction; amount?: number }

async function rtmActionUnlocked(r: RoomRow, action: RtmAction, actor: { id: string; isHost: boolean } | null, by: string, amount?: number) {
  const need: Record<RtmAction, AuctionState> = { RTM_USE: "RTM_OFFER", RTM_PASS: "RTM_OFFER", RTM_RAISE: "RTM_RAISE", RTM_KEEP: "RTM_RAISE", RTM_MATCH: "RTM_MATCH", RTM_DECLINE: "RTM_MATCH" };
  assertState(r.state, [need[action]], action.replace("_", " ").toLowerCase());
  if (!r.rtmTeamId || !r.rtmBidderTeamId || !r.currentPlayerId) throw new AuctionError("RTM state is incomplete", "RTM_STATE");
  const [rtmTeam, bidder, player] = await Promise.all([prisma.team.findUniqueOrThrow({ where: { id: r.rtmTeamId } }), prisma.team.findUniqueOrThrow({ where: { id: r.rtmBidderTeamId } }), prisma.player.findUniqueOrThrow({ where: { id: r.currentPlayerId } })]);
  // Same rule as bidding: only the manager of the franchise concerned may decide (timeouts apply the safe default for absent managers).
  if (actor) {
    const side = ["RTM_RAISE", "RTM_KEEP"].includes(action) ? bidder : rtmTeam;
    if (!side.ownerId || side.ownerId !== actor.id) throw new AuctionError(`Only the manager of ${side.name} can make this decision`, "FORBIDDEN");
  }
  const final = r.rtmFinalAmount ?? r.currentBid;
  clearRtmTimer(r.id);
  const deadline = () => new Date(Date.now() + r.rtmTimerSeconds * 1000);

  switch (action) {
    case "RTM_USE": {
      const d = deadline();
      await prisma.room.update({ where: { id: r.id }, data: { state: "RTM_RAISE", rtmDeadlineAt: d, ...touch } });
      await log(r.id, "RTM_USED", { playerId: player.id, teamId: rtmTeam.id, amount: final, payload: { by } });
      scheduleRtmDeadline(r.id, d);
      await broadcast(r.id, "rtm:raise", { playerId: player.id, teamId: rtmTeam.id, bidderTeamId: bidder.id, amount: final });
      return { state: "RTM_RAISE" };
    }
    case "RTM_PASS": {
      await log(r.id, "RTM_PASSED", { playerId: player.id, teamId: rtmTeam.id, amount: final, payload: { by } });
      emit(r.id, "rtm:passed", { playerId: player.id, teamId: rtmTeam.id });
      return finalizeSaleUnlocked(r, bidder.id, final, false, { rtmPassed: true });
    }
    case "RTM_RAISE":
    case "RTM_KEEP": {
      let newFinal = final;
      if (action === "RTM_RAISE") {
        if (amount == null || !Number.isInteger(amount) || amount % 5 !== 0) throw new AuctionError("Raise must be a multiple of ₹5 L", "BAD_INCREMENT");
        if (amount < final) throw new AuctionError("Raise cannot be lower than the winning bid", "TOO_LOW");
        if (amount > bidder.purse) throw new AuctionError("Insufficient purse for that raise", "INSUFFICIENT_PURSE");
        newFinal = amount;
        if (amount > final) await prisma.bid.create({ data: { roomId: r.id, playerId: player.id, teamId: bidder.id, amount, kind: "RTM_RAISE" } });
      }
      const d = deadline();
      await prisma.room.update({ where: { id: r.id }, data: { state: "RTM_MATCH", rtmFinalAmount: newFinal, currentBid: newFinal, rtmDeadlineAt: d, ...touch } });
      await log(r.id, action === "RTM_RAISE" ? "RTM_RAISED" : "RTM_KEPT", { playerId: player.id, teamId: bidder.id, amount: newFinal, payload: { by, from: final } });
      scheduleRtmDeadline(r.id, d);
      await broadcast(r.id, "rtm:match", { playerId: player.id, teamId: rtmTeam.id, bidderTeamId: bidder.id, amount: newFinal });
      return { state: "RTM_MATCH", amount: newFinal };
    }
    case "RTM_MATCH": {
      if (!canRtm(rtmTeam, player, final, r, bidder.id)) throw new AuctionError("Franchise cannot match this price (purse, squad or RTM cards)", "CANNOT_MATCH");
      await prisma.bid.create({ data: { roomId: r.id, playerId: player.id, teamId: rtmTeam.id, amount: final, kind: "RTM_MATCH" } });
      await log(r.id, "RTM_MATCHED", { playerId: player.id, teamId: rtmTeam.id, amount: final, payload: { by, bidderTeamId: bidder.id } });
      return finalizeSaleUnlocked({ ...r, highestTeamId: rtmTeam.id }, rtmTeam.id, final, true, { matchedFrom: bidder.id });
    }
    case "RTM_DECLINE": {
      await log(r.id, "RTM_DECLINED", { playerId: player.id, teamId: rtmTeam.id, amount: final, payload: { by } });
      return finalizeSaleUnlocked(r, bidder.id, final, false, { rtmDeclined: true });
    }
  }
}

export const rtmAction = (input: RtmInput) => withLock(input.roomId, async () => {
  const [r, user] = await Promise.all([getRoom(input.roomId), prisma.user.findUnique({ where: { id: input.userId } })]);
  if (!user) throw new AuctionError("Not authenticated", "UNAUTHENTICATED");
  return rtmActionUnlocked(r, input.action, { id: user.id, isHost: r.hostId === user.id || user.role === "ADMIN" }, user.id, input.amount);
});

async function markUnsoldUnlocked(r: RoomRow) {
  assertState(r.state, ["PLAYER_LIVE"], "mark unsold");
  if (!r.currentPlayerId) throw new AuctionError("No current player", "NO_PLAYER");
  if (r.currentBid > 0) throw new AuctionError("There is a valid bid — SELL instead", "HAS_BID");
  clearTimer(r.id);
  const p = await prisma.player.findUniqueOrThrow({ where: { id: r.currentPlayerId } });
  await prisma.$transaction([
    prisma.player.update({ where: { id: p.id }, data: { status: "UNSOLD" } }),
    prisma.room.update({ where: { id: r.id }, data: { state: "UNSOLD", ...CLEAR_TIMER, ...touch } }),
    prisma.auctionEvent.create({ data: { roomId: r.id, type: "PLAYER_UNSOLD", playerId: p.id } }),
  ]);
  await armNextUnlocked(r.id);
  await broadcast(r.id, "player:unsold", { playerName: p.name, basePrice: p.basePrice, playerId: p.id });
}
export const markUnsold = (roomId: string) => withLock(roomId, async () => markUnsoldUnlocked(await getRoom(roomId)));

export const skipPlayer = (roomId: string) => withLock(roomId, async () => {
  const r = await getRoom(roomId);
  assertState(r.state, ["PLAYER_LIVE"], "skip");
  if (!r.currentPlayerId) throw new AuctionError("No current player", "NO_PLAYER");
  if (r.currentBid > 0) throw new AuctionError("Cannot skip a player with bids", "HAS_BID");
  clearTimer(roomId);
  await prisma.$transaction([
    prisma.bid.deleteMany({ where: { playerId: r.currentPlayerId } }),
    prisma.player.update({ where: { id: r.currentPlayerId }, data: { status: "SKIPPED" } }),
    prisma.room.update({ where: { id: roomId }, data: { state: "LIVE", ...CLEAR_PLAYER, ...touch } }),
    prisma.auctionEvent.create({ data: { roomId, type: "PLAYER_SKIPPED", playerId: r.currentPlayerId } }),
  ]);
  await broadcast(roomId, "player:skipped", { playerId: r.currentPlayerId });
});

/** Clear the SOLD/UNSOLD result and bring up the next player in the queue. */
export const nextPlayer = (roomId: string, autoStart = true) => withLock(roomId, async () => {
  const r = await getRoom(roomId);
  assertState(r.state, ["SOLD", "UNSOLD", "LIVE"], "move to next player");
  await prisma.room.update({ where: { id: roomId }, data: { state: "LIVE", ...CLEAR_PLAYER, ...touch } });
  await broadcast(roomId, "player:next");
  if (autoStart) { const next = await pickNextPlayerId(roomId); if (next) await startPlayerUnlocked(await getRoom(roomId), next); }
});

/** Undo the most recent SOLD/UNSOLD/SKIPPED and put that player back on the block. */
export const undoLast = (roomId: string) => withLock(roomId, async () => {
  const r = await getRoom(roomId);
  assertState(r.state, ["SOLD", "UNSOLD", "LIVE", "PLAYER_LIVE", "PAUSED"], "undo");
  const ev = await prisma.auctionEvent.findFirst({ where: { roomId, undone: false, type: { in: ["PLAYER_SOLD", "PLAYER_UNSOLD", "PLAYER_SKIPPED"] } }, orderBy: { createdAt: "desc" } });
  if (!ev || !ev.playerId) throw new AuctionError("Nothing to undo", "NOTHING");
  if (r.state === "PLAYER_LIVE" && r.currentBid > 0) throw new AuctionError("Finish or skip the current player before undoing", "BUSY");
  clearTimer(roomId); clearRtmTimer(roomId); clearNext(roomId);
  const endsAt = new Date(Date.now() + r.timerSeconds * 1000);
  const payload = (ev.payload ?? {}) as { viaRtm?: boolean; overseas?: boolean };
  await prisma.$transaction(async (tx) => {
    if (r.currentPlayerId && r.currentPlayerId !== ev.playerId) {
      await tx.bid.deleteMany({ where: { playerId: r.currentPlayerId } });
      await tx.player.update({ where: { id: r.currentPlayerId }, data: { status: "WAITING" } });
    }
    if (ev.type === "PLAYER_SOLD" && ev.teamId && ev.amount != null) {
      await tx.squadPlayer.deleteMany({ where: { playerId: ev.playerId! } });
      const t = await tx.team.update({ where: { id: ev.teamId }, data: { purse: { increment: ev.amount }, spent: { decrement: ev.amount }, squadCount: { decrement: 1 }, ...(payload.overseas ? { overseasCount: { decrement: 1 } } : {}), ...(payload.viaRtm ? { rtmUsed: { decrement: 1 } } : {}) } });
      if (t.squadCount < 0 || t.spent < 0 || t.rtmUsed < 0 || t.overseasCount < 0) throw new AuctionError("Inconsistent undo", "INCONSISTENT");
      await tx.bid.deleteMany({ where: { playerId: ev.playerId!, kind: { in: ["RTM_RAISE", "RTM_MATCH"] } } });
    }
    await tx.player.update({ where: { id: ev.playerId! }, data: { status: "LIVE", soldPrice: null, soldToId: null, soldAt: null } });
    const lastBid = await tx.bid.findFirst({ where: { playerId: ev.playerId!, kind: "BID" }, orderBy: { amount: "desc" } });
    await tx.room.update({ where: { id: roomId }, data: { state: "PLAYER_LIVE", ...CLEAR_PLAYER, currentPlayerId: ev.playerId, currentBid: lastBid?.amount ?? 0, highestTeamId: lastBid?.teamId ?? null, highestBidId: lastBid?.id ?? null, timerEndsAt: endsAt, timerRunning: true, ...touch } });
    await tx.auctionEvent.update({ where: { id: ev.id }, data: { undone: true } });
    await tx.auctionEvent.create({ data: { roomId, type: "UNDO", playerId: ev.playerId, teamId: ev.teamId, amount: ev.amount, payload: { undoneEventId: ev.id, undoneType: ev.type } } });
  });
  scheduleTimerEnd(roomId, endsAt);
  await broadcast(roomId, "auction:undo", { undone: ev.type, playerId: ev.playerId });
});

/** Return an UNSOLD/SKIPPED player to the end of the queue. */
export const requeuePlayer = (roomId: string, playerId: string) => withLock(roomId, async () => {
  const p = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
  if (p.roomId !== roomId) throw new AuctionError("Player not in this room", "NOT_FOUND");
  if (!["UNSOLD", "SKIPPED"].includes(p.status)) throw new AuctionError("Only unsold/skipped players can be re-queued", "BAD_PLAYER_STATE");
  const r = await getRoom(roomId);
  const max = await prisma.player.aggregate({ where: { roomId }, _max: { queueOrder: true } });
  await prisma.bid.deleteMany({ where: { playerId } });
  await prisma.player.update({ where: { id: playerId }, data: { status: r.state === "WAITING" ? "POOL" : "WAITING", queueOrder: (max._max.queueOrder ?? 0) + 1 } });
  await broadcast(roomId, "state:sync");
});
