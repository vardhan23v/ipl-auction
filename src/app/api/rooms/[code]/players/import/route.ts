import { prisma } from "@/lib/prisma";
import { roomGuard, handle, json, audit } from "@/lib/api";
import { importPool } from "@/lib/pool";
import { emitSnapshot } from "@/server/auction-engine";
/** Host: (re)load the bundled pool. `?replace=1` wipes the room's auction first. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "host"); if ("error" in g) return g.error;
  try {
    const replace = new URL(req.url).searchParams.get("replace") === "1";
    const r = await importPool(prisma, g.room.id, replace);
    await audit(g.access.userId, "POOL_IMPORT", "Room", g.room.id, { ...r, replace });
    await emitSnapshot(g.room.id, "state:sync");
    return json({ ok: true, ...r });
  } catch (e) { return handle(e); }
}
