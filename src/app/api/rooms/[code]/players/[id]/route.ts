import { prisma } from "@/lib/prisma";
import { roomGuard, parse, handle, json, audit } from "@/lib/api";
import { playerSchema } from "../route";
import { emitSnapshot } from "@/server/auction-engine";
type P = { params: Promise<{ code: string; id: string }> };
export async function GET(_: Request, { params }: P) {
  const { code, id } = await params; const g = await roomGuard(code, "any"); if ("error" in g) return g.error;
  const p = await prisma.player.findFirst({ where: { id, roomId: g.room.id }, include: { bids: { include: { team: true }, orderBy: { createdAt: "desc" } }, soldTo: true, previousTeam: true } });
  return p ? json(p) : json({ error: "Not found" }, 404);
}
export async function PATCH(req: Request, { params }: P) {
  const { code, id } = await params; const g = await roomGuard(code, "host"); if ("error" in g) return g.error;
  try {
    const data = await parse(req, playerSchema.partial());
    const current = await prisma.player.findFirstOrThrow({ where: { id, roomId: g.room.id } });
    if (["LIVE", "SOLD"].includes(current.status) && data.status && data.status !== current.status) return json({ error: "Use auction controls to change a live/sold player" }, 409);
    const p = await prisma.player.update({ where: { id }, data: { ...data, photoUrl: data.photoUrl === "" ? null : data.photoUrl, previousTeamId: data.previousTeamId === "" ? null : data.previousTeamId } });
    await audit(g.access.userId, "PLAYER_UPDATE", "Player", id, data);
    if (current.status === "LIVE") await emitSnapshot(g.room.id, "state:sync");
    return json(p);
  } catch (e) { return handle(e); }
}
export async function DELETE(_: Request, { params }: P) {
  const { code, id } = await params; const g = await roomGuard(code, "host"); if ("error" in g) return g.error;
  try {
    const p = await prisma.player.findFirstOrThrow({ where: { id, roomId: g.room.id } });
    if (["LIVE", "SOLD"].includes(p.status)) return json({ error: "Cannot delete a live or sold player" }, 409);
    await prisma.player.delete({ where: { id } });
    await audit(g.access.userId, "PLAYER_DELETE", "Player", id);
    return json({ ok: true });
  } catch (e) { return handle(e); }
}
