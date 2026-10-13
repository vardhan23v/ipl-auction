import { prisma } from "@/lib/prisma";
import { guard, json } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  const g = await guard("ADMIN"); if ("error" in g) return g.error;
  return json(await prisma.room.findMany({ orderBy: { lastActiveAt: "desc" }, take: 200, select: { id: true, code: true, name: true, state: true, isPublic: true, createdAt: true, lastActiveAt: true, host: { select: { name: true, email: true } }, _count: { select: { members: true, players: true } } } }));
}
