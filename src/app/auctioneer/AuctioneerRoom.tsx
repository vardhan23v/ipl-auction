"use client";
import { AuctionRoom } from "@/components/auction/AuctionRoom";
import { AuctioneerPanel } from "@/components/auction/AuctioneerPanel";
import type { AuctionSnapshot } from "@/types/auction";
export function AuctioneerRoom({ initial, isAdmin }: { initial: AuctionSnapshot; isAdmin: boolean }) {
  return <AuctionRoom initial={initial} controls={(a) => <AuctioneerPanel a={a} isAdmin={isAdmin} />} />;
}
