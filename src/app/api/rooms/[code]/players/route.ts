import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { roomGuard, parse, handle, json, audit } from "@/lib/api";
export const dynamic = "force-dynamic";

export const playerSchema = z.object({
  name: z.string().min(2).max(80),
  photoUrl: z.string().nullable().optional().or(z.literal("")),
  role: z.enum(["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKETKEEPER"]),
  nationality: z.string().min(2).max(40).default("India"),
  overseas: z.boolean().default(false),
  capped: z.boolean().default(true),
  set: z.string().min(1).max(40).default("Set 1"),
  basePrice: z.coerce.number().int().min(5).default(30),
  rating: z.coerce.number().int().min(0).max(100).nullable().optional(),
  matches: z.coerce.number().int().min(0).default(0),
  runs: z.coerce.number().int().min(0).default(0),
  wickets: z.coerce.number().int().min(0).default(0),
  average: z.coerce.number().nullable().optional(),
  strikeRate: z.coerce.number().nullable().optional(),
  economy: z.coerce.number().nullable().optional(),
  highScore: z.string().nullable().optional(),
  bestBowling: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  previousTeamId: z.string().nullable().optional().or(z.literal("")),
  status: z.enum(["POOL", "WAITING", "LIVE", "SOLD", "UNSOLD", "SKIPPED"]).optional(),
});
type P = { params: Promise<{ code: string }> };

/** Player list (public; richer filters for the host's manage pages). */
export async function GET(req: Request, { params }: P) {
  const g = await roomGuard((await params).code, "any"); if ("error" in g) return g.error;
  const u = new URL(req.url);
  const q = u.searchParams.get("q") || undefined, status = u.searchParams.get("status") || undefined, role = u.searchParams.get("role") || undefined, set = u.searchParams.get("set") || undefined, prev = u.searchParams.get("prev") || undefined;
  const players = await prisma.player.findMany({
    where: { roomId: g.room.id, ...(q ? { name: { contains: q } } : {}), ...(status ? { status: status as never } : {}), ...(role ? { role: role as never } : {}), ...(set ? { set } : {}), ...(prev ? { previousTeamId: prev } : {}) },
    orderBy: [{ queueOrder: "asc" }, { createdAt: "desc" }], include: { soldTo: { select: { name: true, abbreviation: true, color: true } }, previousTeam: { select: { abbreviation: true, color: true } }, squadEntry: { select: { viaRtm: true } } }, take: 600,
  });
  return json(players.map((p) => ({ ...p, viaRtm: p.squadEntry?.viaRtm ?? false, squadEntry: undefined })));
}

export async function POST(req: Request, { params }: P) {
  const g = await roomGuard((await params).code, "host"); if ("error" in g) return g.error;
  try {
    const data = await parse(req, playerSchema);
    const max = await prisma.player.aggregate({ where: { roomId: g.room.id }, _max: { queueOrder: true } });
    const p = await prisma.player.create({ data: { ...data, roomId: g.room.id, photoUrl: data.photoUrl || null, previousTeamId: data.previousTeamId || null, status: data.status ?? (g.room.state === "WAITING" ? "POOL" : "WAITING"), queueOrder: (max._max.queueOrder ?? 0) + 1 } });
    await audit(g.access.userId, "PLAYER_CREATE", "Player", p.id);
    return json(p, 201);
  } catch (e) { return handle(e); }
}
