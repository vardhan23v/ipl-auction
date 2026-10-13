import Link from "next/link";
import { loadRoomPage } from "@/lib/room-page";
import { RoomShell } from "../RoomShell";
import { RoomCtx } from "./Ctx";
const items = [["Overview", ""], ["Host console", "/host", true], ["Franchises", "/manage/teams"], ["Players & RTM lists", "/manage/players"], ["Queue", "/manage/queue"], ["Sold", "/manage/sold"], ["Unsold / skipped", "/manage/unsold"], ["Bids & events", "/manage/bids"], ["Settings", "/manage/settings"]] as const;
export default async function ManageLayout({ children, params }: { children: React.ReactNode; params: Promise<{ code: string }> }) {
  const { room, access } = await loadRoomPage((await params).code, "host");
  const base = `/r/${room.code}`;
  return (
    <RoomShell room={room} access={access}>
      <div className="mx-auto flex max-w-[1400px] gap-4 px-4 py-4">
        <aside className="hidden w-48 shrink-0 lg:block"><nav className="card sticky top-20 flex flex-col p-2">{items.map(([l, h]) => <Link key={h} href={`${base}${h || "/manage"}`} className="rounded-md px-3 py-2 text-sm hover:bg-panel-2">{l}</Link>)}</nav></aside>
        <div className="min-w-0 flex-1">
          <div className="scroll-x mb-3 flex gap-1 lg:hidden">{items.map(([l, h]) => <Link key={h} href={`${base}${h || "/manage"}`} className="shrink-0 whitespace-nowrap rounded-md bg-panel-2 px-3 py-1 text-xs">{l}</Link>)}</div>
          <RoomCtx code={room.code} access={access}>{children}</RoomCtx>
        </div>
      </div>
    </RoomShell>
  );
}
