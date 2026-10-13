import { loadRoomPage } from "@/lib/room-page";
import { getSnapshot } from "@/server/auction-engine";
import { RoomShell } from "../RoomShell";
import { HostRoom } from "./HostRoom";
export const dynamic = "force-dynamic";
export const metadata = { title: "Host Console" };
export default async function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { room, access } = await loadRoomPage((await params).code, "host");
  return <RoomShell room={room} access={access}><HostRoom code={room.code} access={access} initial={await getSnapshot(room.id)} /></RoomShell>;
}
