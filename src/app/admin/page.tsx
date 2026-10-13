import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
import { getStats } from "@/lib/queries";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Overview() {
  const [st, a, recent, remaining] = await Promise.all([getStats(), prisma.auction.findUnique({ where: { id: 1 } }), prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { user: { select: { name: true } } } }), prisma.player.count({ where: { status: { in: ["POOL", "WAITING"] } } })]);
  const cur = a?.currentPlayerId ? await prisma.player.findUnique({ where: { id: a.currentPlayerId } }) : null;
  const tiles = [["Franchises", st.teams.length], ["Players in pool", st.totalPlayers], ["Sold", st.sold], ["Unsold", st.unsold], ["Remaining", remaining], ["Money spent", money(st.totalSpent)], ["RTM matches", st.rtmSales], ["Current player", cur?.name ?? "—"], ["Auction status", a?.state ?? "WAITING"]];
  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="display text-4xl">Overview</h1><Link href="/admin/live" className="btn-red">Open auction console</Link></div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">{tiles.map(([l, v]) => <div key={String(l)} className="card p-4"><div className="text-[11px] uppercase tracking-wider text-muted">{l}</div><div className="display mt-1 truncate text-2xl text-gold">{v}</div></div>)}</div>
      <h2 className="display mt-8 text-2xl">Audit log</h2>
      <div className="card mt-2 divide-y divide-line/50 text-sm">{recent.map((r) => <div key={r.id} className="flex justify-between p-2"><span><b>{r.user?.name ?? "system"}</b> · {r.action} {r.entity && <span className="text-muted">{r.entity}</span>}</span><span className="text-muted">{r.createdAt.toLocaleString()}</span></div>)}{recent.length === 0 && <div className="p-4 text-muted">No activity yet.</div>}</div>
    </div>
  );
}
