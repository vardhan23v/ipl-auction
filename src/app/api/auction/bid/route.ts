import { z } from "zod";
import * as engine from "@/server/auction-engine";
import { guard, parse, handle, json } from "@/lib/api";
const schema = z.object({ teamId: z.string().optional(), amount: z.coerce.number().int().optional() });
/** HTTP bid (same validation as the socket channel). Owners always bid for their own franchise. */
export async function POST(req: Request) {
  const g = await guard("ADMIN", "AUCTIONEER", "OWNER");
  if ("error" in g) return g.error;
  try {
    const { teamId, amount } = await parse(req, schema);
    const team = g.session.user.role === "OWNER" ? g.session.user.teamId : teamId;
    if (!team) return json({ error: "teamId required" }, 422);
    const bid = await engine.placeBid({ userId: g.session.user.id, teamId: team, amount });
    return json({ ok: true, bidId: bid.id, amount: bid.amount });
  } catch (e) { return handle(e); }
}
