import type { Role } from "@prisma/client";
/** Where each role lands after sign-in. Spectators go to the lobby to claim a franchise. */
export function roleHome(role: Role, teamId?: string | null): string {
  switch (role) { case "ADMIN": return "/admin"; case "AUCTIONEER": return "/auctioneer"; case "OWNER": return teamId ? "/owner" : "/lobby"; default: return "/lobby"; }
}
export const ROLE_NAME: Record<Role, string> = { ADMIN: "Admin", AUCTIONEER: "Auctioneer", OWNER: "Franchise Owner", SPECTATOR: "Manager" };
