import { prisma } from "@/lib/prisma";
import { loadRoomPage } from "@/lib/room-page";
import { PlayersTable } from "./PlayersTable";
export const dynamic = "force-dynamic";
export default async function Players({ params }: { params: Promise<{ code: string }> }) {
  const { room } = await loadRoomPage((await params).code, "host");
  const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, abbreviation: true, color: true } });
  return <PlayersTable title="Players & RTM lists" teams={teams} />;
}
