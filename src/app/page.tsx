import Link from "next/link";
import { Nav } from "@/components/Nav";
import { TeamBadge } from "@/components/TeamBadge";
import { RtmCards } from "@/components/auction/PursePanel";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/server/auction-engine";
import { LivePreview } from "@/components/LivePreview";
export const dynamic = "force-dynamic";

export default async function Home() {
  const [teams, settings, auction, poolCount, overseasCount] = await Promise.all([
    prisma.team.findMany({ orderBy: { sortOrder: "asc" } }), getSettings(), prisma.auction.findUnique({ where: { id: 1 } }), prisma.player.count(), prisma.player.count({ where: { overseas: true } }),
  ]);
  const totalPurse = settings.startingPurse * teams.length;
  const stats = [
    { v: String(teams.length), l: "Franchises" }, { v: String(poolCount), l: "Players In Pool" }, { v: money(totalPurse), l: "Total Purse" },
    { v: money(settings.startingPurse), l: "Purse Per Team" }, { v: `${settings.maxSquadSize}`, l: "Max Squad" }, { v: `${settings.defaultRtmCards}`, l: "RTM Cards Per Team" },
  ];
  const live = auction && !["WAITING", "COMPLETED"].includes(auction.state);
  return (
    <>
      <Nav />
      <main className="stadium relative">
        <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 text-center md:pt-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest">
            <span className={`h-2 w-2 rounded-full ${live ? "live-dot bg-live" : "bg-gold"}`} />{live ? "Auction is live now" : settings.auctionName}
          </div>
          <h1 className="display text-6xl font-bold leading-[.95] md:text-8xl lg:text-9xl">IPL<br /><span className="bg-gradient-to-r from-gold to-gold-2 bg-clip-text text-transparent">Mega Auction</span></h1>
          <p className="display mt-6 text-2xl text-ink/90 md:text-4xl">&ldquo;Every Player Has a Price. Some Have a Match.&rdquo;</p>
          <p className="mx-auto mt-4 max-w-2xl text-muted md:text-lg">Ten franchises. {money(settings.startingPurse)} each. {poolCount} players, {overseasCount} of them overseas. Right-To-Match cards let a franchise bring its own stars home.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/live" className="btn-red !px-6 !py-3 text-base"><span className="live-dot h-2 w-2 rounded-full bg-white" /> WATCH LIVE AUCTION</Link>
            <Link href="/login" className="btn-gold !px-6 !py-3 text-base">JOIN AS MANAGER</Link>
            <Link href="/rtm" className="btn-rtm !px-6 !py-3 text-base">RTM BOARD</Link>
          </div>
          <div className="display mt-10 text-lg tracking-widest text-muted">{teams.length} Franchises • {poolCount} Players • {money(totalPurse)} Total Purse</div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {stats.map((s) => <div key={s.l} className="card p-5 text-center"><div className="display money text-3xl font-bold md:text-4xl">{s.v}</div><div className="mt-1 text-xs uppercase tracking-wider text-muted">{s.l}</div></div>)}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10">
          <SectionTitle kicker="Live Auction Preview" title="Watch the block in real time" />
          <LivePreview />
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10">
          <SectionTitle kicker="How it works" title="From marquee set to final squad" />
          <div className="grid gap-3 md:grid-cols-4">
            {[["01", "Claim a franchise", "Sign in with Google or as a guest, then claim one of the ten franchises in the lobby — ₹120 Cr purse each."], ["02", "Players come up by set", `Marquee stars first, then capped and uncapped sets. A ${settings.timerSeconds}-second clock resets on every bid.`], ["03", "Bid on the IPL ladder", "₹5 L steps up to ₹1 Cr, ₹10 L to ₹2 Cr, ₹20 L to ₹5 Cr, then ₹25 L — or jump with a custom bid."], ["04", "Play the RTM card", "When one of your former players is about to be sold, match the final price and bring them home."]].map(([n, t, d]) => (
              <div key={n} className="card p-5"><div className="display text-3xl text-gold">{n}</div><div className="mt-2 font-bold">{t}</div><div className="mt-1 text-sm text-muted">{d}</div></div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10">
          <SectionTitle kicker="Right to match" title="The RTM card, step by step" />
          <div className="card grid gap-4 border-rtm/40 p-6 md:grid-cols-3">
            {[["1 · Decision", "A player from your fixed RTM list is about to be sold to a rival. You get a few seconds to USE a card or PASS."], ["2 · Final raise", "The winning bidder gets exactly one chance to raise the price — the IPL 2025 rule — or keep it."], ["3 · Match", "Match the final price and the player is yours, card consumed. Decline and the bidder wins at that price."]].map(([t, d]) => (
              <div key={t}><div className="display text-2xl text-rtm-2">{t}</div><div className="mt-1 text-sm text-muted">{d}</div></div>
            ))}
            <div className="text-xs text-muted md:col-span-3">RTM works only for the <b className="text-ink">fixed list of each franchise&rsquo;s former players</b> (editable by the admin), needs an unused card, enough purse, and room in the squad and overseas quota. <Link href="/rtm" className="text-rtm-2 underline">See every franchise&rsquo;s RTM list →</Link></div>
          </div>
        </section>

        <section id="teams" className="mx-auto max-w-7xl px-4 py-10">
          <SectionTitle kicker="The Franchises" title="Ten teams. One trophy." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {teams.map((t) => (
              <Link href={`/squads#${t.id}`} key={t.id} className="card group relative overflow-hidden p-4 transition hover:border-gold/50">
                <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${t.color}, ${t.color2 ?? t.color})` }} />
                <div className="flex items-center gap-3">
                  <TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={48} />
                  <div className="min-w-0"><div className="display truncate text-xl">{t.abbreviation}</div><div className="truncate text-xs text-muted">{t.name}</div></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-panel-2 p-2"><div className="text-[10px] uppercase text-muted">Purse</div><div className="money font-bold">{money(t.purse)}</div></div>
                  <div className="rounded-lg bg-panel-2 p-2"><div className="text-[10px] uppercase text-muted">Squad</div><div className="font-bold">{t.squadCount}/{settings.maxSquadSize}</div></div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted"><span>RTM</span><RtmCards total={t.rtmTotal} used={t.rtmUsed} /></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10">
          <SectionTitle kicker="Auction features" title="Built for the big moment" />
          <div className="grid gap-3 md:grid-cols-3">
            {[["⚡ Real-time bidding", "Every bid is broadcast instantly to all owners and spectators via WebSockets."], ["🛡️ Server-enforced rules", "Purse, 25-man squad, 8 overseas slots, increments, timer and RTM eligibility are all validated on the server."], ["▮ RTM cards", "Right-To-Match with the real three-step rule: decide, final raise, match."], ["⏱️ Shared countdown", "One server clock; auto-sell when it hits zero (optional)."], ["🎛️ Auctioneer console", "Start, pause, sell, unsold, skip, undo — with confirmations."], ["📊 Franchise Strength", "Squad ratings and spend analytics update live; a final leaderboard crowns the best-built squad."]].map(([t, d]) => (
              <div key={t} className="card p-5"><div className="font-bold">{t}</div><div className="mt-1 text-sm text-muted">{d}</div></div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10">
          <SectionTitle kicker="FAQ" title="Questions, answered" />
          <div className="flex flex-col gap-2">
            {[["Who can bid?", "Anyone who signs in (Google or guest) and claims a free franchise in the lobby. The auctioneer can also record a bid on a franchise's behalf. Spectators only watch."], ["What are the increments?", "The official IPL ladder: ₹5 L below ₹1 Cr, ₹10 L up to ₹2 Cr, ₹20 L up to ₹5 Cr, ₹25 L above. Custom jump bids are allowed in multiples of ₹5 L."], ["Which players can be RTM'd?", "Only players on a franchise's fixed RTM list — by default the squad they were part of in IPL 2025. The admin can edit the list per player."], ["How many RTM cards?", `${settings.defaultRtmCards} per franchise by default; the admin can set a different number for each team.`], ["What happens when the timer hits zero?", settings.autoSell ? "The player is sold to the highest bidder automatically (after the RTM window, if any), or marked unsold with no bids." : "Bidding closes and the auctioneer marks the player SOLD or UNSOLD."], ["Can unsold players come back?", settings.unsoldReentry ? "Yes — the admin can return them to the queue for an accelerated round." : "Not in this edition."]].map(([q, a]) => (
              <details key={q} className="card group p-4"><summary className="cursor-pointer font-semibold">{q}</summary><p className="mt-2 text-sm text-muted">{a}</p></details>
            ))}
          </div>
        </section>
        <footer className="border-t border-line/60 py-8 text-center text-xs text-muted">IPL Mega Auction · Live Franchise Auction Platform · {new Date().getFullYear()} · Player data from the open-source Crick Auction pool</footer>
      </main>
    </>
  );
}
function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return <div className="mb-6"><div className="text-xs font-semibold uppercase tracking-widest text-gold">{kicker}</div><h2 className="display text-4xl">{title}</h2></div>;
}
