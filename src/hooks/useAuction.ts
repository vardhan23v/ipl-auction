"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket-client";
import { minNextBid } from "@/lib/rules";
import type { AuctionSnapshot, RtmAction } from "@/types/auction";

export interface FlashEvent { kind: "SOLD" | "UNSOLD" | "RTM"; playerName: string; teamName?: string; teamColor?: string; amount?: number; viaRtm?: boolean; id: number }
type Reply = { ok: boolean; error?: string; code?: string };

export function useAuction(initial?: AuctionSnapshot | null) {
  const [snap, setSnap] = useState<AuctionSnapshot | null>(initial ?? null);
  const [connected, setConnected] = useState(false);
  const [clients, setClients] = useState(0);
  const [flash, setFlash] = useState<FlashEvent | null>(null);
  const [lastRejection, setLastRejection] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const offset = useRef(0);

  useEffect(() => {
    const s = getSocket();
    const onSnap = (p: { snapshot?: AuctionSnapshot }) => { if (p?.snapshot) { setSnap(p.snapshot); offset.current = p.snapshot.serverTime - Date.now(); } };
    const events = ["state:sync", "auction:started", "auction:paused", "auction:resumed", "auction:completed", "player:started", "player:skipped", "player:next", "bid:accepted", "timer:updated", "team:purseUpdated", "auction:undo", "rtm:raise", "rtm:match"];
    events.forEach((e) => s.on(e, onSnap));
    s.on("player:sold", (p: { playerName: string; teamName: string; teamColor: string; amount: number; viaRtm?: boolean; snapshot: AuctionSnapshot }) => { onSnap(p); setFlash({ kind: "SOLD", playerName: p.playerName, teamName: p.teamName, teamColor: p.teamColor, amount: p.amount, viaRtm: p.viaRtm, id: Date.now() }); });
    s.on("player:unsold", (p: { playerName: string; snapshot: AuctionSnapshot }) => { onSnap(p); setFlash({ kind: "UNSOLD", playerName: p.playerName, id: Date.now() }); });
    s.on("rtm:offer", (p: { snapshot: AuctionSnapshot }) => { onSnap(p); const sn = p.snapshot; const t = sn.teams.find((x) => x.id === sn.rtm?.teamId); setFlash({ kind: "RTM", playerName: sn.currentPlayer?.name ?? "", teamName: t?.name, teamColor: t?.color, amount: sn.rtm?.finalAmount, id: Date.now() }); });
    s.on("bid:rejected", (p: { error: string }) => setLastRejection(p.error));
    s.on("presence", (p: { clients: number }) => setClients(p.clients));
    s.on("time", (p: { serverTime: number }) => { offset.current = p.serverTime - Date.now(); });
    s.on("connect", () => { setConnected(true); s.emit("state:request"); });
    s.on("disconnect", () => setConnected(false));
    if (s.connected) { setConnected(true); s.emit("state:request"); }
    const tick = setInterval(() => setNow(Date.now() + offset.current), 200);
    return () => { events.forEach((e) => s.off(e, onSnap)); ["player:sold", "player:unsold", "rtm:offer", "bid:rejected", "presence", "time"].forEach((e) => s.off(e)); clearInterval(tick); };
  }, []);

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
