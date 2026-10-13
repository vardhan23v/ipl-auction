import { prisma } from "@/lib/prisma";
import { guard, json } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  const g = await guard("ADMIN", "AUCTIONEER"); if ("error" in g) return g.error;
  return json(await prisma.auctionEvent.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { player: { select: { name: true } }, team: { select: { abbreviation: true, color: true } } } }));
}
