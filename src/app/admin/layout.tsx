import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Nav } from "@/components/Nav";
const items = [["Overview", "/admin"], ["Live Console", "/admin/live"], ["Franchises", "/admin/teams"], ["Players & RTM lists", "/admin/players"], ["Auction Queue", "/admin/queue"], ["Sold", "/admin/sold"], ["Unsold / Skipped", "/admin/unsold"], ["Bids & Events", "/admin/bids"], ["Analytics", "/analytics"], ["Users", "/admin/users"], ["Settings", "/admin/settings"]];
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s?.user || s.user.role !== "ADMIN") redirect("/login");
  return (
    <>
      <Nav />
      <div className="mx-auto flex max-w-[1400px] gap-4 px-4 py-4">
        <aside className="hidden w-48 shrink-0 lg:block"><nav className="card sticky top-20 flex flex-col p-2">{items.map(([l, h]) => <Link key={h} href={h} className="rounded-md px-3 py-2 text-sm hover:bg-panel-2">{l}</Link>)}</nav></aside>
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex gap-1 overflow-x-auto lg:hidden">{items.map(([l, h]) => <Link key={h} href={h} className="whitespace-nowrap rounded-md bg-panel-2 px-3 py-1 text-xs">{l}</Link>)}</div>
          {children}
        </div>
      </div>
    </>
  );
}
