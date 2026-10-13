import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, parse, handle, json, fail, audit } from "@/lib/api";
import { getSettings, emitSnapshot } from "@/server/auction-engine";

const schema = z.object({ teamId: z.string().nullable(), price: z.coerce.number().int().min(0).optional() });

/** Admin: assign a player to a franchise, move them, or send them back to the pool (with refunds). */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN"); if ("error" in g) return g.error;
  try {
    const { id } = await params;
    const { teamId, price } = await parse(req, schema);
    const s = await getSettings();
    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.player.findUniqueOrThrow({ where: { id }, include: { squadEntry: true } });
      if (player.status === "LIVE") throw new Error("Player is live on the block — finish or skip them first");
      const auction = await tx.auction.findUnique({ where: { id: 1 } });
      if (player.squadEntry) {
        await tx.team.update({ where: { id: player.squadEntry.teamId }, data: { purse: { increment: player.squadEntry.price }, spent: { decrement: player.squadEntry.price }, squadCount: { decrement: 1 }, ...(player.overseas ? { overseasCount: { decrement: 1 } } : {}), ...(player.squadEntry.viaRtm ? { rtmUsed: { decrement: 1 } } : {}) } });
        await tx.squadPlayer.delete({ where: { id: player.squadEntry.id } });
      }
      if (!teamId) {
        await tx.player.update({ where: { id }, data: { status: auction && auction.state !== "WAITING" ? "WAITING" : "POOL", soldPrice: null, soldToId: null, soldAt: null } });
        return { action: "removed" };
      }
      const team = await tx.team.findUniqueOrThrow({ where: { id: teamId } });
      const pay = price ?? player.soldPrice ?? player.basePrice;
      if (team.squadCount >= s.maxSquadSize) throw new Error(`${team.name} squad is full`);
      if (player.overseas && team.overseasCount >= s.maxOverseas) throw new Error(`${team.name} overseas quota is full`);
      if (team.purse < pay) throw new Error(`${team.name} has only ${team.purse} L left`);
      await tx.squadPlayer.create({ data: { teamId, playerId: id, price: pay } });
      await tx.team.update({ where: { id: teamId }, data: { purse: { decrement: pay }, spent: { increment: pay }, squadCount: { increment: 1 }, ...(player.overseas ? { overseasCount: { increment: 1 } } : {}) } });
      await tx.player.update({ where: { id }, data: { status: "SOLD", soldPrice: pay, soldToId: teamId, soldAt: player.soldAt ?? new Date() } });
      await tx.auctionEvent.create({ data: { type: "ADMIN_ASSIGN", playerId: id, teamId, amount: pay, payload: { overseas: player.overseas } } });
      return { action: "assigned", team: team.name, price: pay };
    });
    await audit(g.session.user.id, "PLAYER_TEAM_CHANGE", "Player", id, { teamId, price });
    await emitSnapshot("state:sync");
    return json({ ok: true, ...result });
  } catch (e) { return e instanceof Error && !(e as { name?: string }).name?.startsWith("Zod") ? fail(e.message, 409) : handle(e); }
}
