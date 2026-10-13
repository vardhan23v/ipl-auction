"use client";
import { AuctionRoom } from "@/components/auction/AuctionRoom";
import { AuctioneerPanel } from "@/components/auction/AuctioneerPanel";
import type { AuctionSnapshot, RoomAccess } from "@/types/auction";
export function HostRoom({ code, access, initial }: { code: string; access: RoomAccess; initial: AuctionSnapshot }) {
  return <AuctionRoom code={code} access={access} initial={initial} myTeamId={access.teamId} controls={(a) => <AuctioneerPanel a={a} isAdmin />} />;
}
