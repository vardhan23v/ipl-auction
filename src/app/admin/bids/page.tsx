import { prisma } from "@/lib/prisma";
import { money } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function Bids() {
  const [bids, events] = await Promise.all([
    prisma.bid.findMany({ orderBy: { createdAt: "desc" }, take: 150, include: { player: { select: { name: true } }, team: { select: { abbreviation: true, color: true } }, user: { select: { name: true } } } }),
    prisma.auctionEvent.findMany({ orderBy: { createdAt: "desc" }, take: 150, include: { player: { select: { name: true } }, team: { select: { abbreviation: true, color: true } } } }),
  ]);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div><h1 className="display text-4xl">Bid log</h1><div className="card mt-3 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-panel-2 text-left text-xs uppercase text-muted"><tr><th className="p-2">Time</th><th className="p-2">Player</th><th className="p-2">Franchise</th><th className="p-2">Amount</th><th className="p-2">Kind</th><th className="p-2">By</th></tr></thead><tbody>{bids.map((b) => <tr key={b.id} className="border-t border-line/50"><td className="p-2 text-muted">{b.createdAt.toLocaleTimeString()}</td><td className="p-2">{b.player.name}</td><td className="p-2" style={{ color: b.team.color }}>{b.team.abbreviation}</td><td className="money p-2 font-bold">{money(b.amount)}</td><td className="p-2 text-xs text-muted">{b.kind}</td><td className="p-2 text-muted">{b.user?.name ?? "—"}</td></tr>)}{bids.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted">No bids yet.</td></tr>}</tbody></table></div></div>
      <div><h1 className="display text-4xl">Events</h1><div className="card mt-3 divide-y divide-line/50 text-sm">{events.map((e) => <div key={e.id} className={`flex items-center justify-between p-2 ${e.undone ? "opacity-50 line-through" : ""}`}><span><b className={e.type.startsWith("RTM") ? "text-rtm-2" : ""}>{e.type}</b> {e.player?.name && <span className="text-muted">· {e.player.name}</span>} {e.team && <span style={{ color: e.team.color }}>· {e.team.abbreviation}</span>} {e.amount != null && <span className="money">· {money(e.amount)}</span>}</span><span className="text-xs text-muted">{e.createdAt.toLocaleTimeString()}</span></div>)}{events.length === 0 && <div className="p-6 text-center text-muted">No events yet.</div>}</div></div>
    </div>
  );
}
