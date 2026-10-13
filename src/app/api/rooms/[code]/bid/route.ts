import { z } from "zod";
import * as engine from "@/server/auction-engine";
import { roomGuard, parse, handle, json } from "@/lib/api";
const schema = z.object({ teamId: z.string().optional(), amount: z.coerce.number().int().optional() });
/** HTTP bid (same validation as the socket channel). Owners always bid for their own franchise; the host may name a team. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "member"); if ("error" in g) return g.error;
  try {
    const { teamId, amount } = await parse(req, schema);
    const team = g.access.isHost || g.access.isAdmin ? teamId ?? g.access.teamId : g.access.teamId;
    if (!team) return json({ error: "Claim a franchise before bidding" }, 422);
    const bid = await engine.placeBid({ roomId: g.room.id, userId: g.access.userId!, teamId: team, amount });
    return json({ ok: true, bidId: bid.id, amount: bid.amount });
  } catch (e) { return handle(e); }
}
