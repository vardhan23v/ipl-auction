import { getSnapshot } from "@/server/auction-engine";
import { AuctioneerRoom } from "@/app/auctioneer/AuctioneerRoom";
export const dynamic = "force-dynamic";
export default async function AdminLive() { return <AuctioneerRoom initial={await getSnapshot()} isAdmin />; }
