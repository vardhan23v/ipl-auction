import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getSession, requireRole } from "./auth";
import { prisma } from "./prisma";
import { getRoomByCode, getRoomAccess } from "./room";
import type { Role } from "@prisma/client";
import { AuctionError } from "@/server/auction-engine";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400, code?: string) => NextResponse.json({ error: message, code }, { status });
export async function guard(...roles: Role[]) {
  const s = await requireRole(...roles);
  return s ? { session: s } : { error: fail("Forbidden", 403) };
}
/** Resolve a room from the URL code and the caller's access to it. `need` = "host" | "member" | "any". */
export async function roomGuard(code: string, need: "host" | "member" | "any" = "any") {
  const room = await getRoomByCode(code);
  if (!room) return { error: fail("Room not found", 404, "NO_ROOM") } as const;
  const s = await getSession();
  const access = await getRoomAccess(room, s?.user);
  if (need === "host" && !(access.isHost || access.isAdmin)) return { error: fail("Only the room host can do that", 403, "NOT_HOST") } as const;
  if (need === "member" && !access.userId) return { error: fail("Sign in first", 401, "UNAUTHENTICATED") } as const;
  return { room, access, session: s } as const;
}
export async function parse<T>(req: Request, schema: ZodType<T>): Promise<T> { return schema.parse(await req.json()); }
export function handle(e: unknown) {
  if (e instanceof ZodError) return fail(e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 422, "VALIDATION");
  if (e instanceof AuctionError) return fail(e.message, 409, e.code);
  console.error(e);
  return fail((e as Error).message ?? "Server error", 500);
}
export async function audit(userId: string | undefined | null, action: string, entity?: string, entityId?: string, details?: unknown) {
  await prisma.auditLog.create({ data: { userId: userId ?? undefined, action, entity, entityId, details: (details as object) ?? undefined } }).catch(() => {});
}
