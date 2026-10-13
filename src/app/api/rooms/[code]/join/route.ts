import { roomGuard, json, audit } from "@/lib/api";
import { ensureMember } from "@/lib/room";
import { emitSnapshot } from "@/server/auction-engine";
/** Join a room as a member (spectator until a franchise is claimed). */
export async function POST(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "member"); if ("error" in g) return g.error;
  const existed = g.access.isMember;
  await ensureMember(g.room.id, g.access.userId!);
  if (!existed) { await audit(g.access.userId, "ROOM_JOIN", "Room", g.room.id); await emitSnapshot(g.room.id, "room:members"); }
  return json({ ok: true, code: g.room.code });
}
