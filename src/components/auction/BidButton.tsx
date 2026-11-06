"use client";
import { useState } from "react";
import { money } from "@/lib/format";
import { quickBids } from "@/lib/rules";
import type { useAuction } from "@/hooks/useAuction";
import { Sheet } from "../Sheet";
import { RtmCards } from "./PursePanel";
import { RtmPanel } from "./RtmPanel";
type A = ReturnType<typeof useAuction>;

function useBidState(a: A, teamId: string) {
  const s = a.snap!; const me = s.teams.find((t) => t.id === teamId);
  const p = s.currentPlayer;
  const highest = s.highestTeamId === teamId;
  const full = !!me && me.squadCount >= me.maxSquad;
  const overseasFull = !!me && !!p?.overseas && me.overseasCount >= me.maxOverseas;
  const cannot = !a.biddingOpen || !p || highest || full || overseasFull || (me?.purse ?? 0) < a.nextBid;
  const why = !p ? "Waiting for the next player" : s.state.startsWith("RTM") ? "RTM decision in progress" : !a.biddingOpen ? (s.state === "PAUSED" ? "Auction paused" : "Bidding closed for this player") : highest ? "You hold the highest bid" : full ? "Your squad is full" : overseasFull ? "Overseas quota full" : (me?.purse ?? 0) < a.nextBid ? "Not enough purse" : null;
  const options = p ? quickBids(s.currentBid, p.basePrice, s.bidIncrement) : [];
  return { s, me, p, highest, cannot, why, options };
}

/** Owner bidding controls (desktop card): one giant BID button, quick jumps and a custom amount. */
export function BidButton({ a, teamId }: { a: A; teamId: string }) {
  const { me, p, highest, cannot, why, options } = useBidState(a, teamId);
  const [busy, setBusy] = useState(false); const [custom, setCustom] = useState("");
  const bid = async (amt?: number) => { setBusy(true); await a.placeBid(teamId, amt); setBusy(false); setCustom(""); };
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

/**
 * Phone bid dock: your purse/squad at a glance, a thumb-sized BID button, two quick jumps and a custom-amount sheet.
 * During an RTM window it turns into the RTM controls so nobody has to scroll to act.
 */
export function BidDock({ a, teamId, rtmSide }: { a: A; teamId: string; rtmSide: "rtm" | "bidder" | "both" | null }) {
  const { s, me, p, highest, cannot, why, options } = useBidState(a, teamId);
  const [busy, setBusy] = useState(false); const [sheet, setSheet] = useState(false); const [custom, setCustom] = useState("");
  const bid = async (amt?: number) => { setBusy(true); await a.placeBid(teamId, amt); setBusy(false); };
  if (s.state.startsWith("RTM") && s.rtm) return <RtmPanel a={a} canAct={rtmSide} compact />;
  return (
    <div className="flex flex-col gap-1.5">
      {me && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="flex min-w-0 items-center gap-2"><b className="text-ink">{me.abbreviation}</b><b className="money text-sm">{money(me.purse)}</b><span>{me.squadCount}/{me.maxSquad}</span><span>✈ {me.overseasCount}/{me.maxOverseas}</span></span>
          <span className="flex shrink-0 items-center gap-2"><RtmCards total={me.rtmTotal} used={me.rtmUsed} />{why && <span className={`truncate ${highest ? "text-gold" : ""}`}>{highest ? "Highest ✓" : why}</span>}</span>
        </div>
      )}
      <div className="flex items-stretch gap-2">
        <button className={`btn-gold flex-1 !rounded-xl !py-3.5 text-xl ${!cannot ? "shadow-[0_0_30px_rgba(245,184,46,.35)]" : ""}`} disabled={cannot || busy} onClick={() => bid()}>
          {highest ? "YOU'RE HIGHEST" : !p ? "WAITING" : <>BID {money(a.nextBid)}</>}
        </button>
        {options.slice(1, 3).map((v) => <button key={v} className="btn-ghost !px-2.5 text-sm" disabled={cannot || busy || (me?.purse ?? 0) < v} onClick={() => bid(v)}>{money(v)}</button>)}
        <button className="btn-ghost !px-3 text-lg" disabled={cannot || busy} onClick={() => setSheet(true)} aria-label="Custom bid">＋</button>
      </div>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Custom bid">
        <div className="text-sm text-muted">Next valid bid {money(a.nextBid)} · purse {money(me?.purse ?? 0)}</div>
        <div className="mt-3 flex flex-wrap gap-2">{options.map((v) => <button key={v} className="btn-ghost tap flex-1" disabled={(me?.purse ?? 0) < v} onClick={() => { setSheet(false); bid(v); }}>{money(v)}</button>)}</div>
        <div className="mt-3 flex gap-2 pb-2">
          <input className="input tap text-lg" inputMode="numeric" placeholder="Amount in lakhs" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))} />
          <button className="btn-gold tap !px-5" disabled={!custom || Number(custom) < a.nextBid} onClick={() => { setSheet(false); bid(Number(custom)); setCustom(""); }}>Bid {custom ? money(Number(custom)) : ""}</button>
        </div>
      </Sheet>
    </div>
  );
}
