import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { roomGuard, parse, handle, json, audit } from "@/lib/api";
import { emitSnapshot } from "@/server/auction-engine";
const schema = z.object({
  name: z.string().min(2).max(40).optional(),
  abbreviation: z.string().min(2).max(5).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  color2: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional().or(z.literal("")),
  logoUrl: z.string().regex(/^(https?:\/\/|\/)/, "must be a URL or /path").nullable().optional().or(z.literal("")),
  rtmTotal: z.coerce.number().int().min(0).max(10).optional(),
  /** host: remove the current owner (kick) */
  kickOwner: z.boolean().optional(),
});
/** Host: edit a franchise (name, colours, RTM cards) or kick its owner. */
export async function PATCH(req: Request, { params }: { params: Promise<{ code: string; id: string }> }) {
  const { code, id } = await params; const g = await roomGuard(code, "host"); if ("error" in g) return g.error;
  try {
    const { kickOwner, ...data } = await parse(req, schema);
    const t = await prisma.team.findFirstOrThrow({ where: { id, roomId: g.room.id } });
    const team = await prisma.team.update({ where: { id: t.id }, data: { ...data, color2: data.color2 === "" ? null : data.color2, logoUrl: data.logoUrl === "" ? null : data.logoUrl, ...(kickOwner ? { ownerId: null, ownerName: null } : {}) } });
    if (kickOwner && t.ownerId) await prisma.roomMember.updateMany({ where: { roomId: g.room.id, userId: t.ownerId, role: "OWNER" }, data: { role: "SPECTATOR" } });
    await audit(g.access.userId, "TEAM_UPDATE", "Team", id, { ...data, kickOwner });
    await emitSnapshot(g.room.id, "team:purseUpdated", { teamId: id });
    return json(team);
  } catch (e) { return handle(e); }
}
