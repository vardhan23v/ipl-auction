import type { Role } from "@prisma/client";
export function roleHome(role: Role): string {
  switch (role) { case "ADMIN": return "/admin"; case "AUCTIONEER": return "/auctioneer"; case "OWNER": return "/owner"; default: return "/live"; }
}
export const ROLE_NAME: Record<Role, string> = { ADMIN: "Admin", AUCTIONEER: "Auctioneer", OWNER: "Franchise Owner", SPECTATOR: "Spectator" };
