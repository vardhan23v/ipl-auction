"use client";
import { useEffect, useRef } from "react";
import { AuctionRoom } from "@/components/auction/AuctionRoom";
import { BidDock } from "@/components/auction/BidButton";
import type { AuctionSnapshot, RoomAccess } from "@/types/auction";
import { getSocket } from "@/lib/socket-client";
import { useToast } from "@/components/Toast";

type Side = "rtm" | "bidder" | "both" | null;
const sideFor = (snap: AuctionSnapshot | null, teamId: string): Side => { const rtm = snap?.rtm; return rtm ? (rtm.teamId === teamId ? "rtm" : rtm.bidderTeamId === teamId ? "bidder" : null) : null; };

/** A manager's live room: the shared live view plus the BID dock (which turns into RTM buttons when it's their call). */
export function OwnerRoom({ code, access, initial, teamId }: { code: string; access: RoomAccess; initial: AuctionSnapshot; teamId: string }) {
  const { push } = useToast(); const wasHighest = useRef(false);
  useEffect(() => {
    const s = getSocket();
    const onBid = (p: { snapshot?: AuctionSnapshot }) => { const snap = p?.snapshot; if (!snap || snap.roomCode !== code) return; const nowHighest = snap.highestTeamId === teamId; if (wasHighest.current && !nowHighest && snap.state === "PLAYER_LIVE") { push({ title: "Outbid", body: `${snap.teams.find((t) => t.id === snap.highestTeamId)?.abbreviation} is now highest`, tone: "error" }); navigator.vibrate?.(80); } wasHighest.current = nowHighest; };
    const onRtm = (p: { snapshot?: AuctionSnapshot }) => { const snap = p?.snapshot; if (snap?.roomCode === code && snap?.rtm?.teamId === teamId) navigator.vibrate?.([60, 40, 60]); };
    s.on("bid:accepted", onBid); s.on("rtm:offer", onRtm);
    return () => { s.off("bid:accepted", onBid); s.off("rtm:offer", onRtm); };
  }, [teamId, code, push]);
  return (
    <AuctionRoom code={code} access={access} initial={initial} myTeamId={teamId}
      controls={() => null}
      dock={(a) => <BidDock a={a} teamId={teamId} rtmSide={sideFor(a.snap, teamId)} />} />
  );
}
