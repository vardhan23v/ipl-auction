import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parse, handle, json, fail, audit } from "@/lib/api";
import { makeRoomCode } from "@/lib/room";
import { TEAMS, poolRows } from "@/lib/pool";
export const dynamic = "force-dynamic";

/** Public rooms directory. */
export async function GET() {
  const rooms = await prisma.room.findMany({ where: { isPublic: true, state: { not: "COMPLETED" } }, orderBy: { lastActiveAt: "desc" }, take: 30, select: { code: true, name: true, state: true, createdAt: true, lastActiveAt: true, host: { select: { name: true, image: true } }, _count: { select: { members: true } }, teams: { where: { ownerId: { not: null } }, select: { abbreviation: true } } } });
  return json(rooms.map((r) => ({ code: r.code, name: r.name, state: r.state, host: r.host, members: r._count.members, claimed: r.teams.length, createdAt: r.createdAt, lastActiveAt: r.lastActiveAt })));
}

const schema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  isPublic: z.boolean().default(true),
  startingPurse: z.coerce.number().int().min(100).max(100000).default(12000),
  maxSquadSize: z.coerce.number().int().min(1).max(30).default(25),
  maxOverseas: z.coerce.number().int().min(0).max(30).default(8),
  timerSeconds: z.coerce.number().int().min(5).max(120).default(15),
  rtmEnabled: z.boolean().default(true),
  defaultRtmCards: z.coerce.number().int().min(0).max(10).default(2),
  autoSell: z.boolean().default(true),
});

/** Create a room: 10 franchises + the bundled player pool. The creator becomes host. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s?.user) return fail("Sign in to create a room", 401);
  try {
    const d = await parse(req, schema);
    const hosted = await prisma.room.count({ where: { hostId: s.user.id, state: { not: "COMPLETED" } } });
    if (hosted >= 5) return fail("You already host 5 active rooms — complete or delete one first", 409);
    let code = makeRoomCode();
    while (await prisma.room.findUnique({ where: { code } })) code = makeRoomCode();
    const room = await prisma.$transaction(async (tx) => {
      const room = await tx.room.create({ data: { code, name: d.name ?? `${s.user.name ?? "Manager"}'s Auction`, hostId: s.user.id, isPublic: d.isPublic, startingPurse: d.startingPurse, maxSquadSize: d.maxSquadSize, maxOverseas: d.maxOverseas, timerSeconds: d.timerSeconds, rtmEnabled: d.rtmEnabled, defaultRtmCards: d.defaultRtmCards, autoSell: d.autoSell, minSquadSize: Math.min(18, d.maxSquadSize) } });
      await tx.roomMember.create({ data: { roomId: room.id, userId: s.user.id, role: "HOST" } });
      const ids = new Map<string, string>();
      for (const [i, t] of TEAMS.entries()) {
        const team = await tx.team.create({ data: { ...t, roomId: room.id, sortOrder: i, startingPurse: d.startingPurse, purse: d.startingPurse, rtmTotal: d.defaultRtmCards } });
        ids.set(t.abbreviation, team.id);
      }
      await tx.player.createMany({ data: poolRows(room.id, ids) });
      return room;
    }, { timeout: 30000 });
    await audit(s.user.id, "ROOM_CREATE", "Room", room.id, { code });
    return json({ ok: true, code: room.code }, 201);
  } catch (e) { return handle(e); }
}
