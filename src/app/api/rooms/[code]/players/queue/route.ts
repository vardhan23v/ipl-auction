import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { roomGuard, parse, handle, json, audit } from "@/lib/api";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ code: string }> };
export async function GET(_: Request, { params }: P) {
  const g = await roomGuard((await params).code, "any"); if ("error" in g) return g.error;
  return json(await prisma.player.findMany({ where: { roomId: g.room.id, status: { in: ["POOL", "WAITING"] } }, orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }], include: { previousTeam: { select: { abbreviation: true, color: true } } } }));
}
/** Body: { order: string[] } — full ordered list of player ids. */
export async function PUT(req: Request, { params }: P) {
  const g = await roomGuard((await params).code, "host"); if ("error" in g) return g.error;
  try {
    const { order } = await parse(req, z.object({ order: z.array(z.string()).max(1000) }));
    await prisma.$transaction(order.map((id, i) => prisma.player.updateMany({ where: { id, roomId: g.room.id }, data: { queueOrder: i + 1 } })));
    await audit(g.access.userId, "QUEUE_REORDER", "Room", g.room.id);
    return json({ ok: true });
  } catch (e) { return handle(e); }
}
