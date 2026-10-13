import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { getSession, roleHome } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/server/auction-engine";
import { Lobby } from "./Lobby";
export const dynamic = "force-dynamic";
export const metadata = { title: "Franchise Lobby" };

export default async function LobbyPage() {
  const s = await getSession();
  if (!s?.user) redirect("/login");
  if (["ADMIN", "AUCTIONEER"].includes(s.user.role)) redirect(roleHome(s.user.role));
  const [teams, settings, auction] = await Promise.all([
    prisma.team.findMany({ orderBy: { sortOrder: "asc" }, include: { owner: { select: { id: true, name: true, image: true, isGuest: true } }, _count: { select: { formerPlayers: true } } } }),
    getSettings(), prisma.auction.findUnique({ where: { id: 1 } }),
  ]);
  return (
    <>
      <Nav />
      <Lobby me={{ id: s.user.id, name: s.user.name ?? "Manager", teamId: s.user.teamId }} auctionState={auction?.state ?? "WAITING"} maxSquad={settings.maxSquadSize}
        teams={teams.map((t) => ({ id: t.id, name: t.name, abbreviation: t.abbreviation, color: t.color, color2: t.color2, logoUrl: t.logoUrl, purse: t.purse, squadCount: t.squadCount, rtmTotal: t.rtmTotal, rtmUsed: t.rtmUsed, formerCount: t._count.formerPlayers, owner: t.owner ? { id: t.owner.id, name: t.owner.name, image: t.owner.image, isGuest: t.owner.isGuest } : null }))} />
    </>
  );
}
