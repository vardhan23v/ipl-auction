"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Sheet } from "./Sheet";

const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const LOBBY = "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", SQUADS = "M4 6h16M4 12h16M4 18h10", MORE = "M5 12h.01M12 12h.01M19 12h.01";

/** Secondary room pages, shared by the phone "More" sheet and the desktop "More" button. */
export function roomMoreLinks(code: string, isHost: boolean, hasTeam: boolean): [string, string][] {
  const b = `/r/${code}`;
  return [
    ...(isHost ? [["Set up auction", `${b}/setup`] as [string, string]] : []),
    ...(hasTeam ? [["My franchise", `${b}/owner`] as [string, string]] : []),
    ["Players", `${b}/players`], ["Results", `${b}/results`], ["RTM board", `${b}/rtm`], ["History", `${b}/history`], ["Analytics", `${b}/analytics`], ["Big screen", `${b}/display`],
    ...(isHost ? [["Room admin", `${b}/manage`] as [string, string]] : []),
  ];
}

export function RoomMoreSheet({ code, isHost, hasTeam, open, onClose }: { code: string; isHost: boolean; hasTeam: boolean; open: boolean; onClose: () => void }) {
  const { data } = useSession(); const path = usePathname();
  return (
    <Sheet open={open} onClose={onClose} title="More">
      <div className="grid grid-cols-2 gap-2 pb-2">
        {roomMoreLinks(code, isHost, hasTeam).map(([l, h]) => <Link key={h} href={h} onClick={onClose} className={`btn-ghost tap justify-start ${path === h ? "border-gold/60 text-gold" : ""}`}>{l}</Link>)}
      </div>
      <div className="mt-2 flex flex-col gap-2 border-t border-line/60 pt-3 pb-2">
        <Link href="/rooms" onClick={onClose} className="btn-ghost tap justify-start">My rooms{data?.user?.name ? ` · ${data.user.name}` : ""}</Link>
        {data?.user ? <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-ghost tap justify-start text-muted">Log out</button> : <Link href={`/login?next=/r/${code}`} className="btn-gold tap">Sign in</Link>}
      </div>
    </Sheet>
  );
}

/** Phone bottom tabs: Lobby · Live · Squads · More. */
export function RoomTabBar({ code, isHost, hasTeam }: { code: string; isHost: boolean; hasTeam: boolean }) {
  const path = usePathname(); const [more, setMore] = useState(false);
  const b = `/r/${code}`;
  const tabs = [
    { href: b, label: "Lobby", icon: <Icon d={LOBBY} /> },
    { href: `${b}/live`, label: "Live", icon: <span className="live-dot inline-block h-3 w-3 rounded-full bg-live" /> },
    { href: `${b}/squads`, label: "Squads", icon: <Icon d={SQUADS} /> },
  ];
  const active = (h: string) => (h === b ? path === b : path === h || path.startsWith(h + "/"));
  const moreActive = !tabs.some((t) => active(t.href));
  return (
    <>
      <nav className="safe-b safe-x fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-pitch/95 backdrop-blur md:hidden" aria-label="Room">
        <div className="grid grid-cols-4">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} className={`tap flex flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-semibold ${active(t.href) ? "text-gold" : "text-muted"}`} aria-current={active(t.href) ? "page" : undefined}>
              <span className="flex h-5 items-center">{t.icon}</span>{t.label}
            </Link>
          ))}
          <button onClick={() => setMore(true)} className={`tap flex flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-semibold ${moreActive ? "text-gold" : "text-muted"}`} aria-haspopup="dialog">
            <span className="flex h-5 items-center"><Icon d={MORE} /></span>More
          </button>
        </div>
      </nav>
      <RoomMoreSheet code={code} isHost={isHost} hasTeam={hasTeam} open={more} onClose={() => setMore(false)} />
    </>
  );
}
