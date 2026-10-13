import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { getSession } from "@/lib/auth";
import { getSnapshot } from "@/server/auction-engine";
import { AuctioneerRoom } from "./AuctioneerRoom";
export const dynamic = "force-dynamic";
export const metadata = { title: "Auctioneer" };
export default async function AuctioneerPage() {
  const s = await getSession();
  if (!s?.user || !["ADMIN", "AUCTIONEER"].includes(s.user.role)) redirect("/login");
  return (<><Nav /><AuctioneerRoom initial={await getSnapshot()} isAdmin={s.user.role === "ADMIN"} /></>);
}
