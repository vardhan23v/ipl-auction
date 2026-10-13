"use client";
import { useEffect, useRef, useState } from "react";
import { money, ROLE_LABEL } from "@/lib/format";
import type { AuctionSnapshot } from "@/types/auction";
import { Timer } from "./Timer";
import { PlayerPhoto } from "../PlayerPhoto";

export function PlayerCard({ snap, remainingMs }: { snap: AuctionSnapshot; remainingMs: number }) {
  const p = snap.currentPlayer;
  const prevBid = useRef(snap.currentBid);
  const [bump, setBump] = useState(0);
  useEffect(() => { if (snap.currentBid !== prevBid.current) { prevBid.current = snap.currentBid; setBump((b) => b + 1); } }, [snap.currentBid]);
  const highest = snap.teams.find((t) => t.id === snap.highestTeamId);
  const rtmState = snap.state.startsWith("RTM");

  if (!p) {
    if (snap.state === "COMPLETED") {
      return (
        <div className="card flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
          <div className="display text-5xl text-gold">Auction Complete</div>
          <div className="mt-2 text-muted">All ten squads are finalised.</div>
          <a href="/results" className="btn-gold mt-6 !px-6 !py-3 text-base">View the final squads →</a>
        </div>
      );
    }
    return (
      <div className="card sheen relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden p-8 text-center">
        <div className="orb" style={{ left: "8%", top: "18%", width: 190, height: 190, background: "rgba(245,184,46,.16)" }} />
        <div className="orb" style={{ right: "6%", bottom: "10%", width: 240, height: 240, background: "rgba(255,46,77,.10)", animationDelay: "2.5s" }} />
        {[12, 30, 52, 70, 88].map((x, i) => <span key={x} className="ember" style={{ left: `${x}%`, animationDelay: `${i * 1.1}s` }} />)}
        <div className="relative mb-6 h-28 w-28">
          <svg viewBox="0 0 100 100" className="ring absolute inset-0 h-full w-full"><circle cx="50" cy="50" r="46" fill="none" stroke="#f5b82e" strokeWidth="2" strokeDasharray="10 14" opacity=".6" /></svg>
          <div className="floaty absolute inset-3 flex items-center justify-center rounded-full border border-gold/40 bg-panel-2"><span className="display text-3xl font-bold text-gold">IPL</span></div>
        </div>
        <div className={`display text-5xl md:text-6xl ${snap.state === "WAITING" ? "gold-text" : ""}`}>{snap.state === "WAITING" ? "Mega Auction 2026" : snap.state === "PAUSED" ? "Auction Paused" : "Next Player Coming Up"}</div>
        <div className="mt-2 text-sm text-muted">{snap.state === "WAITING" ? "The auctioneer will open the bidding shortly" : snap.state === "PAUSED" ? "Hold tight — bidding resumes shortly" : "Shuffling the deck"}<span className="dot1">.</span><span className="dot2">.</span><span className="dot3">.</span></div>
        <div className="mt-6 flex gap-6 text-center">
          <div><div className="display text-2xl text-gold">{snap.playersRemaining}</div><div className="text-[10px] uppercase tracking-wider text-muted">Remaining</div></div>
          <div><div className="display text-2xl text-emerald-400">{snap.soldCount}</div><div className="text-[10px] uppercase tracking-wider text-muted">Sold</div></div>
          <div><div className="display text-2xl text-live">{snap.unsoldCount}</div><div className="text-[10px] uppercase tracking-wider text-muted">Unsold</div></div>
        </div>
      </div>
    );
  }
  const stats = p.role === "BOWLER"
    ? [["Matches", p.matches], ["Wickets", p.wickets], ["Econ", p.economy ?? "—"], ["Best", p.bestBowling ?? "—"]]
    : p.role === "ALL_ROUNDER"
      ? [["Matches", p.matches], ["Runs", p.runs], ["Wickets", p.wickets], ["SR", p.strikeRate ?? "—"]]
      : [["Matches", p.matches], ["Runs", p.runs], ["Avg", p.average ?? "—"], ["SR", p.strikeRate ?? "—"]];
  return (
    <div key={p.id} className="card reveal sheen relative overflow-hidden p-5 md:p-7">
      {snap.state === "PAUSED" && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm"><div className="display text-4xl font-bold text-gold">PAUSED</div></div>}
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-2xl border border-line bg-panel-2 md:h-auto md:w-full md:min-h-[260px]">
          <PlayerPhoto src={p.photoUrl} name={p.name} className="h-full w-full object-cover object-top text-7xl" />
          {p.rating != null && <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-xs font-bold"><span className="text-gold">★</span> {p.rating}</div>}
          {p.previousTeamAbbr && <div className={`absolute bottom-2 left-2 right-2 rounded-md px-2 py-1 text-center text-[11px] font-bold ${p.rtmAvailable ? "bg-rtm text-white" : "bg-black/70 text-muted"}`}>RTM · {p.previousTeamAbbr}{p.rtmAvailable ? "" : " (n/a)"}</div>}
        </div>
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-widest text-gold">Now on the block · {p.set}</div>
              <h2 className="display text-4xl font-bold leading-none md:text-5xl">{p.name}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="chip font-semibold">{ROLE_LABEL[p.role]}</span>
                <span className={`chip ${p.overseas ? "text-sky-300" : ""}`}>{p.overseas ? "✈ Overseas" : "🇮🇳 Indian"}{p.nationality !== "India" && p.nationality !== "Overseas" ? ` · ${p.nationality}` : ""}</span>
                <span className="chip">{p.capped ? "Capped" : "Uncapped"}</span>
                {p.previousTeamName && <span className="chip text-rtm-2">Ex-{p.previousTeamName}</span>}
              </div>
            </div>
            {snap.timerRunning && !rtmState && <Timer ms={remainingMs} running total={snap.timerSeconds} />}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-muted">
            {stats.map(([l, v]) => <div key={String(l)} className="rounded-lg bg-panel-2 p-2"><div className="text-lg font-bold text-ink">{String(v)}</div>{l}</div>)}
          </div>
          <div className="mt-auto grid grid-cols-[1fr_2fr] items-end gap-4 pt-5">
            <div><div className="label">Base price</div><div className="display text-2xl">{money(p.basePrice)}</div></div>
            <div className="text-right">
              <div className="label">{rtmState ? "Price on the table" : "Current bid"}</div>
              <div key={bump} className={`display money text-5xl font-bold leading-none md:text-7xl ${bump ? "bump" : ""} ${snap.currentBid > 0 ? "bid-glow" : ""}`}>{snap.currentBid > 0 ? money(snap.currentBid) : "—"}</div>
              <div className="mt-1 text-sm">{highest ? <span className="font-bold uppercase tracking-wider" style={{ color: highest.color }}>{highest.name}</span> : <span className="text-muted">No bids yet</span>}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
