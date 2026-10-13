import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { RoomsHub } from "./RoomsHub";
export const dynamic = "force-dynamic";
export const metadata = { title: "My rooms" };

export default async function RoomsPage() {
  const s = await getSession();
  if (!s?.user) redirect("/login?next=/rooms");
  const me = s.user.id;
  const rooms = await prisma.room.findMany({
    where: { members: { some: { userId: me } } },
    orderBy: { lastActiveAt: "desc" },
    take: 30,
    select: { code: true, name: true, state: true, hostId: true, lastActiveAt: true, host: { select: { name: true } }, _count: { select: { members: true } }, teams: { where: { ownerId: me }, select: { abbreviation: true, color: true } } },
  });
  return (
    <RoomsHub
      user={{ id: me, name: s.user.name ?? "Manager" }}
      rooms={rooms.map((r) => ({ code: r.code, name: r.name, state: r.state, isHost: r.hostId === me, host: r.host.name, members: r._count.members, myTeam: r.teams[0] ?? null, lastActiveAt: r.lastActiveAt.toISOString() }))}
    />
  );
}
