import { prisma } from "@/lib/prisma";
import { json } from "@/lib/api";
export const dynamic = "force-dynamic";
/** RTM board: every franchise's cards and its fixed list of RTM-eligible (former) players. */
export async function GET() {
  const teams = await prisma.team.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, abbreviation: true, color: true, logoUrl: true, rtmTotal: true, rtmUsed: true, formerPlayers: { orderBy: [{ basePrice: "desc" }, { name: "asc" }], select: { id: true, name: true, role: true, overseas: true, basePrice: true, status: true, soldPrice: true, soldToId: true, soldTo: { select: { abbreviation: true, color: true } }, squadEntry: { select: { viaRtm: true } } } } } });
  return json(teams);
}
