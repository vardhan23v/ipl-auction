import { loadRoomPage } from "@/lib/room-page";
import { getSnapshot } from "@/server/auction-engine";
import { AuctionRoom } from "@/components/auction/AuctionRoom";
import { RoomShell } from "../RoomShell";
import { OwnerRoom } from "../owner/OwnerRoom";
export const dynamic = "force-dynamic";
export const metadata = { title: "Live" };
export default async function Live({ params }: { params: Promise<{ code: string }> }) {
  const { room, access } = await loadRoomPage((await params).code, "any");
  const snap = await getSnapshot(room.id);
  // Managers (franchise owners) bid right here, crickauction-style; everyone else watches.
  return <RoomShell room={room} access={access}>{access.teamId ? <OwnerRoom code={room.code} access={access} initial={snap} teamId={access.teamId} /> : <AuctionRoom code={room.code} access={access} initial={snap} myTeamId={null} />}</RoomShell>;
}
