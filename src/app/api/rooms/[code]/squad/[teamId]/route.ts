import { prisma } from "@/lib/prisma";
import { roomGuard, json } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ code: string; teamId: string }> }) {
  const { code, teamId } = await params;
  const g = await roomGuard(code, "any"); if ("error" in g) return g.error;
  const team = await prisma.team.findFirst({ where: { id: teamId, roomId: g.room.id }, select: { ownerName: true, rtmTotal: true, rtmUsed: true, squad: { orderBy: { createdAt: "asc" }, select: { id: true, price: true, viaRtm: true, player: { select: { name: true, role: true, photoUrl: true, overseas: true, rating: true } } } } } });
  return team ? json(team) : json({ error: "Not found" }, 404);
}
