"use client";
import { useState } from "react";
import { AuctionRoom } from "@/components/auction/AuctionRoom";
import { AuctioneerPanel, HostDock } from "@/components/auction/AuctioneerPanel";
import { BidButton, BidDock } from "@/components/auction/BidButton";
import type { AuctionSnapshot, RoomAccess } from "@/types/auction";

/** Host console. Phones get the host dock; a host who also manages a franchise can flip the dock to bidding. */
export function HostRoom({ code, access, initial }: { code: string; access: RoomAccess; initial: AuctionSnapshot }) {
  const mine = access.teamId; const [mode, setMode] = useState<"host" | "bid">("host");
  return (
    <AuctionRoom code={code} access={access} initial={initial} myTeamId={mine}
      controls={(a) => (<div className="hidden flex-col gap-4 md:flex">{mine && <BidButton a={a} teamId={mine} />}<AuctioneerPanel a={a} isAdmin /></div>)}
      dock={(a) => (<>
        {mine && (
          <div className="mb-1.5 grid grid-cols-2 gap-1 rounded-lg bg-panel p-0.5 text-xs font-semibold">
            {(["host", "bid"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded-md py-1.5 ${mode === m ? "bg-panel-2 text-gold" : "text-muted"}`}>{m === "host" ? "Host controls" : "Bid for my team"}</button>)}
          </div>
        )}
        {mine && mode === "bid" ? <BidDock a={a} teamId={mine} rtmSide={a.snap?.rtm ? (a.snap.rtm.teamId === mine ? "rtm" : a.snap.rtm.bidderTeamId === mine ? "bidder" : null) : null} /> : <HostDock a={a} isAdmin />}
      </>)} />
  );
}
