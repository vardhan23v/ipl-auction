"use client";
/** Full-screen takeover when the realtime socket drops. Auto-hides on reconnect. */
import { useEffect, useRef, useSyncExternalStore } from "react";
import { getSocket } from "@/lib/socket-client";
import { useToast } from "@/components/Toast";
const SHOW_AFTER_MS = 2500;
type Conn = { connected: boolean; attempts: number; downSince: number | null; now: number; offline: boolean };
const SERVER: Conn = { connected: true, attempts: 0, downSince: null, now: 0, offline: false };
let conn: Conn = SERVER; const listeners = new Set<() => void>(); let ticker: ReturnType<typeof setInterval> | null = null; let bound = false;
function set(patch: Partial<Conn>) { conn = { ...conn, ...patch }; listeners.forEach((l) => l()); }
function bind() {
  if (bound) return; bound = true;
  const s = getSocket();
  const down = () => { if (conn.downSince == null) set({ connected: false, downSince: Date.now(), now: Date.now() }); if (!ticker) ticker = setInterval(() => set({ now: Date.now() }), 1000); };
  const up = () => { set({ connected: true, downSince: null, attempts: 0 }); if (ticker) { clearInterval(ticker); ticker = null; } };
  s.on("connect", up); s.on("disconnect", down); s.on("connect_error", down);
  s.io.on("reconnect_attempt", (n: number) => set({ attempts: n }));
  window.addEventListener("online", () => set({ offline: false })); window.addEventListener("offline", () => set({ offline: true }));
  set({ offline: !navigator.onLine });
  if (!s.connected) down();
}
function subscribe(l: () => void) { listeners.add(l); bind(); return () => { listeners.delete(l); }; }

export function ConnectionOverlay({ size = "normal" }: { size?: "normal" | "big" }) {
  const c = useSyncExternalStore(subscribe, () => conn, () => SERVER);
  const { push } = useToast(); const wasDown = useRef(false);
  const downFor = c.downSince ? Math.max(0, c.now - c.downSince) : 0;
  const visible = !c.connected && downFor >= SHOW_AFTER_MS;
  useEffect(() => { if (visible) wasDown.current = true; if (c.connected && wasDown.current) { wasDown.current = false; push({ title: "Back online", body: "Reconnected to the auction server.", tone: "success" }); } }, [visible, c.connected]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!visible) return null;
  const secs = Math.floor(downFor / 1000); const big = size === "big";
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-pitch/90 p-6 text-center backdrop-blur-md" role="alertdialog" aria-live="assertive">
      <span className={`live-dot mb-6 inline-block rounded-full bg-live ${big ? "h-6 w-6" : "h-3.5 w-3.5"}`} />
      <div className={`display font-bold leading-none text-live ${big ? "text-[9vh]" : "text-4xl md:text-6xl"}`}>{c.offline ? "You're offline" : "Connection lost"}</div>
      <p className={`mt-4 max-w-xl text-muted ${big ? "text-[3vh]" : "text-base md:text-lg"}`}>{c.offline ? "Your device has no internet connection." : "Lost contact with the auction server. Reconnecting automatically — the auction state lives on the server, nothing is lost."}</p>
      <div className={`mt-6 flex items-center gap-3 rounded-full border border-line bg-panel/80 px-4 py-2 tabular-nums text-muted ${big ? "text-[2.5vh]" : "text-sm"}`}><span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-gold" />{c.offline ? "Waiting for network…" : `Reconnecting… attempt ${c.attempts || 1} · ${secs}s`}</div>
      <div className="mt-8 flex gap-3"><button onClick={() => window.location.reload()} className={`btn-gold ${big ? "!px-8 !py-4 text-[2.5vh]" : ""}`}>Reload page</button>{!big && <a href="/api/health" target="_blank" rel="noreferrer" className="btn-ghost">Check server</a>}</div>
    </div>
  );
}
