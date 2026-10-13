"use client";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuction } from "@/hooks/useAuction";
import { useToast } from "@/components/Toast";
import { ConnectionOverlay } from "@/components/ConnectionOverlay";
import { LiveHeader } from "./LiveHeader";
import { PlayerCard } from "./PlayerCard";
import { BidFeed } from "./BidFeed";
import { PursePanel } from "./PursePanel";
import { ResultOverlay } from "./ResultOverlay";
import { RecentResults } from "./RecentResults";
import type { AuctionSnapshot } from "@/types/auction";

/** Shared room layout. `controls` renders under the player card (bid button / RTM panel / auctioneer console). */
export function AuctionRoom({ initial, myTeamId, controls }: { initial: AuctionSnapshot | null; myTeamId?: string | null; controls?: (a: ReturnType<typeof useAuction>) => ReactNode }) {
  const a = useAuction(initial);
  const { push } = useToast();
  useEffect(() => { if (a.lastRejection) { push({ title: "Rejected", body: a.lastRejection, tone: "error" }); a.clearRejection(); } }, [a.lastRejection]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (a.flash) push({ title: a.flash.kind === "SOLD" ? `SOLD: ${a.flash.playerName}` : a.flash.kind === "RTM" ? `RTM window: ${a.flash.teamName}` : `UNSOLD: ${a.flash.playerName}`, body: a.flash.kind === "SOLD" ? `${a.flash.teamName}${a.flash.viaRtm ? " (RTM)" : ""}` : undefined, tone: a.flash.kind === "SOLD" ? "success" : a.flash.kind === "RTM" ? "rtm" : "error" }); }, [a.flash]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!a.snap) return (<><ConnectionOverlay /><div className="p-10 text-center text-muted">Connecting to auction…</div></>);
  const s = a.snap;
  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 px-3 py-4 md:px-4">
      <ConnectionOverlay />
      <ResultOverlay flash={a.flash} />
      <LiveHeader snap={s} connected={a.connected} clients={a.clients} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <PlayerCard snap={s} remainingMs={a.remainingMs} />
          {controls?.(a)}
          <div className="grid gap-4 md:grid-cols-2">
            <BidFeed bids={s.bids} />
            <div className="lg:hidden"><PursePanel teams={s.teams} highlight={s.highestTeamId} mine={myTeamId} rtmTeam={s.rtm?.teamId} /></div>
            <RecentResults />
          </div>
        </div>
        <div className="hidden lg:block"><PursePanel teams={s.teams} highlight={s.highestTeamId} mine={myTeamId} rtmTeam={s.rtm?.teamId} /></div>
      </div>
    </div>
  );
}
