"use client";
import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { money, ROLE_LABEL } from "@/lib/format";
import type { AuctionSnapshot } from "@/types/auction";
import { useCountdown } from "@/hooks/useNow";
import { SnapTimer } from "./Timer";
import { PlayerPhoto } from "../PlayerPhoto";

/** "Next player in 3…" while the result shows between players. Only this ticks. */
function NextIn({ at }: { at: number | null }) {
  const ms = useCountdown(at);
  if (!at) return null;
  return <span className="tabular-nums">Next player in {Math.max(1, Math.ceil(ms / 1000))}…</span>;
}

/** The single hero card: who's on the block, the clock and the current bid — or the result between players. */
export const PlayerCard = memo(function PlayerCard({ snap }: { snap: AuctionSnapshot }) {
  const p = snap.currentPlayer;
  const prevBid = useRef(snap.currentBid);
  const [bump, setBump] = useState(0);
  useEffect(() => { if (snap.currentBid !== prevBid.current) { prevBid.current = snap.currentBid; setBump((b) => b + 1); } }, [snap.currentBid]);
  const highest = snap.teams.find((t) => t.id === snap.highestTeamId);
  const st = snap.state;

  if (!p) {
    const title = st === "COMPLETED" ? "Auction complete" : st === "WAITING" ? "Waiting for the host" : st === "PAUSED" ? "Auction paused" : "Next player coming up";
    return (
      <div className="card flex min-h-[220px] flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="display text-3xl">{title}</div>
        <div className="text-sm text-muted">{snap.soldCount} sold · {snap.unsoldCount} unsold · {snap.playersRemaining} {st === "COMPLETED" ? "not auctioned" : "to go"}</div>
        {st === "COMPLETED" && <Link href={`/r/${snap.roomCode}/results`} className="btn-gold tap mt-3">See the final squads</Link>}
      </div>
    );
  }

  const paused = st === "PAUSED", rtm = st.startsWith("RTM");
  // Paused between players keeps showing the result of the last lot.
  const sold = st === "SOLD" || (paused && p.status === "SOLD"), unsold = st === "UNSOLD" || (paused && p.status === "UNSOLD");
  const stats = p.role === "BOWLER"
    ? [["Mat", p.matches], ["Wkts", p.wickets], ["Econ", p.economy ?? "—"]]
    : p.role === "ALL_ROUNDER" ? [["Mat", p.matches], ["Runs", p.runs], ["Wkts", p.wickets]]
      : [["Mat", p.matches], ["Runs", p.runs], ["SR", p.strikeRate ?? "—"]];
  return (
    <div key={p.id} className="card reveal relative overflow-hidden p-4 md:p-6">
      <div className="flex gap-4">
        <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-panel-2 md:h-40 md:w-32">
          <PlayerPhoto src={p.photoUrl} name={p.name} sizes="(min-width: 768px) 128px, 96px" className="h-full w-full object-cover object-top text-4xl" />
          {p.previousTeamAbbr && <div className={`absolute inset-x-1 bottom-1 rounded-md px-1 py-0.5 text-center text-xs font-bold ${p.rtmAvailable ? "bg-rtm text-white" : "bg-black/70 text-muted"}`}>RTM {p.previousTeamAbbr}</div>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold uppercase tracking-widest text-muted">{p.set}</div>
              <h2 className="display text-2xl leading-tight md:text-4xl">{p.name}</h2>
              <div className="mt-1 text-sm text-muted">{ROLE_LABEL[p.role]} · {p.overseas ? `✈ ${p.nationality}` : "India"}{p.rating != null ? ` · ★ ${p.rating}` : ""}</div>
            </div>
            {st === "PLAYER_LIVE" && snap.timerRunning && <div className="shrink-0"><SnapTimer snap={snap} size="sm" /></div>}
          </div>
          <div className="mt-auto flex gap-4 pt-3 text-sm">
            {stats.map(([l, v]) => <div key={String(l)}><div className="font-semibold">{String(v)}</div><div className="text-xs text-muted">{l}</div></div>)}
            <div><div className="font-semibold">{money(p.basePrice)}</div><div className="text-xs text-muted">Base</div></div>
          </div>
        </div>
      </div>

      {sold || unsold ? (
        <div className={`mt-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${sold ? "bg-emerald-500/15" : "bg-live/15"}`}>
          <div className="min-w-0">
            <div className={`display text-2xl ${sold ? "text-emerald-400" : "text-live"}`}>{sold ? "Sold" : "Unsold"}</div>
            <div className="truncate text-sm">{sold && highest ? <><b style={{ color: highest.color }}>{highest.name}</b> · <span className="money font-bold">{money(snap.currentBid)}</span></> : "No bids"}</div>
          </div>
          <div className="shrink-0 text-right text-sm text-muted">{paused ? "Paused" : <NextIn at={snap.nextPlayerAt} />}</div>
        </div>
      ) : (
        <div className="mt-4 flex items-end justify-between gap-3 rounded-xl bg-panel-2/70 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted">{rtm ? "Price on the table" : paused ? "Paused at" : "Current bid"}</div>
            <div className="truncate text-sm">{highest ? <b className="uppercase tracking-wide" style={{ color: highest.color }}>{highest.name}</b> : <span className="text-muted">No bids yet</span>}</div>
          </div>
          <div key={bump} className={`display money shrink-0 text-4xl leading-none md:text-5xl ${bump ? "bump" : ""}`}>{snap.currentBid > 0 ? money(snap.currentBid) : "—"}</div>
        </div>
      )}
    </div>
  );
});
