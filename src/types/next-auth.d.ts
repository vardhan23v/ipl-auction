import type { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";
declare module "next-auth" {
  interface Session { user: { id: string; name?: string | null; email?: string | null; role: Role; teamId: string | null } }
  interface User { role: Role; teamId: string | null }
}
declare module "next-auth/jwt" { interface JWT { uid?: string; role?: Role; teamId?: string | null } }
