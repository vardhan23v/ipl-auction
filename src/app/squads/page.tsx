import { Nav } from "@/components/Nav";
import { TeamBadge } from "@/components/TeamBadge";
import { RtmCards } from "@/components/auction/PursePanel";
import { money, ROLE_LABEL } from "@/lib/format";
import { getTeamsWithSquads } from "@/lib/queries";
export const dynamic = "force-dynamic";
export const metadata = { title: "Squads" };
const ORDER = ["BATSMAN", "WICKETKEEPER", "ALL_ROUNDER", "BOWLER"];
export default async function Squads() {
  const { teams, settings, strength } = await getTeamsWithSquads();
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="display text-5xl">Franchise Squads</h1>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {teams.map((t) => {
            const prices = t.squad.map((s) => s.price); const max = prices.length ? Math.max(...prices) : 0; const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
            return (
              <section id={t.id} key={t.id} className="card scroll-mt-20 overflow-hidden">
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${t.color}, ${t.color2 ?? t.color})` }} />
                <div className="p-5">
                  <div className="flex items-center gap-4"><TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={56} /><div className="min-w-0 flex-1"><div className="display text-3xl">{t.name}</div><div className="text-sm text-muted">Owner: {t.ownerName ?? t.owner?.name ?? "TBA"}</div></div><div className="text-right"><div className="label">RTM</div><RtmCards total={t.rtmTotal} used={t.rtmUsed} size="md" /></div></div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-muted sm:grid-cols-6">
                    {[["Purse left", money(t.purse)], ["Spent", money(t.spent)], ["Squad", `${t.squadCount}/${settings.maxSquadSize}`], ["Overseas", `${t.overseasCount}/${settings.maxOverseas}`], ["Top buy", money(max)], ["Strength", strength[t.id].avg ? `★ ${strength[t.id].avg}` : "—"]].map(([l, v]) => <div key={l} className="rounded-lg bg-panel-2 p-2"><div className="font-bold text-ink">{v}</div>{l}</div>)}
                  </div>
                  {ORDER.map((role) => { const list = t.squad.filter((s) => s.player.role === role); if (!list.length) return null; return (
                    <div key={role} className="mt-4"><div className="label">{ROLE_LABEL[role]}s ({list.length})</div>
                      {list.map((s) => <div key={s.id} className="flex items-center justify-between border-b border-line/50 py-1.5 text-sm last:border-0"><span>{s.player.name}{s.player.overseas && <span className="ml-1 text-xs text-sky-300">✈</span>}{s.viaRtm && <span className="ml-1 rounded bg-rtm/20 px-1 text-[9px] font-bold text-rtm-2">RTM</span>} <span className="text-xs text-muted">★ {s.player.rating ?? "—"}</span></span><span className="money font-semibold">{money(s.price)}</span></div>)}
                    </div>); })}
                  {t.squad.length === 0 && <div className="mt-4 text-center text-sm text-muted">No players yet. Avg buy {money(avg)}.</div>}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
