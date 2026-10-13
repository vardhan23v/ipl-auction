"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import type { useAuction } from "@/hooks/useAuction";
import { money } from "@/lib/format";
import { RtmPanel } from "./RtmPanel";
import { useRoom, roomApi } from "../RoomContext";
type A = ReturnType<typeof useAuction>;
type Q = { id: string; name: string; role: string; basePrice: number; set: string; overseas: boolean; previousTeam: { abbreviation: string } | null };

export function AuctioneerPanel({ a, isAdmin }: { a: A; isAdmin: boolean }) {
  const { push } = useToast(); const { code } = useRoom();
  const [busy, setBusy] = useState<string | null>(null); const [amount, setAmount] = useState(""); const [queue, setQueue] = useState<Q[]>([]); const [pick, setPick] = useState("");
  const s = a.snap!;
  const loadQueue = () => fetch(roomApi(code, "/players/queue")).then((r) => r.json()).then((q) => Array.isArray(q) && setQueue(q)).catch(() => {});
  useEffect(() => { loadQueue(); }, [s.version]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(action: string, confirmMsg?: string, playerId?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(action);
    const r = await fetch(roomApi(code, "/control"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, playerId }) });
    const j = await r.json(); setBusy(null);
    if (!r.ok) push({ title: "Action failed", body: j.error, tone: "error" }); else push({ title: action.replace(/_/g, " "), tone: "success" });
  }
  const btn = (ac: string, label: string, enabled: boolean, cls = "btn-ghost", confirm?: string) => (
    <button key={ac} className={`${cls} w-full`} disabled={!enabled || !!busy} onClick={() => act(ac, confirm)}>{busy === ac ? "…" : label}</button>
  );
  const st = s.state; const highest = s.teams.find((t) => t.id === s.highestTeamId);
  const canStart = ["LIVE", "SOLD", "UNSOLD"].includes(st);
  async function bidFor(teamId: string) { const r = await a.placeBid(teamId, amount ? Number(amount) : undefined); if (r.ok) setAmount(""); }
  const p = s.currentPlayer;
  return (
    <div className="flex flex-col gap-4">
      <RtmPanel a={a} canAct="both" />
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="display text-lg">Host Console</h3><span className="rounded bg-panel-2 px-2 py-0.5 text-xs font-bold">{st}</span></div>
        {st === "WAITING" && <div className="mb-3 grid gap-2 md:grid-cols-3">{btn("START_AUCTION", "▶ START AUCTION", true, "btn-green")}{btn("ORDER_BY_SET", "Order queue by set", true, "btn-ghost")}{btn("SHUFFLE", "🔀 Shuffle queue", true, "btn-ghost")}</div>}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <div className="col-span-2 flex gap-1 md:col-span-2">
            <select className="input" value={pick} onChange={(e) => setPick(e.target.value)} disabled={!canStart}>
              <option value="">Next in queue ({queue.length})</option>
              {queue.slice(0, 200).map((q) => <option key={q.id} value={q.id}>{q.name} · {money(q.basePrice)} · {q.set}{q.previousTeam ? ` · RTM ${q.previousTeam.abbreviation}` : ""}</option>)}
            </select>
            <button className="btn-gold whitespace-nowrap" disabled={!canStart || !!busy} onClick={() => act("START_PLAYER", undefined, pick || undefined)}>START PLAYER</button>
          </div>
          {st === "PAUSED" ? btn("RESUME", "RESUME", true, "btn-green") : btn("PAUSE", "PAUSE", st === "LIVE" || st === "PLAYER_LIVE")}
          {st === "PLAYER_LIVE" && !s.timerRunning ? btn("START_TIMER", "▶ TIMER", true) : btn("PAUSE_TIMER", "⏸ TIMER", st === "PLAYER_LIVE" && s.timerRunning)}
          {btn("RESET_TIMER", "↺ RESET TIMER", st === "PLAYER_LIVE" || st === "PAUSED", "btn-ghost")}
          {btn("SELL", highest ? `SELL → ${highest.abbreviation}${p?.rtmAvailable ? " (RTM check)" : ""}` : "SELL", st === "PLAYER_LIVE" && s.currentBid > 0, "btn-green", `Sell ${p?.name} to ${highest?.name} for ${money(s.currentBid)}?${p?.rtmAvailable ? ` ${p.previousTeamAbbr} will first get the RTM option.` : ""}`)}
          {btn("UNSOLD", "UNSOLD", st === "PLAYER_LIVE" && s.currentBid === 0, "btn-red", `Mark ${p?.name} UNSOLD?`)}
          {btn("SKIP", "SKIP", st === "PLAYER_LIVE" && s.currentBid === 0, "btn-ghost", "Skip this player?")}
          {btn("NEXT", "NEXT PLAYER ▶", st === "SOLD" || st === "UNSOLD" || (st === "LIVE" && !p), "btn-gold")}
          {btn("UNDO", "↩ UNDO LAST", ["SOLD", "UNSOLD", "LIVE", "PLAYER_LIVE"].includes(st), "btn-ghost", "Undo the last SOLD/UNSOLD/SKIP? Purse, squad and RTM cards are restored.")}
          {isAdmin && btn("COMPLETE", "■ COMPLETE AUCTION", ["LIVE", "PAUSED", "SOLD", "UNSOLD"].includes(st), "btn-red", "Complete the auction? No further actions will be possible.")}
          {isAdmin && <button className="btn-ghost w-full text-live" disabled={!!busy} onClick={() => { if (!window.confirm("RESET the auction? All sales, bids, purses and RTM usage will be wiped.")) return; if (!window.confirm("Are you absolutely sure? This cannot be undone.")) return; act("RESET_AUCTION"); }}>⟲ RESET AUCTION</button>}
        </div>
        <div className="mt-4 rounded-xl border border-line bg-panel-2/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Record a bid for a franchise {a.biddingOpen ? <span className="text-gold">— next: {money(a.nextBid)}</span> : <span>(bidding closed)</span>}</div>
            <input className="input w-40 !py-1 text-sm" placeholder={`Custom lakhs (${a.nextBid})`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 md:grid-cols-10">
            {s.teams.map((t) => {
              const amt = amount ? Number(amount) : a.nextBid;
              const why = t.squadCount >= t.maxSquad ? "FULL" : p?.overseas && t.overseasCount >= t.maxOverseas ? "✈ full" : amt > t.purse ? "No purse" : s.highestTeamId === t.id ? "Highest" : null;
              const cant = !a.biddingOpen || !!why;
              return (
                <button key={t.id} disabled={cant} onClick={() => bidFor(t.id)} className="flex flex-col items-center rounded-lg border px-1 py-2 font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35" style={{ borderColor: t.color, background: s.highestTeamId === t.id ? `${t.color}22` : "transparent" }}>
                  <span className="display text-base" style={{ color: t.color }}>{t.abbreviation}</span>
                  <span className="text-[10px] text-muted">{why ?? money(t.purse)}</span>
                </button>
              );
            })}
          </div>
        </div>
        {st === "PLAYER_LIVE" && s.currentBid > 0 && <div className="mt-3 rounded-lg bg-gold/15 px-3 py-2 text-sm text-gold">Highest: {highest?.name} at {money(s.currentBid)}{s.autoSell ? " — sells automatically when the timer ends, or press SELL now." : " — SELL when the room settles."}{p?.rtmAvailable && <span className="ml-1 text-rtm-2">{p.previousTeamAbbr} can RTM.</span>}</div>}
      </div>
    </div>
  );
}
