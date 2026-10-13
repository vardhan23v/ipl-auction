/**
 * Server-authoritative auction engine (IPL edition).
 * Every mutation goes through here; DB row `Auction#1` is the single source of truth.
 * An in-process mutex serialises mutations so concurrent bids / RTM decisions can't race.
 *
 * State machine:
 *   WAITING → LIVE ⇄ PAUSED
 *   LIVE → PLAYER_LIVE → (SELL) → SOLD | RTM_OFFER → RTM_RAISE → RTM_MATCH → SOLD
 *   PLAYER_LIVE → UNSOLD | (SKIP) LIVE
 *   SOLD/UNSOLD → (NEXT) LIVE → … → COMPLETED
 */
import { Prisma, AuctionState } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { minNextBid } from "@/lib/rules";
import type { AuctionSnapshot, BidSnapshot, SocketEvent, RtmAction } from "@/types/auction";

export class AuctionError extends Error {
  constructor(message: string, public code = "INVALID") { super(message); }
}

type Emitter = (event: SocketEvent, payload: unknown) => void;
type Db = Prisma.TransactionClient | typeof prisma;
/** Next.js bundles this module separately for API routes from the copy loaded by the custom server, so shared state lives on globalThis. */
const G = globalThis as unknown as { __ipl?: { emit: Emitter; chain: Promise<unknown>; timer: NodeJS.Timeout | null; rtmTimer: NodeJS.Timeout | null } };
G.__ipl ??= { emit: () => {}, chain: Promise.resolve(), timer: null, rtmTimer: null };
const shared = G.__ipl;
const emit: Emitter = (e, p) => shared.emit(e, p);
export function setEmitter(fn: Emitter) { shared.emit = fn; }

// ---- mutex ----------------------------------------------------------------
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = shared.chain.then(fn, fn);
  shared.chain = run.catch(() => {});
  return run;
}

// ---- helpers --------------------------------------------------------------
export async function getSettings() { return prisma.auctionSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }); }
async function getAuction(db: Db = prisma) { return db.auction.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }); }
type AuctionRow = Awaited<ReturnType<typeof getAuction>>;

const CLEAR_RTM = { rtmTeamId: null, rtmBidderTeamId: null, rtmFinalAmount: null, rtmDeadlineAt: null };
const CLEAR_TIMER = { timerRunning: false, timerEndsAt: null, timerRemainingMs: null };
const CLEAR_PLAYER = { currentPlayerId: null, currentBid: 0, highestTeamId: null, highestBidId: null, ...CLEAR_TIMER, ...CLEAR_RTM };

function clearTimer() { if (shared.timer) clearTimeout(shared.timer); shared.timer = null; }
function scheduleTimerEnd(endsAt: Date) {
  clearTimer();
  shared.timer = setTimeout(() => { onTimerExpired().catch(console.error); }, Math.max(0, endsAt.getTime() - Date.now()) + 20);
}
function clearRtmTimer() { if (shared.rtmTimer) clearTimeout(shared.rtmTimer); shared.rtmTimer = null; }
function scheduleRtmDeadline(at: Date) {
  clearRtmTimer();
  shared.rtmTimer = setTimeout(() => { onRtmDeadline().catch(console.error); }, Math.max(0, at.getTime() - Date.now()) + 20);
}

async function onTimerExpired() {
  await withLock(async () => {
    const a = await getAuction();
    if (a.state !== "PLAYER_LIVE" || !a.timerRunning || !a.timerEndsAt) return;
    if (a.timerEndsAt.getTime() > Date.now()) { scheduleTimerEnd(a.timerEndsAt); return; }
    await prisma.auction.update({ where: { id: 1 }, data: { timerRunning: false, timerRemainingMs: 0, version: { increment: 1 } } });
    const s = await getSettings();
    if (s.autoSell) {
      const fresh = await getAuction();
      if (fresh.currentBid > 0) await resolveSaleUnlocked(fresh); else await markUnsoldUnlocked(fresh);
    } else {
      await broadcast("timer:updated", { expired: true });
    }
  });
}

/** When an RTM decision window lapses, the default (least surprising) outcome applies. */
async function onRtmDeadline() {
  await withLock(async () => {
    const a = await getAuction();
    if (!a.rtmDeadlineAt || a.rtmDeadlineAt.getTime() > Date.now()) { if (a.rtmDeadlineAt) scheduleRtmDeadline(a.rtmDeadlineAt); return; }
    if (a.state === "RTM_OFFER") await rtmActionUnlocked(a, "RTM_PASS", null, "timeout");
    else if (a.state === "RTM_RAISE") await rtmActionUnlocked(a, "RTM_KEEP", null, "timeout");
    else if (a.state === "RTM_MATCH") await rtmActionUnlocked(a, "RTM_DECLINE", null, "timeout");
  });
}

/** Re-arm timers after a server restart. */
export async function resumeTimerOnBoot() {
  const a = await getAuction();
  if (a.state === "PLAYER_LIVE" && a.timerRunning && a.timerEndsAt) scheduleTimerEnd(a.timerEndsAt);
  if (["RTM_OFFER", "RTM_RAISE", "RTM_MATCH"].includes(a.state) && a.rtmDeadlineAt) scheduleRtmDeadline(a.rtmDeadlineAt);
}

// ---- RTM eligibility ------------------------------------------------------
type TeamRow = Prisma.TeamGetPayload<object>;
type PlayerRow = Prisma.PlayerGetPayload<object>;
type SettingsRow = Awaited<ReturnType<typeof getSettings>>;

/** Can `team` match a bid of `amount` for `player` right now? (cards left, purse, squad & overseas room) */
function canRtm(team: TeamRow | null | undefined, player: PlayerRow, amount: number, s: SettingsRow, highestTeamId: string | null) {
  if (!s.rtmEnabled || !team) return false;
  if (highestTeamId && highestTeamId === team.id) return false;
  if (team.rtmUsed >= team.rtmTotal) return false;
  if (team.purse < amount) return false;
  if (team.squadCount >= s.maxSquadSize) return false;
  if (player.overseas && team.overseasCount >= s.maxOverseas) return false;
  return true;
}

// ---- snapshot -------------------------------------------------------------
export async function getSnapshot(): Promise<AuctionSnapshot> {
  const [a, settings, teams, counts] = await Promise.all([
    getAuction(), getSettings(),
    prisma.team.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.player.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const c = (st: string) => counts.find((x) => x.status === st)?._count._all ?? 0;
  const p = a.currentPlayerId ? await prisma.player.findUnique({ where: { id: a.currentPlayerId } }) : null;
  const bids = a.currentPlayerId ? await prisma.bid.findMany({ where: { playerId: a.currentPlayerId }, include: { team: true }, orderBy: { createdAt: "desc" }, take: 60 }) : [];
  const highest = a.highestTeamId ? teams.find((t) => t.id === a.highestTeamId) : null;
  const byId = (id: string | null) => (id ? teams.find((t) => t.id === id) ?? null : null);
  const prev = p ? byId(p.previousTeamId) : null;
  const rtmTeam = byId(a.rtmTeamId), bidder = byId(a.rtmBidderTeamId);
  const total = counts.reduce((n, x) => n + x._count._all, 0);
  return {
    state: a.state,
    currentPlayer: p && {
      id: p.id, name: p.name, photoUrl: p.photoUrl, role: p.role, nationality: p.nationality, overseas: p.overseas, capped: p.capped, set: p.set,
      basePrice: p.basePrice, rating: p.rating, status: p.status, matches: p.matches, runs: p.runs, wickets: p.wickets,
      average: p.average, strikeRate: p.strikeRate, economy: p.economy, highScore: p.highScore, bestBowling: p.bestBowling,
      previousTeamId: p.previousTeamId, previousTeamName: prev?.name ?? null, previousTeamAbbr: prev?.abbreviation ?? null,
      rtmAvailable: canRtm(prev, p, Math.max(a.currentBid, p.basePrice), settings, a.highestTeamId),
    },
    currentBid: a.currentBid,
    highestTeamId: a.highestTeamId,
    highestTeamName: highest?.name ?? null,
    timerEndsAt: a.timerEndsAt?.getTime() ?? null,
    timerRemainingMs: a.timerRemainingMs,
    timerRunning: a.timerRunning,
    timerSeconds: settings.timerSeconds,
    rtmTimerSeconds: settings.rtmTimerSeconds,
    bidIncrement: settings.bidIncrement,
    autoSell: settings.autoSell,
    rtm: rtmTeam && bidder ? {
      teamId: rtmTeam.id, teamName: rtmTeam.name, teamAbbr: rtmTeam.abbreviation, teamColor: rtmTeam.color,
      bidderTeamId: bidder.id, bidderTeamName: bidder.name, bidderTeamAbbr: bidder.abbreviation, bidderTeamColor: bidder.color,
      finalAmount: a.rtmFinalAmount ?? a.currentBid, deadlineAt: a.rtmDeadlineAt?.getTime() ?? null,
    } : null,
    teams: teams.map((t) => ({
      id: t.id, name: t.name, abbreviation: t.abbreviation, color: t.color, color2: t.color2, logoUrl: t.logoUrl, ownerName: t.ownerName,
      purse: t.purse, spent: t.spent, squadCount: t.squadCount, maxSquad: settings.maxSquadSize, overseasCount: t.overseasCount, maxOverseas: settings.maxOverseas,
      rtmTotal: t.rtmTotal, rtmUsed: t.rtmUsed,
    })),
    bids: bids.map<BidSnapshot>((b) => ({ id: b.id, teamId: b.teamId, teamName: b.team.name, abbreviation: b.team.abbreviation, color: b.team.color, amount: b.amount, kind: b.kind, createdAt: b.createdAt.toISOString() })),
    playersRemaining: c("POOL") + c("WAITING"),
    totalPlayers: total,
    soldCount: c("SOLD"),
    unsoldCount: c("UNSOLD"),
    serverTime: Date.now(),
    version: a.version,
  };
}

async function broadcast(event: SocketEvent, payload: unknown = {}) {
  const snap = await getSnapshot();
  emit(event, { ...(payload as object), snapshot: snap });
}
export const emitSnapshot = (event: SocketEvent, payload: object = {}) => broadcast(event, payload);

async function log(type: string, data: Partial<Prisma.AuctionEventUncheckedCreateInput> = {}, db: Db = prisma) {
  return db.auctionEvent.create({ data: { type, ...data } });
}
function assertState(state: AuctionState, allowed: AuctionState[], what: string) {
  if (!allowed.includes(state)) throw new AuctionError(`Cannot ${what} while auction is ${state.replace("_", " ")}`, "BAD_STATE");
}

// ---- auction lifecycle ----------------------------------------------------
async function shuffleWaitingQueue(db: Db = prisma) {
  const pool = await db.player.findMany({ where: { status: { in: ["POOL", "WAITING"] } }, select: { id: true } });
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  for (const [i, p] of pool.entries()) await db.player.update({ where: { id: p.id }, data: { queueOrder: i + 1 } });
  return pool.length;
}
export const shuffleQueue = () => withLock(async () => {
  const n = await shuffleWaitingQueue();
  await log("QUEUE_SHUFFLED", { payload: { count: n } });
  await broadcast("state:sync");
  return n;
});

/** Order the queue by set (Marquee first) — the way the real auction runs. */
export const orderQueueBySet = () => withLock(async () => {
  const pool = await prisma.player.findMany({ where: { status: { in: ["POOL", "WAITING"] } }, select: { id: true, set: true, basePrice: true, rating: true } });
  const rank = (s: string) => (/marquee/i.test(s) ? 0 : /^Set (\d)/.test(s) ? Number(s.match(/^Set (\d)/)![1]) : /uncapped/i.test(s) ? 20 : 10);
  pool.sort((x, y) => rank(x.set) - rank(y.set) || x.set.localeCompare(y.set) || y.basePrice - x.basePrice || (y.rating ?? 0) - (x.rating ?? 0));
  for (const [i, p] of pool.entries()) await prisma.player.update({ where: { id: p.id }, data: { queueOrder: i + 1 } });
  await log("QUEUE_ORDERED_BY_SET", { payload: { count: pool.length } });
  await broadcast("state:sync");
  return pool.length;
});

export const startAuction = () => withLock(async () => {
  const a = await getAuction();
  assertState(a.state, ["WAITING"], "start auction");
  await prisma.$transaction([
    prisma.auction.update({ where: { id: 1 }, data: { state: "LIVE", startedAt: new Date(), version: { increment: 1 } } }),
    prisma.player.updateMany({ where: { status: "POOL" }, data: { status: "WAITING" } }),
  ]);
  await log("AUCTION_STARTED");
  await broadcast("auction:started");
});

export const pauseAuction = () => withLock(async () => {
  const a = await getAuction();
  assertState(a.state, ["LIVE", "PLAYER_LIVE"], "pause");
  const remaining = a.timerRunning && a.timerEndsAt ? Math.max(0, a.timerEndsAt.getTime() - Date.now()) : a.timerRemainingMs;
  clearTimer();
  await prisma.auction.update({ where: { id: 1 }, data: { state: "PAUSED", timerRunning: false, timerRemainingMs: remaining, timerEndsAt: null, version: { increment: 1 } } });
  await log("AUCTION_PAUSED", { payload: { previousState: a.state } });
  await broadcast("auction:paused");
});

export const resumeAuction = () => withLock(async () => {
  const a = await getAuction();
  assertState(a.state, ["PAUSED"], "resume");
  const next: AuctionState = a.currentPlayerId ? "PLAYER_LIVE" : "LIVE";
  await prisma.auction.update({ where: { id: 1 }, data: { state: next, version: { increment: 1 } } });
  await log("AUCTION_RESUMED");
  await broadcast("auction:resumed");
});

export const completeAuction = () => withLock(async () => {
  const a = await getAuction();
  assertState(a.state, ["LIVE", "PAUSED", "SOLD", "UNSOLD"], "complete");
  clearTimer(); clearRtmTimer();
  await prisma.auction.update({ where: { id: 1 }, data: { state: "COMPLETED", completedAt: new Date(), ...CLEAR_PLAYER, version: { increment: 1 } } });
  await log("AUCTION_COMPLETED");
  await broadcast("auction:completed");
});

/** Admin-only reset back to WAITING (keeps players/teams, wipes sales, bids and RTM usage). */
export const resetAuction = () => withLock(async () => {
  clearTimer(); clearRtmTimer();
  await prisma.$transaction(async (tx) => {
    await tx.squadPlayer.deleteMany();
    await tx.bid.deleteMany();
    await tx.auctionEvent.deleteMany();
    await tx.player.updateMany({ where: { status: { not: "POOL" } }, data: { status: "POOL", soldPrice: null, soldToId: null, soldAt: null } });
    const teams = await tx.team.findMany();
    for (const t of teams) await tx.team.update({ where: { id: t.id }, data: { purse: t.startingPurse, spent: 0, squadCount: 0, overseasCount: 0, rtmUsed: 0 } });
    await tx.auction.update({ where: { id: 1 }, data: { state: "WAITING", ...CLEAR_PLAYER, startedAt: null, completedAt: null, version: { increment: 1 } } });
  });
  await broadcast("state:sync");
});

// ---- player lifecycle -----------------------------------------------------
async function pickNextPlayerId(): Promise<string | null> {
  const p = await prisma.player.findFirst({ where: { status: "WAITING" }, orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }] });
  return p?.id ?? null;
}

async function startPlayerUnlocked(id: string) {
  const s = await getSettings();
  const endsAt = s.autoTimer ? new Date(Date.now() + s.timerSeconds * 1000) : null;
  clearTimer();
  await prisma.$transaction([
    prisma.player.update({ where: { id }, data: { status: "LIVE" } }),
    prisma.auction.update({ where: { id: 1 }, data: { state: "PLAYER_LIVE", ...CLEAR_PLAYER, currentPlayerId: id, timerEndsAt: endsAt, timerRunning: !!endsAt, version: { increment: 1 } } }),
  ]);
  if (endsAt) scheduleTimerEnd(endsAt);
  await log("PLAYER_STARTED", { playerId: id });
  await broadcast("player:started", { playerId: id });
}

export const startPlayer = (playerId?: string) => withLock(async () => {
  const a = await getAuction();
  assertState(a.state, ["LIVE", "SOLD", "UNSOLD"], "start a player");
  const id = playerId ?? (await pickNextPlayerId());
  if (!id) throw new AuctionError("No players remaining in the queue", "EMPTY_QUEUE");
  const p = await prisma.player.findUnique({ where: { id } });
  if (!p) throw new AuctionError("Player not found", "NOT_FOUND");
  if (p.status !== "WAITING" && p.status !== "POOL") throw new AuctionError(`Player is ${p.status}, not available`, "BAD_PLAYER_STATE");
  await startPlayerUnlocked(id);
});

export const startTimer = () => withLock(async () => {
  const a = await getAuction();
  assertState(a.state, ["PLAYER_LIVE"], "start timer");
  const s = await getSettings();
  const ms = a.timerRemainingMs && a.timerRemainingMs > 0 ? a.timerRemainingMs : s.timerSeconds * 1000;
  const endsAt = new Date(Date.now() + ms);
  await prisma.auction.update({ where: { id: 1 }, data: { timerEndsAt: endsAt, timerRunning: true, timerRemainingMs: null, version: { increment: 1 } } });
  scheduleTimerEnd(endsAt);
  await broadcast("timer:updated", { action: "start" });
});

export const resetTimer = () => withLock(async () => {
  const a = await getAuction();
  assertState(a.state, ["PLAYER_LIVE", "PAUSED"], "reset timer");
  const s = await getSettings();
  clearTimer();
  if (a.state === "PLAYER_LIVE") {
    const endsAt = new Date(Date.now() + s.timerSeconds * 1000);
    await prisma.auction.update({ where: { id: 1 }, data: { timerEndsAt: endsAt, timerRunning: true, timerRemainingMs: null, version: { increment: 1 } } });
    scheduleTimerEnd(endsAt);
  } else {
    await prisma.auction.update({ where: { id: 1 }, data: { timerEndsAt: null, timerRunning: false, timerRemainingMs: s.timerSeconds * 1000, version: { increment: 1 } } });
  }
  await broadcast("timer:updated", { action: "reset" });
});

export const pauseTimer = () => withLock(async () => {
  const a = await getAuction();
  assertState(a.state, ["PLAYER_LIVE"], "pause timer");
  if (!a.timerRunning || !a.timerEndsAt) return;
  clearTimer();
  const remaining = Math.max(0, a.timerEndsAt.getTime() - Date.now());
  await prisma.auction.update({ where: { id: 1 }, data: { timerRunning: false, timerEndsAt: null, timerRemainingMs: remaining, version: { increment: 1 } } });
  await broadcast("timer:updated", { action: "pause" });
});

// ---- bidding --------------------------------------------------------------
export interface BidInput { userId: string; teamId: string; amount?: number }

export const placeBid = (input: BidInput) => withLock(async () => {
  const [a, s, user, team] = await Promise.all([getAuction(), getSettings(), prisma.user.findUnique({ where: { id: input.userId } }), prisma.team.findUnique({ where: { id: input.teamId } })]);
  if (!user) throw new AuctionError("Not authenticated", "UNAUTHENTICATED");
  if (!team) throw new AuctionError("Team not found", "NOT_FOUND");
  if (user.role === "OWNER" && user.teamId !== team.id) throw new AuctionError("You can only bid for your own franchise", "FORBIDDEN");
  if (!["ADMIN", "AUCTIONEER", "OWNER"].includes(user.role)) throw new AuctionError("Spectators cannot bid", "FORBIDDEN");
  if (a.state === "PAUSED") throw new AuctionError("Auction is paused", "PAUSED");
  if (a.state === "COMPLETED") throw new AuctionError("Auction is completed", "COMPLETED");
  if (a.state.startsWith("RTM")) throw new AuctionError("Bidding closed — RTM decision in progress", "RTM");
  if (a.state !== "PLAYER_LIVE" || !a.currentPlayerId) throw new AuctionError("No player is live", "NO_PLAYER");
  if (s.autoSell && !a.timerRunning && a.timerRemainingMs === 0) throw new AuctionError("Time is up for this player", "TIMER_EXPIRED");
  const player = await prisma.player.findUnique({ where: { id: a.currentPlayerId } });
  if (!player || player.status !== "LIVE") throw new AuctionError("Player is not live", "PLAYER_NOT_LIVE");
  if (team.squadCount >= s.maxSquadSize) throw new AuctionError(`Squad full (${s.maxSquadSize}/${s.maxSquadSize})`, "SQUAD_FULL");
  if (player.overseas && team.overseasCount >= s.maxOverseas) throw new AuctionError(`Overseas quota full (${s.maxOverseas})`, "OVERSEAS_FULL");
  if (a.highestTeamId === team.id) throw new AuctionError("You are already the highest bidder", "ALREADY_HIGHEST");

  const minNext = minNextBid(a.currentBid, player.basePrice, s.bidIncrement);
  const amount = input.amount ?? minNext;
  if (!Number.isInteger(amount) || amount % 5 !== 0) throw new AuctionError("Bids must be in multiples of ₹5 L", "BAD_INCREMENT");
  if (amount < minNext) throw new AuctionError(`Bid must be at least ${minNext} L`, "TOO_LOW");
  if (amount > team.purse) throw new AuctionError("Insufficient purse", "INSUFFICIENT_PURSE");

  const timered = a.timerRunning;
  const endsAt = new Date(Date.now() + s.timerSeconds * 1000);
  const bid = await prisma.$transaction(async (tx) => {
    const fresh = await tx.auction.findUniqueOrThrow({ where: { id: 1 } });
    if (fresh.version !== a.version) throw new AuctionError("Auction state changed, retry", "CONFLICT");
    const b = await tx.bid.create({ data: { playerId: player.id, teamId: team.id, userId: user.id, amount } });
    await tx.auction.update({ where: { id: 1 }, data: { currentBid: amount, highestTeamId: team.id, highestBidId: b.id, ...(timered ? { timerEndsAt: endsAt, timerRunning: true, timerRemainingMs: null } : {}), version: { increment: 1 } } });
    return b;
  });
  if (timered) scheduleTimerEnd(endsAt);
  await broadcast("bid:accepted", { bidId: bid.id, teamId: team.id, teamName: team.name, amount, playerId: player.id, previousHighestTeamId: a.highestTeamId });
  return bid;
});

// ---- sell / RTM / unsold / skip -------------------------------------------
/** Hand the current player to `teamId` for `amount` inside one transaction with row locks. */
async function finalizeSaleUnlocked(a: AuctionRow, teamId: string, amount: number, viaRtm: boolean, extra: Record<string, unknown> = {}) {
  const s = await getSettings();
  clearTimer(); clearRtmTimer();
  const result = await prisma.$transaction(async (tx) => {
    const [team] = await tx.$queryRaw<{ id: string; purse: number; squadCount: number; overseasCount: number; rtmUsed: number; rtmTotal: number }[]>`SELECT id, purse, squadCount, overseasCount, rtmUsed, rtmTotal FROM Team WHERE id = ${teamId} FOR UPDATE`;
    const [player] = await tx.$queryRaw<{ id: string; status: string; name: string; overseas: number | boolean }[]>`SELECT id, status, name, overseas FROM Player WHERE id = ${a.currentPlayerId} FOR UPDATE`;
    if (!team || !player) throw new AuctionError("Record missing", "NOT_FOUND");
    if (player.status !== "LIVE") throw new AuctionError("Player already processed", "DOUBLE_SELL");
    if (team.purse < amount) throw new AuctionError("Team purse insufficient", "INSUFFICIENT_PURSE");
    if (team.squadCount >= s.maxSquadSize) throw new AuctionError("Squad full", "SQUAD_FULL");
    const overseas = !!player.overseas;
    if (overseas && team.overseasCount >= s.maxOverseas) throw new AuctionError("Overseas quota full", "OVERSEAS_FULL");
    if (viaRtm && team.rtmUsed >= team.rtmTotal) throw new AuctionError("No RTM cards left", "NO_RTM");
    if (await tx.squadPlayer.findUnique({ where: { playerId: player.id } })) throw new AuctionError("Player already in a squad", "DOUBLE_SELL");

    await tx.squadPlayer.create({ data: { teamId: team.id, playerId: player.id, price: amount, viaRtm } });
    const t = await tx.team.update({ where: { id: team.id }, data: { purse: { decrement: amount }, spent: { increment: amount }, squadCount: { increment: 1 }, ...(overseas ? { overseasCount: { increment: 1 } } : {}), ...(viaRtm ? { rtmUsed: { increment: 1 } } : {}) } });
    if (t.purse < 0) throw new AuctionError("Purse would go negative", "NEGATIVE_PURSE");
    await tx.player.update({ where: { id: player.id }, data: { status: "SOLD", soldPrice: amount, soldToId: team.id, soldAt: new Date() } });
    const ev = await log("PLAYER_SOLD", { playerId: player.id, teamId: team.id, amount, payload: { viaRtm, overseas, bidderTeamId: a.rtmBidderTeamId ?? a.highestTeamId, rtmTeamId: a.rtmTeamId, ...extra } }, tx);
    await tx.auction.update({ where: { id: 1 }, data: { state: "SOLD", currentBid: amount, highestTeamId: team.id, ...CLEAR_TIMER, ...CLEAR_RTM, version: { increment: 1 } } });
    return { eventId: ev.id, playerName: player.name, teamName: t.name, teamAbbr: t.abbreviation, teamColor: t.color, amount, teamId: team.id, playerId: player.id, viaRtm };
  });
  await broadcast("player:sold", result);
  emit("team:squadUpdated", { teamId: result.teamId });
  return result;
}

/** SELL: either finalize to the highest bidder, or open an RTM window for the player's previous franchise. */
async function resolveSaleUnlocked(a: AuctionRow) {
  assertState(a.state, ["PLAYER_LIVE"], "sell");
  if (!a.currentPlayerId || !a.highestTeamId || a.currentBid <= 0) throw new AuctionError("No winning bid — mark UNSOLD instead", "NO_BID");
  const [s, player] = await Promise.all([getSettings(), prisma.player.findUniqueOrThrow({ where: { id: a.currentPlayerId } })]);
  const prev = player.previousTeamId ? await prisma.team.findUnique({ where: { id: player.previousTeamId } }) : null;
  if (canRtm(prev, player, a.currentBid, s, a.highestTeamId)) {
    clearTimer();
    const deadline = new Date(Date.now() + s.rtmTimerSeconds * 1000);
    await prisma.auction.update({ where: { id: 1 }, data: { state: "RTM_OFFER", ...CLEAR_TIMER, rtmTeamId: prev!.id, rtmBidderTeamId: a.highestTeamId, rtmFinalAmount: a.currentBid, rtmDeadlineAt: deadline, version: { increment: 1 } } });
    await log("RTM_OFFERED", { playerId: player.id, teamId: prev!.id, amount: a.currentBid, payload: { bidderTeamId: a.highestTeamId } });
    scheduleRtmDeadline(deadline);
    await broadcast("rtm:offer", { playerId: player.id, teamId: prev!.id, bidderTeamId: a.highestTeamId, amount: a.currentBid });
    return { rtm: true };
  }
  return finalizeSaleUnlocked(a, a.highestTeamId, a.currentBid, false);
}
export const sellPlayer = () => withLock(async () => resolveSaleUnlocked(await getAuction()));

export interface RtmInput { userId: string; action: RtmAction; amount?: number }

async function rtmActionUnlocked(a: AuctionRow, action: RtmAction, actor: { role: string; teamId: string | null } | null, by: string, amount?: number) {
  const s = await getSettings();
  const need: Record<RtmAction, AuctionState> = { RTM_USE: "RTM_OFFER", RTM_PASS: "RTM_OFFER", RTM_RAISE: "RTM_RAISE", RTM_KEEP: "RTM_RAISE", RTM_MATCH: "RTM_MATCH", RTM_DECLINE: "RTM_MATCH" };
  assertState(a.state, [need[action]], action.replace("_", " ").toLowerCase());
  if (!a.rtmTeamId || !a.rtmBidderTeamId || !a.currentPlayerId) throw new AuctionError("RTM state is incomplete", "RTM_STATE");
  // Owners may act only for the side they represent; admin/auctioneer may act for anyone (e.g. relaying a verbal decision).
  if (actor && actor.role === "OWNER") {
    const side = ["RTM_RAISE", "RTM_KEEP"].includes(action) ? a.rtmBidderTeamId : a.rtmTeamId;
    if (actor.teamId !== side) throw new AuctionError("This decision belongs to another franchise", "FORBIDDEN");
  }
  const [rtmTeam, bidder, player] = await Promise.all([prisma.team.findUniqueOrThrow({ where: { id: a.rtmTeamId } }), prisma.team.findUniqueOrThrow({ where: { id: a.rtmBidderTeamId } }), prisma.player.findUniqueOrThrow({ where: { id: a.currentPlayerId } })]);
  const final = a.rtmFinalAmount ?? a.currentBid;
  clearRtmTimer();
  const deadline = () => new Date(Date.now() + s.rtmTimerSeconds * 1000);

  switch (action) {
    case "RTM_USE": {
      const d = deadline();
      await prisma.auction.update({ where: { id: 1 }, data: { state: "RTM_RAISE", rtmDeadlineAt: d, version: { increment: 1 } } });
      await log("RTM_USED", { playerId: player.id, teamId: rtmTeam.id, amount: final, payload: { by } });
      scheduleRtmDeadline(d);
      await broadcast("rtm:raise", { playerId: player.id, teamId: rtmTeam.id, bidderTeamId: bidder.id, amount: final });
      return { state: "RTM_RAISE" };
    }
    case "RTM_PASS": {
      await log("RTM_PASSED", { playerId: player.id, teamId: rtmTeam.id, amount: final, payload: { by } });
      emit("rtm:passed", { playerId: player.id, teamId: rtmTeam.id });
      return finalizeSaleUnlocked(a, bidder.id, final, false, { rtmPassed: true });
    }
    case "RTM_RAISE":
    case "RTM_KEEP": {
      let newFinal = final;
      if (action === "RTM_RAISE") {
        if (amount == null || !Number.isInteger(amount) || amount % 5 !== 0) throw new AuctionError("Raise must be a multiple of ₹5 L", "BAD_INCREMENT");
        if (amount < final) throw new AuctionError("Raise cannot be lower than the winning bid", "TOO_LOW");
        if (amount > bidder.purse) throw new AuctionError("Insufficient purse for that raise", "INSUFFICIENT_PURSE");
        newFinal = amount;
        if (amount > final) await prisma.bid.create({ data: { playerId: player.id, teamId: bidder.id, amount, kind: "RTM_RAISE" } });
      }
      const d = deadline();
      await prisma.auction.update({ where: { id: 1 }, data: { state: "RTM_MATCH", rtmFinalAmount: newFinal, currentBid: newFinal, rtmDeadlineAt: d, version: { increment: 1 } } });
      await log(action === "RTM_RAISE" ? "RTM_RAISED" : "RTM_KEPT", { playerId: player.id, teamId: bidder.id, amount: newFinal, payload: { by, from: final } });
      scheduleRtmDeadline(d);
      await broadcast("rtm:match", { playerId: player.id, teamId: rtmTeam.id, bidderTeamId: bidder.id, amount: newFinal });
      return { state: "RTM_MATCH", amount: newFinal };
    }
    case "RTM_MATCH": {
      if (!canRtm(rtmTeam, player, final, s, bidder.id)) throw new AuctionError("Franchise cannot match this price (purse, squad or RTM cards)", "CANNOT_MATCH");
      await prisma.bid.create({ data: { playerId: player.id, teamId: rtmTeam.id, amount: final, kind: "RTM_MATCH" } });
      await log("RTM_MATCHED", { playerId: player.id, teamId: rtmTeam.id, amount: final, payload: { by, bidderTeamId: bidder.id } });
      return finalizeSaleUnlocked({ ...a, highestTeamId: rtmTeam.id }, rtmTeam.id, final, true, { matchedFrom: bidder.id });
    }
    case "RTM_DECLINE": {
      await log("RTM_DECLINED", { playerId: player.id, teamId: rtmTeam.id, amount: final, payload: { by } });
      return finalizeSaleUnlocked(a, bidder.id, final, false, { rtmDeclined: true });
    }
  }
}

export const rtmAction = (input: RtmInput) => withLock(async () => {
  const [a, user] = await Promise.all([getAuction(), prisma.user.findUnique({ where: { id: input.userId } })]);
  if (!user) throw new AuctionError("Not authenticated", "UNAUTHENTICATED");
  if (!["ADMIN", "AUCTIONEER", "OWNER"].includes(user.role)) throw new AuctionError("Not allowed", "FORBIDDEN");
  return rtmActionUnlocked(a, input.action, { role: user.role, teamId: user.teamId }, user.id, input.amount);
});

async function markUnsoldUnlocked(a: AuctionRow) {
  assertState(a.state, ["PLAYER_LIVE"], "mark unsold");
  if (!a.currentPlayerId) throw new AuctionError("No current player", "NO_PLAYER");
  if (a.currentBid > 0) throw new AuctionError("There is a valid bid — SELL instead", "HAS_BID");
  clearTimer();
  const p = await prisma.player.findUniqueOrThrow({ where: { id: a.currentPlayerId } });
  await prisma.$transaction([
    prisma.player.update({ where: { id: p.id }, data: { status: "UNSOLD" } }),
    prisma.auction.update({ where: { id: 1 }, data: { state: "UNSOLD", ...CLEAR_TIMER, version: { increment: 1 } } }),
    prisma.auctionEvent.create({ data: { type: "PLAYER_UNSOLD", playerId: p.id } }),
  ]);
  await broadcast("player:unsold", { playerName: p.name, basePrice: p.basePrice, playerId: p.id });
}
export const markUnsold = () => withLock(async () => markUnsoldUnlocked(await getAuction()));

export const skipPlayer = () => withLock(async () => {
  const a = await getAuction();
  assertState(a.state, ["PLAYER_LIVE"], "skip");
  if (!a.currentPlayerId) throw new AuctionError("No current player", "NO_PLAYER");
  if (a.currentBid > 0) throw new AuctionError("Cannot skip a player with bids", "HAS_BID");
  clearTimer();
  await prisma.$transaction([
    prisma.bid.deleteMany({ where: { playerId: a.currentPlayerId } }),
    prisma.player.update({ where: { id: a.currentPlayerId }, data: { status: "SKIPPED" } }),
    prisma.auction.update({ where: { id: 1 }, data: { state: "LIVE", ...CLEAR_PLAYER, version: { increment: 1 } } }),
    prisma.auctionEvent.create({ data: { type: "PLAYER_SKIPPED", playerId: a.currentPlayerId } }),
  ]);
  await broadcast("player:skipped", { playerId: a.currentPlayerId });
});

/** Clear the SOLD/UNSOLD result and bring up the next player in the queue. */
export const nextPlayer = (autoStart = true) => withLock(async () => {
  const a = await getAuction();
  assertState(a.state, ["SOLD", "UNSOLD", "LIVE"], "move to next player");
  await prisma.auction.update({ where: { id: 1 }, data: { state: "LIVE", ...CLEAR_PLAYER, version: { increment: 1 } } });
  await broadcast("player:next");
  if (autoStart) { const next = await pickNextPlayerId(); if (next) await startPlayerUnlocked(next); }
});

/** Undo the most recent SOLD/UNSOLD/SKIPPED and put that player back on the block. */
export const undoLast = () => withLock(async () => {
  const a = await getAuction();
  assertState(a.state, ["SOLD", "UNSOLD", "LIVE", "PLAYER_LIVE"], "undo");
  const ev = await prisma.auctionEvent.findFirst({ where: { undone: false, type: { in: ["PLAYER_SOLD", "PLAYER_UNSOLD", "PLAYER_SKIPPED"] } }, orderBy: { createdAt: "desc" } });
  if (!ev || !ev.playerId) throw new AuctionError("Nothing to undo", "NOTHING");
  if (a.state === "PLAYER_LIVE" && a.currentBid > 0) throw new AuctionError("Finish or skip the current player before undoing", "BUSY");
  clearTimer(); clearRtmTimer();
  const payload = (ev.payload ?? {}) as { viaRtm?: boolean; overseas?: boolean };
  await prisma.$transaction(async (tx) => {
    if (a.currentPlayerId && a.currentPlayerId !== ev.playerId) {
      await tx.bid.deleteMany({ where: { playerId: a.currentPlayerId } });
      await tx.player.update({ where: { id: a.currentPlayerId }, data: { status: "WAITING" } });
    }
    if (ev.type === "PLAYER_SOLD" && ev.teamId && ev.amount != null) {
      await tx.squadPlayer.deleteMany({ where: { playerId: ev.playerId! } });
      const t = await tx.team.update({ where: { id: ev.teamId }, data: { purse: { increment: ev.amount }, spent: { decrement: ev.amount }, squadCount: { decrement: 1 }, ...(payload.overseas ? { overseasCount: { decrement: 1 } } : {}), ...(payload.viaRtm ? { rtmUsed: { decrement: 1 } } : {}) } });
      if (t.squadCount < 0 || t.spent < 0 || t.rtmUsed < 0 || t.overseasCount < 0) throw new AuctionError("Inconsistent undo", "INCONSISTENT");
      await tx.bid.deleteMany({ where: { playerId: ev.playerId!, kind: { in: ["RTM_RAISE", "RTM_MATCH"] } } });
    }
    await tx.player.update({ where: { id: ev.playerId! }, data: { status: "LIVE", soldPrice: null, soldToId: null, soldAt: null } });
    const lastBid = await tx.bid.findFirst({ where: { playerId: ev.playerId!, kind: "BID" }, orderBy: { amount: "desc" } });
    await tx.auction.update({ where: { id: 1 }, data: { state: "PLAYER_LIVE", ...CLEAR_PLAYER, currentPlayerId: ev.playerId, currentBid: lastBid?.amount ?? 0, highestTeamId: lastBid?.teamId ?? null, highestBidId: lastBid?.id ?? null, version: { increment: 1 } } });
    await tx.auctionEvent.update({ where: { id: ev.id }, data: { undone: true } });
    await tx.auctionEvent.create({ data: { type: "UNDO", playerId: ev.playerId, teamId: ev.teamId, amount: ev.amount, payload: { undoneEventId: ev.id, undoneType: ev.type } } });
  });
  await broadcast("auction:undo", { undone: ev.type, playerId: ev.playerId });
});

/** Return an UNSOLD/SKIPPED player to the end of the queue. */
export const requeuePlayer = (playerId: string) => withLock(async () => {
  const p = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
  if (!["UNSOLD", "SKIPPED"].includes(p.status)) throw new AuctionError("Only unsold/skipped players can be re-queued", "BAD_PLAYER_STATE");
  const a = await getAuction();
  const max = await prisma.player.aggregate({ _max: { queueOrder: true } });
  await prisma.bid.deleteMany({ where: { playerId } });
  await prisma.player.update({ where: { id: playerId }, data: { status: a.state === "WAITING" ? "POOL" : "WAITING", queueOrder: (max._max.queueOrder ?? 0) + 1 } });
  await broadcast("state:sync");
});
