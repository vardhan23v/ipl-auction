import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { roomGuard, parse, handle, json, audit } from "@/lib/api";
import { emitSnapshot } from "@/server/auction-engine";
export const dynamic = "force-dynamic";

/** Which players to keep in this auction. Anything not matching is removed from the room's pool (re-import restores it). */
const schema = z.object({
  roles: z.array(z.enum(["BATSMAN", "BOWLER", "ALL_ROUNDER", "WICKETKEEPER"])).min(1),
  capped: z.enum(["all", "capped", "uncapped"]),
  overseas: z.enum(["all", "indian", "overseas"]),
  sets: z.array(z.string()).optional(),
  dryRun: z.boolean().optional(),
});
function removeWhere(roomId: string, f: z.infer<typeof schema>): Prisma.PlayerWhereInput {
  const keep: Prisma.PlayerWhereInput[] = [{ role: { in: f.roles } }];
  if (f.capped !== "all") keep.push({ capped: f.capped === "capped" });
  if (f.overseas !== "all") keep.push({ overseas: f.overseas === "overseas" });
  if (f.sets?.length) keep.push({ set: { in: f.sets } });
  return { roomId, status: "POOL", NOT: { AND: keep } };
}
/** Host, before the start: preview (dryRun) or apply the player filter. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "host"); if ("error" in g) return g.error;
  try {
    if (g.room.state !== "WAITING") return json({ error: "The player pool is locked once the auction starts" }, 409);
    const f = await parse(req, schema);
    const where = removeWhere(g.room.id, f);
    const [remove, total] = await Promise.all([prisma.player.count({ where }), prisma.player.count({ where: { roomId: g.room.id } })]);
    if (f.dryRun) return json({ remove, keep: total - remove });
    if (total - remove < 2) return json({ error: "That filter leaves fewer than 2 players" }, 422);
    const r = await prisma.player.deleteMany({ where });
    await audit(g.access.userId, "POOL_FILTER", "Room", g.room.id, f);
    await emitSnapshot(g.room.id, "state:sync");
    return json({ removed: r.count, keep: total - r.count });
  } catch (e) { return handle(e); }
}
