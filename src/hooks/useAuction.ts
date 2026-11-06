"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getSocket } from "@/lib/socket-client";
import { minNextBid } from "@/lib/rules";
import type { AuctionSnapshot, RtmAction } from "@/types/auction";
import { setServerOffset } from "./useNow";

export interface FlashEvent { kind: "SOLD" | "UNSOLD" | "RTM"; playerName: string; teamName?: string; teamColor?: string; amount?: number; viaRtm?: boolean; id: number }
type Reply = { ok: boolean; error?: string; code?: string };

/**
 * Live auction state for one room (joined by its code), over Socket.IO.
 * The server owns the clocks (in-process timers), so the client only renders countdowns — see useNow.
 */
export function useAuction(roomCode: string, initial?: AuctionSnapshot | null) {
  const [snap, setSnap] = useState<AuctionSnapshot | null>(initial ?? null);
  const [connected, setConnected] = useState(false);
  const [clients, setClients] = useState(0);
  const [flash, setFlash] = useState<FlashEvent | null>(null);
  const [lastRejection, setLastRejection] = useState<string | null>(null);

  useEffect(() => {
    const s = getSocket();
    const onSnap = (p: { snapshot?: AuctionSnapshot }) => { if (p?.snapshot && p.snapshot.roomCode === roomCode) { setSnap(p.snapshot); setServerOffset(p.snapshot.serverTime - Date.now()); } };
    const events = ["state:sync", "auction:started", "auction:paused", "auction:resumed", "auction:completed", "player:started", "player:skipped", "player:next", "bid:accepted", "timer:updated", "team:purseUpdated", "auction:undo", "rtm:raise", "rtm:match"];
    events.forEach((e) => s.on(e, onSnap));
    const onSold = (p: { playerName: string; teamName: string; teamColor: string; amount: number; viaRtm?: boolean; snapshot: AuctionSnapshot }) => { if (p.snapshot?.roomCode !== roomCode) return; onSnap(p); setFlash({ kind: "SOLD", playerName: p.playerName, teamName: p.teamName, teamColor: p.teamColor, amount: p.amount, viaRtm: p.viaRtm, id: Date.now() }); };
    const onUnsold = (p: { playerName: string; snapshot: AuctionSnapshot }) => { if (p.snapshot?.roomCode !== roomCode) return; onSnap(p); setFlash({ kind: "UNSOLD", playerName: p.playerName, id: Date.now() }); };
    const onRtm = (p: { snapshot: AuctionSnapshot }) => { if (p.snapshot?.roomCode !== roomCode) return; onSnap(p); const sn = p.snapshot; const t = sn.teams.find((x) => x.id === sn.rtm?.teamId); setFlash({ kind: "RTM", playerName: sn.currentPlayer?.name ?? "", teamName: t?.name, teamColor: t?.color, amount: sn.rtm?.finalAmount, id: Date.now() }); };
    const onRej = (p: { error: string }) => setLastRejection(p.error);
    const onPresence = (p: { clients: number }) => setClients(p.clients);
    const onTime = (p: { serverTime: number }) => { setServerOffset(p.serverTime - Date.now()); };
    const join = () => s.emit("room:join", { code: roomCode });
    const onConnect = () => { setConnected(true); join(); };
    const onDisconnect = () => setConnected(false);
    s.on("player:sold", onSold); s.on("player:unsold", onUnsold); s.on("rtm:offer", onRtm); s.on("bid:rejected", onRej); s.on("presence", onPresence); s.on("time", onTime); s.on("connect", onConnect); s.on("disconnect", onDisconnect);
    if (s.connected) { queueMicrotask(() => setConnected(true)); join(); }
    return () => { events.forEach((e) => s.off(e, onSnap)); s.off("player:sold", onSold); s.off("player:unsold", onUnsold); s.off("rtm:offer", onRtm); s.off("bid:rejected", onRej); s.off("presence", onPresence); s.off("time", onTime); s.off("connect", onConnect); s.off("disconnect", onDisconnect); };
  }, [roomCode]);

  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), flash.kind === "RTM" ? 3200 : 4500); return () => clearTimeout(t); }, [flash]);

  /** Bids show instantly (optimistic); the server snapshot that follows confirms or corrects them. */
  const placeBid = useCallback((teamId: string | undefined, amount?: number) => new Promise<Reply>((resolve) => {
    if (teamId) setSnap((cur) => {
      if (!cur || cur.state !== "PLAYER_LIVE" || !cur.currentPlayer || cur.highestTeamId === teamId) return cur;
      const amt = amount ?? minNextBid(cur.currentBid, cur.currentPlayer.basePrice, cur.bidIncrement);
      const t = cur.teams.find((x) => x.id === teamId);
      if (!t || amt > t.purse || amt <= cur.currentBid) return cur;
      return { ...cur, currentBid: amt, highestTeamId: teamId, highestTeamName: t.name, bids: [{ id: `pending-${Date.now()}`, teamId, teamName: t.name, abbreviation: t.abbreviation, color: t.color, amount: amt, kind: "BID", createdAt: new Date().toISOString() }, ...cur.bids] };
    });
    const s = getSocket();
    s.emit("bid:place", { teamId, amount }, (r: Reply) => { if (!r.ok) { setLastRejection(r.error ?? "Rejected"); s.emit("state:request"); } resolve(r); });
  }), []);
  const rtm = useCallback((action: RtmAction, amount?: number) => new Promise<Reply>((resolve) => {
    getSocket().emit("rtm:action", { action, amount }, (r: Reply) => { if (!r.ok) setLastRejection(r.error ?? "Rejected"); resolve(r); });
  }), []);

  const nextBid = snap ? minNextBid(snap.currentBid, snap.currentPlayer?.basePrice ?? 0, snap.bidIncrement) : 0;
  const biddingOpen = !!snap && snap.state === "PLAYER_LIVE" && !(!snap.timerRunning && snap.timerRemainingMs === 0);

  const clearRejection = useCallback(() => setLastRejection(null), []);
  return useMemo(() => ({ snap, connected, clients, flash, lastRejection, clearRejection, placeBid, rtm, nextBid, biddingOpen }), [snap, connected, clients, flash, lastRejection, clearRejection, placeBid, rtm, nextBid, biddingOpen]);
}
