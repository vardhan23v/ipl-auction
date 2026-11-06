"use client";
import { useState } from "react";
import type { AuctionSnapshot } from "@/types/auction";
import { useToast } from "../Toast";
import { Sheet } from "../Sheet";
import { useRoom, roomApi } from "../RoomContext";

/** The host's only powers once the auction runs: pause/resume, undo the last result, end the auction. */
export function HostMenu({ snap }: { snap: AuctionSnapshot }) {
  const { code } = useRoom(); const { push } = useToast();
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState<string | null>(null);
  const st = snap.state;
  async function act(action: "PAUSE" | "RESUME" | "UNDO" | "COMPLETE", confirm?: string) {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(action);
    try {
      const r = await fetch(roomApi(code, "/control"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) push({ title: "Not possible right now", body: j.error, tone: "error" }); else setOpen(false);
    } finally { setBusy(null); }
  }
  if (st === "WAITING" || st === "COMPLETED") return null;
  const paused = st === "PAUSED";
  return (
    <>
      <button onClick={() => setOpen(true)} className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold ${paused ? "border-gold/60 bg-gold/10 text-gold" : "border-line bg-panel-2 text-ink"}`} aria-label="Host controls">
        {paused ? "Paused" : "Host"} <span aria-hidden>⋯</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Host controls">
        <div className="flex flex-col gap-2 pb-2">
          {paused
            ? <button className="btn-green tap text-base" disabled={!!busy} onClick={() => act("RESUME")}>▶ Resume auction</button>
            : <button className="btn-gold tap text-base" disabled={!!busy || st.startsWith("RTM")} onClick={() => act("PAUSE")}>⏸ Pause auction</button>}
          <button className="btn-ghost tap" disabled={!!busy || st.startsWith("RTM")} onClick={() => act("UNDO", "Undo the last result? The player goes back on the block; purse, squad and RTM card are restored.")}>↩ Undo last result</button>
          <button className="btn-ghost tap text-live" disabled={!!busy} onClick={() => act("COMPLETE", "End the auction now? Remaining players stay unsold and the results become final.")}>■ End auction</button>
          <p className="pt-1 text-xs text-muted">Players come up and sell automatically. Pausing freezes the clock; resuming continues it.</p>
        </div>
      </Sheet>
    </>
  );
}
