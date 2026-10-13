import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { loadRoomPage } from "@/lib/room-page";
import { money } from "@/lib/format";
import { RoomShell } from "../RoomShell";
export const dynamic = "force-dynamic";
export const metadata = { title: "History" };
export default async function History({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ team?: string }> }) {
  const { room, access } = await loadRoomPage((await params).code, "any");
  const { team } = await searchParams;
  const [teams, rows] = await Promise.all([
    prisma.team.findMany({ where: { roomId: room.id }, orderBy: { sortOrder: "asc" } }),
    prisma.player.findMany({ where: { roomId: room.id, status: { in: ["SOLD", "UNSOLD", "SKIPPED"] }, ...(team ? { soldToId: team } : {}) }, orderBy: { updatedAt: "desc" }, include: { soldTo: true, squadEntry: { select: { viaRtm: true } }, _count: { select: { bids: true } } } }),
  ]);
  const base = `/r/${room.code}/history`;
  return (
    <RoomShell room={room} access={access}>
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3"><h1 className="display text-4xl md:text-5xl">Auction History</h1>
          <div className="scroll-x flex gap-1 text-sm"><Link href={base} className={`shrink-0 rounded-md px-3 py-1 ${!team ? "bg-gold text-black" : "bg-panel-2"}`}>All</Link>{teams.map((t) => <Link key={t.id} href={`${base}?team=${t.id}`} className={`shrink-0 rounded-md px-3 py-1 ${team === t.id ? "bg-gold text-black" : "bg-panel-2"}`}>{t.abbreviation}</Link>)}</div></div>
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-panel-2 text-left text-xs uppercase text-muted"><tr><th className="p-3">Player</th><th className="p-3">Set</th><th className="p-3">Base</th><th className="p-3">Franchise</th><th className="p-3">Price</th><th className="p-3">Bids</th><th className="p-3">Time</th><th className="p-3">Status</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted">Nothing yet.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line/50">
                  <td className="p-3 font-semibold">{r.name}{r.overseas && <span className="ml-1 text-xs text-sky-300">✈</span>}</td><td className="p-3 text-muted">{r.set}</td><td className="p-3">{money(r.basePrice)}</td>
                  <td className="p-3" style={{ color: r.soldTo?.color }}>{r.soldTo?.name ?? "—"}{r.squadEntry?.viaRtm && <span className="ml-1 rounded bg-rtm/20 px-1 text-[9px] font-bold text-rtm-2">RTM</span>}</td>
                  <td className="money p-3 font-bold">{r.soldPrice ? money(r.soldPrice) : "—"}</td><td className="p-3">{r._count.bids}</td>
                  <td className="p-3 text-muted">{(r.soldAt ?? r.updatedAt).toLocaleTimeString()}</td>
                  <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs font-bold ${r.status === "SOLD" ? "bg-emerald-500/20 text-emerald-400" : "bg-live/20 text-live"}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </RoomShell>
  );
}
