import { z } from "zod";
import * as engine from "@/server/auction-engine";
import { roomGuard, parse, handle, json, audit } from "@/lib/api";
import { CONTROL_ACTIONS } from "@/types/auction";
const schema = z.object({ action: z.enum(CONTROL_ACTIONS), playerId: z.string().optional() });

/** Host console actions. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "host"); if ("error" in g) return g.error;
  const id = g.room.id;
  try {
    const { action, playerId } = await parse(req, schema);
    let result: unknown = null;
    switch (action) {
      case "START_AUCTION": await engine.startAuction(id); break;
      case "PAUSE": await engine.pauseAuction(id); break;
      case "RESUME": await engine.resumeAuction(id); break;
      case "COMPLETE": await engine.completeAuction(id); break;
      case "RESET_AUCTION": await engine.resetAuction(id); break;
      case "START_PLAYER": await engine.startPlayer(id, playerId); break;
      case "START_TIMER": await engine.startTimer(id); break;
      case "PAUSE_TIMER": await engine.pauseTimer(id); break;
      case "RESET_TIMER": await engine.resetTimer(id); break;
      case "SELL": result = await engine.sellPlayer(id); break;
      case "UNSOLD": await engine.markUnsold(id); break;
      case "SKIP": await engine.skipPlayer(id); break;
      case "NEXT": await engine.nextPlayer(id); break;
      case "UNDO": await engine.undoLast(id); break;
      case "SHUFFLE": result = await engine.shuffleQueue(id); break;
      case "ORDER_BY_SET": result = await engine.orderQueueBySet(id); break;
      case "REQUEUE": if (!playerId) throw new engine.AuctionError("playerId required"); await engine.requeuePlayer(id, playerId); break;
    }
    await audit(g.access.userId, `AUCTION_${action}`, "Room", id, { playerId });
    return json({ ok: true, result, snapshot: await engine.getSnapshot(id) });
  } catch (e) { return handle(e); }
}
