import { prisma } from "@/lib/prisma";
import { loadRoomPage } from "@/lib/room-page";
import { TeamEditor } from "./TeamEditor";
export const dynamic = "force-dynamic";
export default async function Teams({ params }: { params: Promise<{ code: string }> }) {
  const { room } = await loadRoomPage((await params).code, "host");
  const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { sortOrder: "asc" }, include: { owner: { select: { name: true, email: true, isGuest: true } }, _count: { select: { formerPlayers: true } } } });
  return (<div><h1 className="display text-3xl md:text-4xl">Franchises</h1><p className="mt-1 text-sm text-muted">Edit names, colours, logos and RTM cards per franchise, or remove a manager who left.</p><div className="mt-4 grid gap-3 lg:grid-cols-2">{teams.map((t) => <TeamEditor key={t.id} code={room.code} team={{ id: t.id, name: t.name, abbreviation: t.abbreviation, color: t.color, color2: t.color2, logoUrl: t.logoUrl, rtmTotal: t.rtmTotal, rtmUsed: t.rtmUsed, purse: t.purse, squadCount: t.squadCount, formerCount: t._count.formerPlayers, owner: t.owner ? `${t.owner.name}${t.owner.isGuest ? " (guest)" : ""}` : null }} />)}</div></div>);
}
