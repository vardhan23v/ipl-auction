"use client";
import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { money, ROLE_LABEL } from "@/lib/format";
import type { AuctionSnapshot } from "@/types/auction";
import { SnapTimer } from "./Timer";
import { PlayerPhoto } from "../PlayerPhoto";

/**
 * The player on the block. Phones get a compact card (photo beside the name, small clock, bid as the hero line)
 * so the whole thing fits above the bid dock; md+ keeps the broadcast-style layout.
 */
export const PlayerCard = memo(function PlayerCard({ snap }: { snap: AuctionSnapshot }) {
  const p = snap.currentPlayer;
  const prevBid = useRef(snap.currentBid);
  const [bump, setBump] = useState(0);
  useEffect(() => { if (snap.currentBid !== prevBid.current) { prevBid.current = snap.currentBid; setBump((b) => b + 1); } }, [snap.currentBid]);
  const highest = snap.teams.find((t) => t.id === snap.highestTeamId);
  const rtmState = snap.state.startsWith("RTM");

  if (!p) {
    if (snap.state === "COMPLETED") {
      return (
        <div className="card flex min-h-[220px] flex-col items-center justify-center p-6 text-center md:min-h-[360px] md:p-8">
          <div className="display text-3xl text-gold md:text-5xl">Auction Complete</div>
          <div className="mt-2 text-muted">All squads are finalised.</div>
          <Link href={`/r/${snap.roomCode}/results`} className="btn-gold mt-6 !px-6 !py-3 text-base">View the final squads →</Link>
        </div>
      );
    }
    return (
      <div className="card sheen relative flex min-h-[240px] flex-col items-center justify-center overflow-hidden p-6 text-center md:min-h-[400px] md:p-8">
        <div className="orb" style={{ left: "8%", top: "18%", width: 190, height: 190, background: "rgba(245,184,46,.16)" }} />
        <div className="orb" style={{ right: "6%", bottom: "10%", width: 240, height: 240, background: "rgba(255,46,77,.10)", animationDelay: "2.5s" }} />
        {[12, 30, 52, 70, 88].map((x, i) => <span key={x} className="ember" style={{ left: `${x}%`, animationDelay: `${i * 1.1}s` }} />)}
        <div className="relative mb-4 h-20 w-20 md:mb-6 md:h-28 md:w-28">
          <svg viewBox="0 0 100 100" className="ring absolute inset-0 h-full w-full"><circle cx="50" cy="50" r="46" fill="none" stroke="#f5b82e" strokeWidth="2" strokeDasharray="10 14" opacity=".6" /></svg>
          <div className="floaty absolute inset-3 flex items-center justify-center rounded-full border border-gold/40 bg-panel-2"><span className="display text-2xl font-bold text-gold md:text-3xl">IPL</span></div>
        </div>
        <div className={`display text-3xl md:text-6xl ${snap.state === "WAITING" ? "gold-text" : ""}`}>{snap.state === "WAITING" ? "Mega Auction 2026" : snap.state === "PAUSED" ? "Auction Paused" : "Next Player Coming Up"}</div>
        <div className="mt-2 text-sm text-muted">{snap.state === "WAITING" ? "The auctioneer will open the bidding shortly" : snap.state === "PAUSED" ? "Hold tight — bidding resumes shortly" : "Shuffling the deck"}<span className="dot1">.</span><span className="dot2">.</span><span className="dot3">.</span></div>
        <div className="mt-5 flex gap-6 text-center">
          <div><div className="display text-2xl text-gold">{snap.playersRemaining}</div><div className="text-xs uppercase tracking-wider text-muted">Remaining</div></div>
          <div><div className="display text-2xl text-emerald-400">{snap.soldCount}</div><div className="text-xs uppercase tracking-wider text-muted">Sold</div></div>
          <div><div className="display text-2xl text-live">{snap.unsoldCount}</div><div className="text-xs uppercase tracking-wider text-muted">Unsold</div></div>
        </div>
      </div>
    );
  }
  const stats = p.role === "BOWLER"
    ? [["Mat", p.matches], ["Wkts", p.wickets], ["Econ", p.economy ?? "—"], ["Best", p.bestBowling ?? "—"]]
    : p.role === "ALL_ROUNDER"
      ? [["Mat", p.matches], ["Runs", p.runs], ["Wkts", p.wickets], ["SR", p.strikeRate ?? "—"]]
      : [["Mat", p.matches], ["Runs", p.runs], ["Avg", p.average ?? "—"], ["SR", p.strikeRate ?? "—"]];
  const showClock = snap.timerRunning && !rtmState;
  return (
    <div key={p.id} className="card reveal sheen relative overflow-hidden p-3 md:p-7">
      {snap.state === "PAUSED" && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm"><div className="display text-4xl font-bold text-gold">PAUSED</div></div>}
      <div className="grid grid-cols-[88px_1fr] gap-3 md:grid-cols-[220px_1fr] md:gap-6">
        <div className="relative h-[112px] w-[88px] overflow-hidden rounded-xl border border-line bg-panel-2 md:h-auto md:min-h-[260px] md:w-full md:rounded-2xl">
          <PlayerPhoto src={p.photoUrl} name={p.name} sizes="(min-width: 768px) 220px, 88px" className="h-full w-full object-cover object-top text-5xl md:text-7xl" />
          {p.rating != null && <div className="absolute left-1 top-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-bold md:left-2 md:top-2 md:px-2 md:py-1"><span className="text-gold">★</span> {p.rating}</div>}
          {p.previousTeamAbbr && <div className={`absolute bottom-1 left-1 right-1 rounded-md px-1 py-0.5 text-center text-xs font-bold md:bottom-2 md:left-2 md:right-2 md:px-2 md:py-1 ${p.rtmAvailable ? "bg-rtm text-white" : "bg-black/70 text-muted"}`}>RTM · {p.previousTeamAbbr}<span className="hidden md:inline">{p.rtmAvailable ? "" : " (n/a)"}</span></div>}
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-2 md:gap-3">
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold uppercase tracking-widest text-gold"><span className="hidden md:inline">Now on the block · </span>{p.set}</div>
              <h2 className="display text-2xl font-bold leading-none md:text-5xl">{p.name}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs md:gap-2">
                <span className="chip font-semibold">{ROLE_LABEL[p.role]}</span>
                <span className={`chip ${p.overseas ? "text-sky-300" : ""}`}>{p.overseas ? "✈ " : "🇮🇳 "}{p.nationality !== "Overseas" ? p.nationality : "Overseas"}</span>
                <span className="chip hidden sm:inline-flex">{p.capped ? "Capped" : "Uncapped"}</span>
                {p.previousTeamName && <span className="chip hidden text-rtm-2 md:inline-flex">Ex-{p.previousTeamName}</span>}
              </div>
            </div>
            {showClock && <><div className="shrink-0 md:hidden"><SnapTimer snap={snap} size="sm" /></div><div className="hidden shrink-0 md:block"><SnapTimer snap={snap} /></div></>}
          </div>
          <div className="mt-3 hidden grid-cols-4 gap-2 text-center text-xs text-muted md:grid">
            {stats.map(([l, v]) => <div key={String(l)} className="rounded-lg bg-panel-2 p-2"><div className="text-lg font-bold text-ink">{String(v)}</div>{l}</div>)}
          </div>
          <div className="mt-auto hidden grid-cols-[1fr_2fr] items-end gap-4 pt-5 md:grid">
            <div><div className="label">Base price</div><div className="display text-2xl">{money(p.basePrice)}</div></div>
            <div className="text-right">
              <div className="label">{rtmState ? "Price on the table" : "Current bid"}</div>
              <div key={bump} className={`display money text-5xl font-bold leading-none md:text-7xl ${bump ? "bump" : ""} ${snap.currentBid > 0 ? "bid-glow" : ""}`}>{snap.currentBid > 0 ? money(snap.currentBid) : "—"}</div>
              <div className="mt-1 text-sm">{highest ? <span className="font-bold uppercase tracking-wider" style={{ color: highest.color }}>{highest.name}</span> : <span className="text-muted">No bids yet</span>}</div>
            </div>
          </div>
        </div>
      </div>
      {/* phone: stats strip + bid hero line */}
      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-xs text-muted md:hidden">
        {stats.map(([l, v]) => <div key={String(l)} className="rounded-lg bg-panel-2 px-1 py-1.5"><div className="truncate text-sm font-bold text-ink">{String(v)}</div>{l}</div>)}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3 rounded-xl bg-panel-2/70 px-3 py-2.5 md:hidden">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted">{rtmState ? "Price on table" : "Current bid"} · base {money(p.basePrice)}</div>
          <div className="truncate text-sm">{highest ? <span className="font-bold uppercase tracking-wider" style={{ color: highest.color }}>{highest.name}</span> : <span className="text-muted">No bids yet</span>}</div>
        </div>
        <div key={bump} className={`display money shrink-0 text-4xl font-bold leading-none ${bump ? "bump" : ""}`}>{snap.currentBid > 0 ? money(snap.currentBid) : "—"}</div>
      </div>
    </div>
  );
});
