"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket-client";
import { minNextBid } from "@/lib/rules";
import type { AuctionSnapshot, RtmAction } from "@/types/auction";

export interface FlashEvent { kind: "SOLD" | "UNSOLD" | "RTM"; playerName: string; teamName?: string; teamColor?: string; amount?: number; viaRtm?: boolean; id: number }
type Reply = { ok: boolean; error?: string; code?: string };

/** Live auction state for one room (joined by its code). */
export function useAuction(roomCode: string, initial?: AuctionSnapshot | null) {
  const [snap, setSnap] = useState<AuctionSnapshot | null>(initial ?? null);
  const [connected, setConnected] = useState(false);
  const [clients, setClients] = useState(0);
  const [flash, setFlash] = useState<FlashEvent | null>(null);
  const [lastRejection, setLastRejection] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const offset = useRef(0);

  useEffect(() => {
    const s = getSocket();
    const onSnap = (p: { snapshot?: AuctionSnapshot }) => { if (p?.snapshot && p.snapshot.roomCode === roomCode) { setSnap(p.snapshot); offset.current = p.snapshot.serverTime - Date.now(); } };
    const events = ["state:sync", "auction:started", "auction:paused", "auction:resumed", "auction:completed", "player:started", "player:skipped", "player:next", "bid:accepted", "timer:updated", "team:purseUpdated", "auction:undo", "rtm:raise", "rtm:match"];
    events.forEach((e) => s.on(e, onSnap));
    const onSold = (p: { playerName: string; teamName: string; teamColor: string; amount: number; viaRtm?: boolean; snapshot: AuctionSnapshot }) => { if (p.snapshot?.roomCode !== roomCode) return; onSnap(p); setFlash({ kind: "SOLD", playerName: p.playerName, teamName: p.teamName, teamColor: p.teamColor, amount: p.amount, viaRtm: p.viaRtm, id: Date.now() }); };
    const onUnsold = (p: { playerName: string; snapshot: AuctionSnapshot }) => { if (p.snapshot?.roomCode !== roomCode) return; onSnap(p); setFlash({ kind: "UNSOLD", playerName: p.playerName, id: Date.now() }); };
    const onRtm = (p: { snapshot: AuctionSnapshot }) => { if (p.snapshot?.roomCode !== roomCode) return; onSnap(p); const sn = p.snapshot; const t = sn.teams.find((x) => x.id === sn.rtm?.teamId); setFlash({ kind: "RTM", playerName: sn.currentPlayer?.name ?? "", teamName: t?.name, teamColor: t?.color, amount: sn.rtm?.finalAmount, id: Date.now() }); };
    const onRej = (p: { error: string }) => setLastRejection(p.error);
    const onPresence = (p: { clients: number }) => setClients(p.clients);
    const onTime = (p: { serverTime: number }) => { offset.current = p.serverTime - Date.now(); };
    const join = () => s.emit("room:join", { code: roomCode });
    const onConnect = () => { setConnected(true); join(); };
    const onDisconnect = () => setConnected(false);
    s.on("player:sold", onSold); s.on("player:unsold", onUnsold); s.on("rtm:offer", onRtm); s.on("bid:rejected", onRej); s.on("presence", onPresence); s.on("time", onTime); s.on("connect", onConnect); s.on("disconnect", onDisconnect);
    if (s.connected) { setConnected(true); join(); }
    const tick = setInterval(() => setNow(Date.now() + offset.current), 200);
    return () => { events.forEach((e) => s.off(e, onSnap)); s.off("player:sold", onSold); s.off("player:unsold", onUnsold); s.off("rtm:offer", onRtm); s.off("bid:rejected", onRej); s.off("presence", onPresence); s.off("time", onTime); s.off("connect", onConnect); s.off("disconnect", onDisconnect); clearInterval(tick); };
  }, [roomCode]);

  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), flash.kind === "RTM" ? 3200 : 4500); return () => clearTimeout(t); }, [flash]);

  const placeBid = useCallback((teamId: string | undefined, amount?: number) => new Promise<Reply>((resolve) => {
    getSocket().emit("bid:place", { teamId, amount }, (r: Reply) => { if (!r.ok) setLastRejection(r.error ?? "Rejected"); resolve(r); });
  }), []);
  const rtm = useCallback((action: RtmAction, amount?: number) => new Promise<Reply>((resolve) => {
    getSocket().emit("rtm:action", { action, amount }, (r: Reply) => { if (!r.ok) setLastRejection(r.error ?? "Rejected"); resolve(r); });
  }), []);

  const remainingMs = snap ? (snap.timerRunning && snap.timerEndsAt ? Math.max(0, snap.timerEndsAt - now) : (snap.timerRemainingMs ?? (snap.state === "PLAYER_LIVE" ? snap.timerSeconds * 1000 : 0))) : 0;
  const rtmRemainingMs = snap?.rtm?.deadlineAt ? Math.max(0, snap.rtm.deadlineAt - now) : 0;
  const nextBid = snap ? minNextBid(snap.currentBid, snap.currentPlayer?.basePrice ?? 0, snap.bidIncrement) : 0;
  const biddingOpen = !!snap && snap.state === "PLAYER_LIVE" && !(snap.autoSell && !snap.timerRunning && snap.timerRemainingMs === 0);

  return { snap, connected, clients, flash, lastRejection, clearRejection: () => setLastRejection(null), placeBid, rtm, remainingMs, rtmRemainingMs, nextBid, biddingOpen };
}
