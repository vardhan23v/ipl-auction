import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { roomGuard, parse, handle, json, fail, audit } from "@/lib/api";
import { ensureMember } from "@/lib/room";
import { emitSnapshot } from "@/server/auction-engine";
type P = { params: Promise<{ code: string }> };

/** Claim a free franchise in this room (crickauction-style lobby). */
export async function POST(req: Request, { params }: P) {
  const g = await roomGuard((await params).code, "member"); if ("error" in g) return g.error;
  const { room, access } = g; const userId = access.userId!;
  try {
    const { teamId } = await parse(req, z.object({ teamId: z.string() }));
    const name = await prisma.$transaction(async (tx) => {
      const team = await tx.team.findUniqueOrThrow({ where: { id: teamId }, include: { owner: { select: { id: true, name: true } } } });
      if (team.roomId !== room.id) throw new Error("Team is not in this room");
      if (team.owner && team.owner.id !== userId) throw new Error(`${team.name} is already managed by ${team.owner.name}`);
      const mine = await tx.team.findFirst({ where: { roomId: room.id, ownerId: userId } });
      if (mine && mine.id !== teamId) {
        if (room.state !== "WAITING" && mine.squadCount > 0) throw new Error("You can't switch franchise once yours has bought players");
        await tx.team.update({ where: { id: mine.id }, data: { ownerId: null, ownerName: null } });
      }
      const me = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      await tx.team.update({ where: { id: teamId }, data: { ownerId: userId, ownerName: me.name } });
      return team.name;
    });
    await ensureMember(room.id, userId, room.hostId === userId ? "HOST" : "OWNER");
    await audit(userId, "FRANCHISE_CLAIM", "Team", teamId, { room: room.code });
    await emitSnapshot(room.id, "team:purseUpdated", { teamId });
    return json({ ok: true, team: name });
  } catch (e) { return e instanceof Error && !(e as { name?: string }).name?.startsWith("Zod") ? fail(e.message, 409) : handle(e); }
}

/** Release your franchise in this room. */
export async function DELETE(_: Request, { params }: P) {
  const g = await roomGuard((await params).code, "member"); if ("error" in g) return g.error;
  const { room, access } = g;
  const team = await prisma.team.findFirst({ where: { roomId: room.id, ownerId: access.userId! } });
  if (!team) return fail("You don't own a franchise here", 409);
  if (team.squadCount > 0 && room.state !== "WAITING") return fail("Your franchise has already bought players — ask the host to reassign it", 409);
  await prisma.team.update({ where: { id: team.id }, data: { ownerId: null, ownerName: null } });
  await ensureMember(room.id, access.userId!, room.hostId === access.userId ? "HOST" : "SPECTATOR");
  await audit(access.userId, "FRANCHISE_RELEASE", "Team", team.id);
  await emitSnapshot(room.id, "team:purseUpdated", { teamId: team.id });
  return json({ ok: true });
}
