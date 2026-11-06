import Link from "next/link";
import { Nav } from "@/components/Nav";
import { JoinByCode } from "./JoinByCode";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { POOL_SIZE } from "@/lib/pool";
export const dynamic = "force-dynamic";

const STATE: Record<string, [string, string]> = { WAITING: ["Waiting", "text-muted"], PAUSED: ["Paused", "text-gold"] };

/** Home: join with a code, create a room, or jump into a public room. Nothing else. */
export default async function Home() {
  const [session, rooms] = await Promise.all([
    getSession(),
    prisma.room.findMany({
      where: { isPublic: true, state: { not: "COMPLETED" } },
      orderBy: { lastActiveAt: "desc" },
      take: 12,
      select: { id: true, code: true, name: true, state: true, host: { select: { name: true } }, _count: { select: { members: true } } },
    }).catch(() => []),
  ]);
  const signedIn = !!session?.user;
  return (
    <>
      <Nav />
      <main className="page-enter mx-auto max-w-2xl px-4 pb-16">
        <section className="pt-10 text-center md:pt-16">
          <h1 className="display text-5xl leading-none md:text-6xl"><span className="text-gold">IPL</span> Auction</h1>
          <p className="mx-auto mt-3 max-w-md text-muted">Run a live IPL-style auction with friends — {POOL_SIZE} players, 10 franchises, RTM cards. Everyone bids from their phone.</p>
        </section>

        <section className="card mt-8 p-4">
          <div className="mb-2 text-sm font-semibold">Got a room code?</div>
          <JoinByCode compact />
        </section>
        <Link href={signedIn ? "/rooms" : "/login?next=/rooms"} className="btn-gold tap mt-3 flex w-full text-base">{signedIn ? "Create a room" : "Sign in to create a room"}</Link>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Public rooms</h2>
          {rooms.length === 0
            ? <div className="card mt-2 p-6 text-center text-sm text-muted">No public rooms right now — create one and share the code.</div>
            : <div className="mt-2 flex flex-col gap-2">
                {rooms.map((r) => { const [label, cls] = STATE[r.state] ?? ["Live", "text-live"]; return (
                  <Link key={r.id} href={`/r/${r.code}`} className="card flex items-center justify-between gap-3 p-4 transition hover:border-gold/50">
                    <div className="min-w-0"><div className="truncate font-semibold">{r.name}</div><div className="truncate text-xs text-muted">{r.host.name} · {r._count.members} in room</div></div>
                    <div className="shrink-0 text-right"><div className={`text-xs font-semibold uppercase ${cls}`}>{label === "Live" && <span className="live-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-live" />}{label}</div><div className="font-mono text-sm font-bold tracking-widest text-gold">{r.code}</div></div>
                  </Link>
                ); })}
              </div>}
        </section>

        <section id="how" className="mt-10 text-sm text-muted">
          <h2 className="text-sm font-semibold uppercase tracking-widest">How it works</h2>
          <p className="mt-2">Create a room and set the rules → friends join with the code and claim a franchise → start. Players come up one by one; the highest bid when the clock runs out wins. Franchises can use RTM cards on their former players.</p>
        </section>
      </main>
      <footer className="safe-b border-t border-line/60 py-6 text-center text-xs text-muted"><span className="text-gold">IPL</span> Auction · open source · <a className="hover:text-ink" href="https://github.com/vardhan23v/ipl-auction" target="_blank" rel="noreferrer">GitHub</a></footer>
    </>
  );
}
