"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { roomBus } from "@/lib/realtime-client";
import { minNextBid } from "@/lib/rules";
import type { AuctionSnapshot, RtmAction } from "@/types/auction";
import { setServerOffset, serverNow } from "./useNow";

export interface FlashEvent { kind: "SOLD" | "UNSOLD" | "RTM"; playerName: string; teamName?: string; teamColor?: string; amount?: number; viaRtm?: boolean; id: number }
type Reply = { ok: boolean; error?: string; code?: string };

const SNAPSHOT_EVENTS = ["state:sync", "auction:started", "auction:paused", "auction:resumed", "auction:completed", "player:started", "player:skipped", "player:next", "bid:accepted", "timer:updated", "team:purseUpdated", "auction:undo", "rtm:raise", "rtm:match", "room:members"];

async function post(code: string, path: string, body: object): Promise<Reply> {
  try {
    const r = await fetch(`/api/rooms/${code}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true } : { ok: false, error: j.error ?? "Rejected", code: j.code };
  } catch { return { ok: false, error: "Network error — try again" }; }
}

/**
 * Live auction state for one room (joined by its code).
 * Updates arrive on the room's Supabase Realtime channel; bids / RTM decisions are HTTP calls to the API.
 * When a countdown reaches zero, this client asks the server to settle it (`POST /tick`) — the server has no timers.
 */
export function useAuction(roomCode: string, initial?: AuctionSnapshot | null) {
  const [snap, setSnap] = useState<AuctionSnapshot | null>(initial ?? null);
  const [connected, setConnected] = useState(false);
  const [clients, setClients] = useState(0);
  const [flash, setFlash] = useState<FlashEvent | null>(null);
  const [lastRejection, setLastRejection] = useState<string | null>(null);
  const lastVersion = useRef(initial?.version ?? -1);

  const apply = useCallback((s: AuctionSnapshot | undefined) => {
    if (!s || s.roomCode !== roomCode) return;
    // Broadcasts can arrive out of order; never step back to an older room version.
    if (s.version < lastVersion.current) return;
    lastVersion.current = s.version;
    setSnap(s); setServerOffset(s.serverTime - Date.now());
  }, [roomCode]);
  const resync = useCallback(() => {
    fetch(`/api/rooms/${roomCode}/state`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((s) => { if (s) { lastVersion.current = -1; apply(s); } }).catch(() => {});
  }, [roomCode, apply]);

  useEffect(() => {
    if (initial) setServerOffset(initial.serverTime - Date.now());
    const bus = roomBus(roomCode);
    const onSnap = (p: { snapshot?: AuctionSnapshot }) => apply(p?.snapshot);
    const onSold = (p: { playerName: string; teamName: string; teamColor: string; amount: number; viaRtm?: boolean; snapshot: AuctionSnapshot }) => { onSnap(p); setFlash({ kind: "SOLD", playerName: p.playerName, teamName: p.teamName, teamColor: p.teamColor, amount: p.amount, viaRtm: p.viaRtm, id: Date.now() }); };
    const onUnsold = (p: { playerName: string; snapshot: AuctionSnapshot }) => { onSnap(p); setFlash({ kind: "UNSOLD", playerName: p.playerName, id: Date.now() }); };
    const onRtm = (p: { snapshot: AuctionSnapshot }) => { onSnap(p); const sn = p.snapshot; const t = sn?.teams.find((x) => x.id === sn.rtm?.teamId); setFlash({ kind: "RTM", playerName: sn?.currentPlayer?.name ?? "", teamName: t?.name, teamColor: t?.color, amount: sn?.rtm?.finalAmount, id: Date.now() }); };
    const offs = [
      ...SNAPSHOT_EVENTS.map((e) => bus.on(e, onSnap)),
      bus.on("player:sold", onSold), bus.on("player:unsold", onUnsold), bus.on("rtm:offer", onRtm),
      bus.on("presence", (p: { clients: number }) => setClients(p.clients)),
      // (Re)connected: we may have missed broadcasts while the channel was down.
      bus.on("connect", () => { setConnected(true); resync(); }),
      bus.on("disconnect", () => setConnected(false)),
    ];
    if (bus.connected) queueMicrotask(() => setConnected(true));
    return () => offs.forEach((off) => off());
  }, [roomCode, apply, resync]); // eslint-disable-line react-hooks/exhaustive-deps -- `initial` is only the first paint

  // Countdown hit zero → ask the server to settle it (auto-sell / unsold / RTM default). Retries cover clock skew;
  // any new snapshot cancels them. Duplicate ticks from many phones are harmless (idempotent, under the room lock).
  const deadline = snap ? (snap.state === "PLAYER_LIVE" && snap.timerRunning ? snap.timerEndsAt : snap.state.startsWith("RTM") ? snap.rtm?.deadlineAt ?? null : null) : null;
  useEffect(() => {
    if (!deadline) return;
    const jitter = 120 + Math.random() * 400;
    const timers = [0, 2000, 5000].map((extra) => setTimeout(() => { post(roomCode, "/tick", {}); }, Math.max(0, deadline - serverNow()) + jitter + extra));
    return () => timers.forEach(clearTimeout);
  }, [deadline, roomCode, snap?.version]);

  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), flash.kind === "RTM" ? 3200 : 4500); return () => clearTimeout(t); }, [flash]);

  /** Bids show instantly (optimistic); the broadcast snapshot that follows confirms or corrects them. */
  const placeBid = useCallback(async (teamId: string | undefined, amount?: number) => {
    if (teamId) setSnap((cur) => {
      if (!cur || cur.state !== "PLAYER_LIVE" || !cur.currentPlayer || cur.highestTeamId === teamId) return cur;
      const amt = amount ?? minNextBid(cur.currentBid, cur.currentPlayer.basePrice, cur.bidIncrement);
      const t = cur.teams.find((x) => x.id === teamId);
      if (!t || amt > t.purse || amt <= cur.currentBid) return cur;
      return { ...cur, currentBid: amt, highestTeamId: teamId, highestTeamName: t.name, bids: [{ id: `pending-${Date.now()}`, teamId, teamName: t.name, abbreviation: t.abbreviation, color: t.color, amount: amt, kind: "BID", createdAt: new Date().toISOString() }, ...cur.bids] };
    });
    const r = await post(roomCode, "/bid", { amount });
    if (!r.ok) { setLastRejection(r.error ?? "Rejected"); resync(); }
    return r;
  }, [roomCode, resync]);
  const rtm = useCallback(async (action: RtmAction, amount?: number) => {
    const r = await post(roomCode, "/rtm", { action, amount });
    if (!r.ok) { setLastRejection(r.error ?? "Rejected"); resync(); }
    return r;
  }, [roomCode, resync]);

  const nextBid = snap ? minNextBid(snap.currentBid, snap.currentPlayer?.basePrice ?? 0, snap.bidIncrement) : 0;
  const biddingOpen = !!snap && snap.state === "PLAYER_LIVE" && !(!snap.timerRunning && snap.timerRemainingMs === 0);

  const clearRejection = useCallback(() => setLastRejection(null), []);
  return useMemo(() => ({ snap, connected, clients, flash, lastRejection, clearRejection, placeBid, rtm, nextBid, biddingOpen }), [snap, connected, clients, flash, lastRejection, clearRejection, placeBid, rtm, nextBid, biddingOpen]);
}
