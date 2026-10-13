import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { roomGuard, parse, handle, json, fail, audit } from "@/lib/api";
import { emitSnapshot } from "@/server/auction-engine";
const schema = z.object({ teamId: z.string().nullable(), price: z.coerce.number().int().min(0).optional() });
/** Host: assign a player to a franchise, move them, or send them back to the pool (with refunds). */
export async function PUT(req: Request, { params }: { params: Promise<{ code: string; id: string }> }) {
  const { code, id } = await params; const g = await roomGuard(code, "host"); if ("error" in g) return g.error;
  const room = g.room;
  try {
    const { teamId, price } = await parse(req, schema);
    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.player.findFirstOrThrow({ where: { id, roomId: room.id }, include: { squadEntry: true } });
      if (player.status === "LIVE") throw new Error("Player is live on the block — finish or skip them first");
      if (player.squadEntry) {
        await tx.team.update({ where: { id: player.squadEntry.teamId }, data: { purse: { increment: player.squadEntry.price }, spent: { decrement: player.squadEntry.price }, squadCount: { decrement: 1 }, ...(player.overseas ? { overseasCount: { decrement: 1 } } : {}), ...(player.squadEntry.viaRtm ? { rtmUsed: { decrement: 1 } } : {}) } });
        await tx.squadPlayer.delete({ where: { id: player.squadEntry.id } });
      }
      if (!teamId) {
        await tx.player.update({ where: { id }, data: { status: room.state !== "WAITING" ? "WAITING" : "POOL", soldPrice: null, soldToId: null, soldAt: null } });
        return { action: "removed" };
      }
      const team = await tx.team.findFirstOrThrow({ where: { id: teamId, roomId: room.id } });
      const pay = price ?? player.soldPrice ?? player.basePrice;
      if (team.squadCount >= room.maxSquadSize) throw new Error(`${team.name} squad is full`);
      if (player.overseas && team.overseasCount >= room.maxOverseas) throw new Error(`${team.name} overseas quota is full`);
      if (team.purse < pay) throw new Error(`${team.name} has only ${team.purse} L left`);
      await tx.squadPlayer.create({ data: { roomId: room.id, teamId, playerId: id, price: pay } });
      await tx.team.update({ where: { id: teamId }, data: { purse: { decrement: pay }, spent: { increment: pay }, squadCount: { increment: 1 }, ...(player.overseas ? { overseasCount: { increment: 1 } } : {}) } });
      await tx.player.update({ where: { id }, data: { status: "SOLD", soldPrice: pay, soldToId: teamId, soldAt: player.soldAt ?? new Date() } });
      await tx.auctionEvent.create({ data: { roomId: room.id, type: "HOST_ASSIGN", playerId: id, teamId, amount: pay, payload: { overseas: player.overseas } } });
      return { action: "assigned", team: team.name, price: pay };
    });
    await audit(g.access.userId, "PLAYER_TEAM_CHANGE", "Player", id, { teamId, price });
    await emitSnapshot(room.id, "state:sync");
    return json({ ok: true, ...result });
  } catch (e) { return e instanceof Error && !(e as { name?: string }).name?.startsWith("Zod") ? fail(e.message, 409) : handle(e); }
}
