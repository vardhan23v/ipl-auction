import { roomGuard, json } from "@/lib/api";
import { getSnapshot, settleDue } from "@/server/auction-engine";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "any"); if ("error" in g) return g.error;
  await settleDue(g.room.id).catch(() => false);
  return json(await getSnapshot(g.room.id));
}
