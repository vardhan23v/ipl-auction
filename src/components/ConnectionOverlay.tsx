"use client";
/** Full-screen takeover when the realtime socket drops. Auto-hides on reconnect. */
import { useEffect, useRef, useSyncExternalStore } from "react";
import { subscribeConn, getConn, CONN_SERVER } from "@/lib/realtime-client";
import { useToast } from "@/components/Toast";
const SHOW_AFTER_MS = 2500;

export function ConnectionOverlay({ size = "normal" }: { size?: "normal" | "big" }) {
  const c = useSyncExternalStore(subscribeConn, getConn, () => CONN_SERVER);
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
      <div className="mt-8 flex gap-3"><button onClick={() => window.location.reload()} className={`btn-gold ${big ? "!px-8 !py-4 text-[2.5vh]" : ""}`}>Reload page</button></div>
    </div>
  );
}
