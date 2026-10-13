import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/prisma";
import { PlayersBrowser, type PubPlayer } from "./PlayersBrowser";
export const dynamic = "force-dynamic";
export const metadata = { title: "Player Pool" };
export default async function PlayersPage() {
  const players = await prisma.player.findMany({
    orderBy: [{ queueOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, photoUrl: true, role: true, nationality: true, overseas: true, capped: true, set: true, rating: true, matches: true, runs: true, wickets: true, basePrice: true, status: true, soldPrice: true, queueOrder: true, soldTo: { select: { abbreviation: true, color: true } }, previousTeam: { select: { abbreviation: true, color: true } }, squadEntry: { select: { viaRtm: true } } },
  });
  const sold = players.filter((p) => p.status === "SOLD").length;
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><div className="text-xs font-semibold uppercase tracking-widest text-gold">The pool</div><h1 className="display text-5xl">Auction Players</h1></div>
          <div className="text-sm text-muted">{players.length} players · {sold} sold · {players.filter((p) => p.overseas).length} overseas</div>
        </div>
        <PlayersBrowser players={players.map((p) => ({ ...p, viaRtm: p.squadEntry?.viaRtm ?? false })) as PubPlayer[]} />
      </main>
    </>
  );
}
