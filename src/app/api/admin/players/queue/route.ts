import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, parse, handle, json, audit } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  const g = await guard("ADMIN", "AUCTIONEER"); if ("error" in g) return g.error;
  return json(await prisma.player.findMany({ where: { status: { in: ["POOL", "WAITING"] } }, orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }], include: { previousTeam: { select: { abbreviation: true, color: true } } } }));
}
/** Body: { order: string[] } — full ordered list of player ids. */
export async function PUT(req: Request) {
  const g = await guard("ADMIN", "AUCTIONEER"); if ("error" in g) return g.error;
  try {
    const { order } = await parse(req, z.object({ order: z.array(z.string()).max(1000) }));
    await prisma.$transaction(order.map((id, i) => prisma.player.update({ where: { id }, data: { queueOrder: i + 1 } })));
    await audit(g.session.user.id, "QUEUE_REORDER", "Player");
    return json({ ok: true });
  } catch (e) { return handle(e); }
}
