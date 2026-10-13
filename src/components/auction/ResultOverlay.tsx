"use client";
import { money } from "@/lib/format";
import type { FlashEvent } from "@/hooks/useAuction";
export function ResultOverlay({ flash }: { flash: FlashEvent | null }) {
  if (!flash) return null;
  if (flash.kind === "RTM") {
    return (
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="pop text-center">
          <div className="flip-in display inline-block rounded-2xl border-8 border-rtm bg-rtm/15 px-10 py-4 text-6xl font-bold text-rtm-2 md:text-8xl" style={{ textShadow: "0 0 40px currentColor" }}>RTM CARD</div>
          <div className="display mt-8 text-3xl md:text-5xl">{flash.playerName}</div>
          <div className="mt-2 text-lg text-muted">Right to match for</div>
          <div className="display text-3xl font-bold md:text-4xl" style={{ color: flash.teamColor }}>{flash.teamName}</div>
          <div className="display money mt-3 text-5xl font-bold md:text-6xl">{money(flash.amount)}</div>
        </div>
      </div>
    );
  }
  const sold = flash.kind === "SOLD";
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="pop text-center">
        <div className={`stamp display inline-block rounded-2xl border-8 px-10 py-4 text-7xl font-bold md:text-9xl ${sold ? "border-emerald-400 text-emerald-400" : "border-live text-live"}`} style={{ textShadow: "0 0 40px currentColor" }}>{sold ? "SOLD!" : "UNSOLD"}</div>
        <div className="display mt-8 text-4xl md:text-5xl">{flash.playerName}</div>
        {sold ? (<>
          <div className="mt-2 text-lg text-muted">{flash.viaRtm ? "Matched via RTM by" : "Sold to"}</div>
          <div className="display text-3xl font-bold md:text-4xl" style={{ color: flash.teamColor }}>{flash.teamName}</div>
          <div className="display money mt-3 text-6xl font-bold md:text-7xl">{money(flash.amount)}</div>
        </>) : <div className="mt-2 text-lg text-muted">No successful bids</div>}
      </div>
    </div>
  );
}
