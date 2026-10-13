import { encode } from "next-auth/jwt";
import { getSession } from "@/lib/auth";
import { json } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() {
  const s = await getSession();
  if (!s?.user) return json({ token: null });
  const token = await encode({ secret: process.env.NEXTAUTH_SECRET!, maxAge: 60 * 60 * 12, token: { uid: s.user.id, role: s.user.role } });
  return json({ token });
}
