"use client";
import { useState } from "react";
import { money } from "@/lib/format";
import { quickBids } from "@/lib/rules";
import type { useAuction } from "@/hooks/useAuction";
type A = ReturnType<typeof useAuction>;

/** Owner bidding controls: one giant BID button, quick jumps and a custom amount. */
export function BidButton({ a, teamId, compact = false }: { a: A; teamId: string; compact?: boolean }) {
  const s = a.snap!; const me = s.teams.find((t) => t.id === teamId); const [busy, setBusy] = useState(false); const [custom, setCustom] = useState("");
  const p = s.currentPlayer;
  const highest = s.highestTeamId === teamId;
  const full = !!me && me.squadCount >= me.maxSquad;
  const overseasFull = !!me && !!p?.overseas && me.overseasCount >= me.maxOverseas;
  const cannot = !a.biddingOpen || !p || highest || full || overseasFull || (me?.purse ?? 0) < a.nextBid;
  const why = !p ? "No player on the block" : s.state.startsWith("RTM") ? "RTM decision in progress" : !a.biddingOpen ? (s.state === "PAUSED" ? "Auction paused" : "Bidding closed for this player") : highest ? "You hold the highest bid" : full ? "Your squad is full" : overseasFull ? "Overseas quota full" : (me?.purse ?? 0) < a.nextBid ? "Not enough purse" : null;
  const bid = async (amt?: number) => { setBusy(true); await a.placeBid(teamId, amt); setBusy(false); setCustom(""); };
  const options = p ? quickBids(s.currentBid, p.basePrice, s.bidIncrement) : [];
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button className={`btn-gold flex-1 !rounded-xl !py-4 text-xl ${!cannot ? "shadow-[0_0_30px_rgba(245,184,46,.35)]" : ""}`} disabled={cannot || busy} onClick={() => bid()}>{highest ? "YOU'RE HIGHEST" : !p ? "WAITING" : <>BID {money(a.nextBid)}</>}</button>
        {options.slice(1, 3).map((v) => <button key={v} className="btn-ghost !px-3 !py-4 text-sm" disabled={cannot || busy || (me?.purse ?? 0) < v} onClick={() => bid(v)}>{money(v)}</button>)}
      </div>
    );
  }
  return (
    <div className={`card p-4 ${highest ? "border-gold/60" : ""}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <button className={`btn-gold flex-1 !rounded-xl !py-5 text-2xl md:text-3xl ${!cannot ? "shadow-[0_0_40px_rgba(245,184,46,.35)]" : ""}`} disabled={cannot || busy} onClick={() => bid()}>
          {highest ? "YOU'RE HIGHEST" : !p ? "WAITING FOR A PLAYER" : <>BID {money(a.nextBid)}</>}
        </button>
        <div className="flex flex-wrap gap-2 md:w-72">
          {options.slice(1).map((v) => <button key={v} className="btn-ghost !px-3 !py-2 text-sm" disabled={cannot || busy || (me?.purse ?? 0) < v} onClick={() => bid(v)}>{money(v)}</button>)}
          <div className="flex w-full gap-1"><input className="input !py-2 text-sm" inputMode="numeric" placeholder="Custom (lakhs)" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))} /><button className="btn-ghost !px-3 !py-2 text-sm" disabled={cannot || busy || !custom} onClick={() => bid(Number(custom))}>Go</button></div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{why ?? `Next valid bid ${money(a.nextBid)} · increments follow the IPL ladder`}</span>
        {me && <span>Purse <b className="money">{money(me.purse)}</b> · Squad {me.squadCount}/{me.maxSquad} · ✈ {me.overseasCount}/{me.maxOverseas} · RTM {me.rtmTotal - me.rtmUsed}/{me.rtmTotal}</span>}
      </div>
    </div>
  );
}
