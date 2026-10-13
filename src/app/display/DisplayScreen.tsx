"use client";
/** Fullscreen broadcast view for the projector on auction night. */
import { useEffect, useState } from "react";
import { useAuction } from "@/hooks/useAuction";
import { money, ROLE_LABEL, mmss, STATE_LABEL } from "@/lib/format";
import { TeamBadge } from "@/components/TeamBadge";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { ConnectionOverlay } from "@/components/ConnectionOverlay";
import type { AuctionSnapshot } from "@/types/auction";

export function DisplayScreen({ initial }: { initial: AuctionSnapshot }) {
  const a = useAuction(initial);
  const [clock, setClock] = useState("");
  useEffect(() => { const t = setInterval(() => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })), 1000); return () => clearInterval(t); }, []);
  if (!a.snap) return null;
  const s = a.snap; const p = s.currentPlayer; const highest = s.teams.find((t) => t.id === s.highestTeamId);
  const sec = Math.ceil(a.remainingMs / 1000); const live = !["WAITING", "COMPLETED", "PAUSED"].includes(s.state); const rtm = s.state.startsWith("RTM");
  return (
    <div className="stadium fixed inset-0 flex flex-col overflow-hidden bg-pitch">
      <ConnectionOverlay size="big" />
      {a.flash && a.flash.kind !== "RTM" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur">
          <div className={`stamp display rounded-3xl border-[10px] px-16 py-6 text-[16vh] font-bold leading-none ${a.flash.kind === "SOLD" ? "border-emerald-400 text-emerald-400" : "border-live text-live"}`} style={{ textShadow: "0 0 60px currentColor" }}>{a.flash.kind === "SOLD" ? "SOLD!" : "UNSOLD"}</div>
          <div className="display mt-10 text-[7vh] leading-none">{a.flash.playerName}</div>
          {a.flash.kind === "SOLD" && (<><div className="display mt-4 text-[5vh] leading-none" style={{ color: a.flash.teamColor }}>{a.flash.viaRtm ? "RTM · " : ""}{a.flash.teamName}</div><div className="display money mt-6 text-[12vh] font-bold leading-none">{money(a.flash.amount)}</div></>)}
        </div>
      )}
      <header className="glass z-10 flex items-center gap-6 px-8 py-4">
        <div className="display text-4xl font-bold tracking-widest"><span className="text-gold">IPL</span> MEGA AUCTION</div>
        <div className="flex items-center gap-3 text-2xl font-bold">{live && <span className={`inline-block h-4 w-4 rounded-full ${rtm ? "rtm-pulse bg-rtm" : "live-dot bg-live"}`} />}{STATE_LABEL[s.state]}</div>
        <div className="ml-auto flex items-center gap-8 text-xl text-muted"><span>Players left <b className="text-ink">{s.playersRemaining}</b></span><span className={a.connected ? "text-emerald-400" : "text-live"}>●</span><span className="tabular-nums">{clock}</span></div>
      </header>
      {p ? (
        <main className="grid min-h-0 flex-1 grid-cols-[1fr_1.4fr] gap-8 p-8">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-panel-2">
            <PlayerPhoto src={p.photoUrl} name={p.name} className="h-full w-full object-cover object-top text-[30vh]" />
            {s.state === "PAUSED" && <div className="absolute inset-0 flex items-center justify-center bg-black/70"><span className="display text-[8vh] text-gold">PAUSED</span></div>}
            {p.previousTeamAbbr && <div className={`absolute bottom-4 left-4 rounded-xl px-4 py-2 text-2xl font-bold ${p.rtmAvailable ? "bg-rtm text-white" : "bg-black/70 text-muted"}`}>RTM · {p.previousTeamAbbr}</div>}
          </div>
          <div className="flex min-h-0 flex-col">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="display text-2xl tracking-[.3em] text-gold">{p.set}</div>
                <h1 className="display mt-1 text-[9vh] font-bold leading-[.95]">{p.name}</h1>
                <div className="mt-3 flex gap-3 text-2xl text-muted"><span className="rounded-xl bg-panel-2 px-4 py-1 font-semibold text-ink">{ROLE_LABEL[p.role]}</span><span className="rounded-xl bg-panel-2 px-4 py-1">{p.overseas ? "✈ Overseas" : "Indian"}</span><span className="rounded-xl bg-panel-2 px-4 py-1">★ {p.rating ?? "—"}</span></div>
              </div>
              {s.timerRunning && !rtm && <div className={`display rounded-2xl border-4 px-8 py-4 text-[8vh] font-bold leading-none tabular-nums ${sec <= 5 ? "border-live text-live" : "border-line text-ink"}`}>{mmss(a.remainingMs)}</div>}
              {rtm && s.rtm && <div className="display rounded-2xl border-4 border-rtm px-8 py-4 text-right text-rtm-2"><div className="text-2xl">RTM · {s.state === "RTM_OFFER" ? `${s.rtm.teamAbbr} deciding` : s.state === "RTM_RAISE" ? `${s.rtm.bidderTeamAbbr} may raise` : `${s.rtm.teamAbbr} to match`}</div><div className="text-[6vh] font-bold leading-none tabular-nums">{mmss(a.rtmRemainingMs)}</div></div>}
            </div>
            <div className="mt-auto">
              <div className="flex items-end justify-between">
                <div><div className="display text-2xl text-muted">BASE PRICE</div><div className="display text-[5vh]">{money(p.basePrice)}</div></div>
                <div className="text-right">
                  <div className="display text-2xl text-muted">{rtm ? "PRICE TO MATCH" : "CURRENT BID"}</div>
                  <div className="display money text-[16vh] font-bold leading-none">{s.currentBid > 0 ? money(s.currentBid) : "—"}</div>
                  <div className="display mt-2 text-[4.5vh] leading-none">{highest ? <span style={{ color: highest.color }}>{highest.name}</span> : <span className="text-muted">Awaiting first bid</span>}</div>
                </div>
              </div>
              <div className="mt-6 flex gap-3 overflow-hidden">
                {s.bids.slice(0, 6).map((b, i) => <div key={b.id} className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-5 py-3 text-2xl ${i === 0 ? "bid-new bg-gold/15 ring-2 ring-gold/50" : "bg-panel-2"}`}><span className="h-4 w-4 rounded-full" style={{ background: b.color }} /><span className="font-semibold">{b.abbreviation}</span><span className="money font-bold">{money(b.amount)}</span></div>)}
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex flex-1 flex-col items-center justify-center">
          <div className="display text-[10vh] text-muted">{s.state === "WAITING" ? "AUCTION STARTS SOON" : s.state === "COMPLETED" ? "AUCTION COMPLETE" : s.state === "PAUSED" ? "PAUSED" : "NEXT PLAYER COMING UP"}</div>
          <div className="mt-4 text-3xl text-muted">{s.soldCount} sold · {s.unsoldCount} unsold · {s.playersRemaining} remaining</div>
        </main>
      )}
      <footer className="z-10 grid grid-cols-10 gap-2 border-t border-line/60 bg-panel/80 px-6 py-4">
        {s.teams.map((t) => (
          <div key={t.id} className={`flex items-center gap-2 rounded-xl border p-2 ${s.highestTeamId === t.id ? "border-gold bg-gold/10" : s.rtm?.teamId === t.id ? "border-rtm bg-rtm/10" : "border-line bg-panel-2"}`}>
            <TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={40} />
            <div className="min-w-0"><div className="truncate text-base font-bold leading-tight">{t.abbreviation}</div><div className="money text-lg font-bold leading-tight tabular-nums">{money(t.purse)}</div><div className="text-xs text-muted">{t.squadCount}/{t.maxSquad} · RTM {t.rtmTotal - t.rtmUsed}</div></div>
          </div>
        ))}
      </footer>
    </div>
  );
}
