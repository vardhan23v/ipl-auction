"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { useToast } from "@/components/Toast";

export type RoomCard = { code: string; name: string; state: string; isHost: boolean; host: string; members: number; myTeam: { abbreviation: string; color: string } | null; lastActiveAt: string };

const LABEL: Record<string, [string, string]> = { WAITING: ["Setting up", "text-muted"], PAUSED: ["Paused", "text-gold"], COMPLETED: ["Finished", "text-emerald-400"] };
const normCode = (c: string) => c.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

/** My rooms: join with a code, create a room (just a name — rules are set on the setup screen), and the rooms I'm in. */
export function RoomsHub({ user, rooms }: { user: { id: string; name: string }; rooms: RoomCard[] }) {
  const r = useRouter(); const { push } = useToast();
  const [name, setName] = useState(`${user.name}'s Auction`);
  const [isPublic, setPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setCreating(true);
    try {
      const res = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() || undefined, isPublic }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.code) { push({ title: "Could not create the room", body: j.error, tone: "error" }); return; }
      r.push(`/r/${j.code}/setup`);
    } catch { push({ title: "Network error — try again", tone: "error" }); } finally { setCreating(false); }
  }
  function join(e: React.FormEvent) { e.preventDefault(); const c = normCode(joinCode); if (c.length !== 6) { push({ title: "Enter the 6-character room code", tone: "error" }); return; } r.push(`/r/${c}`); }
  async function del(code: string) {
    if (!confirm(`Delete room ${code}? This removes its teams, players and bids.`)) return;
    setDeleting(code);
    const res = await fetch(`/api/rooms/${code}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    setDeleting(null);
    if (!res.ok) { push({ title: "Delete failed", body: j.error, tone: "error" }); return; }
    r.refresh();
  }

  return (
    <>
      <Nav />
      <main className="page-enter mx-auto max-w-2xl px-4 py-6">
        <h1 className="display text-3xl">Hi, {user.name}</h1>

        <form onSubmit={join} className="card mt-4 flex gap-2 p-3">
          <input className="input tap flex-1 font-mono text-lg uppercase tracking-[.3em]" value={joinCode} onChange={(e) => setJoinCode(normCode(e.target.value))} placeholder="ROOM CODE" maxLength={6} autoCapitalize="characters" autoCorrect="off" spellCheck={false} aria-label="Room code" />
          <button type="submit" className="btn-ghost tap shrink-0 !px-5">Join</button>
        </form>

        <form onSubmit={create} className="card mt-3 p-4">
          <div className="text-sm font-semibold">New auction</div>
          <div className="mt-2 flex gap-2">
            <input className="input tap flex-1" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-label="Room name" />
            <button type="submit" disabled={creating} className="btn-gold tap shrink-0 !px-5">{creating ? "…" : "Create"}</button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-muted"><input type="checkbox" className="h-4 w-4 accent-[#f5b82e]" checked={isPublic} onChange={(e) => setPublic(e.target.checked)} />List it on the home page</label>
          <p className="mt-1 text-xs text-muted">Purse, squads, clock, RTM, players and teams are set on the next screen.</p>
        </form>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-widest text-muted">Your rooms</h2>
        {rooms.length === 0 ? <div className="card mt-2 p-6 text-center text-sm text-muted">No rooms yet.</div> : (
          <ul className="mt-2 flex flex-col gap-2">
            {rooms.map((room) => { const [label, cls] = LABEL[room.state] ?? ["Live", "text-live"]; return (
              <li key={room.code} className="card flex items-center gap-3 p-3">
                <Link href={`/r/${room.code}`} className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{room.name}</div>
                  <div className="truncate text-xs text-muted"><span className="font-mono font-bold tracking-widest text-gold">{room.code}</span> · <span className={cls}>{label}</span> · {room.isHost ? "you host" : room.myTeam ? `you have ${room.myTeam.abbreviation}` : "watching"}</div>
                </Link>
                {room.isHost && room.state === "WAITING" && <Link href={`/r/${room.code}/setup`} className="btn-ghost !px-3 !py-1.5 text-sm">Set up</Link>}
                {room.isHost && <button type="button" disabled={deleting === room.code} onClick={() => del(room.code)} className="px-2 text-sm text-muted hover:text-live" aria-label={`Delete ${room.code}`}>✕</button>}
              </li>
            ); })}
          </ul>
        )}
      </main>
    </>
  );
}
