import { notFound, redirect } from "next/navigation";
import { getSession } from "./auth";
import { getRoomByCode, getRoomAccess, ensureMember } from "./room";

/** Shared loader for `/r/[code]/...` pages. `need`: "any" (public), "member" (signed in, auto-joins), "host". */
export async function loadRoomPage(code: string, need: "any" | "member" | "host" = "any") {
  const room = await getRoomByCode(code);
  if (!room) notFound();
  const session = await getSession();
  if (need !== "any" && !session?.user) redirect(`/login?next=/r/${room.code}`);
  const access = await getRoomAccess(room, session?.user);
  if (need === "host" && !(access.isHost || access.isAdmin)) redirect(`/r/${room.code}`);
  if (need === "member" && session?.user && !access.isMember) { await ensureMember(room.id, session.user.id); access.isMember = true; }
  return { room, access, session };
}
