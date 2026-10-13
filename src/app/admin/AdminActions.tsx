"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Platform admin: delete a room (and everything inside it) after a confirm prompt. */
export function DeleteRoomButton({ code, name }: { code: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function onDelete() {
    if (!confirm(`Delete room ${code} (“${name}”)? This removes its teams, players, bids and history. This cannot be undone.`)) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Delete failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={onDelete} disabled={busy} className="btn-ghost !px-3 !py-1.5 text-xs text-live hover:!border-live/60" aria-label={`Delete room ${code}`}>
        {busy ? "Deleting…" : "Delete"}
      </button>
      {err && <span className="max-w-[12rem] text-right text-[11px] text-live">{err}</span>}
    </span>
  );
}
