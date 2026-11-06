"use client";
import { memo } from "react";
import { STATE_LABEL } from "@/lib/format";
import type { AuctionSnapshot } from "@/types/auction";
import { useRoom } from "../RoomContext";
import { HostMenu } from "./HostMenu";

/** One quiet line: status, players left, who's here — plus the host's ⋯ menu. */
export const LiveHeader = memo(function LiveHeader({ snap, connected, clients }: { snap: AuctionSnapshot; connected: boolean; clients: number }) {
  const { access } = useRoom();
  const isHost = !!access && (access.isHost || access.isAdmin);
  const live = !["WAITING", "COMPLETED", "PAUSED"].includes(snap.state);
  const rtm = snap.state.startsWith("RTM");
  return (
    <div className="mb-3 flex items-center gap-3 text-sm">
      <span className="flex items-center gap-2 font-semibold"><span className={`inline-block h-2.5 w-2.5 rounded-full ${live ? (rtm ? "bg-rtm" : "live-dot bg-live") : "bg-muted"}`} />{rtm ? "RTM" : live ? "Live" : STATE_LABEL[snap.state]}</span>
      <span className="text-muted">{snap.playersRemaining} left</span>
      <span className="ml-auto flex items-center gap-1.5 text-xs text-muted"><span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-live"}`} />{connected ? `${clients} watching` : "Reconnecting…"}</span>
      {isHost && <HostMenu snap={snap} />}
    </div>
  );
});
