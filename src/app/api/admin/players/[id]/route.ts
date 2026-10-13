import { prisma } from "@/lib/prisma";
import { guard, parse, handle, json, audit } from "@/lib/api";
import { playerSchema } from "../route";
import { emitSnapshot } from "@/server/auction-engine";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN", "AUCTIONEER"); if ("error" in g) return g.error;
  const { id } = await params;
  const p = await prisma.player.findUnique({ where: { id }, include: { bids: { include: { team: true }, orderBy: { createdAt: "desc" } }, soldTo: true, previousTeam: true } });
  return p ? json(p) : json({ error: "Not found" }, 404);
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN"); if ("error" in g) return g.error;
  try {
    const { id } = await params;
    const data = await parse(req, playerSchema.partial());
    const current = await prisma.player.findUniqueOrThrow({ where: { id } });
    if (["LIVE", "SOLD"].includes(current.status) && data.status && data.status !== current.status) return json({ error: "Use auction controls to change a live/sold player" }, 409);
    const p = await prisma.player.update({ where: { id }, data: { ...data, photoUrl: data.photoUrl === "" ? null : data.photoUrl, previousTeamId: data.previousTeamId === "" ? null : data.previousTeamId } });
    await audit(g.session.user.id, "PLAYER_UPDATE", "Player", id, data);
    if (current.status === "LIVE") await emitSnapshot("state:sync");
    return json(p);
  } catch (e) { return handle(e); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN"); if ("error" in g) return g.error;
  try {
    const { id } = await params;
    const p = await prisma.player.findUniqueOrThrow({ where: { id } });
    if (["LIVE", "SOLD"].includes(p.status)) return json({ error: "Cannot delete a live or sold player" }, 409);
    await prisma.player.delete({ where: { id } });
    await audit(g.session.user.id, "PLAYER_DELETE", "Player", id);
    return json({ ok: true });
  } catch (e) { return handle(e); }
}
