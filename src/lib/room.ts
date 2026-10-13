import { prisma } from "./prisma";
import type { RoomAccess } from "@/types/auction";

export const ROOM_CODE_LEN = 6;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export function makeRoomCode() { let s = ""; for (let i = 0; i < ROOM_CODE_LEN; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return s; }
export const normalizeCode = (c: string) => c.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LEN);

export type RoomRow = NonNullable<Awaited<ReturnType<typeof getRoomByCode>>>;
export async function getRoomByCode(code: string) {
  const c = normalizeCode(code);
  if (c.length !== ROOM_CODE_LEN) return null;
  return prisma.room.findUnique({ where: { code: c }, include: { host: { select: { id: true, name: true, image: true } } } });
}

/** What `userId` may do inside `room`. Host == auctioneer; a team owner may bid for that team; platform admins may do anything. */
export async function getRoomAccess(room: { id: string; code: string; hostId: string }, user: { id: string; role: string } | null | undefined): Promise<RoomAccess> {
  if (!user) return { roomId: room.id, code: room.code, userId: null, isHost: false, isAdmin: false, isMember: false, teamId: null, teamAbbr: null, role: "GUEST" };
  const [member, team] = await Promise.all([
    prisma.roomMember.findUnique({ where: { roomId_userId: { roomId: room.id, userId: user.id } } }),
    prisma.team.findFirst({ where: { roomId: room.id, ownerId: user.id }, select: { id: true, abbreviation: true } }),
  ]);
  const isHost = room.hostId === user.id; const isAdmin = user.role === "ADMIN";
  return { roomId: room.id, code: room.code, userId: user.id, isHost, isAdmin, isMember: !!member || isHost, teamId: team?.id ?? null, teamAbbr: team?.abbreviation ?? null, role: isHost ? "HOST" : team ? "OWNER" : "SPECTATOR" };
}

/** Make sure the user is a member of the room (idempotent). */
export async function ensureMember(roomId: string, userId: string, role?: "HOST" | "OWNER" | "SPECTATOR") {
  return prisma.roomMember.upsert({ where: { roomId_userId: { roomId, userId } }, update: role ? { role } : {}, create: { roomId, userId, role: role ?? "SPECTATOR" } });
}
