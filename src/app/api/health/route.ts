import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  try { await prisma.$queryRaw`SELECT 1`; return NextResponse.json({ ok: true, db: "up" }); }
  catch (e) { return NextResponse.json({ ok: false, db: "down", error: (e as Error).message }, { status: 503 }); }
}
