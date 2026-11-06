"use client";
import { useEffect, useState } from "react";
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
import { RtmPanel } from "./RtmPanel";
import type { AuctionSnapshot, RoomAccess } from "@/types/auction";
import { RoomCtx } from "../RoomContext";

type A = ReturnType<typeof useAuction>;
type Tab = "feed" | "purses" | "results";

/**
 * Shared live-room layout.
 * - `controls` renders under the player card (desktop bid panel / RTM panel / host console).
 * - `dock` renders in a fixed bar above the phone tab bar (bid dock / host dock). Phones only.
 * Each panel is mounted once; phones switch between Feed · Purses · Results with a segmented control.
 */
export function AuctionRoom({ code, access, initial, myTeamId, controls, dock }: { code: string; access?: RoomAccess | null; initial: AuctionSnapshot | null; myTeamId?: string | null; controls?: (a: A) => ReactNode; dock?: (a: A) => ReactNode }) {
  const a = useAuction(code, initial);
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>("feed");
  useEffect(() => { if (a.lastRejection) { push({ title: "Rejected", body: a.lastRejection, tone: "error" }); a.clearRejection(); } }, [a.lastRejection]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (a.flash) push({ title: a.flash.kind === "SOLD" ? `SOLD: ${a.flash.playerName}` : a.flash.kind === "RTM" ? `RTM window: ${a.flash.teamName}` : `UNSOLD: ${a.flash.playerName}`, body: a.flash.kind === "SOLD" ? `${a.flash.teamName}${a.flash.viaRtm ? " (RTM)" : ""}` : undefined, tone: a.flash.kind === "SOLD" ? "success" : a.flash.kind === "RTM" ? "rtm" : "error" }); }, [a.flash]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!a.snap) return (<><ConnectionOverlay /><div className="p-10 text-center text-muted">Connecting to auction…</div></>);
  const s = a.snap;
  const show = (t: Tab) => `${tab === t ? "" : "hidden"} md:block`;
  return (
    <RoomCtx.Provider value={{ code, access: access ?? null }}>
    <div className={`mx-auto w-full max-w-7xl min-w-0 px-3 py-3 md:px-4 md:py-4 ${dock ? "pb-dock" : ""}`}>
      <ConnectionOverlay />
      <ResultOverlay flash={a.flash} />
      <LiveHeader snap={s} connected={a.connected} clients={a.clients} />
      <div className="grid gap-3 md:gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 lg:col-start-1"><PlayerCard snap={s} /></div>
        {controls ? <div className="flex min-w-0 flex-col gap-4 empty:hidden lg:col-start-1">{controls(a)}</div>
          : s.state.startsWith("RTM") && <div className="min-w-0 lg:col-start-1"><RtmPanel a={a} canAct={null} /></div>}
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-panel p-1 md:hidden" role="tablist">
          {([["feed", `Bids${s.bids.length ? ` · ${s.bids.length}` : ""}`], ["purses", "Purses"], ["results", "Results"]] as [Tab, string][]).map(([t, l]) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`tap rounded-lg text-sm font-semibold transition ${tab === t ? "bg-panel-2 text-gold" : "text-muted"}`}>{l}</button>
          ))}
        </div>
        <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:col-start-1">
          <div className={show("feed")}><BidFeed bids={s.bids} /></div>
          <div className={show("results")}><RecentResults /></div>
        </div>
        <div className={`${show("purses")} min-w-0 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-start`}>
          <PursePanel teams={s.teams} highlight={s.highestTeamId} mine={myTeamId} rtmTeam={s.rtm?.teamId} />
        </div>
      </div>
      {dock && <div className="safe-x fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-line/70 bg-pitch/95 px-3 py-2 backdrop-blur md:hidden">{dock(a)}</div>}
    </div>
    </RoomCtx.Provider>
  );
}
