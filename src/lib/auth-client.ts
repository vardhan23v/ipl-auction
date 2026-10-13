import type { Role } from "@prisma/client";
export function roleHome(role: Role): string { return role === "ADMIN" ? "/admin" : "/rooms"; }
