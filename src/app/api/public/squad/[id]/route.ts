import { prisma } from "@/lib/prisma";
import { json } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await prisma.team.findUnique({ where: { id }, select: { ownerName: true, rtmTotal: true, rtmUsed: true, squad: { orderBy: { createdAt: "asc" }, select: { id: true, price: true, viaRtm: true, player: { select: { name: true, role: true, photoUrl: true, overseas: true, rating: true } } } } } });
  return team ? json(team) : json({ error: "Not found" }, 404);
}
