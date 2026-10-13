import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { requireRole } from "./auth";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";
import { AuctionError } from "@/server/auction-engine";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400, code?: string) => NextResponse.json({ error: message, code }, { status });
export async function guard(...roles: Role[]) {
  const s = await requireRole(...roles);
  return s ? { session: s } : { error: fail("Forbidden", 403) };
}
export async function parse<T>(req: Request, schema: ZodType<T>): Promise<T> { return schema.parse(await req.json()); }
export function handle(e: unknown) {
  if (e instanceof ZodError) return fail(e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 422, "VALIDATION");
  if (e instanceof AuctionError) return fail(e.message, 409, e.code);
  console.error(e);
  return fail((e as Error).message ?? "Server error", 500);
}
export async function audit(userId: string | undefined, action: string, entity?: string, entityId?: string, details?: unknown) {
  await prisma.auditLog.create({ data: { userId, action, entity, entityId, details: (details as object) ?? undefined } }).catch(() => {});
}
