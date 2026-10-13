import { z } from "zod";
import * as engine from "@/server/auction-engine";
import { roomGuard, parse, handle, json, audit } from "@/lib/api";
import { RTM_ACTIONS } from "@/types/auction";
const schema = z.object({ action: z.enum(RTM_ACTIONS), amount: z.coerce.number().int().optional() });
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "member"); if ("error" in g) return g.error;
  try {
    const { action, amount } = await parse(req, schema);
    const result = await engine.rtmAction({ roomId: g.room.id, userId: g.access.userId!, action, amount });
    await audit(g.access.userId, action, "Room", g.room.id, { amount });
    return json({ ok: true, result });
  } catch (e) { return handle(e); }
}
