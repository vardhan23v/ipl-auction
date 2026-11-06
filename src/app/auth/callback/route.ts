import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** OAuth (Google) return URL: exchange the code for a session cookie, then continue to `next` (same-site paths only). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const raw = url.searchParams.get("next") ?? "/rooms";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/rooms";
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL(`/login?error=oauth&next=${encodeURIComponent(next)}`, url.origin));
}
