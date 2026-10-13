"use client";
/* eslint-disable @next/next/no-img-element -- remote OAuth avatars */
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

/** Site nav. Inside a room (`/r/CODE/...`) it shows the room's sections; elsewhere the global ones. Collapses to a menu on phones. */
export function Nav({ roomCode, roomName, isHost }: { roomCode?: string; roomName?: string; isHost?: boolean }) {
  const { data } = useSession(); const path = usePathname(); const [open, setOpen] = useState(false);
  const u = data?.user?.id ? data.user : null;
  const base = roomCode ? `/r/${roomCode}` : "";
  const links: [string, string, string?][] = roomCode
    ? [["Lobby", base], ["Live", `${base}/live`], ["Players", `${base}/players`], ["Squads", `${base}/squads`], ["RTM", `${base}/rtm`, "text-rtm-2"], ["History", `${base}/history`], ["Analytics", `${base}/analytics`], ["Results", `${base}/results`], ...(isHost ? [["Host console", `${base}/host`, "text-gold"] as [string, string, string]] : [])]
    : [["Rooms", "/rooms"], ["How it works", "/#how"]];
  const active = (h: string) => path === h ? "bg-panel-2 text-ink" : "text-muted hover:bg-panel-2 hover:text-ink";
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-pitch/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
        <Link href="/" className="display shrink-0 text-lg font-bold tracking-widest"><span className="text-gold">IPL</span> <span className="hidden sm:inline">Auction</span></Link>
        {roomCode && <Link href={base} className="hidden min-w-0 items-center gap-2 rounded-md border border-line px-2 py-1 text-xs md:flex"><span className="truncate text-muted">{roomName}</span><span className="font-mono font-bold tracking-widest text-gold">{roomCode}</span></Link>}
        <nav className="ml-auto hidden items-center gap-0.5 text-sm lg:flex">
          {links.map(([l, h, cls]) => <Link key={h} href={h} className={`rounded-md px-2.5 py-1.5 transition ${active(h)} ${cls ?? ""}`}>{l === "Live" ? <><span className="live-dot mr-1.5 inline-block h-2 w-2 rounded-full bg-live" />Live</> : l}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          {u ? (<>
            <Link href="/rooms" className="hidden items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-panel-2 sm:flex">
              {u.image ? <img src={u.image} alt="" className="h-6 w-6 rounded-full" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-black">{(u.name ?? "?")[0]}</span>}
              <span className="max-w-[9rem] truncate">{u.name}</span>
            </Link>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="hidden px-2 text-sm text-muted hover:text-ink sm:inline">Logout</button>
          </>) : <Link href="/login" className="btn-gold !px-3 !py-1.5 text-sm">Join / Sign in</Link>}
          <button className="btn-ghost !px-2.5 !py-1.5 lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "✕" : "☰"}</button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line/60 bg-pitch/95 px-4 py-2 lg:hidden">
          {roomCode && <div className="flex items-center justify-between py-2 text-xs"><span className="text-muted">{roomName}</span><span className="font-mono font-bold tracking-widest text-gold">{roomCode}</span></div>}
          <div className="grid grid-cols-2 gap-1">
            {links.map(([l, h, cls]) => <Link key={h} href={h} onClick={() => setOpen(false)} className={`rounded-md px-3 py-2 text-sm ${active(h)} ${cls ?? ""}`}>{l}</Link>)}
            {u && <Link href="/rooms" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted hover:bg-panel-2">My rooms ({u.name})</Link>}
            {u && <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-panel-2">Logout</button>}
          </div>
        </nav>
      )}
    </header>
  );
}
