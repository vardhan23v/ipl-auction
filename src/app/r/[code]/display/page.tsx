import { loadRoomPage } from "@/lib/room-page";
import { getSnapshot } from "@/server/auction-engine";
import { DisplayScreen } from "./DisplayScreen";
export const dynamic = "force-dynamic";
export const metadata = { title: "Big Screen" };
export default async function DisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const { room } = await loadRoomPage((await params).code, "any");
  return <DisplayScreen code={room.code} initial={await getSnapshot(room.id)} />;
}
