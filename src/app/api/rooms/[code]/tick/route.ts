import { roomGuard, json } from "@/lib/api";
import { settleDue } from "@/server/auction-engine";
export const dynamic = "force-dynamic";
/**
 * Live screens call this when their countdown reaches zero. It applies an expired bidding clock (auto-sell / unsold)
 * or RTM window (pass / keep / decline). Idempotent and cheap when nothing is due, so duplicate calls are harmless.
 */
export async function POST(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "any"); if ("error" in g) return g.error;
  return json({ settled: await settleDue(g.room.id) });
}
