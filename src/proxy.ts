import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
export const proxy = withAuth(
  function (req) {
    const role = req.nextauth.token?.role as string | undefined;
    const p = req.nextUrl.pathname;
    if (p.startsWith("/admin") && role !== "ADMIN") return NextResponse.redirect(new URL("/login", req.url));
    if (p.startsWith("/auctioneer") && !["ADMIN", "AUCTIONEER"].includes(role ?? "")) return NextResponse.redirect(new URL("/login", req.url));
    if (p.startsWith("/owner") && role !== "OWNER") return NextResponse.redirect(new URL("/lobby", req.url));
    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token?.uid }, pages: { signIn: "/login" } },
);
export const config = { matcher: ["/admin/:path*", "/auctioneer/:path*", "/owner/:path*", "/lobby/:path*"] };
