import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { loadRoomPage } from "@/lib/room-page";
import { getStats } from "@/lib/queries";
import { money } from "@/lib/format";
import { DangerZone } from "./DangerZone";
export const dynamic = "force-dynamic";
export default async function Overview({ params }: { params: Promise<{ code: string }> }) {
  const { room } = await loadRoomPage((await params).code, "host");
  const [st, remaining, members, events] = await Promise.all([getStats(room.id), prisma.player.count({ where: { roomId: room.id, status: { in: ["POOL", "WAITING"] } } }), prisma.roomMember.count({ where: { roomId: room.id } }), prisma.auctionEvent.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "desc" }, take: 10, include: { player: { select: { name: true } }, team: { select: { abbreviation: true, color: true } } } })]);
  const cur = room.currentPlayerId ? await prisma.player.findUnique({ where: { id: room.currentPlayerId } }) : null;
  const tiles = [["Members", members], ["Franchises claimed", st.teams.filter((t) => t.ownerId).length], ["Players in pool", st.totalPlayers], ["Sold", st.sold], ["Unsold", st.unsold], ["Remaining", remaining], ["Money spent", money(st.totalSpent)], ["RTM matches", st.rtmSales], ["Current player", cur?.name ?? "—"], ["Status", room.state]];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="display text-3xl md:text-4xl">Manage · {room.name}</h1><Link href={`/r/${room.code}/host`} className="btn-red">Open host console</Link></div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">{tiles.map(([l, v]) => <div key={String(l)} className="card p-4"><div className="text-[11px] uppercase tracking-wider text-muted">{l}</div><div className="display mt-1 truncate text-2xl text-gold">{v}</div></div>)}</div>
      <h2 className="display mt-8 text-2xl">Latest events</h2>
      <div className="card mt-2 divide-y divide-line/50 text-sm">{events.map((e) => <div key={e.id} className="flex justify-between p-2"><span><b>{e.type}</b> {e.player?.name && <span className="text-muted">· {e.player.name}</span>} {e.team && <span style={{ color: e.team.color }}>· {e.team.abbreviation}</span>} {e.amount != null && <span className="money">· {money(e.amount)}</span>}</span><span className="text-muted">{e.createdAt.toLocaleTimeString()}</span></div>)}{events.length === 0 && <div className="p-4 text-muted">No activity yet.</div>}</div>
      <DangerZone code={room.code} />
    </div>
  );
}
