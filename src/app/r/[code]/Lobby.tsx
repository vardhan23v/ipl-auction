"use client";
/* eslint-disable @next/next/no-img-element -- remote OAuth avatars */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TeamBadge } from "@/components/TeamBadge";
import { RtmCards } from "@/components/auction/PursePanel";
import { RoomLivePreview } from "@/components/auction/RoomLivePreview";
import { useToast } from "@/components/Toast";
import { getSocket, reconnectSocket } from "@/lib/socket-client";
import { money } from "@/lib/format";
import type { AuctionSnapshot, RoomAccess } from "@/types/auction";

type T = { id: string; name: string; abbreviation: string; color: string; color2: string | null; logoUrl: string | null; purse: number; squadCount: number; rtmTotal: number; rtmUsed: number; formerCount: number; owner: { id: string; name: string; image: string | null; isGuest: boolean } | null };
type M = { id: string; name: string; image: string | null; isGuest: boolean; role: string; team: string | null };
type R = { name: string; state: string; isPublic: boolean; hostName: string; hostId: string; maxSquad: number; purse: number; rtmCards: number; timer: number };

export function Lobby({ code, room: roomProp, access, me, teams: teamsProp, members, initial }: { code: string; room: R; access: RoomAccess; me: { id: string; name: string } | null; teams: T[]; members: M[]; initial: AuctionSnapshot }) {
  const r = useRouter(); const { push } = useToast();
  const [busy, setBusy] = useState<string | null>(null); const [copied, setCopied] = useState(false);
  // Purses/squads/state come straight from socket snapshots; only membership or ownership changes need a (debounced) server refresh.
  const [live, setLive] = useState<{ teams: T[]; state: string; from: T[] }>({ teams: teamsProp, state: roomProp.state, from: teamsProp });
  if (live.from !== teamsProp) setLive({ teams: teamsProp, state: roomProp.state, from: teamsProp });
  const teams = live.teams; const room = { ...roomProp, state: live.state };
  const owners = useRef("");
  useEffect(() => { owners.current = teamsProp.map((t) => t.owner?.id ?? "").join(","); }, [teamsProp]);
  useEffect(() => {
    const s = getSocket(); let t: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => { clearTimeout(t); t = setTimeout(() => r.refresh(), 300); };
    const onSnap = (p: { snapshot?: AuctionSnapshot }) => {
      const sn = p?.snapshot; if (!sn || sn.roomCode !== code) return;
      setLive((cur) => ({ ...cur, state: sn.state, teams: cur.teams.map((x) => { const y = sn.teams.find((z) => z.id === x.id); return y ? { ...x, purse: y.purse, squadCount: y.squadCount, rtmUsed: y.rtmUsed, rtmTotal: y.rtmTotal } : x; }) }));
      if (sn.teams.map((x) => x.ownerId ?? "").join(",") !== owners.current) refresh();
    };
    const ev = ["state:sync", "team:purseUpdated", "player:sold", "auction:undo", "auction:started", "auction:completed"];
    ev.forEach((e) => s.on(e, onSnap)); s.on("room:members", refresh);
    return () => { clearTimeout(t); ev.forEach((e) => s.off(e, onSnap)); s.off("room:members", refresh); };
  }, [r, code]);
  const mine = me ? teams.find((t) => t.owner?.id === me.id) : undefined;
  const taken = teams.filter((t) => t.owner).length;
  const isHost = access.isHost || access.isAdmin;
  const link = typeof window !== "undefined" ? `${window.location.origin}/r/${code}` : `/r/${code}`;

  async function post(path: string, body?: object, method = "POST") { setBusy(path); const res = await fetch(`/api/rooms/${code}${path}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); const j = await res.json().catch(() => ({})); setBusy(null); if (!res.ok) push({ title: "Failed", body: j.error, tone: "error" }); return res.ok; }
  async function claim(t: T) { if (await post("/claim", { teamId: t.id })) { push({ title: `You now manage ${t.name}`, tone: "success" }); await reconnectSocket(); r.refresh(); } }
  async function release() { if (!confirm("Release your franchise and go back to spectating?")) return; if (await post("/claim", undefined, "DELETE")) { await reconnectSocket(); r.refresh(); } }
  async function control(action: string, msg?: string) { if (msg && !confirm(msg)) return; if (await post("/control", { action })) push({ title: action.replace(/_/g, " "), tone: "success" }); }
  async function copy() {
    try { if (navigator.share && window.matchMedia("(max-width: 767px)").matches) { await navigator.share({ title: `${room.name} · ${code}`, text: `Join my IPL auction room ${code}`, url: link }); return; } } catch { return; }
    navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }
  const dockAction = isHost ? (room.state === "WAITING" ? "start" : room.state === "COMPLETED" ? null : "host") : mine ? "mine" : null;

  return (
    <main className={`stadium relative mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-8 ${dockAction ? "max-md:pb-24" : ""}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold uppercase tracking-widest text-gold">Hosted by {room.hostName}</div>
          <h1 className="display truncate text-3xl md:text-5xl">{room.name}</h1>
          <p className="mt-1 text-xs text-muted md:text-sm">{money(room.purse)} per franchise · {room.maxSquad}-man squads · {room.rtmCards} RTM cards · {room.timer}s clock{room.isPublic ? " · public room" : " · private room"}</p>
        </div>
        <div className="card flex items-center justify-between gap-3 p-3">
          <div><div className="text-xs uppercase tracking-widest text-muted">Room code</div><div className="font-mono text-2xl font-bold tracking-[.3em] text-gold">{code}</div></div>
          <button className="btn-ghost tap" onClick={copy}>{copied ? "Copied ✓" : <><span className="md:hidden">Invite friends</span><span className="hidden md:inline">Copy invite link</span></>}</button>
        </div>
      </div>

      {!me && <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm"><Link href={`/login?next=/r/${code}`} className="font-bold text-gold underline">Sign in</Link> (Google or guest) to claim a franchise and bid. You can also just <Link href={`/r/${code}/live`} className="underline">watch live</Link>.</div>}

      <div className="mt-4 md:mt-6"><RoomLivePreview code={code} initial={initial} /></div>

      <div className="mt-5 grid gap-5 md:mt-6 md:gap-6 lg:grid-cols-[1fr_300px]">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="display text-2xl md:text-3xl">{mine ? "Your franchise" : "Choose your franchise"}</h2>
            <div className="flex items-center gap-2 text-sm text-muted"><span>{taken}/{teams.length} claimed</span>{mine && <Link href={`/r/${code}/owner`} className="btn-gold hidden !py-1.5 md:inline-flex">Enter my franchise room →</Link>}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">
            {teams.map((t) => {
              const isMine = !!me && t.owner?.id === me.id; const isTaken = !!t.owner && !isMine;
              return (
                <div key={t.id} className={`card relative overflow-hidden p-3 transition ${isMine ? "border-gold shadow-[0_0_30px_rgba(245,184,46,.2)]" : isTaken ? "opacity-70" : "hover:border-gold/50"}`}>
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${t.color}, ${t.color2 ?? t.color})` }} />
                  <div className="flex items-center gap-2.5"><TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={40} /><div className="min-w-0"><div className="display truncate text-lg leading-tight">{t.abbreviation}</div><div className="truncate text-xs text-muted">{t.name}</div></div></div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted"><span className="money font-bold">{money(t.purse)}</span><span>{t.squadCount}/{room.maxSquad}</span><RtmCards total={t.rtmTotal} used={t.rtmUsed} /></div>
                  <div className="mt-2 min-h-[2.25rem]">
                    {isMine ? <div className="flex items-center justify-between"><span className="rounded bg-gold/20 px-2 py-1 text-xs font-bold text-gold">YOURS</span>{(room.state === "WAITING" || t.squadCount === 0) && <button className="min-h-9 rounded-md px-2 text-xs text-muted hover:text-live" disabled={busy === "/claim"} onClick={release}>Release</button>}</div>
                      : isTaken ? <div className="flex items-center gap-1.5 text-xs text-muted">{t.owner!.image ? <img src={t.owner!.image} alt="" className="h-5 w-5 rounded-full" /> : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-panel-2 text-xs font-bold">{t.owner!.name[0]}</span>}<span className="truncate"><b className="text-ink">{t.owner!.name}</b></span></div>
                      : me ? <button className="btn-gold w-full min-h-10 !py-1.5 text-sm" disabled={!!busy} onClick={() => claim(t)}>{busy === "/claim" ? "…" : mine ? "Switch" : "Claim"}</button>
                      : <Link href={`/login?next=/r/${code}`} className="btn-ghost w-full min-h-10 !py-1.5 text-sm">Sign in to claim</Link>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <aside className="flex flex-col gap-4">
          {isHost && (
            <div className="card border-gold/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-gold">You&apos;re the host</div>
              <div className="mt-2 flex flex-col gap-2">
                {room.state === "WAITING" ? <button className="btn-green" disabled={!!busy} onClick={() => control("START_AUCTION", `Start the auction with ${taken} of ${teams.length} franchises claimed?`)}>▶ Start the auction</button> : <Link href={`/r/${code}/host`} className="btn-red">Open host console</Link>}
                {!["WAITING", "COMPLETED"].includes(room.state) && <button className="btn-ghost text-live" disabled={!!busy} onClick={() => control("COMPLETE", "End the auction now? Players still in the queue stay unsold and the results become final.")}>■ End the auction</button>}
                <Link href={`/r/${code}/manage`} className="btn-ghost">Manage room (players, teams, settings)</Link>
                <Link href={`/r/${code}/display`} className="btn-ghost">⛶ Big-screen view</Link>
              </div>
              {room.state === "WAITING" && <div className="mt-2 text-xs text-muted">Unclaimed franchises can still be claimed after the start. Only a franchise&apos;s manager can bid for it — unclaimed teams sit out.</div>}
            </div>
          )}
          <div className="card p-4">
            <div className="flex items-center justify-between"><h3 className="display text-lg">In the room</h3><span className="text-xs text-muted">{members.length}</span></div>
            <div className="mt-2 flex flex-col gap-1.5">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  {m.image ? <img src={m.image} alt="" className="h-6 w-6 rounded-full" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-panel-2 text-xs font-bold">{m.name[0]}</span>}
                  <span className="min-w-0 flex-1 truncate">{m.name}{m.isGuest && <span className="text-muted"> (guest)</span>}</span>
                  {m.id === room.hostId ? <span className="rounded bg-gold/20 px-1.5 py-0.5 text-xs font-bold text-gold">HOST</span> : null}
                  {m.team && <span className="rounded bg-panel-2 px-1.5 py-0.5 text-xs font-bold">{m.team}</span>}
                </div>
              ))}
              {members.length === 0 && <div className="text-sm text-muted">Nobody yet — share the code.</div>}
            </div>
          </div>
          <div className="card p-4 text-sm text-muted">
            <div className="display text-lg text-ink">How it works</div>
            <ol className="mt-1 list-decimal space-y-1 pl-4"><li>Friends open the invite link and sign in (Google or guest).</li><li>Everyone claims a franchise.</li><li>The host starts the auction; players come up by set with a {room.timer}s clock.</li><li>Bid from your phone; use RTM cards on your former players.</li></ol>
          </div>
        </aside>
      </div>
      {dockAction && (
        <div className="safe-x fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-line/70 bg-pitch/95 px-3 py-2 backdrop-blur md:hidden">
          {dockAction === "start" && <button className="btn-green tap w-full text-base" disabled={!!busy} onClick={() => control("START_AUCTION", `Start the auction with ${taken} of ${teams.length} franchises claimed?`)}>▶ Start the auction · {taken}/{teams.length} claimed</button>}
          {dockAction === "host" && <Link href={`/r/${code}/host`} className="btn-red tap w-full text-base">Open host console →</Link>}
          {dockAction === "mine" && <Link href={`/r/${code}/live`} className="btn-gold tap w-full text-base">{room.state === "WAITING" ? `Waiting for host · ${mine!.abbreviation} ready` : `Go to live bidding · ${mine!.abbreviation} →`}</Link>}
        </div>
      )}
    </main>
  );
}
