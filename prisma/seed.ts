/**
 * Seed: 10 IPL franchises, admin/auctioneer/owner accounts and the player pool
 * (prisma/data/players.json — derived from the open-source Crick Auction dataset, Apache-2.0).
 */
import { PrismaClient, PlayingRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import pool from "./data/players.json";
const prisma = new PrismaClient();

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

/** (Re)load the pool. Keeps players that are already sold/live untouched unless `replace` is true. */
export async function importPool(db: PrismaClient, replace = false) {
  const teams = await db.team.findMany();
  const byAbbr = new Map(teams.map((t) => [t.abbreviation, t.id]));
  if (replace) {
    await db.squadPlayer.deleteMany(); await db.bid.deleteMany(); await db.auctionEvent.deleteMany();
    await db.player.deleteMany();
    for (const t of teams) await db.team.update({ where: { id: t.id }, data: { purse: t.startingPurse, spent: 0, squadCount: 0, overseasCount: 0, rtmUsed: 0 } });
    await db.auction.update({ where: { id: 1 }, data: { state: "WAITING", currentPlayerId: null, currentBid: 0, highestTeamId: null, highestBidId: null, timerEndsAt: null, timerRemainingMs: null, timerRunning: false, rtmTeamId: null, rtmBidderTeamId: null, rtmFinalAmount: null, rtmDeadlineAt: null, startedAt: null, completedAt: null } }).catch(() => {});
  }
  let created = 0, updated = 0;
  for (const [i, p] of (pool as PoolPlayer[]).entries()) {
    const data = {
      name: p.name, role: p.role as PlayingRole, nationality: p.nationality, overseas: p.overseas, capped: p.capped, set: p.set,
      basePrice: p.basePrice, photoUrl: p.photoUrl, rating: p.rating, matches: p.matches, runs: p.runs, wickets: p.wickets,
      average: p.average, strikeRate: p.strikeRate, economy: p.economy, highScore: p.highScore, bestBowling: p.bestBowling,
      previousTeamId: p.previousTeam ? byAbbr.get(p.previousTeam) ?? null : null,
    };
    const existing = await db.player.findUnique({ where: { externalId: p.externalId } });
    if (existing) {
      // Never touch auction state of an existing player; only refresh static facts.
      await db.player.update({ where: { id: existing.id }, data: { ...data, previousTeamId: existing.previousTeamId ?? data.previousTeamId } });
      updated++;
    } else {
      await db.player.create({ data: { ...data, externalId: p.externalId, status: "POOL", queueOrder: i + 1 } });
      created++;
    }
  }
  return { created, updated };
}

async function main() {
  const pw = process.env.SEED_PASSWORD ?? "ipl2026";
  const hash = await bcrypt.hash(pw, 10);
  const settings = await prisma.auctionSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  await prisma.auction.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const teams = [];
  for (const [i, t] of TEAMS.entries()) {
    teams.push(await prisma.team.upsert({
      where: { abbreviation: t.abbreviation },
      update: { sortOrder: i, logoUrl: t.logoUrl, color: t.color, color2: t.color2 },
      create: { ...t, sortOrder: i, startingPurse: settings.startingPurse, purse: settings.startingPurse, rtmTotal: settings.defaultRtmCards },
    }));
  }
  await prisma.user.upsert({ where: { email: "admin@ipl.local" }, update: {}, create: { name: "Auction Admin", email: "admin@ipl.local", role: "ADMIN", passwordHash: hash } });
  await prisma.user.upsert({ where: { email: "auctioneer@ipl.local" }, update: {}, create: { name: "Auctioneer", email: "auctioneer@ipl.local", role: "AUCTIONEER", passwordHash: hash } });
  // Franchises are claimed in the lobby (Google / guest sign-in) — no pre-made owner accounts.
  await prisma.user.deleteMany({ where: { email: { endsWith: "@ipl.local" }, role: "OWNER" } });
  await prisma.team.updateMany({ where: { owner: null }, data: { ownerName: null } });
  const r = await importPool(prisma, process.env.SEED_REPLACE === "1");
  console.log(`Players: ${r.created} created, ${r.updated} refreshed`);
  console.log(`\nStaff logins (password: ${pw})\n  admin@ipl.local (ADMIN)\n  auctioneer@ipl.local (AUCTIONEER)\nManagers sign in with Google or as a guest and claim a franchise at /lobby.`);
}

if (process.argv[1]?.endsWith("seed.ts")) main().finally(() => prisma.$disconnect());
