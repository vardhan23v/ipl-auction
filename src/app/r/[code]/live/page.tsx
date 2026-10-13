import { loadRoomPage } from "@/lib/room-page";
import { getSnapshot } from "@/server/auction-engine";
import { AuctionRoom } from "@/components/auction/AuctionRoom";
import { RoomShell } from "../RoomShell";
export const dynamic = "force-dynamic";
export const metadata = { title: "Live" };
export default async function Live({ params }: { params: Promise<{ code: string }> }) {
  const { room, access } = await loadRoomPage((await params).code, "any");
  return <RoomShell room={room} access={access}><AuctionRoom code={room.code} access={access} initial={await getSnapshot(room.id)} myTeamId={access.teamId} /></RoomShell>;
}
