import { prisma } from "@/lib/prisma";
import { guard, handle, json, audit } from "@/lib/api";
import { importPool } from "../../../../../../prisma/seed";
import { emitSnapshot } from "@/server/auction-engine";
/** Re-import the bundled player pool (prisma/data/players.json). `?replace=1` wipes the auction first. */
export async function POST(req: Request) {
  const g = await guard("ADMIN"); if ("error" in g) return g.error;
  try {
    const replace = new URL(req.url).searchParams.get("replace") === "1";
    const r = await importPool(prisma, replace);
    await audit(g.session.user.id, "POOL_IMPORT", "Player", undefined, { ...r, replace });
    await emitSnapshot("state:sync");
    return json({ ok: true, ...r });
  } catch (e) { return handle(e); }
}
