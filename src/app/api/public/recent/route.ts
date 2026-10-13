import { prisma } from "@/lib/prisma";
import { json } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  const rows = await prisma.player.findMany({ where: { status: { in: ["SOLD", "UNSOLD"] } }, orderBy: { updatedAt: "desc" }, take: 40, select: { id: true, name: true, role: true, status: true, basePrice: true, soldPrice: true, overseas: true, soldTo: { select: { name: true, abbreviation: true, color: true } }, squadEntry: { select: { viaRtm: true } } } });
  return json(rows.map((r) => ({ ...r, viaRtm: r.squadEntry?.viaRtm ?? false, squadEntry: undefined })));
}
