"use client";
import { useState } from "react";
import { money } from "@/lib/format";
import type { useAuction } from "@/hooks/useAuction";
import { Timer } from "./Timer";
type A = ReturnType<typeof useAuction>;

/**
 * Right-To-Match negotiation. IPL 2025 rule:
 *  1. RTM_OFFER  – the player's previous franchise decides to USE the card or PASS.
 *  2. RTM_RAISE  – the winning bidder gets one chance to raise the final price (or keep it).
 *  3. RTM_MATCH  – the previous franchise must MATCH the final price to take the player, or DECLINE.
 * `canAct` tells which side this viewer may act for ("rtm" | "bidder" | "both" | null).
 */
export function RtmPanel({ a, canAct }: { a: A; canAct: "rtm" | "bidder" | "both" | null }) {
  const s = a.snap!; const r = s.rtm; const [amount, setAmount] = useState(""); const [busy, setBusy] = useState(false);
  if (!r || !s.state.startsWith("RTM")) return null;
  const rtmSide = canAct === "rtm" || canAct === "both", bidderSide = canAct === "bidder" || canAct === "both";
  const rtmTeam = s.teams.find((t) => t.id === r.teamId); const bidder = s.teams.find((t) => t.id === r.bidderTeamId);
  const go = async (action: Parameters<A["rtm"]>[0], amt?: number) => { setBusy(true); await a.rtm(action, amt); setBusy(false); setAmount(""); };
  const step = s.state === "RTM_OFFER" ? 1 : s.state === "RTM_RAISE" ? 2 : 3;
  return (
    <div className="card rtm-pulse flip-in border-rtm/60 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-rtm-2">Right to match · step {step} of 3</div>
          <div className="display text-3xl leading-none">
            {s.state === "RTM_OFFER" && <><span style={{ color: r.teamColor }}>{r.teamName}</span> — use an RTM card?</>}
            {s.state === "RTM_RAISE" && <><span style={{ color: r.bidderTeamColor }}>{r.bidderTeamName}</span> — final raise?</>}
            {s.state === "RTM_MATCH" && <><span style={{ color: r.teamColor }}>{r.teamName}</span> — match {money(r.finalAmount)}?</>}
          </div>
          <div className="mt-1 text-sm text-muted">
            {s.state === "RTM_OFFER" && <>Winning bid {money(r.finalAmount)} by <b style={{ color: r.bidderTeamColor }}>{r.bidderTeamName}</b>. {rtmTeam ? `${rtmTeam.rtmTotal - rtmTeam.rtmUsed} card${rtmTeam.rtmTotal - rtmTeam.rtmUsed === 1 ? "" : "s"} left · purse ${money(rtmTeam.purse)}.` : ""} No answer = pass.</>}
            {s.state === "RTM_RAISE" && <>{r.teamName} has played the RTM card. {r.bidderTeamName} may raise the price once (purse {money(bidder?.purse ?? 0)}). No answer = keep {money(r.finalAmount)}.</>}
            {s.state === "RTM_MATCH" && <>Final price {money(r.finalAmount)}. Match it to bring the player home, or decline and {r.bidderTeamName} wins. No answer = decline.</>}
          </div>
        </div>
        <Timer ms={a.rtmRemainingMs} running total={s.rtmTimerSeconds} color="#a855f7" />
      </div>
      {canAct && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {s.state === "RTM_OFFER" && rtmSide && (<>
            <button className="btn-rtm !px-5 !py-3 text-base" disabled={busy} onClick={() => go("RTM_USE")}>▮ USE RTM CARD</button>
            <button className="btn-ghost !py-3" disabled={busy} onClick={() => go("RTM_PASS")}>Pass — let {r.bidderTeamAbbr} have them</button>
          </>)}
          {s.state === "RTM_RAISE" && bidderSide && (<>
            <input className="input w-40 !py-3" inputMode="numeric" placeholder={`Lakhs ≥ ${r.finalAmount}`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
            <button className="btn-gold !py-3" disabled={busy || !amount || Number(amount) <= r.finalAmount} onClick={() => go("RTM_RAISE", Number(amount))}>RAISE TO {amount ? money(Number(amount)) : "…"}</button>
            {[25, 50, 100, 200].map((inc) => <button key={inc} className="btn-ghost !py-3" disabled={busy || r.finalAmount + inc > (bidder?.purse ?? 0)} onClick={() => go("RTM_RAISE", r.finalAmount + inc)}>+{money(inc)}</button>)}
            <button className="btn-ghost !py-3" disabled={busy} onClick={() => go("RTM_KEEP")}>Keep {money(r.finalAmount)}</button>
          </>)}
          {s.state === "RTM_MATCH" && rtmSide && (<>
            <button className="btn-rtm !px-5 !py-3 text-base" disabled={busy || (rtmTeam?.purse ?? 0) < r.finalAmount} onClick={() => go("RTM_MATCH")}>✔ MATCH {money(r.finalAmount)}</button>
            <button className="btn-ghost !py-3" disabled={busy} onClick={() => go("RTM_DECLINE")}>Decline</button>
          </>)}
          {((s.state === "RTM_OFFER" && !rtmSide) || (s.state === "RTM_RAISE" && !bidderSide) || (s.state === "RTM_MATCH" && !rtmSide)) && <div className="text-sm text-muted">Waiting for the other franchise…</div>}
        </div>
      )}
    </div>
  );
}
