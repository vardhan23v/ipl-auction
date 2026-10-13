"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AuctionRoom } from "@/components/auction/AuctionRoom";
import { BidButton } from "@/components/auction/BidButton";
import { RtmPanel } from "@/components/auction/RtmPanel";
import type { AuctionSnapshot } from "@/types/auction";
import { getSocket } from "@/lib/socket-client";
import { useToast } from "@/components/Toast";

export function OwnerRoom({ initial, teamId }: { initial: AuctionSnapshot; teamId: string }) {
  const r = useRouter(); const { push } = useToast(); const wasHighest = useRef(false);
  useEffect(() => {
    const s = getSocket(); const refresh = () => r.refresh();
    const onBid = (p: { snapshot?: AuctionSnapshot }) => {
      const snap = p?.snapshot; if (!snap) return;
      const nowHighest = snap.highestTeamId === teamId;
      if (wasHighest.current && !nowHighest && snap.state === "PLAYER_LIVE") push({ title: "You've been outbid!", body: `${snap.teams.find((t) => t.id === snap.highestTeamId)?.name} is now highest`, tone: "error" });
      wasHighest.current = nowHighest;
    };
    const onRtm = (p: { snapshot?: AuctionSnapshot }) => { const snap = p?.snapshot; if (snap?.rtm?.teamId === teamId) push({ title: "Your RTM call!", body: `${snap.currentPlayer?.name} — use a card?`, tone: "rtm" }); };
    s.on("player:sold", refresh); s.on("auction:undo", refresh); s.on("bid:accepted", onBid); s.on("rtm:offer", onRtm);
    return () => { s.off("player:sold", refresh); s.off("auction:undo", refresh); s.off("bid:accepted", onBid); s.off("rtm:offer", onRtm); };
  }, [r, teamId, push]);
  return (
    <AuctionRoom initial={initial} myTeamId={teamId} controls={(a) => {
      const rtm = a.snap?.rtm;
      const side = rtm ? (rtm.teamId === teamId ? "rtm" : rtm.bidderTeamId === teamId ? "bidder" : null) : null;
      return (<>
        {a.snap?.state.startsWith("RTM") && <RtmPanel a={a} canAct={side} />}
        <BidButton a={a} teamId={teamId} />
      </>);
    }} />
  );
}
