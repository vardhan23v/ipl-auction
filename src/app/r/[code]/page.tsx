import { prisma } from "@/lib/prisma";
import { loadRoomPage } from "@/lib/room-page";
import { getSnapshot } from "@/server/auction-engine";
import { RoomShell } from "./RoomShell";
import { Lobby } from "./Lobby";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) { const { code } = await params; return { title: `Room ${code.toUpperCase()}` }; }

export default async function RoomLobby({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { room, access, session } = await loadRoomPage(code, "any");
  const [teams, members, snap] = await Promise.all([
    prisma.team.findMany({ where: { roomId: room.id }, orderBy: { sortOrder: "asc" }, include: { owner: { select: { id: true, name: true, image: true, isGuest: true } }, _count: { select: { formerPlayers: true } } } }),
    prisma.roomMember.findMany({ where: { roomId: room.id }, orderBy: { joinedAt: "asc" }, include: { user: { select: { id: true, name: true, image: true, isGuest: true } } } }),
    getSnapshot(room.id),
  ]);
  return (
    <RoomShell room={room} access={access}>
      <Lobby code={room.code} room={{ name: room.name, state: room.state, isPublic: room.isPublic, hostName: room.host.name, hostId: room.hostId, maxSquad: room.maxSquadSize, purse: room.startingPurse, rtmCards: room.defaultRtmCards, timer: room.timerSeconds }} access={access}
        me={session?.user ? { id: session.user.id, name: session.user.name ?? "Manager" } : null} initial={snap}
        teams={teams.map((t) => ({ id: t.id, name: t.name, abbreviation: t.abbreviation, color: t.color, color2: t.color2, logoUrl: t.logoUrl, purse: t.purse, squadCount: t.squadCount, rtmTotal: t.rtmTotal, rtmUsed: t.rtmUsed, formerCount: t._count.formerPlayers, owner: t.owner ? { id: t.owner.id, name: t.owner.name, image: t.owner.image, isGuest: t.owner.isGuest } : null }))}
        members={members.map((m) => ({ id: m.user.id, name: m.user.name, image: m.user.image, isGuest: m.user.isGuest, role: m.role, team: teams.find((t) => t.ownerId === m.user.id)?.abbreviation ?? null }))} />
    </RoomShell>
  );
}
