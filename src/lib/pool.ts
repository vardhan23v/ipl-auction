/** The bundled player pool (from the open-source Crick Auction dataset) and the ten IPL franchises. */
import type { PrismaClient, Prisma, PlayingRole } from "@prisma/client";
import pool from "../../prisma/data/players.json";

export const TEAMS = [
  { name: "Mumbai Indians", abbreviation: "MI", color: "#1d6fd1", color2: "#c9a227", logoUrl: "https://documents.iplt20.com/ipl/MI/Logos/Logooutline/MIoutline.png" },
  { name: "Chennai Super Kings", abbreviation: "CSK", color: "#f5c518", color2: "#1b4f9c", logoUrl: "https://documents.iplt20.com/ipl/CSK/logos/Logooutline/CSKoutline.png" },
  { name: "Royal Challengers Bengaluru", abbreviation: "RCB", color: "#e0262b", color2: "#1c1c1c", logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/Royal_Challengers_Bengaluru_Logo.svg/960px-Royal_Challengers_Bengaluru_Logo.svg.png" },
  { name: "Kolkata Knight Riders", abbreviation: "KKR", color: "#7b3fd4", color2: "#d9b64e", logoUrl: "https://documents.iplt20.com/ipl/KKR/Logos/Logooutline/KKRoutline.png" },
  { name: "Delhi Capitals", abbreviation: "DC", color: "#2f7df6", color2: "#d71920", logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2f/Delhi_Capitals.svg/960px-Delhi_Capitals.svg.png" },
  { name: "Punjab Kings", abbreviation: "PBKS", color: "#e03a3e", color2: "#c0c0c0", logoUrl: "https://documents.iplt20.com/ipl/PBKS/Logos/Logooutline/PBKSoutline.png" },
  { name: "Rajasthan Royals", abbreviation: "RR", color: "#ea1a85", color2: "#254aa5", logoUrl: "https://static.vecteezy.com/system/resources/previews/075/244/952/non_2x/rajasthan-royals-logo-rr-logo-icon-on-transparent-background-free-png.png" },
  { name: "Sunrisers Hyderabad", abbreviation: "SRH", color: "#f26522", color2: "#1c1c1c", logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/5/51/Sunrisers_Hyderabad_Logo.svg/1280px-Sunrisers_Hyderabad_Logo.svg.png" },
  { name: "Gujarat Titans", abbreviation: "GT", color: "#4b6cb7", color2: "#c8a951", logoUrl: "https://documents.iplt20.com/ipl/GT/Logos/Logooutline/GToutline.png" },
  { name: "Lucknow Super Giants", abbreviation: "LSG", color: "#00a3e0", color2: "#f36f21", logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/3/34/Lucknow_Super_Giants_Logo.svg/1920px-Lucknow_Super_Giants_Logo.svg.png" },
];

type PoolPlayer = (typeof pool)[number];
export const POOL_SIZE = pool.length;

/** Build the Player rows for a room from the bundled pool. `teamIds` maps abbreviation → team id in that room. */
export function poolRows(roomId: string, teamIds: Map<string, string>): Prisma.PlayerCreateManyInput[] {
  return (pool as PoolPlayer[]).map((p, i) => ({
    roomId, externalId: p.externalId, name: p.name, role: p.role as PlayingRole, nationality: p.nationality, overseas: p.overseas, capped: p.capped, set: p.set,
    basePrice: p.basePrice, photoUrl: p.photoUrl, rating: p.rating, matches: p.matches, runs: p.runs, wickets: p.wickets,
    average: p.average, strikeRate: p.strikeRate, economy: p.economy, highScore: p.highScore, bestBowling: p.bestBowling,
    previousTeamId: p.previousTeam ? teamIds.get(p.previousTeam) ?? null : null, status: "POOL", queueOrder: i + 1,
  }));
}

/** (Re)load the bundled pool into a room. `replace` wipes the room's auction first. */
export async function importPool(db: PrismaClient, roomId: string, replace = false) {
  const room = await db.room.findUniqueOrThrow({ where: { id: roomId } });
  const teams = await db.team.findMany({ where: { roomId } });
  const teamIds = new Map(teams.map((t) => [t.abbreviation, t.id]));
  if (replace) {
    await db.$transaction(async (tx) => {
      await tx.squadPlayer.deleteMany({ where: { roomId } }); await tx.bid.deleteMany({ where: { roomId } }); await tx.auctionEvent.deleteMany({ where: { roomId } });
      await tx.player.deleteMany({ where: { roomId } });
      for (const t of teams) await tx.team.update({ where: { id: t.id }, data: { purse: t.startingPurse, spent: 0, squadCount: 0, overseasCount: 0, rtmUsed: 0 } });
      await tx.room.update({ where: { id: roomId }, data: { state: "WAITING", currentPlayerId: null, currentBid: 0, highestTeamId: null, highestBidId: null, timerEndsAt: null, timerRemainingMs: null, timerRunning: false, rtmTeamId: null, rtmBidderTeamId: null, rtmFinalAmount: null, rtmDeadlineAt: null, startedAt: null, completedAt: null } });
    });
  }
  const existing = new Set((await db.player.findMany({ where: { roomId, externalId: { not: null } }, select: { externalId: true } })).map((p) => p.externalId));
  const rows = poolRows(roomId, teamIds).filter((r) => !existing.has(r.externalId ?? ""));
  if (rows.length) await db.player.createMany({ data: rows });
  void room;
  return { created: rows.length, skipped: existing.size };
}
