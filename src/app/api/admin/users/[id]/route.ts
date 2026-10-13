import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { guard, parse, handle, json, audit } from "@/lib/api";
const schema = z.object({ name: z.string().min(2).optional(), email: z.string().email().optional(), password: z.string().min(6).optional(), role: z.enum(["ADMIN", "AUCTIONEER", "OWNER", "SPECTATOR"]).optional(), teamId: z.string().nullable().optional() });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN"); if ("error" in g) return g.error;
  try {
    const { id } = await params;
    const { password, ...d } = await parse(req, schema);
    const u = await prisma.user.update({ where: { id }, data: { ...d, email: d.email?.toLowerCase(), ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) } });
    await audit(g.session.user.id, "USER_UPDATE", "User", id, d);
    return json({ id: u.id });
  } catch (e) { return handle(e); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN"); if ("error" in g) return g.error;
  const { id } = await params;
  if (id === g.session.user.id) return json({ error: "Cannot delete yourself" }, 409);
  await prisma.user.delete({ where: { id } });
  await audit(g.session.user.id, "USER_DELETE", "User", id);
  return json({ ok: true });
}
