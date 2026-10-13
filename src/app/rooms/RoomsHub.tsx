"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { useToast } from "@/components/Toast";
import { money } from "@/lib/format";

export type RoomCard = { code: string; name: string; state: string; isHost: boolean; host: string; members: number; myTeam: { abbreviation: string; color: string } | null; lastActiveAt: string };

const STATE_PILL: Record<string, string> = { LOBBY: "border-line text-muted", LIVE: "border-live/70 text-live", PAUSED: "border-gold/60 text-gold", COMPLETED: "border-emerald-500/60 text-emerald-400" };

function stateLabel(s: string) { return s.replace(/_/g, " "); }
function normCode(c: string) { return c.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); }

function renderToggle(label: string, hint: string, on: boolean, set: (v: boolean) => void) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)} className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${on ? "border-gold/60 bg-gold/10" : "border-line bg-panel-2"}`}>
      <span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-muted">{hint}</span></span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-gold" : "bg-line"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-black transition ${on ? "left-[22px]" : "left-0.5"}`} /></span>
    </button>
  );
}

function renderNum(label: string, value: number, set: (v: number) => void, min: number, max: number, suffix?: string) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="flex items-center gap-2">
        <input type="number" inputMode="numeric" className="input w-full" value={value} min={min} max={max} onChange={(e) => set(Number(e.target.value))} />
        {suffix && <span className="shrink-0 text-xs text-muted">{suffix}</span>}
      </div>
    </label>
  );
}

export function RoomsHub({ user, rooms }: { user: { id: string; name: string }; rooms: RoomCard[] }) {
  const r = useRouter(); const { push } = useToast();
  const [name, setName] = useState(`${user.name}'s Auction`);
  const [isPublic, setPublic] = useState(true);
  const [purseCr, setPurseCr] = useState(120);
  const [maxSquad, setMaxSquad] = useState(25);
  const [maxOverseas, setMaxOverseas] = useState(8);
  const [timer, setTimer] = useState(15);
  const [rtm, setRtm] = useState(true);
  const [rtmCards, setRtmCards] = useState(2);
  const [autoSell, setAutoSell] = useState(true);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setCreating(true);
    try {
      const res = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() || undefined, isPublic, startingPurse: Math.round(purseCr * 100), maxSquadSize: maxSquad, maxOverseas, timerSeconds: timer, rtmEnabled: rtm, defaultRtmCards: rtmCards, autoSell }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.code) { setErr(j.error ?? "Could not create the room"); push({ title: "Could not create room", body: j.error, tone: "error" }); return; }
      push({ title: "Room created", body: `Code ${j.code}`, tone: "success" });
      r.push(`/r/${j.code}`);
    } catch { setErr("Network error — try again"); } finally { setCreating(false); }
  }
  function join(e: React.FormEvent) { e.preventDefault(); const c = normCode(joinCode); if (c.length !== 6) { push({ title: "Enter the 6-character room code", tone: "error" }); return; } r.push(`/r/${c}`); }
  async function del(code: string) {
    if (!confirm(`Delete room ${code}? This removes all teams, players and bids in it.`)) return;
    setDeleting(code);
    const res = await fetch(`/api/rooms/${code}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    setDeleting(null);
    if (!res.ok) { push({ title: "Delete failed", body: j.error, tone: "error" }); return; }
    push({ title: `Room ${code} deleted`, tone: "success" }); r.refresh();
  }

  return (
    <>
      <Nav />
      <main className="stadium page-enter relative mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="text-xs font-semibold uppercase tracking-widest text-gold">Welcome, {user.name}</div>
        <h1 className="display text-4xl md:text-5xl">Your auction rooms</h1>
        <p className="mt-1 text-sm text-muted">Create a room and share the code, or join a friend&apos;s room. Each room has its own 10 franchises, player pool and purse.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="card sheen p-4 md:p-5">
            <h2 className="display text-2xl">Create a room</h2>
            <form onSubmit={create} className="mt-3 space-y-3">
              <label className="block"><span className="label">Room name</span><input className="input w-full" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={`${user.name}'s Auction`} /></label>
              <div className="grid grid-cols-2 gap-3">
                {renderNum("Purse per team", purseCr, setPurseCr, 1, 1000, `Cr = ${money(Math.round(purseCr * 100))}`)}
                {renderNum("Max squad", maxSquad, setMaxSquad, 1, 30)}
                {renderNum("Max overseas", maxOverseas, setMaxOverseas, 0, 30)}
                {renderNum("Bid timer", timer, setTimer, 5, 120, "sec")}
              </div>
              {renderToggle("Public room", "Listed in the public directory so anyone can find it", isPublic, setPublic)}
              {renderToggle("Right-To-Match cards", "Owners can match the winning bid for their former players", rtm, setRtm)}
              {rtm && renderNum("RTM cards per team", rtmCards, setRtmCards, 0, 10)}
              {renderToggle("Auto-sell on timer", "Hammer falls automatically when the clock hits zero", autoSell, setAutoSell)}
              {err && <p className="text-sm text-live">{err}</p>}
              <button type="submit" disabled={creating} className="btn-gold w-full !py-3 disabled:opacity-60">{creating ? "Creating…" : "Create room →"}</button>
            </form>
          </section>

          <div className="space-y-6">
            <section className="card p-4 md:p-5">
              <h2 className="display text-2xl">Join by code</h2>
              <p className="mt-1 text-xs text-muted">Ask the host for the 6-character code.</p>
              <form onSubmit={join} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input className="input w-full font-mono text-lg uppercase tracking-[.3em]" value={joinCode} onChange={(e) => setJoinCode(normCode(e.target.value))} placeholder="ABC234" maxLength={6} autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
                <button type="submit" className="btn-ghost shrink-0 !py-3 sm:!py-2">Join room</button>
              </form>
            </section>

            <section>
              <div className="flex items-center justify-between"><h2 className="display text-2xl">My rooms</h2><span className="text-xs text-muted">{rooms.length} room{rooms.length === 1 ? "" : "s"}</span></div>
              {rooms.length === 0 ? (
                <div className="card mt-3 p-5 text-center text-sm text-muted">You haven&apos;t joined any rooms yet. Create one on the left or join with a code.</div>
              ) : (
                <ul className="mt-3 space-y-3">
                  {rooms.map((room) => (
                    <li key={room.code} className="card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{room.name}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span className="font-mono text-sm font-bold tracking-[.25em] text-gold">{room.code}</span>
                            <span>· host {room.host}</span>
                            <span>· {room.members} member{room.members === 1 ? "" : "s"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`pill border ${STATE_PILL[room.state] ?? "border-line text-muted"}`}>{stateLabel(room.state)}</span>
                          {room.isHost ? <span className="pill border border-gold/60 text-gold">Host</span>
                            : room.myTeam ? <span className="pill border" style={{ borderColor: room.myTeam.color, color: room.myTeam.color }}>Owner · {room.myTeam.abbreviation}</span>
                            : <span className="pill border border-line text-muted">Spectator</span>}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/r/${room.code}`} className="btn-gold flex-1 text-center !py-2.5 sm:flex-none">Open</Link>
                        {room.isHost && <Link href={`/r/${room.code}/host`} className="btn-ghost flex-1 text-center !py-2.5 sm:flex-none">Host console</Link>}
                        {room.isHost && <button type="button" disabled={deleting === room.code} onClick={() => del(room.code)} className="btn-ghost !py-2.5 text-live disabled:opacity-60">{deleting === room.code ? "Deleting…" : "Delete"}</button>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
