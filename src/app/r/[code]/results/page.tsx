import Link from "next/link";
import { loadRoomPage } from "@/lib/room-page";
import { TeamBadge } from "@/components/TeamBadge";
import { money, ROLE_LABEL } from "@/lib/format";
import { getStats, getTeamsWithSquads } from "@/lib/queries";
import { RoomShell } from "../RoomShell";
export const dynamic = "force-dynamic";
export const metadata = { title: "Results" };
const ORDER = ["BATSMAN", "WICKETKEEPER", "ALL_ROUNDER", "BOWLER"];

export default async function Results({ params }: { params: Promise<{ code: string }> }) {
  const { room, access } = await loadRoomPage((await params).code, "any");
  const [st, { teams, strength }] = await Promise.all([getStats(room.id), getTeamsWithSquads(room.id)]);
  const complete = room.state === "COMPLETED";
  const board = [...teams].map((t) => ({ t, s: strength[t.id], dq: t.squadCount < room.minSquadSize })).sort((a, b) => Number(a.dq) - Number(b.dq) || b.s.avg - a.s.avg || b.s.total - a.s.total);
  return (
    <RoomShell room={room} access={access}>
      <main className="stadium relative mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-gold">{complete ? "The gavel has fallen" : "Results so far"}</div>
          <h1 className="display text-5xl md:text-8xl">{complete ? "Auction Complete" : "Auction In Progress"}</h1>
          {complete ? <p className="mx-auto mt-3 max-w-xl text-muted">{st.sold} players found their price, {st.rtmSales} came home via RTM.</p> : <p className="mt-3 text-muted">The auction is still running — <Link className="text-gold underline" href={`/r/${room.code}/live`}>watch it live</Link>.</p>}
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[["Players sold", st.sold], ["Unsold", st.unsold], ["Total spent", money(st.totalSpent)], ["Highest price", money(st.highestBid)]].map(([l, v]) => <div key={String(l)} className="card p-4 text-center md:p-5"><div className="display money text-2xl md:text-3xl">{v}</div><div className="text-xs uppercase text-muted">{l}</div></div>)}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="card p-5 md:p-6"><div className="label">Most expensive player</div>{st.mostExpensive ? <><div className="display text-3xl md:text-4xl">{st.mostExpensive.name}</div><div className="money text-xl">{money(st.mostExpensive.soldPrice)} · <span style={{ color: st.mostExpensive.soldTo?.color }}>{st.mostExpensive.soldTo?.name}</span></div></> : <div className="text-muted">—</div>}</div>
          <div className="card p-5 md:p-6"><div className="label">Highest spending franchise</div>{st.topSpender ? <><div className="display text-3xl md:text-4xl" style={{ color: st.topSpender.color }}>{st.topSpender.name}</div><div className="money text-xl">{money(st.topSpender.spent)} spent · {money(st.topSpender.purse)} left</div></> : <div className="text-muted">—</div>}</div>
        </div>
        <h2 className="display mt-12 text-center text-4xl md:text-5xl">Franchise Strength</h2>
        <p className="mt-1 text-center text-sm text-muted">Average career-impact rating of each squad. Squads below {room.minSquadSize} players are listed last.</p>
        <div className="mt-6 flex flex-col gap-2">
          {board.map(({ t, s, dq }, i) => (
            <div key={t.id} className={`card flex items-center gap-3 p-3 md:gap-4 ${i === 0 && !dq && s.rated ? "border-gold/60" : ""} ${dq ? "opacity-70" : ""}`}>
              <div className={`display w-8 text-center text-2xl md:w-10 md:text-3xl ${i === 0 && !dq ? "text-gold" : "text-muted"}`}>{i + 1}</div>
              <TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={40} />
              <div className="min-w-0 flex-1"><div className="display truncate text-xl md:text-2xl">{t.name}</div><div className="truncate text-xs text-muted">{t.ownerName ?? "unclaimed"} · {t.squadCount}/{room.maxSquadSize} · {money(t.spent)} spent{dq ? ` · below minimum of ${room.minSquadSize}` : ""}</div></div>
              <div className="hidden w-40 sm:block"><div className="h-2 overflow-hidden rounded bg-line"><div className="h-full" style={{ width: `${s.avg}%`, background: t.color }} /></div></div>
              <div className="text-right"><div className="display text-2xl md:text-3xl"><span className="text-gold">★</span> {s.avg || "—"}</div><div className="text-[10px] uppercase text-muted">avg rating</div></div>
            </div>
          ))}
        </div>
        <h2 className="display mt-12 text-center text-4xl md:text-5xl">{complete ? "The Final Ten" : "Squads"}</h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {teams.map((t) => { const prices = t.squad.map((s) => s.price); const top = prices.length ? Math.max(...prices) : 0; return (
            <div key={t.id} className="card reveal overflow-hidden">
              <div className="h-2" style={{ background: `linear-gradient(90deg, ${t.color}, ${t.color2 ?? t.color})` }} />
              <div className="p-5 md:p-6">
                <div className="flex items-center gap-4"><TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={56} /><div className="min-w-0 flex-1"><div className="display truncate text-2xl md:text-3xl">{t.name}</div><div className="text-sm text-muted">Manager: <b className="text-ink">{t.ownerName ?? "unclaimed"}</b></div></div><div className="text-right"><div className="display text-2xl">{t.squadCount}/{room.maxSquadSize}</div><div className="text-[11px] uppercase text-muted">squad</div></div></div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-muted">{[["Spent", money(t.spent)], ["Purse left", money(t.purse)], ["Top buy", money(top)], ["RTM used", `${t.rtmUsed}/${t.rtmTotal}`]].map(([l, v]) => <div key={l} className="rounded-lg bg-panel-2 p-2"><div className="text-base font-bold text-ink">{v}</div>{l}</div>)}</div>
                {ORDER.map((role) => { const list = t.squad.filter((s) => s.player.role === role); if (!list.length) return null; return (
                  <div key={role} className="mt-3"><div className="label">{ROLE_LABEL[role]}s ({list.length})</div>
                    {list.map((s) => <div key={s.id} className="flex items-center justify-between border-b border-line/40 py-1.5 text-sm last:border-0"><span className="truncate">{s.player.name}{s.player.overseas && <span className="ml-1 text-xs text-sky-300">✈</span>}{s.viaRtm && <span className="ml-1 rounded bg-rtm/20 px-1 text-[9px] font-bold text-rtm-2">RTM</span>}</span><span className="money font-semibold">{money(s.price)}</span></div>)}
                  </div>); })}
                {t.squad.length === 0 && <div className="mt-3 py-4 text-center text-sm text-muted">No players bought{complete ? "" : " yet"}.</div>}
              </div>
            </div>); })}
        </div>
      </main>
    </RoomShell>
  );
}
