import { prisma } from "@/lib/prisma";
import { roomGuard, json } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await roomGuard((await params).code, "any"); if ("error" in g) return g.error;
  const rows = await prisma.player.findMany({ where: { roomId: g.room.id, status: { in: ["SOLD", "UNSOLD"] } }, orderBy: { updatedAt: "desc" }, take: 40, select: { id: true, name: true, role: true, status: true, basePrice: true, soldPrice: true, overseas: true, soldTo: { select: { name: true, abbreviation: true, color: true } }, squadEntry: { select: { viaRtm: true } } } });
  return json(rows.map((r) => ({ ...r, viaRtm: r.squadEntry?.viaRtm ?? false, squadEntry: undefined })));
}
