import Link from "next/link";
import { Nav } from "@/components/Nav";
import { TeamBadge } from "@/components/TeamBadge";
import { JoinByCode } from "./JoinByCode";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { TEAMS, POOL_SIZE } from "@/lib/pool";
import { money } from "@/lib/format";
export const dynamic = "force-dynamic";

const STATE_PILL: Record<string, { label: string; cls: string; dot?: boolean }> = {
  WAITING: { label: "Waiting", cls: "border-line bg-panel-2 text-muted" },
  PAUSED: { label: "Paused", cls: "border-gold/50 bg-gold/10 text-gold" },
  LIVE: { label: "Live", cls: "border-live/50 bg-live/10 text-live", dot: true },
};
function statePill(state: string) {
  const p = STATE_PILL[state] ?? STATE_PILL.LIVE;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${p.cls}`}>
      {p.dot && <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-live" />}{p.label}
    </span>
  );
}
function sectionTitle(kicker: string, title: string, sub?: string) {
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-gold">{kicker}</div>
      <h2 className="display mt-1 text-3xl md:text-4xl">{title}</h2>
      {sub && <p className="mt-1 max-w-2xl text-sm text-muted md:text-base">{sub}</p>}
    </div>
  );
}

const STEPS: [string, string, string][] = [
  ["01", "Create a room", "Sign in with Google or just a name. Pick purse, squad size, timer and RTM cards — you get a 6-character room code."],
  ["02", "Share the code", "Friends open /r/CODE on any phone or laptop. No accounts to set up — a guest name is enough to join."],
  ["03", "Claim franchises", "Each manager claims one of the ten IPL franchises in the lobby. Spectators can still watch every bid live."],
  ["04", "Host runs the auction", "The host brings players to the block; owners bid on the IPL ladder. RTM cards let a franchise match the final price for its former players."],
];

export default async function Home() {
  const [session, rooms] = await Promise.all([
    getSession(),
    prisma.room.findMany({
      where: { isPublic: true, state: { not: "COMPLETED" } },
      orderBy: { lastActiveAt: "desc" },
      take: 12,
      select: {
        id: true, code: true, name: true, state: true, startingPurse: true, lastActiveAt: true,
        host: { select: { name: true } },
        _count: { select: { members: true, teams: { where: { ownerId: { not: null } } } } },
      },
    }).catch(() => []),
  ]);
  const signedIn = !!session?.user;
  const liveCount = rooms.filter((r) => r.state !== "WAITING").length;
  const stats = [
    { v: String(TEAMS.length), l: "Franchises" }, { v: String(POOL_SIZE), l: "Players in pool" },
    { v: money(12000), l: "Default purse" }, { v: "2", l: "RTM cards / team" },
  ];

  return (
    <>
      <Nav />
      <main className="stadium relative page-enter">
        {/* Hero */}
        <section className="relative mx-auto max-w-7xl px-4 pb-12 pt-14 text-center md:pb-16 md:pt-24">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest sm:text-xs">
            <span className={`h-2 w-2 rounded-full ${liveCount ? "live-dot bg-live" : "bg-gold"}`} />{liveCount ? `${liveCount} auction${liveCount > 1 ? "s" : ""} live right now` : "Open-source IPL auction rooms"}
          </div>
          <h1 className="display text-5xl font-bold leading-[.95] sm:text-6xl md:text-8xl lg:text-9xl">IPL<br /><span className="bg-gradient-to-r from-gold to-gold-2 bg-clip-text text-transparent">Mega Auction</span></h1>
          <p className="display mt-5 text-xl text-ink/90 sm:text-2xl md:text-4xl">&ldquo;Every Player Has a Price. Some Have a Match.&rdquo;</p>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted sm:text-base md:text-lg">Run a full IPL-style mega auction with your friends in minutes. Create a room, share the code, claim franchises, and let the bidding begin — with Right-To-Match cards for every franchise&rsquo;s former stars.</p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            {signedIn ? (<>
              <Link href="/rooms" className="btn-gold !px-6 !py-3 text-base">Create a room</Link>
              <Link href="/rooms" className="btn-ghost !px-6 !py-3 text-base">My rooms</Link>
            </>) : (
              <Link href="/login?next=/rooms" className="btn-gold !px-6 !py-3 text-base">Sign in to create a room</Link>
            )}
            <a href="#how" className="btn-ghost !px-6 !py-3 text-base">How it works</a>
          </div>

          <div className="card sheen mx-auto mt-10 max-w-xl p-4 text-left sm:p-5">
            <div className="label">Join a room by code</div>
            <JoinByCode compact />
            <p className="mt-2 text-xs text-muted">Got a code from a friend? Enter it to jump straight into their lobby. You can sign in with Google or a guest name once you&rsquo;re there.</p>
          </div>
        </section>

        {/* Stats strip */}
        <section className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((s) => <div key={s.l} className="card p-4 text-center sm:p-5"><div className="display money text-3xl font-bold md:text-4xl">{s.v}</div><div className="mt-1 text-[11px] uppercase tracking-wider text-muted sm:text-xs">{s.l}</div></div>)}
          </div>
          <div className="scroll-x mt-4 flex gap-2 pb-1 sm:justify-center sm:flex-wrap">
            {TEAMS.map((t) => (
              <div key={t.abbreviation} className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-panel/70 py-1 pl-1 pr-3" title={t.name}>
                <TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={28} />
                <span className="display text-sm">{t.abbreviation}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Public rooms */}
        <section id="rooms" className="mx-auto max-w-7xl px-4 py-10">
          {sectionTitle("Public rooms", "Jump into an auction", "Open rooms anyone can join. Private rooms are only reachable by code.")}
          {rooms.length === 0 ? (
            <div className="card p-6 text-center sm:p-10">
              <div className="display text-2xl">No public rooms right now</div>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">Be the first — create a room and share the code, or ask a friend for theirs.</p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href={signedIn ? "/rooms" : "/login?next=/rooms"} className="btn-gold !px-6 !py-3">{signedIn ? "Create a room" : "Sign in to create a room"}</Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <Link key={room.id} href={`/r/${room.code}`} className="card group relative overflow-hidden p-4 transition hover:border-gold/50 active:scale-[.99]">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold to-gold-2 opacity-60 transition group-hover:opacity-100" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-bold">{room.name}</div>
                      <div className="mt-0.5 truncate text-xs text-muted">Hosted by {room.host.name}</div>
                    </div>
                    {statePill(room.state)}
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div><div className="text-[10px] uppercase tracking-widest text-muted">Franchises</div><div className="font-semibold"><span className="text-gold">{room._count.teams}</span>/{TEAMS.length} claimed</div></div>
                      <div><div className="text-[10px] uppercase tracking-widest text-muted">Members</div><div className="font-semibold">{room._count.members}</div></div>
                    </div>
                    <div className="text-right"><div className="text-[10px] uppercase tracking-widest text-muted">Code</div><div className="font-mono text-base font-bold tracking-[.25em] text-gold">{room.code}</div></div>
                  </div>
                  <div className="mt-3 text-xs text-muted">{money(room.startingPurse)} per franchise</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-7xl px-4 py-10">
          {sectionTitle("How it works", "From room code to final squad")}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([n, t, d]) => (
              <div key={n} className="card p-5"><div className="display text-3xl text-gold">{n}</div><div className="mt-2 font-bold">{t}</div><div className="mt-1 text-sm text-muted">{d}</div></div>
            ))}
          </div>
          <div className="card mt-4 grid gap-4 border-rtm/40 p-5 sm:p-6 md:grid-cols-3">
            {[["1 · Decision", "A player from your franchise's former-player list is about to be sold to a rival. Use an RTM card or pass."], ["2 · Final raise", "The winning bidder gets exactly one chance to raise the price — or keep it."], ["3 · Match", "Match the final price and the player is yours, card consumed. Decline and the bidder wins."]].map(([t, d]) => (
              <div key={t}><div className="display text-2xl text-rtm-2">{t}</div><div className="mt-1 text-sm text-muted">{d}</div></div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-line/60">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-center text-xs text-muted sm:flex-row sm:text-left">
            <div><span className="display text-sm text-ink"><span className="text-gold">IPL</span> Auction</span> · Open source · MIT</div>
            <div className="flex items-center gap-4">
              <a href="#how" className="hover:text-ink">How it works</a>
              <Link href="/rooms" className="hover:text-ink">Rooms</Link>
              <a href="https://github.com/vardhan23v/ipl-auction" target="_blank" rel="noreferrer" className="hover:text-ink">GitHub ↗</a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
