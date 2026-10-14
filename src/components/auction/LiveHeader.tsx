"use client";
import Link from "next/link";
import { useState } from "react";
import { STATE_LABEL } from "@/lib/format";
import type { AuctionSnapshot } from "@/types/auction";
import { useRoom, roomApi } from "../RoomContext";
export function LiveHeader({ snap, connected, clients }: { snap: AuctionSnapshot; connected: boolean; clients: number }) {
  const { code, access } = useRoom(); const [ending, setEnding] = useState(false);
  // The person who created the room (or a platform admin) can end the auction from anywhere, not just the host console.
  const canEnd = !!access && (access.isHost || access.isAdmin) && !["WAITING", "COMPLETED"].includes(snap.state);
  async function endAuction() {
    if (!window.confirm("End the auction now? Players still in the queue stay unsold and the results become final.")) return;
    setEnding(true);
    const r = await fetch(roomApi(code, "/control"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "COMPLETE" }) });
    if (!r.ok) window.alert((await r.json().catch(() => ({}))).error ?? "Could not end the auction");
    setEnding(false);
  }
  const live = !["WAITING", "COMPLETED", "PAUSED"].includes(snap.state);
  const rtm = snap.state.startsWith("RTM");
  const claimed = snap.teams.filter((t) => t.ownerId).length;
  return (
    <div className="glass sheen mb-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl px-3 py-2.5 text-xs sm:px-4 sm:text-sm">
      <div className="display truncate text-base font-bold tracking-widest sm:text-lg"><span className="text-gold">{snap.roomName}</span></div>
      <div className="flex items-center gap-2 font-bold"><span className={`inline-block h-2.5 w-2.5 rounded-full ${live ? (rtm ? "rtm-pulse bg-rtm" : "live-dot bg-live") : "bg-muted"}`} />{rtm ? "RTM" : live ? "LIVE" : STATE_LABEL[snap.state]}</div>
      <div className="text-muted">Left <span className="font-semibold text-ink">{snap.playersRemaining}/{snap.totalPlayers}</span></div>
      <div className="text-muted">Franchises <span className="font-semibold text-ink">{claimed}/{snap.teams.length}</span></div>
      <div className="ml-auto flex items-center gap-3">
        {canEnd && <button onClick={endAuction} disabled={ending} className="rounded-md border border-live/60 px-2 py-1 text-xs font-semibold text-live hover:bg-live/10" title="Only the room host can end the auction">■ End auction</button>}
        <Link href={`/r/${snap.roomCode}/display`} className="hidden rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-gold/60 hover:text-ink md:inline" title="Projector view">⛶ Big screen</Link>
        <div className="flex items-center gap-1.5 text-xs text-muted"><span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-live"}`} />{connected ? `${clients} here` : "Reconnecting…"}</div>
      </div>
    </div>
  );
}
