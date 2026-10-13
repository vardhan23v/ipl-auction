import { z } from "zod";
import * as engine from "@/server/auction-engine";
import { guard, parse, handle, json, audit } from "@/lib/api";
import { RTM_ACTIONS } from "@/types/auction";

const schema = z.object({ action: z.enum(RTM_ACTIONS), amount: z.coerce.number().int().optional() });

/** RTM decisions over HTTP (owners, auctioneer, admin). The socket channel `rtm:action` does the same. */
export async function POST(req: Request) {
  const g = await guard("ADMIN", "AUCTIONEER", "OWNER");
  if ("error" in g) return g.error;
  try {
    const { action, amount } = await parse(req, schema);
    const result = await engine.rtmAction({ userId: g.session.user.id, action, amount });
    await audit(g.session.user.id, action, "Auction", undefined, { amount });
    return json({ ok: true, result });
  } catch (e) { return handle(e); }
}
