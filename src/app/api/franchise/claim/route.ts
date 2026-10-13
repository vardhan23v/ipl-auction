import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parse, handle, json, fail, audit } from "@/lib/api";
import { emitSnapshot } from "@/server/auction-engine";

/** Claim a free franchise (crickauction-style lobby): the signed-in user becomes its OWNER. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s?.user) return fail("Sign in first", 401);
  if (["ADMIN", "AUCTIONEER"].includes(s.user.role)) return fail("Staff accounts run the auction — they don't own a franchise", 409);
  try {
    const { teamId } = await parse(req, z.object({ teamId: z.string() }));
    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.team.findUniqueOrThrow({ where: { id: teamId }, include: { owner: { select: { id: true, name: true } } } });
      if (team.owner && team.owner.id !== s.user.id) throw new Error(`${team.name} is already managed by ${team.owner.name}`);
      const me = await tx.user.findUniqueOrThrow({ where: { id: s.user.id }, include: { team: true } });
      const auction = await tx.auction.findUnique({ where: { id: 1 } });
      if (me.teamId && me.teamId !== teamId && auction && auction.state !== "WAITING" && me.team && me.team.squadCount > 0) throw new Error("You can't switch franchise once yours has bought players");
      if (me.teamId && me.teamId !== teamId) await tx.team.update({ where: { id: me.teamId }, data: { ownerName: null } });
      await tx.user.update({ where: { id: me.id }, data: { role: "OWNER", teamId } });
      await tx.team.update({ where: { id: teamId }, data: { ownerName: me.name } });
      return team.name;
    });
    await audit(s.user.id, "FRANCHISE_CLAIM", "Team", teamId);
    await emitSnapshot("team:purseUpdated", { teamId });
    return json({ ok: true, team: result });
  } catch (e) { return e instanceof Error && !(e as { name?: string }).name?.startsWith("Zod") ? fail(e.message, 409) : handle(e); }
}

/** Release your franchise and go back to spectating. */
export async function DELETE() {
  const s = await getSession();
  if (!s?.user || s.user.role !== "OWNER" || !s.user.teamId) return fail("You don't own a franchise", 409);
  const team = await prisma.team.findUnique({ where: { id: s.user.teamId } });
  const auction = await prisma.auction.findUnique({ where: { id: 1 } });
  if (team && team.squadCount > 0 && auction && auction.state !== "WAITING") return fail("Your franchise has already bought players — ask the admin to reassign it", 409);
  await prisma.$transaction([
    prisma.user.update({ where: { id: s.user.id }, data: { role: "SPECTATOR", teamId: null } }),
    prisma.team.update({ where: { id: s.user.teamId }, data: { ownerName: null } }),
  ]);
  await audit(s.user.id, "FRANCHISE_RELEASE", "Team", s.user.teamId);
  await emitSnapshot("team:purseUpdated", { teamId: s.user.teamId });
  return json({ ok: true });
}
