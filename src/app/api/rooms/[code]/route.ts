import { roomGuard, json, audit } from "@/lib/api";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ code: string }> };
export async function GET(_: Request, { params }: P) {
  const g = await roomGuard((await params).code, "any"); if ("error" in g) return g.error;
  const { room, access } = g;
  return json({ code: room.code, name: room.name, state: room.state, isPublic: room.isPublic, host: room.host, access });
}
/** Host/admin: delete the room entirely. */
export async function DELETE(_: Request, { params }: P) {
  const g = await roomGuard((await params).code, "host"); if ("error" in g) return g.error;
  await prisma.room.delete({ where: { id: g.room.id } });
  await audit(g.access.userId, "ROOM_DELETE", "Room", g.room.id);
  return json({ ok: true });
}
