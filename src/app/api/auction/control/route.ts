import { z } from "zod";
import * as engine from "@/server/auction-engine";
import { guard, parse, handle, json, audit } from "@/lib/api";
import { CONTROL_ACTIONS } from "@/types/auction";

const schema = z.object({ action: z.enum([...CONTROL_ACTIONS, "ORDER_BY_SET"]), playerId: z.string().optional() });

export async function POST(req: Request) {
  const g = await guard("ADMIN", "AUCTIONEER");
  if ("error" in g) return g.error;
  try {
    const { action, playerId } = await parse(req, schema);
    if (["RESET_AUCTION", "REQUEUE"].includes(action) && g.session.user.role !== "ADMIN") return json({ error: "Admin only" }, 403);
    let result: unknown = null;
    switch (action) {
      case "START_AUCTION": await engine.startAuction(); break;
      case "PAUSE": await engine.pauseAuction(); break;
      case "RESUME": await engine.resumeAuction(); break;
      case "COMPLETE": await engine.completeAuction(); break;
      case "RESET_AUCTION": await engine.resetAuction(); break;
      case "START_PLAYER": await engine.startPlayer(playerId); break;
      case "START_TIMER": await engine.startTimer(); break;
      case "PAUSE_TIMER": await engine.pauseTimer(); break;
      case "RESET_TIMER": await engine.resetTimer(); break;
      case "SELL": result = await engine.sellPlayer(); break;
      case "UNSOLD": await engine.markUnsold(); break;
      case "SKIP": await engine.skipPlayer(); break;
      case "NEXT": await engine.nextPlayer(); break;
      case "UNDO": await engine.undoLast(); break;
      case "SHUFFLE": result = await engine.shuffleQueue(); break;
      case "ORDER_BY_SET": result = await engine.orderQueueBySet(); break;
      case "REQUEUE": if (!playerId) throw new engine.AuctionError("playerId required"); await engine.requeuePlayer(playerId); break;
    }
    await audit(g.session.user.id, `AUCTION_${action}`, "Auction", playerId);
    return json({ ok: true, result, snapshot: await engine.getSnapshot() });
  } catch (e) { return handle(e); }
}
