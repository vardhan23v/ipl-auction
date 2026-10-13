"use client";
import { AuctionRoom } from "@/components/auction/AuctionRoom";
import { AuctioneerPanel } from "@/components/auction/AuctioneerPanel";
import { BidButton } from "@/components/auction/BidButton";
import type { AuctionSnapshot, RoomAccess } from "@/types/auction";
export function HostRoom({ code, access, initial }: { code: string; access: RoomAccess; initial: AuctionSnapshot }) {
  const mine = access.teamId;
  return (
    <AuctionRoom code={code} access={access} initial={initial} myTeamId={mine}
      controls={(a) => (<>{mine && <BidButton a={a} teamId={mine} />}<AuctioneerPanel a={a} isAdmin /></>)}
      stickyControls={mine ? (a) => <BidButton a={a} teamId={mine} compact /> : undefined} />
  );
}
