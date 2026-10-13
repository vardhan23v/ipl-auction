"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AuctionRoom } from "@/components/auction/AuctionRoom";
import { BidButton } from "@/components/auction/BidButton";
import { RtmPanel } from "@/components/auction/RtmPanel";
import type { AuctionSnapshot, RoomAccess } from "@/types/auction";
import { getSocket } from "@/lib/socket-client";
import { useToast } from "@/components/Toast";

export function OwnerRoom({ code, access, initial, teamId }: { code: string; access: RoomAccess; initial: AuctionSnapshot; teamId: string }) {
  const r = useRouter(); const { push } = useToast(); const wasHighest = useRef(false);
  useEffect(() => {
    const s = getSocket(); const refresh = () => r.refresh();
    const onBid = (p: { snapshot?: AuctionSnapshot }) => { const snap = p?.snapshot; if (!snap || snap.roomCode !== code) return; const nowHighest = snap.highestTeamId === teamId; if (wasHighest.current && !nowHighest && snap.state === "PLAYER_LIVE") push({ title: "You've been outbid!", body: `${snap.teams.find((t) => t.id === snap.highestTeamId)?.name} is now highest`, tone: "error" }); wasHighest.current = nowHighest; };
    const onRtm = (p: { snapshot?: AuctionSnapshot }) => { const snap = p?.snapshot; if (snap?.roomCode === code && snap?.rtm?.teamId === teamId) push({ title: "Your RTM call!", body: `${snap.currentPlayer?.name} — use a card?`, tone: "rtm" }); };
    s.on("player:sold", refresh); s.on("auction:undo", refresh); s.on("bid:accepted", onBid); s.on("rtm:offer", onRtm);
    return () => { s.off("player:sold", refresh); s.off("auction:undo", refresh); s.off("bid:accepted", onBid); s.off("rtm:offer", onRtm); };
  }, [r, teamId, code, push]);
  const side = (a: { snap: AuctionSnapshot | null }) => { const rtm = a.snap?.rtm; return rtm ? (rtm.teamId === teamId ? "rtm" : rtm.bidderTeamId === teamId ? "bidder" : null) : null; };
  return (
    <AuctionRoom code={code} access={access} initial={initial} myTeamId={teamId}
      controls={(a) => (<>{a.snap?.state.startsWith("RTM") && <RtmPanel a={a} canAct={side(a)} />}<div className="hidden md:block"><BidButton a={a} teamId={teamId} /></div></>)}
      stickyControls={(a) => <BidButton a={a} teamId={teamId} compact />} />
  );
}
