import type { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";
declare module "next-auth" {
  interface Session { user: { id: string; name?: string | null; email?: string | null; image?: string | null; role: Role; isGuest: boolean } }
  interface User { role: Role; isGuest?: boolean }
}
declare module "next-auth/jwt" { interface JWT { uid?: string; role?: Role; isGuest?: boolean } }
