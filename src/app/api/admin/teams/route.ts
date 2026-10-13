import { prisma } from "@/lib/prisma";
import { json } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  return json(await prisma.team.findMany({ orderBy: { sortOrder: "asc" }, include: { owner: { select: { id: true, name: true, email: true } }, _count: { select: { formerPlayers: true } } } }));
}
