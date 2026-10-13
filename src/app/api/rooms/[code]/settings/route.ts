import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { roomGuard, parse, handle, json, audit } from "@/lib/api";
import { emitSnapshot } from "@/server/auction-engine";
export const dynamic = "force-dynamic";
const schema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  isPublic: z.boolean().optional(),
  startingPurse: z.coerce.number().int().min(100).max(100000).optional(),
  maxSquadSize: z.coerce.number().int().min(1).max(30).optional(),
  minSquadSize: z.coerce.number().int().min(0).max(30).optional(),
  maxOverseas: z.coerce.number().int().min(0).max(30).optional(),
  bidIncrement: z.coerce.number().int().min(0).optional(),
  timerSeconds: z.coerce.number().int().min(5).max(120).optional(),
  rtmTimerSeconds: z.coerce.number().int().min(5).max(180).optional(),
  autoTimer: z.boolean().optional(),
  autoSell: z.boolean().optional(),
  rtmEnabled: z.boolean().optional(),
  defaultRtmCards: z.coerce.number().int().min(0).max(10).optional(),
  unsoldReentry: z.boolean().optional(),
});
type P = { params: Promise<{ code: string }> };
export async function GET(_: Request, { params }: P) {
  const g = await roomGuard((await params).code, "host"); if ("error" in g) return g.error;
  const { host, ...room } = g.room; void host;
  return json(room);
}
export async function PATCH(req: Request, { params }: P) {
  const g = await roomGuard((await params).code, "host"); if ("error" in g) return g.error;
  try {
    const data = await parse(req, schema);
    const started = g.room.state !== "WAITING";
    if (data.startingPurse !== undefined) {
      if (started) return json({ error: "Starting purse can only change before the auction starts" }, 409);
      await prisma.team.updateMany({ where: { roomId: g.room.id }, data: { startingPurse: data.startingPurse, purse: data.startingPurse } });
    }
    if (data.defaultRtmCards !== undefined && !started) await prisma.team.updateMany({ where: { roomId: g.room.id }, data: { rtmTotal: data.defaultRtmCards } });
    const r = await prisma.room.update({ where: { id: g.room.id }, data });
    await audit(g.access.userId, "ROOM_SETTINGS", "Room", g.room.id, data);
    await emitSnapshot(g.room.id, "state:sync");
    const { ...rest } = r; return json(rest);
  } catch (e) { return handle(e); }
}
