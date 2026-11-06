"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TeamBadge } from "@/components/TeamBadge";
import { useToast } from "@/components/Toast";
import { getSocket, reconnectSocket } from "@/lib/socket-client";
import { money } from "@/lib/format";
import type { AuctionSnapshot, RoomAccess } from "@/types/auction";

type T = { id: string; name: string; abbreviation: string; color: string; color2: string | null; logoUrl: string | null; purse: number; squadCount: number; rtmTotal: number; rtmUsed: number; formerCount: number; owner: { id: string; name: string; image: string | null; isGuest: boolean } | null };
type M = { id: string; name: string; image: string | null; isGuest: boolean; role: string; team: string | null };
type R = { name: string; state: string; isPublic: boolean; hostName: string; hostId: string; maxSquad: number; purse: number; rtmCards: number; timer: number };

/** Room lobby: the code to share, one status card (set up / waiting / live) and the franchises to claim. */
export function Lobby({ code, room: roomProp, access, me, teams: teamsProp, members, initial }: { code: string; room: R; access: RoomAccess; me: { id: string; name: string } | null; teams: T[]; members: M[]; initial: AuctionSnapshot }) {
  const r = useRouter(); const { push } = useToast();
  const [busy, setBusy] = useState(false); const [copied, setCopied] = useState(false);
  // Purses and state come from socket snapshots; only ownership / team-list changes need a (debounced) server refresh.
  const [live, setLive] = useState<{ teams: T[]; state: string; from: T[] }>({ teams: teamsProp, state: initial.state ?? roomProp.state, from: teamsProp });
  if (live.from !== teamsProp) setLive({ teams: teamsProp, state: roomProp.state, from: teamsProp });
  const teams = live.teams; const state = live.state;
  const shape = useRef("");
  useEffect(() => { shape.current = teamsProp.map((t) => `${t.id}:${t.owner?.id ?? ""}`).join(","); }, [teamsProp]);
  useEffect(() => {
    const s = getSocket(); let t: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => { clearTimeout(t); t = setTimeout(() => r.refresh(), 300); };
    const onSnap = (p: { snapshot?: AuctionSnapshot }) => {
      const sn = p?.snapshot; if (!sn || sn.roomCode !== code) return;
      setLive((cur) => ({ ...cur, state: sn.state, teams: cur.teams.map((x) => { const y = sn.teams.find((z) => z.id === x.id); return y ? { ...x, purse: y.purse, squadCount: y.squadCount } : x; }) }));
      if (sn.teams.map((x) => `${x.id}:${x.ownerId ?? ""}`).join(",") !== shape.current) refresh();
    };
    const ev = ["state:sync", "team:purseUpdated", "player:sold", "auction:undo", "auction:started", "auction:completed"];
    ev.forEach((e) => s.on(e, onSnap)); s.on("room:members", refresh);
    s.emit("room:join", { code });
    return () => { clearTimeout(t); ev.forEach((e) => s.off(e, onSnap)); s.off("room:members", refresh); };
  }, [r, code]);

  const mine = me ? teams.find((t) => t.owner?.id === me.id) : undefined;
  const taken = teams.filter((t) => t.owner).length;
  const isHost = access.isHost || access.isAdmin;
  const waiting = state === "WAITING", done = state === "COMPLETED";

  async function post(path: string, body?: object, method = "POST") {
    setBusy(true);
    const res = await fetch(`/api/rooms/${code}${path}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await res.json().catch(() => ({})); setBusy(false);
    if (!res.ok) push({ title: "Not possible", body: j.error, tone: "error" });
    return res.ok;
  }
  async function claim(t: T) { if (await post("/claim", { teamId: t.id })) { push({ title: `You manage ${t.name}`, tone: "success" }); await reconnectSocket(); r.refresh(); } }
  async function release() { if (!confirm("Release your franchise and watch instead?")) return; if (await post("/claim", undefined, "DELETE")) { await reconnectSocket(); r.refresh(); } }
  async function invite() {
    const link = `${window.location.origin}/r/${code}`;
    try { if (navigator.share) { await navigator.share({ title: `${roomProp.name} · ${code}`, text: `Join my IPL auction — room ${code}`, url: link }); return; } } catch { return; }
    navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-4 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="display truncate text-3xl">{roomProp.name}</h1>
          <div className="text-sm text-muted">Hosted by {roomProp.hostName} · {members.length} in the room</div>
        </div>
        <button onClick={invite} className="flex shrink-0 flex-col items-center rounded-xl border border-line bg-panel px-3 py-2" aria-label="Invite friends">
          <span className="font-mono text-lg font-bold tracking-[.25em] text-gold">{code}</span>
          <span className="text-xs text-muted">{copied ? "Link copied ✓" : "Tap to invite"}</span>
        </button>
      </div>

      {/* One status card: what happens next */}
      <div className="card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold">{done ? "Auction finished" : waiting ? (isHost ? "Set up your auction" : "Waiting for the host to start") : "The auction is live"}</div>
          <div className="text-sm text-muted">{done ? "See how every franchise did." : waiting ? (isHost ? `Rules, players and teams — then start. ${taken}/${teams.length} franchises claimed.` : `${taken}/${teams.length} franchises claimed${mine ? ` · you have ${mine.abbreviation}` : " · pick one below"}.`) : mine ? `You're bidding for ${mine.name}.` : "Watch the bidding live."}</div>
        </div>
        {done ? <Link href={`/r/${code}/results`} className="btn-gold tap shrink-0">Results</Link>
          : waiting ? (isHost ? <Link href={`/r/${code}/setup`} className="btn-gold tap shrink-0">Set up & start →</Link> : null)
          : <Link href={`/r/${code}/live`} className="btn-red tap shrink-0"><span className="live-dot inline-block h-2 w-2 rounded-full bg-white" />Go live</Link>}
      </div>

      {!me && <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm"><Link href={`/login?next=/r/${code}`} className="font-bold text-gold underline">Sign in</Link> to claim a franchise — or just <Link href={`/r/${code}/live`} className="underline">watch</Link>.</div>}

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-widest text-muted">{mine ? "Franchises" : "Pick your franchise"}</h2>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {teams.map((t) => {
          const isMine = !!me && t.owner?.id === me.id; const isTaken = !!t.owner && !isMine;
          return (
            <div key={t.id} className={`card flex flex-col gap-2 p-3 ${isMine ? "border-gold" : ""} ${isTaken ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-2.5"><TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={36} /><div className="min-w-0"><div className="font-bold leading-tight">{t.abbreviation}</div><div className="truncate text-xs text-muted">{t.owner ? t.owner.name : t.name}</div></div></div>
              <div className="flex items-center justify-between text-xs text-muted"><span className="money font-semibold">{money(t.purse)}</span><span>{t.squadCount}/{roomProp.maxSquad}</span></div>
              {isMine ? (waiting || t.squadCount === 0 ? <button className="btn-ghost min-h-9 !py-1 text-sm" disabled={busy} onClick={release}>Yours · release</button> : <div className="rounded-lg bg-gold/15 py-1.5 text-center text-sm font-semibold text-gold">Yours</div>)
                : isTaken ? <div className="py-1.5 text-center text-sm text-muted">Taken</div>
                : me ? <button className="btn-gold min-h-9 !py-1 text-sm" disabled={busy} onClick={() => claim(t)}>{mine ? "Switch" : "Claim"}</button>
                : <Link href={`/login?next=/r/${code}`} className="btn-ghost min-h-9 !py-1 text-sm">Sign in</Link>}
            </div>
          );
        })}
      </div>
    </main>
  );
}
