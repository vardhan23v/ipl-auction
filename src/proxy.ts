import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Route guard (Next.js 16 proxy). Signed-in users (token.uid) may reach the matched routes;
 * platform /admin additionally needs role ADMIN. Per-room roles (host / owner) are checked by the pages themselves.
 * Unauthenticated hits are redirected by withAuth to /login?callbackUrl=…, which the login page honours.
 */
export const proxy = withAuth(
  function (req) {
    const role = req.nextauth.token?.role as string | undefined;
    const p = req.nextUrl.pathname;
    if (p.startsWith("/admin") && role !== "ADMIN") return NextResponse.redirect(new URL("/rooms", req.url));
    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token?.uid }, pages: { signIn: "/login" } },
);

export const config = { matcher: ["/admin/:path*", "/rooms", "/r/:code/host", "/r/:code/manage/:path*", "/r/:code/owner"] };
