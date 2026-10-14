"use client";
/* eslint-disable @next/next/no-img-element -- remote OAuth avatars */
import { useEffect, useState } from "react";
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

export function Lobby({ code, room, access, me, teams, members, initial }: { code: string; room: R; access: RoomAccess; me: { id: string; name: string } | null; teams: T[]; members: M[]; initial: AuctionSnapshot }) {
  const r = useRouter(); const { push } = useToast();
  const [busy, setBusy] = useState<string | null>(null); const [copied, setCopied] = useState(false);
  useEffect(() => { const s = getSocket(); const f = () => r.refresh(); ["team:purseUpdated", "state:sync", "room:members", "auction:started"].forEach((e) => s.on(e, f)); return () => { ["team:purseUpdated", "state:sync", "room:members", "auction:started"].forEach((e) => s.off(e, f)); }; }, [r]);
  const mine = me ? teams.find((t) => t.owner?.id === me.id) : undefined;
  const taken = teams.filter((t) => t.owner).length;
  const isHost = access.isHost || access.isAdmin;
  const link = typeof window !== "undefined" ? `${window.location.origin}/r/${code}` : `/r/${code}`;

  async function post(path: string, body?: object, method = "POST") { setBusy(path); const res = await fetch(`/api/rooms/${code}${path}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); const j = await res.json().catch(() => ({})); setBusy(null); if (!res.ok) push({ title: "Failed", body: j.error, tone: "error" }); return res.ok; }
  async function claim(t: T) { if (await post("/claim", { teamId: t.id })) { push({ title: `You now manage ${t.name}`, tone: "success" }); await reconnectSocket(); r.refresh(); } }
  async function release() { if (!confirm("Release your franchise and go back to spectating?")) return; if (await post("/claim", undefined, "DELETE")) { await reconnectSocket(); r.refresh(); } }
  async function control(action: string, msg?: string) { if (msg && !confirm(msg)) return; if (await post("/control", { action })) push({ title: action.replace(/_/g, " "), tone: "success" }); }
  function copy() { navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }

  return (
    <main className="stadium relative mx-auto max-w-7xl px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-widest text-gold">Auction room · hosted by {room.hostName}</div>
          <h1 className="display truncate text-4xl md:text-5xl">{room.name}</h1>
          <p className="mt-1 text-sm text-muted">{money(room.purse)} per franchise · {room.maxSquad}-man squads · {room.rtmCards} RTM cards · {room.timer}s clock{room.isPublic ? " · public room" : " · private room"}</p>
        </div>
        <div className="card flex items-center gap-3 p-3">
          <div><div className="text-[10px] uppercase tracking-widest text-muted">Room code</div><div className="font-mono text-2xl font-bold tracking-[.3em] text-gold">{code}</div></div>
          <button className="btn-ghost !py-2" onClick={copy}>{copied ? "Copied ✓" : "Copy invite link"}</button>
        </div>
      </div>

      {!me && <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm"><Link href={`/login?next=/r/${code}`} className="font-bold text-gold underline">Sign in</Link> (Google or guest) to claim a franchise and bid. You can also just <Link href={`/r/${code}/live`} className="underline">watch live</Link>.</div>}

      <div className="mt-6"><RoomLivePreview code={code} initial={initial} /></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="display text-3xl">{mine ? "Your franchise" : "Choose your franchise"}</h2>
            <div className="flex items-center gap-2 text-sm text-muted"><span>{taken}/{teams.length} claimed</span>{mine && <Link href={`/r/${code}/owner`} className="btn-gold !py-1.5">Enter my franchise room →</Link>}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">
            {teams.map((t) => {
              const isMine = !!me && t.owner?.id === me.id; const isTaken = !!t.owner && !isMine;
              return (
                <div key={t.id} className={`card relative overflow-hidden p-3 transition ${isMine ? "border-gold shadow-[0_0_30px_rgba(245,184,46,.2)]" : isTaken ? "opacity-70" : "hover:border-gold/50"}`}>
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${t.color}, ${t.color2 ?? t.color})` }} />
                  <div className="flex items-center gap-2.5"><TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={40} /><div className="min-w-0"><div className="display truncate text-lg leading-tight">{t.abbreviation}</div><div className="truncate text-[11px] text-muted">{t.name}</div></div></div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted"><span className="money font-bold">{money(t.purse)}</span><span>{t.squadCount}/{room.maxSquad}</span><RtmCards total={t.rtmTotal} used={t.rtmUsed} /></div>
                  <div className="mt-2 min-h-[2.25rem]">
                    {isMine ? <div className="flex items-center justify-between"><span className="rounded bg-gold/20 px-2 py-1 text-[11px] font-bold text-gold">YOURS</span>{(room.state === "WAITING" || t.squadCount === 0) && <button className="text-[11px] text-muted hover:text-live" disabled={busy === "/claim"} onClick={release}>release</button>}</div>
                      : isTaken ? <div className="flex items-center gap-1.5 text-[11px] text-muted">{t.owner!.image ? <img src={t.owner!.image} alt="" className="h-5 w-5 rounded-full" /> : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-panel-2 text-[10px] font-bold">{t.owner!.name[0]}</span>}<span className="truncate"><b className="text-ink">{t.owner!.name}</b></span></div>
                      : me ? <button className="btn-gold w-full !py-1.5 text-sm" disabled={!!busy} onClick={() => claim(t)}>{busy === "/claim" ? "…" : mine ? "Switch" : "Claim"}</button>
                      : <Link href={`/login?next=/r/${code}`} className="btn-ghost w-full !py-1.5 text-sm">Sign in to claim</Link>}
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
              {room.state === "WAITING" && <div className="mt-2 text-[11px] text-muted">Unclaimed franchises can still be claimed after the start. Only a franchise&apos;s manager can bid for it — unclaimed teams sit out.</div>}
            </div>
          )}
          <div className="card p-4">
            <div className="flex items-center justify-between"><h3 className="display text-lg">In the room</h3><span className="text-xs text-muted">{members.length}</span></div>
            <div className="mt-2 flex flex-col gap-1.5">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  {m.image ? <img src={m.image} alt="" className="h-6 w-6 rounded-full" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-panel-2 text-[11px] font-bold">{m.name[0]}</span>}
                  <span className="min-w-0 flex-1 truncate">{m.name}{m.isGuest && <span className="text-muted"> (guest)</span>}</span>
                  {m.id === room.hostId ? <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold">HOST</span> : null}
                  {m.team && <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[10px] font-bold">{m.team}</span>}
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
    </main>
  );
}
