/**
 * Validates prisma/data/players.json.
 * Run: npx tsx scripts/check-pool.ts   (exits 1 on any problem)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const KEYS = [
  "externalId", "name", "role", "nationality", "overseas", "capped", "set", "basePrice", "photoUrl", "rating",
  "matches", "runs", "wickets", "average", "strikeRate", "economy", "highScore", "bestBowling", "previousTeam",
] as const;
const ROLES = new Set(["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKETKEEPER"]);
const TEAMS = new Set(["MI", "CSK", "RCB", "KKR", "SRH", "DC", "PBKS", "RR", "GT", "LSG"]);
const LADDER = new Set([30, 50, 75, 100, 150, 200]);
const SET_RE = /^(Marquee [12]|Set \d+|Uncapped (Batters|Bowlers|All-Rounders|Wicketkeepers|Fast Bowlers|Spinners) \d+)$/;

const file = join(__dirname, "..", "prisma", "data", "players.json");
const pool: Record<string, unknown>[] = JSON.parse(readFileSync(file, "utf8"));
const errors: string[] = [];
const err = (i: number, p: Record<string, unknown>, msg: string) => errors.push(`#${i} ${String(p.externalId)} (${String(p.name)}): ${msg}`);

if (!Array.isArray(pool)) throw new Error("players.json must be an array");
const ids = new Map<string, number>();
const names = new Map<string, number>();

pool.forEach((p, i) => {
  const keys = Object.keys(p);
  for (const k of KEYS) if (!(k in p)) err(i, p, `missing key ${k}`);
  for (const k of keys) if (!(KEYS as readonly string[]).includes(k)) err(i, p, `unexpected key ${k}`);

  if (typeof p.externalId !== "string" || !p.externalId) err(i, p, "externalId must be a non-empty string");
  else if (ids.has(p.externalId)) err(i, p, `duplicate externalId (also #${ids.get(p.externalId)})`);
  else ids.set(p.externalId, i);

  if (typeof p.name !== "string" || !p.name.trim()) err(i, p, "name must be a non-empty string");
  else {
    const key = p.name.trim().toLowerCase();
    if (names.has(key)) err(i, p, `duplicate name (also #${names.get(key)})`);
    else names.set(key, i);
  }

  if (!ROLES.has(p.role as string)) err(i, p, `invalid role ${String(p.role)}`);
  if (p.previousTeam !== null && !TEAMS.has(p.previousTeam as string)) err(i, p, `invalid previousTeam ${String(p.previousTeam)}`);
  if (!LADDER.has(p.basePrice as number)) err(i, p, `basePrice ${String(p.basePrice)} not in ladder`);
  if (typeof p.nationality !== "string" || !p.nationality) err(i, p, "nationality must be a non-empty string");
  if (typeof p.overseas !== "boolean" || p.overseas !== (p.nationality !== "India")) err(i, p, `overseas=${String(p.overseas)} inconsistent with nationality ${String(p.nationality)}`);
  if (typeof p.capped !== "boolean") err(i, p, "capped must be boolean");
  if (typeof p.set !== "string" || !SET_RE.test(p.set)) err(i, p, `set "${String(p.set)}" does not follow the naming scheme`);
  else if (p.set.startsWith("Uncapped") === p.capped) err(i, p, `set "${p.set}" inconsistent with capped=${String(p.capped)}`);
  if (p.photoUrl !== null && typeof p.photoUrl !== "string") err(i, p, "photoUrl must be string or null");
  if (p.rating !== null && !Number.isInteger(p.rating)) err(i, p, "rating must be an integer or null");
  // Prisma: matches/runs/wickets are non-null Int; the rest nullable.
  for (const k of ["matches", "runs", "wickets"] as const) if (!Number.isInteger(p[k]) || (p[k] as number) < 0) err(i, p, `${k} must be a non-negative integer`);
  for (const k of ["average", "strikeRate", "economy"] as const) if (p[k] !== null && typeof p[k] !== "number") err(i, p, `${k} must be number or null`);
  for (const k of ["highScore", "bestBowling"] as const) if (p[k] !== null && typeof p[k] !== "string") err(i, p, `${k} must be string or null`);
});

const count = (f: (p: Record<string, unknown>) => unknown) => pool.reduce<Record<string, number>>((a, p) => { const k = String(f(p)); a[k] = (a[k] ?? 0) + 1; return a; }, {});
console.log(`players: ${pool.length}`);
console.log("by role:", count((p) => p.role));
console.log("overseas:", count((p) => p.overseas), "capped:", count((p) => p.capped));

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error("  " + e);
  process.exit(1);
}
console.log("OK: pool is valid");
