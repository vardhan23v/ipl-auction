import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Pages that need a signed-in user. Per-room roles (host / owner) and platform ADMIN are checked by the pages themselves. */
const GUARDED = [/^\/admin(\/|$)/, /^\/rooms$/, /^\/r\/[^/]+\/host$/, /^\/r\/[^/]+\/manage(\/|$)/, /^\/r\/[^/]+\/owner$/];

/**
 * Next.js 16 proxy: keeps the Supabase auth cookies fresh on every request (server components can't write cookies)
 * and sends signed-out visitors of guarded pages to /login?next=….
 */
export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return res;
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getClaims();
  const p = req.nextUrl.pathname;
  if (!data?.claims?.sub && GUARDED.some((r) => r.test(p))) {
    const to = req.nextUrl.clone(); to.pathname = "/login"; to.search = `?next=${encodeURIComponent(p + req.nextUrl.search)}`;
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"] };
