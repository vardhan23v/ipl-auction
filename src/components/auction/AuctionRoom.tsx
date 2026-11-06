"use client";
import { memo, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuction } from "@/hooks/useAuction";
import { useToast } from "@/components/Toast";
import { ConnectionOverlay } from "@/components/ConnectionOverlay";
import { money } from "@/lib/format";
import { LiveHeader } from "./LiveHeader";
import { PlayerCard } from "./PlayerCard";
import { BidFeed } from "./BidFeed";
import { PurseStrip } from "./PurseStrip";
import { RecentResults } from "./RecentResults";
import { RtmPanel } from "./RtmPanel";
import { Sheet } from "../Sheet";
import type { AuctionSnapshot, BidSnapshot, RoomAccess } from "@/types/auction";
import { RoomCtx } from "../RoomContext";

type A = ReturnType<typeof useAuction>;

/** Last three bids inline; everything else lives behind "History". */
const LastBids = memo(function LastBids({ bids }: { bids: BidSnapshot[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Bids</h3><button className="text-sm font-semibold text-gold" onClick={() => setOpen(true)}>History</button></div>
      {bids.length === 0 && <div className="py-3 text-center text-sm text-muted">No bids yet</div>}
      <div className="flex flex-col gap-1.5">
        {bids.slice(0, 3).map((b, i) => (
          <div key={b.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${i === 0 ? "bid-new bg-gold/10" : "bg-panel-2/70"} ${b.id.startsWith("pending-") ? "opacity-70" : ""}`}>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: b.color }} /><span className="font-semibold">{b.abbreviation}</span>{b.kind !== "BID" && <span className="text-xs text-rtm-2">RTM</span>}</span>
            <span className="money font-bold tabular-nums">{money(b.amount)}</span>
          </div>
        ))}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="History">
        <div className="flex flex-col gap-3 pb-2"><BidFeed bids={bids} /><RecentResults /></div>
      </Sheet>
    </div>
  );
});

/**
 * The live room: one focused column — status line, the player card, purses, the last bids.
 * `controls` renders under the card (e.g. RTM status). `dock` is a fixed bar at the bottom for a manager's BID / RTM buttons.
 */
export function AuctionRoom({ code, access, initial, myTeamId, controls, dock }: { code: string; access?: RoomAccess | null; initial: AuctionSnapshot | null; myTeamId?: string | null; controls?: (a: A) => ReactNode; dock?: (a: A) => ReactNode }) {
  const a = useAuction(code, initial);
  const { push } = useToast();
  useEffect(() => { if (a.lastRejection) { push({ title: "Not accepted", body: a.lastRejection, tone: "error" }); a.clearRejection(); } }, [a.lastRejection]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!a.snap) return (<><ConnectionOverlay /><div className="p-10 text-center text-muted">Connecting to auction…</div></>);
  const s = a.snap;
  const showDock = !!dock && !["WAITING", "COMPLETED"].includes(s.state);
  return (
    <RoomCtx.Provider value={{ code, access: access ?? null }}>
      <div className={`mx-auto w-full max-w-3xl min-w-0 px-4 py-3 md:py-6 ${showDock ? "pb-dock" : ""}`}>
        <ConnectionOverlay />
        <LiveHeader snap={s} connected={a.connected} clients={a.clients} />
        <div className="flex flex-col gap-3">
          <PlayerCard snap={s} />
          {controls ? controls(a) : s.state.startsWith("RTM") && <RtmPanel a={a} canAct={null} />}
          <PurseStrip teams={s.teams} highlight={s.highestTeamId} mine={myTeamId} rtmTeam={s.rtm?.teamId} />
          <LastBids bids={s.bids} />
        </div>
      </div>
      {showDock && (
        <div className="safe-x fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-line/70 bg-pitch/95 px-4 py-2 backdrop-blur md:bottom-0 md:pb-[max(.75rem,env(safe-area-inset-bottom))] md:pt-3">
          <div className="mx-auto max-w-3xl">{dock!(a)}</div>
        </div>
      )}
    </RoomCtx.Provider>
  );
}
