import Link from "next/link";
import { STATE_LABEL } from "@/lib/format";
import type { AuctionSnapshot } from "@/types/auction";
export function LiveHeader({ snap, connected, clients }: { snap: AuctionSnapshot; connected: boolean; clients: number }) {
  const live = !["WAITING", "COMPLETED", "PAUSED"].includes(snap.state);
  const rtm = snap.state.startsWith("RTM");
  const active = snap.teams.filter((t) => t.squadCount < t.maxSquad).length;
  return (
    <div className="glass sheen mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl px-4 py-3 text-sm">
      <div className="display text-lg font-bold tracking-widest"><span className="text-gold">IPL</span> Mega Auction</div>
      <div className="flex items-center gap-2 font-bold"><span className={`inline-block h-2.5 w-2.5 rounded-full ${live ? (rtm ? "rtm-pulse bg-rtm" : "live-dot bg-live") : "bg-muted"}`} />{rtm ? "RTM" : live ? "LIVE" : snap.state}</div>
      <div className="text-muted">Status <span className="font-semibold text-ink">{STATE_LABEL[snap.state] ?? snap.state}</span></div>
      <div className="text-muted">Remaining <span className="font-semibold text-ink">{snap.playersRemaining} / {snap.totalPlayers}</span></div>
      <div className="text-muted">Franchises active <span className="font-semibold text-ink">{active}/{snap.teams.length}</span></div>
      <Link href="/display" className="ml-auto rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-gold/60 hover:text-ink" title="Projector view">⛶ Big screen</Link>
      <div className="flex items-center gap-2 text-xs text-muted"><span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-live"}`} />{connected ? `Connected · ${clients} watching` : "Reconnecting…"}</div>
    </div>
  );
}
