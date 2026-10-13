"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { TeamBadge } from "@/components/TeamBadge";
import { RtmCards } from "@/components/auction/PursePanel";
import { useToast } from "@/components/Toast";
import { getSocket, reconnectSocket } from "@/lib/socket-client";
import { money } from "@/lib/format";

type T = { id: string; name: string; abbreviation: string; color: string; color2: string | null; logoUrl: string | null; purse: number; squadCount: number; rtmTotal: number; rtmUsed: number; formerCount: number; owner: { id: string; name: string; image: string | null; isGuest: boolean } | null };

export function Lobby({ me, teams, auctionState, maxSquad }: { me: { id: string; name: string; teamId: string | null }; teams: T[]; auctionState: string; maxSquad: number }) {
  const r = useRouter(); const { push } = useToast(); const { update } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  // Other managers claiming franchises show up live.
  useEffect(() => { const s = getSocket(); const f = () => r.refresh(); s.on("team:purseUpdated", f); s.on("state:sync", f); return () => { s.off("team:purseUpdated", f); s.off("state:sync", f); }; }, [r]);
  const mine = teams.find((t) => t.owner?.id === me.id);
  const taken = teams.filter((t) => t.owner).length;

  async function claim(t: T) {
    setBusy(t.id);
    const res = await fetch("/api/franchise/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId: t.id }) });
    const j = await res.json(); setBusy(null);
    if (!res.ok) return push({ title: "Couldn't claim", body: j.error, tone: "error" });
    push({ title: `You now manage ${t.name}`, tone: "success" });
    await update(); await reconnectSocket(); r.refresh();
  }
  async function release() {
    if (!confirm("Release your franchise and go back to spectating?")) return;
    setBusy("release");
    const res = await fetch("/api/franchise/claim", { method: "DELETE" }); const j = await res.json(); setBusy(null);
    if (!res.ok) return push({ title: "Couldn't release", body: j.error, tone: "error" });
    await update(); await reconnectSocket(); r.refresh();
  }
  return (
    <main className="stadium relative mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gold">Welcome, {me.name}</div>
          <h1 className="display text-5xl">{mine ? "Your franchise is ready" : "Choose your franchise"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{mine ? `You manage ${mine.name}. Head to your franchise room to bid when the auction goes live.` : "Claim a free franchise to bid in the auction. Franchises already taken by another manager are locked."}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>{taken}/{teams.length} franchises claimed</span>
          {mine && <Link href="/owner" className="btn-gold">Enter my franchise room →</Link>}
          <Link href="/live" className="btn-ghost">Just watch</Link>
        </div>
      </div>
      {auctionState !== "WAITING" && <div className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-gold">The auction is {auctionState === "COMPLETED" ? "over" : "already live"} — you can still claim a free franchise and jump in.</div>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {teams.map((t) => {
          const isMine = t.owner?.id === me.id; const isTaken = !!t.owner && !isMine;
          return (
            <div key={t.id} className={`card relative overflow-hidden p-4 transition ${isMine ? "border-gold shadow-[0_0_30px_rgba(245,184,46,.2)]" : isTaken ? "opacity-60" : "hover:border-gold/50"}`}>
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${t.color}, ${t.color2 ?? t.color})` }} />
              <div className="flex items-center gap-3">
                <TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={48} />
                <div className="min-w-0"><div className="display truncate text-xl">{t.abbreviation}</div><div className="truncate text-xs text-muted">{t.name}</div></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-panel-2 p-2"><div className="text-[10px] uppercase text-muted">Purse</div><div className="money font-bold">{money(t.purse)}</div></div>
                <div className="rounded-lg bg-panel-2 p-2"><div className="text-[10px] uppercase text-muted">Squad</div><div className="font-bold">{t.squadCount}/{maxSquad}</div></div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted"><span>{t.formerCount} RTM-eligible</span><RtmCards total={t.rtmTotal} used={t.rtmUsed} /></div>
              <div className="mt-3 min-h-[2.5rem]">
                {isMine ? (
                  <div className="flex items-center justify-between"><span className="rounded bg-gold/20 px-2 py-1 text-xs font-bold text-gold">YOUR FRANCHISE</span>{auctionState === "WAITING" || t.squadCount === 0 ? <button className="text-xs text-muted hover:text-live" disabled={busy === "release"} onClick={release}>release</button> : null}</div>
                ) : isTaken ? (
                  <div className="flex items-center gap-2 text-xs text-muted">
                    {t.owner!.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={t.owner!.image} alt="" className="h-5 w-5 rounded-full" /> : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-panel-2 text-[10px] font-bold">{t.owner!.name[0]}</span>}
                    <span className="truncate">Managed by <b className="text-ink">{t.owner!.name}</b>{t.owner!.isGuest ? " (guest)" : ""}</span>
                  </div>
                ) : (
                  <button className="btn-gold w-full !py-2" disabled={!!busy} onClick={() => claim(t)}>{busy === t.id ? "Claiming…" : mine ? "Switch to this franchise" : "Claim franchise"}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
