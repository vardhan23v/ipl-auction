"use client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
export function DangerZone({ code }: { code: string }) {
  const r = useRouter(); const { push } = useToast();
  async function del() {
    if (!confirm("Delete this room for everyone? All teams, players, bids and results in it are removed.")) return;
    if (!confirm("Really delete? This cannot be undone.")) return;
    const res = await fetch(`/api/rooms/${code}`, { method: "DELETE" }); if (!res.ok) return push({ title: "Failed", tone: "error" });
    r.push("/rooms");
  }
  return <div className="card mt-8 border-live/40 p-4"><div className="display text-lg text-live">Danger zone</div><p className="mt-1 text-sm text-muted">Reset the auction from the host console (keeps members and pool). Deleting the room removes everything.</p><button className="btn-red mt-3" onClick={del}>Delete room</button></div>;
}
