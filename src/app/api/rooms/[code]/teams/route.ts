import { prisma } from "@/lib/prisma";
import { roomGuard, json } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "any"); if ("error" in g) return g.error;
  return json(await prisma.team.findMany({ where: { roomId: g.room.id }, orderBy: { sortOrder: "asc" }, include: { owner: { select: { id: true, name: true, image: true, isGuest: true } }, _count: { select: { formerPlayers: true } } } }));
}
