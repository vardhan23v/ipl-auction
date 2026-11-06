"use client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "./supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any -- broadcast payloads are typed by each listener */
type Handler = (payload: any) => void;

/**
 * One Supabase Realtime channel per room (`room:CODE`), shared by every component on the page.
 * Server → client only: the API publishes snapshots via HTTP broadcast; all writes go through our API routes.
 * Synthetic events: "connect" / "disconnect" (channel status) and "presence" ({ clients }).
 */
class RoomBus {
  private listeners = new Map<string, Set<Handler>>();
  private channel: RealtimeChannel | null = null;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;
  connected = false;
  constructor(private code: string) {}

  on(event: string, h: Handler) {
    if (this.releaseTimer) { clearTimeout(this.releaseTimer); this.releaseTimer = null; }
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(h);
    this.open();
    return () => this.off(event, h);
  }
  off(event: string, h: Handler) {
    this.listeners.get(event)?.delete(h);
    if (![...this.listeners.values()].some((s) => s.size)) this.releaseTimer = setTimeout(() => this.close(), 5000);
  }
  private emit(event: string, payload: unknown) { this.listeners.get(event)?.forEach((h) => h(payload)); }

  private open() {
    if (this.channel) return;
    const key = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random());
    const ch = supabaseBrowser().channel(`room:${this.code}`, { config: { broadcast: { self: false }, presence: { key } } });
    ch.on("broadcast", { event: "*" }, ({ event, payload }) => this.emit(event, payload));
    ch.on("presence", { event: "sync" }, () => this.emit("presence", { clients: Object.keys(ch.presenceState()).length }));
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") { this.connected = true; setConn(true); this.emit("connect", null); ch.track({ at: Date.now() }).catch(() => {}); }
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") { if (this.connected) this.emit("disconnect", null); this.connected = false; setConn(false); }
    });
    this.channel = ch;
  }
  private close() {
    if (!this.channel) return;
    supabaseBrowser().removeChannel(this.channel); this.channel = null; this.connected = false;
    buses.delete(this.code);
  }
}

const buses = new Map<string, RoomBus>();
/** The shared realtime bus for a room code. */
export function roomBus(code: string) {
  const c = code.toUpperCase();
  let b = buses.get(c);
  if (!b) { b = new RoomBus(c); buses.set(c, b); }
  return b;
}

// ---- connection status for the reconnect overlay ---------------------------
export type Conn = { connected: boolean; attempts: number; downSince: number | null; now: number; offline: boolean };
export const CONN_SERVER: Conn = { connected: true, attempts: 0, downSince: null, now: 0, offline: false };
let conn: Conn = { ...CONN_SERVER, connected: false, downSince: null };
let everConnected = false;
const connListeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;
function patch(p: Partial<Conn>) { conn = { ...conn, ...p }; connListeners.forEach((l) => l()); }
function setConn(up: boolean) {
  if (up) { everConnected = true; patch({ connected: true, downSince: null, attempts: 0 }); if (ticker) { clearInterval(ticker); ticker = null; } return; }
  patch({ connected: false, downSince: conn.downSince ?? Date.now(), now: Date.now(), attempts: conn.attempts + 1 });
  ticker ??= setInterval(() => patch({ now: Date.now() }), 1000);
}
let boundNet = false;
export function subscribeConn(l: () => void) {
  connListeners.add(l);
  if (!boundNet && typeof window !== "undefined") {
    boundNet = true;
    window.addEventListener("online", () => patch({ offline: false }));
    window.addEventListener("offline", () => patch({ offline: true }));
    patch({ offline: !navigator.onLine });
  }
  return () => { connListeners.delete(l); };
}
/** Before the first successful subscribe we report "connected" so the overlay doesn't flash on page load. */
export const getConn = () => (everConnected || conn.offline ? conn : CONN_SERVER);
