import { Nav } from "@/components/Nav";
import { getStats } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { Charts } from "./Charts";
export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };
export default async function Analytics() {
  const st = await getStats();
  const [roles, squads, bidsByTeam, prices] = await Promise.all([
    prisma.player.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.squadPlayer.findMany({ include: { player: { select: { role: true, overseas: true } }, team: { select: { abbreviation: true } } } }),
    prisma.bid.groupBy({ by: ["teamId"], _count: { _all: true } }),
    prisma.player.findMany({ where: { status: "SOLD" }, select: { name: true, soldPrice: true }, orderBy: { soldPrice: "desc" }, take: 15 }),
  ]);
  const tiles = [["Players in pool", st.totalPlayers], ["Sold", st.sold], ["Unsold", st.unsold], ["Money spent", money(st.totalSpent)], ["Average price", money(st.avgPrice)], ["Highest bid", money(st.highestBid)], ["RTM matches", st.rtmSales], ["Top spender", st.topSpender?.abbreviation ?? "—"], ["Most expensive", st.mostExpensive ? `${st.mostExpensive.name} (${money(st.mostExpensive.soldPrice)})` : "—"], ["Most active", st.mostActive ? `${st.mostActive.abbreviation} (${st.mostActive.bids} bids)` : "—"]];
  const data = {
    teams: [...st.teams].sort((a, b) => a.sortOrder - b.sortOrder).map((t) => ({ name: t.abbreviation, color: t.color, spent: t.spent, purse: t.purse, bids: bidsByTeam.find((b) => b.teamId === t.id)?._count._all ?? 0, overseas: squads.filter((s) => s.team.abbreviation === t.abbreviation && s.player.overseas).length })),
    roles: roles.map((r) => ({ name: r.role, value: r._count._all })),
    squads: [...st.teams].sort((a, b) => a.sortOrder - b.sortOrder).map((t) => { const s = squads.filter((x) => x.team.abbreviation === t.abbreviation); return { name: t.abbreviation, BATSMAN: s.filter((x) => x.player.role === "BATSMAN").length, BOWLER: s.filter((x) => x.player.role === "BOWLER").length, ALL_ROUNDER: s.filter((x) => x.player.role === "ALL_ROUNDER").length, WICKETKEEPER: s.filter((x) => x.player.role === "WICKETKEEPER").length }; }),
    prices: prices.map((p) => ({ name: p.name, price: p.soldPrice ?? 0 })),
  };
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="display text-5xl">Analytics</h1>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">{tiles.map(([l, v]) => <div key={String(l)} className="card p-4"><div className="text-[11px] uppercase tracking-wider text-muted">{l}</div><div className="display mt-1 truncate text-2xl text-gold">{v}</div></div>)}</div>
        <Charts data={data} />
      </main>
    </>
  );
}
