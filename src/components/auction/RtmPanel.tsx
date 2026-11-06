"use client";
import { useState } from "react";
import { money } from "@/lib/format";
import type { useAuction } from "@/hooks/useAuction";
import { RtmTimer } from "./Timer";
type A = ReturnType<typeof useAuction>;

/**
 * Right-To-Match negotiation. IPL 2025 rule:
 *  1. RTM_OFFER  – the player's previous franchise decides to USE the card or PASS.
 *  2. RTM_RAISE  – the winning bidder gets one chance to raise the final price (or keep it).
 *  3. RTM_MATCH  – the previous franchise must MATCH the final price to take the player, or DECLINE.
 * `canAct` tells which side this viewer may act for ("rtm" | "bidder" | "both" | null).
 * `compact` is the phone bid-dock version: headline, clock and big buttons only.
 */
export function RtmPanel({ a, canAct, compact = false }: { a: A; canAct: "rtm" | "bidder" | "both" | null; compact?: boolean }) {
  const s = a.snap!; const r = s.rtm; const [amount, setAmount] = useState(""); const [busy, setBusy] = useState(false);
  if (!r || !s.state.startsWith("RTM")) return null;
  const rtmSide = canAct === "rtm" || canAct === "both", bidderSide = canAct === "bidder" || canAct === "both";
  const rtmTeam = s.teams.find((t) => t.id === r.teamId); const bidder = s.teams.find((t) => t.id === r.bidderTeamId);
  const go = async (action: Parameters<A["rtm"]>[0], amt?: number) => { setBusy(true); await a.rtm(action, amt); setBusy(false); setAmount(""); };
  const step = s.state === "RTM_OFFER" ? 1 : s.state === "RTM_RAISE" ? 2 : 3;
  const myTurn = (s.state === "RTM_OFFER" && rtmSide) || (s.state === "RTM_RAISE" && bidderSide) || (s.state === "RTM_MATCH" && rtmSide);
  const headline = (<>
    {s.state === "RTM_OFFER" && <><span style={{ color: r.teamColor }}>{compact ? r.teamAbbr : r.teamName}</span> — use an RTM card?</>}
    {s.state === "RTM_RAISE" && <><span style={{ color: r.bidderTeamColor }}>{compact ? r.bidderTeamAbbr : r.bidderTeamName}</span> — final raise?</>}
    {s.state === "RTM_MATCH" && <><span style={{ color: r.teamColor }}>{compact ? r.teamAbbr : r.teamName}</span> — match {money(r.finalAmount)}?</>}
  </>);
  const raiseOptions = [25, 50, 100].filter((inc) => r.finalAmount + inc <= (bidder?.purse ?? 0));
  const actions = canAct && (<>
    {s.state === "RTM_OFFER" && rtmSide && (<>
      <button className="btn-rtm tap flex-1 !px-5 text-base" disabled={busy} onClick={() => go("RTM_USE")}>▮ USE RTM CARD</button>
      <button className="btn-ghost tap" disabled={busy} onClick={() => go("RTM_PASS")}>Pass</button>
    </>)}
    {s.state === "RTM_RAISE" && bidderSide && (<>
      {!compact && <input className="input tap w-40" inputMode="numeric" placeholder={`Lakhs > ${r.finalAmount}`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />}
      {!compact && <button className="btn-gold tap" disabled={busy || !amount || Number(amount) <= r.finalAmount} onClick={() => go("RTM_RAISE", Number(amount))}>RAISE TO {amount ? money(Number(amount)) : "…"}</button>}
      {(compact ? raiseOptions.slice(0, 2) : [...raiseOptions, 200]).map((inc) => <button key={inc} className="btn-gold tap flex-1" disabled={busy || r.finalAmount + inc > (bidder?.purse ?? 0)} onClick={() => go("RTM_RAISE", r.finalAmount + inc)}>+{money(inc)}</button>)}
      <button className="btn-ghost tap flex-1" disabled={busy} onClick={() => go("RTM_KEEP")}>Keep {money(r.finalAmount)}</button>
    </>)}
    {s.state === "RTM_MATCH" && rtmSide && (<>
      <button className="btn-rtm tap flex-1 !px-5 text-base" disabled={busy || (rtmTeam?.purse ?? 0) < r.finalAmount} onClick={() => go("RTM_MATCH")}>✔ MATCH {money(r.finalAmount)}</button>
      <button className="btn-ghost tap" disabled={busy} onClick={() => go("RTM_DECLINE")}>Decline</button>
    </>)}
  </>);

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <RtmTimer snap={s} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-rtm-2">RTM · step {step}/3 · {money(r.finalAmount)}</div>
            <div className="display truncate text-lg leading-tight">{headline}</div>
          </div>
        </div>
        {myTurn ? <div className="flex gap-2">{actions}</div> : <div className="text-center text-sm text-muted">Waiting for the other franchise…</div>}
      </div>
    );
  }
  return (
    <div className="card rtm-pulse flip-in border-rtm/60 p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-widest text-rtm-2">Right to match · step {step} of 3</div>
          <div className="display text-2xl leading-none md:text-3xl">{headline}</div>
          <div className="mt-1 text-sm text-muted">
            {s.state === "RTM_OFFER" && <>Winning bid {money(r.finalAmount)} by <b style={{ color: r.bidderTeamColor }}>{r.bidderTeamName}</b>. {rtmTeam ? `${rtmTeam.rtmTotal - rtmTeam.rtmUsed} card${rtmTeam.rtmTotal - rtmTeam.rtmUsed === 1 ? "" : "s"} left · purse ${money(rtmTeam.purse)}.` : ""} No answer = pass.</>}
            {s.state === "RTM_RAISE" && <>{r.teamName} has played the RTM card. {r.bidderTeamName} may raise the price once (purse {money(bidder?.purse ?? 0)}). No answer = keep {money(r.finalAmount)}.</>}
            {s.state === "RTM_MATCH" && <>Final price {money(r.finalAmount)}. Match it to bring the player home, or decline and {r.bidderTeamName} wins. No answer = decline.</>}
          </div>
        </div>
        <div className="shrink-0 md:hidden"><RtmTimer snap={s} size="sm" /></div>
        <div className="hidden shrink-0 md:block"><RtmTimer snap={s} /></div>
      </div>
      {canAct && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {actions}
          {!myTurn && <div className="text-sm text-muted">Waiting for the other franchise…</div>}
        </div>
      )}
    </div>
  );
}
