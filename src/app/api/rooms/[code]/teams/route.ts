import { prisma } from "@/lib/prisma";
import { roomGuard, json, handle, audit } from "@/lib/api";
import { TEAMS, PREVIOUS_TEAM } from "@/lib/pool";
import { emitSnapshot } from "@/server/auction-engine";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "any"); if ("error" in g) return g.error;
  return json(await prisma.team.findMany({ where: { roomId: g.room.id }, orderBy: { sortOrder: "asc" }, include: { owner: { select: { id: true, name: true, image: true, isGuest: true } }, _count: { select: { formerPlayers: true } } } }));
}

/** Host, before the start: restore the default franchises that were removed (and re-link their RTM lists). */
export async function POST(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "host"); if ("error" in g) return g.error;
  try {
    if (g.room.state !== "WAITING") return json({ error: "Teams can only change before the auction starts" }, 409);
    const have = new Set((await prisma.team.findMany({ where: { roomId: g.room.id }, select: { abbreviation: true } })).map((t) => t.abbreviation));
    const created: string[] = [];
    for (const [i, t] of TEAMS.entries()) {
      if (have.has(t.abbreviation)) continue;
      const team = await prisma.team.create({ data: { ...t, roomId: g.room.id, sortOrder: i, startingPurse: g.room.startingPurse, purse: g.room.startingPurse, rtmTotal: g.room.defaultRtmCards } });
      const ext = [...PREVIOUS_TEAM.entries()].filter(([, abbr]) => abbr === t.abbreviation).map(([e]) => e);
      if (ext.length) await prisma.player.updateMany({ where: { roomId: g.room.id, externalId: { in: ext } }, data: { previousTeamId: team.id } });
      created.push(t.abbreviation);
    }
    await audit(g.access.userId, "TEAM_RESTORE", "Room", g.room.id, { created });
    await emitSnapshot(g.room.id, "team:purseUpdated");
    return json({ ok: true, created });
  } catch (e) { return handle(e); }
}
