import { z } from "zod";
import * as engine from "@/server/auction-engine";
import { roomGuard, parse, handle, json, audit } from "@/lib/api";
import { CONTROL_ACTIONS } from "@/types/auction";
const schema = z.object({ action: z.enum(CONTROL_ACTIONS) });

/** Host powers: start, pause/resume, undo, end. The auction itself (next player, selling) runs automatically. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "host"); if ("error" in g) return g.error;
  const id = g.room.id;
  try {
    const { action } = await parse(req, schema);
    let result: unknown = null;
    switch (action) {
      case "START_AUCTION": await engine.startAuction(id); break;
      case "PAUSE": await engine.pauseAuction(id); break;
      case "RESUME": await engine.resumeAuction(id); break;
      case "UNDO": await engine.undoLast(id); break;
      case "COMPLETE": await engine.completeAuction(id); break;
      // Setup-time tools (only before the auction starts)
      case "RESET_AUCTION": await engine.resetAuction(id); break;
      case "SHUFFLE": if (g.room.state !== "WAITING") throw new engine.AuctionError("The queue is locked once the auction starts", "BAD_STATE"); result = await engine.shuffleQueue(id); break;
      case "ORDER_BY_SET": if (g.room.state !== "WAITING") throw new engine.AuctionError("The queue is locked once the auction starts", "BAD_STATE"); result = await engine.orderQueueBySet(id); break;
    }
    await audit(g.access.userId, `AUCTION_${action}`, "Room", id, {});
    return json({ ok: true, result, snapshot: await engine.getSnapshot(id) });
  } catch (e) { return handle(e); }
}
