import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { guard, parse, handle, json, audit } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  const g = await guard("ADMIN"); if ("error" in g) return g.error;
  return json(await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, teamId: true, createdAt: true, team: { select: { name: true, abbreviation: true } } }, orderBy: { createdAt: "asc" } }));
}
const schema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6), role: z.enum(["ADMIN", "AUCTIONEER", "OWNER", "SPECTATOR"]), teamId: z.string().nullable().optional() });
export async function POST(req: Request) {
  const g = await guard("ADMIN"); if ("error" in g) return g.error;
  try {
    const d = await parse(req, schema);
    if (d.role === "OWNER" && !d.teamId) return json({ error: "An owner needs a franchise" }, 422);
    const u = await prisma.user.create({ data: { name: d.name, email: d.email.toLowerCase(), role: d.role, teamId: d.role === "OWNER" ? d.teamId : null, passwordHash: await bcrypt.hash(d.password, 10) } });
    await audit(g.session.user.id, "USER_CREATE", "User", u.id);
    return json({ id: u.id }, 201);
  } catch (e) { return handle(e); }
}
