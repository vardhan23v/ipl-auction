import { z } from "zod";
import * as engine from "@/server/auction-engine";
import { roomGuard, parse, handle, json } from "@/lib/api";
/** Best-effort burst limit per user per instance (8 bids / 2 s), like the old socket channel. The room lock enforces correctness. */
const buckets = new Map<string, { tokens: number; ts: number }>();
function allow(key: string, max = 8, windowMs = 2000) {
  const now = Date.now(); const b = buckets.get(key) ?? { tokens: max, ts: now };
  b.tokens = Math.min(max, b.tokens + ((now - b.ts) / windowMs) * max); b.ts = now;
  if (buckets.size > 10_000) buckets.clear();
  if (b.tokens < 1) { buckets.set(key, b); return false; }
  b.tokens -= 1; buckets.set(key, b); return true;
}
const schema = z.object({ teamId: z.string().optional(), amount: z.coerce.number().int().optional() });
/** Place a bid. A manager always bids for the franchise they claimed; `teamId` is ignored. */
export const dynamic = "force-dynamic";
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "member"); if ("error" in g) return g.error;
  try {
    const { amount } = await parse(req, schema);
    const team = g.access.teamId;
    if (!team) return json({ error: "Claim a franchise before bidding" }, 422);
    if (!allow(g.access.userId!)) return json({ error: "Too many bids — slow down", code: "RATE_LIMIT" }, 429);
    const bid = await engine.placeBid({ roomId: g.room.id, userId: g.access.userId!, teamId: team, amount });
    return json({ ok: true, bidId: bid.id, amount: bid.amount });
  } catch (e) { return handle(e); }
}
