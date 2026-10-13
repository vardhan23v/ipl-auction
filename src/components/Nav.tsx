"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { roleHome } from "@/lib/auth-client";

export function Nav() {
  const { data } = useSession();
  const u = data?.user;
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-pitch/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="display text-lg font-bold tracking-widest"><span className="text-gold">IPL</span> <span className="hidden sm:inline">Mega Auction</span></Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/live" className="rounded-md px-3 py-1.5 hover:bg-panel-2"><span className="live-dot mr-1.5 inline-block h-2 w-2 rounded-full bg-live" />Live</Link>
          <Link href="/players" className="rounded-md px-3 py-1.5 hover:bg-panel-2">Players</Link>
          <Link href="/squads" className="hidden rounded-md px-3 py-1.5 hover:bg-panel-2 sm:inline">Squads</Link>
          <Link href="/rtm" className="hidden rounded-md px-3 py-1.5 text-rtm-2 hover:bg-panel-2 sm:inline">RTM</Link>
          <Link href="/history" className="hidden rounded-md px-3 py-1.5 hover:bg-panel-2 md:inline">History</Link>
          <Link href="/analytics" className="hidden rounded-md px-3 py-1.5 hover:bg-panel-2 md:inline">Analytics</Link>
          <Link href="/results" className="hidden rounded-md px-3 py-1.5 hover:bg-panel-2 lg:inline">Results</Link>
          {u ? (
            <>
              <Link href={roleHome(u.role)} className="btn-ghost !px-3 !py-1.5">{u.role === "OWNER" ? "My Franchise" : u.role[0] + u.role.slice(1).toLowerCase()}</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="px-2 text-muted hover:text-ink">Logout</button>
            </>
          ) : <Link href="/login" className="btn-gold !px-3 !py-1.5">Franchise Login</Link>}
        </nav>
      </div>
    </header>
  );
}
