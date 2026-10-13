import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { json } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await getSession();
  if (!s?.user) return json([]);
  const rooms = await prisma.room.findMany({ where: { members: { some: { userId: s.user.id } } }, orderBy: { lastActiveAt: "desc" }, take: 30, select: { code: true, name: true, state: true, hostId: true, lastActiveAt: true, host: { select: { name: true } }, _count: { select: { members: true } }, teams: { where: { ownerId: s.user.id }, select: { abbreviation: true, color: true } } } });
  return json(rooms.map((r) => ({ code: r.code, name: r.name, state: r.state, isHost: r.hostId === s.user.id, host: r.host.name, members: r._count.members, myTeam: r.teams[0] ?? null, lastActiveAt: r.lastActiveAt })));
}
