import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { guard, parse, handle, json, audit } from "@/lib/api";
import { emitSnapshot } from "@/server/auction-engine";

const schema = z.object({
  name: z.string().min(2).max(40).optional(),
  abbreviation: z.string().min(2).max(5).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  color2: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional().or(z.literal("")),
  logoUrl: z.string().regex(/^(https?:\/\/|\/)/, "must be a URL or /path").nullable().optional().or(z.literal("")),
  ownerName: z.string().max(60).nullable().optional(),
  ownerEmail: z.string().email().nullable().optional().or(z.literal("")),
  ownerPassword: z.string().min(6).optional(),
  rtmTotal: z.coerce.number().int().min(0).max(10).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN"); if ("error" in g) return g.error;
  try {
    const { id } = await params;
    const { ownerPassword, ...data } = await parse(req, schema);
    const team = await prisma.team.update({ where: { id }, data: { ...data, color2: data.color2 === "" ? null : data.color2, logoUrl: data.logoUrl === "" ? null : data.logoUrl, ownerEmail: data.ownerEmail === "" ? null : data.ownerEmail?.toLowerCase() } });
    if (team.ownerEmail) {
      const existing = await prisma.user.findUnique({ where: { teamId: id } });
      const hash = ownerPassword ? await bcrypt.hash(ownerPassword, 10) : undefined;
      if (existing) await prisma.user.update({ where: { id: existing.id }, data: { name: team.ownerName ?? existing.name, email: team.ownerEmail, ...(hash ? { passwordHash: hash } : {}) } });
      else {
        const byEmail = await prisma.user.findUnique({ where: { email: team.ownerEmail } });
        if (byEmail) await prisma.user.update({ where: { id: byEmail.id }, data: { role: "OWNER", teamId: id, name: team.ownerName ?? byEmail.name, ...(hash ? { passwordHash: hash } : {}) } });
        else await prisma.user.create({ data: { name: team.ownerName ?? team.name + " Owner", email: team.ownerEmail, role: "OWNER", teamId: id, passwordHash: hash ?? (await bcrypt.hash(ownerPassword ?? "ipl" + Math.random().toString(36).slice(2, 8), 10)) } });
      }
    }
    await audit(g.session.user.id, "TEAM_UPDATE", "Team", id, data);
    await emitSnapshot("team:purseUpdated", { teamId: id });
    return json(team);
  } catch (e) { return handle(e); }
}
