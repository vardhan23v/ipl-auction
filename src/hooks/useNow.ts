"use client";
import { useEffect, useState } from "react";
import type { AuctionSnapshot } from "@/types/auction";

/** Offset between the server clock and this device's clock, updated from every snapshot / `time` ping. */
let offset = 0;
export function setServerOffset(ms: number) { offset = ms; }
export const serverNow = () => Date.now() + offset;

/**
 * Server-synced "now" that re-renders ONLY the component that calls it.
 * Keeping this out of `useAuction` stops the whole live room from re-rendering 5×/second.
 * Pass `active=false` to stop ticking (e.g. no timer running).
 */
export function useNow(intervalMs = 200, active = true) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(serverNow());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, intervalMs);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [intervalMs, active]);
  return now;
}

/** Remaining ms on the bidding clock for a snapshot at time `now`. */
export function bidRemainingMs(snap: AuctionSnapshot, now: number) {
  return snap.timerRunning && snap.timerEndsAt ? Math.max(0, snap.timerEndsAt - now) : (snap.timerRemainingMs ?? (snap.state === "PLAYER_LIVE" ? snap.timerSeconds * 1000 : 0));
}

/** Live bidding clock for a snapshot; ticks only while the timer runs. */
export function useBidRemaining(snap: AuctionSnapshot) {
  const now = useNow(200, snap.timerRunning);
  return bidRemainingMs(snap, now);
}

/** Live countdown to an absolute server timestamp (RTM windows). */
export function useCountdown(deadline: number | null | undefined) {
  const now = useNow(200, !!deadline);
  return deadline ? Math.max(0, deadline - now) : 0;
}
