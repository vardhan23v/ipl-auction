import { loadRoomPage } from "@/lib/room-page";
import { getTeamsWithSquads } from "@/lib/queries";
import { TeamBadge } from "@/components/TeamBadge";
import { RtmCards } from "@/components/auction/PursePanel";
import { money, ROLE_LABEL } from "@/lib/format";
import { RoomShell } from "../RoomShell";
export const dynamic = "force-dynamic";
export const metadata = { title: "Squads" };
const ORDER = ["BATSMAN", "WICKETKEEPER", "ALL_ROUNDER", "BOWLER"];
export default async function Squads({ params }: { params: Promise<{ code: string }> }) {
  const { room, access } = await loadRoomPage((await params).code, "any");
  const { teams, strength } = await getTeamsWithSquads(room.id);
  return (
    <RoomShell room={room} access={access}>
      <main className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-8">
        <h1 className="display text-3xl md:text-5xl">Franchise Squads</h1>
        <nav className="scroll-x sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-3 mt-3 flex gap-1.5 border-b border-line/50 bg-pitch/95 px-3 py-2 backdrop-blur md:hidden" aria-label="Jump to franchise">
          {teams.map((t) => <a key={t.id} href={`#${t.id}`} className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-panel px-3 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />{t.abbreviation}<span className="text-xs font-normal text-muted">{t.squadCount}</span></a>)}
        </nav>
        <div className="mt-4 grid gap-4 md:mt-6 lg:grid-cols-2">
          {teams.map((t) => { const prices = t.squad.map((s) => s.price); const max = prices.length ? Math.max(...prices) : 0; return (
            <section id={t.id} key={t.id} className="card scroll-mt-32 overflow-hidden md:scroll-mt-20">
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${t.color}, ${t.color2 ?? t.color})` }} />
              <div className="p-4 md:p-5">
                <div className="flex items-center gap-3 md:gap-4"><TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={44} /><div className="min-w-0 flex-1"><div className="display truncate text-xl md:text-3xl">{t.name}</div><div className="text-sm text-muted">Manager: {t.ownerName ?? t.owner?.name ?? "unclaimed"}</div></div><div className="text-right"><div className="label">RTM</div><RtmCards total={t.rtmTotal} used={t.rtmUsed} size="md" /></div></div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-muted sm:grid-cols-6">
                  {[["Purse left", money(t.purse)], ["Spent", money(t.spent)], ["Squad", `${t.squadCount}/${room.maxSquadSize}`], ["Overseas", `${t.overseasCount}/${room.maxOverseas}`], ["Top buy", money(max)], ["Strength", strength[t.id].avg ? `★ ${strength[t.id].avg}` : "—"]].map(([l, v]) => <div key={l} className="rounded-lg bg-panel-2 p-2"><div className="font-bold text-ink">{v}</div>{l}</div>)}
                </div>
                {ORDER.map((role) => { const list = t.squad.filter((s) => s.player.role === role); if (!list.length) return null; return (
                  <div key={role} className="mt-4"><div className="label">{ROLE_LABEL[role]}s ({list.length})</div>
                    {list.map((s) => <div key={s.id} className="flex items-center justify-between border-b border-line/50 py-1.5 text-sm last:border-0"><span>{s.player.name}{s.player.overseas && <span className="ml-1 text-xs text-sky-300">✈</span>}{s.viaRtm && <span className="ml-1 rounded bg-rtm/20 px-1 text-xs font-bold text-rtm-2">RTM</span>} <span className="text-xs text-muted">★ {s.player.rating ?? "—"}</span></span><span className="money font-semibold">{money(s.price)}</span></div>)}
                  </div>); })}
                {t.squad.length === 0 && <div className="mt-4 text-center text-sm text-muted">No players yet.</div>}
              </div>
            </section>); })}
        </div>
      </main>
    </RoomShell>
  );
}
