import { prisma } from "@/lib/prisma";
import { guard, json } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  const g = await guard("ADMIN"); if ("error" in g) return g.error;
  return json(await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 300, select: { id: true, name: true, email: true, role: true, isGuest: true, createdAt: true, _count: { select: { hostedRooms: true, memberships: true } } } }));
}
