import { roomGuard, json } from "@/lib/api";
import { getSnapshot } from "@/server/auction-engine";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "any"); if ("error" in g) return g.error;
  return json(await getSnapshot(g.room.id));
}
