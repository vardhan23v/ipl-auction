"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useUser, signOut } from "@/hooks/useUser";
import { Sheet } from "./Sheet";

const I = {
  lobby: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  players: "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21a8 8 0 0 1 16 0",
  squads: "M4 6h16M4 12h16M4 18h10",
  more: "M5 12h.01M12 12h.01M19 12h.01",
};
const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;

/** Phone-only bottom tab bar for room pages. Desktop keeps the top nav. */
export function RoomTabBar({ code, isHost, hasTeam }: { code: string; isHost: boolean; hasTeam: boolean }) {
  const path = usePathname(); const [more, setMore] = useState(false); const me = useUser();
  const base = `/r/${code}`;
  const tabs = [
    { href: base, label: "Lobby", icon: <Icon d={I.lobby} /> },
    { href: `${base}/live`, label: "Live", icon: <span className="live-dot inline-block h-3 w-3 rounded-full bg-live" /> },
    ...(isHost ? [{ href: `${base}/host`, label: "Host", icon: <span className="display text-base font-bold leading-none">🔨</span> }] : []),
    { href: `${base}/players`, label: "Players", icon: <Icon d={I.players} /> },
    ...(isHost ? [] : [{ href: `${base}/squads`, label: "Squads", icon: <Icon d={I.squads} /> }]),
  ];
  const extra: [string, string, string?][] = [
    ...(hasTeam ? [["My franchise", `${base}/owner`, "text-gold"] as [string, string, string]] : []),
    ...(isHost ? [["Squads", `${base}/squads`] as [string, string]] : []),
    ["RTM board", `${base}/rtm`, "text-rtm-2"], ["History", `${base}/history`], ["Analytics", `${base}/analytics`], ["Results", `${base}/results`], ["Big screen", `${base}/display`],
    ...(isHost ? [["Manage room", `${base}/manage`, "text-gold"] as [string, string, string]] : []),
  ];
  const isActive = (h: string) => (h === base ? path === base : path === h || path.startsWith(h + "/"));
  const moreActive = extra.some(([, h]) => isActive(h));
  return (
    <>
      <nav className="safe-b safe-x fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-pitch/95 backdrop-blur md:hidden" aria-label="Room">
        <div className="grid grid-cols-5">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} prefetch className={`tap flex flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-semibold ${isActive(t.href) ? "text-gold" : "text-muted"}`} aria-current={isActive(t.href) ? "page" : undefined}>
              <span className="flex h-5 items-center">{t.icon}</span>{t.label}
            </Link>
          ))}
          <button onClick={() => setMore(true)} className={`tap flex flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-semibold ${moreActive ? "text-gold" : "text-muted"}`} aria-haspopup="dialog">
            <span className="flex h-5 items-center"><Icon d={I.more} /></span>More
          </button>
        </div>
      </nav>
      <Sheet open={more} onClose={() => setMore(false)} title="Room">
        <div className="grid grid-cols-2 gap-2 pb-2">
          {extra.map(([l, h, cls]) => <Link key={h} href={h} onClick={() => setMore(false)} className={`btn-ghost tap justify-start ${isActive(h) ? "border-gold/60" : ""} ${cls ?? ""}`}>{l}</Link>)}
        </div>
        <div className="mt-2 flex flex-col gap-2 border-t border-line/60 pt-3 pb-2">
          <Link href="/rooms" onClick={() => setMore(false)} className="btn-ghost tap justify-start">My rooms{me?.name ? ` · ${me.name}` : ""}</Link>
          {me ? <button onClick={() => signOut()} className="btn-ghost tap justify-start text-muted">Log out</button> : <Link href={`/login?next=${base}`} className="btn-gold tap">Join / Sign in</Link>}
        </div>
      </Sheet>
    </>
  );
}
