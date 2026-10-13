import { prisma } from "@/lib/prisma";
import { roomGuard, json } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "any"); if ("error" in g) return g.error;
  const [events, bids] = await Promise.all([
    prisma.auctionEvent.findMany({ where: { roomId: g.room.id }, orderBy: { createdAt: "desc" }, take: 150, include: { player: { select: { name: true } }, team: { select: { abbreviation: true, color: true } } } }),
    prisma.bid.findMany({ where: { roomId: g.room.id }, orderBy: { createdAt: "desc" }, take: 150, include: { player: { select: { name: true } }, team: { select: { abbreviation: true, color: true } }, user: { select: { name: true } } } }),
  ]);
  return json({ events, bids });
}
