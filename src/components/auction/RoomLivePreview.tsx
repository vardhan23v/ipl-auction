"use client";
import Link from "next/link";
import { useAuction } from "@/hooks/useAuction";
import { money, STATE_LABEL } from "@/lib/format";
import { SnapTimer } from "./Timer";
import { PlayerPhoto } from "../PlayerPhoto";
import type { AuctionSnapshot } from "@/types/auction";
/** Compact live card for the room lobby. */
export function RoomLivePreview({ code, initial }: { code: string; initial: AuctionSnapshot }) {
  const a = useAuction(code, initial);
  const s = a.snap; if (!s) return null;
  const p = s.currentPlayer; const highest = s.teams.find((t) => t.id === s.highestTeamId);
  return (
    <Link href={`/r/${code}/live`} className="card sheen block overflow-hidden transition hover:border-gold/50">
      <div className="grid grid-cols-[64px_1fr] items-center gap-3 p-3 sm:grid-cols-[96px_1fr_auto] sm:gap-4 sm:p-4">
        <div className="h-16 w-16 overflow-hidden sm:h-24 sm:w-24 rounded-xl border border-line bg-panel-2"><PlayerPhoto src={p?.photoUrl ?? null} name={p?.name ?? "IPL"} className="h-full w-full object-cover object-top text-4xl" /></div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest"><span className={`h-2 w-2 rounded-full ${["WAITING", "COMPLETED"].includes(s.state) ? "bg-muted" : "live-dot bg-live"}`} />{STATE_LABEL[s.state]}</div>
          <div className="display truncate text-xl sm:text-2xl md:text-3xl">{p?.name ?? (s.state === "WAITING" ? "Waiting for the host to start" : s.state === "COMPLETED" ? "Auction complete" : "Next player coming up")}</div>
          <div className="mt-1 text-sm text-muted">{p ? <>Base {money(p.basePrice)} · Current <b className="money">{s.currentBid ? money(s.currentBid) : "—"}</b>{highest && <> · <span style={{ color: highest.color }}>{highest.abbreviation}</span></>}</> : `${s.soldCount} sold · ${s.unsoldCount} unsold · ${s.playersRemaining} remaining`}</div>
        </div>
        <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:justify-end">{s.timerRunning && <SnapTimer snap={s} size="sm" />}<span className="btn-red tap flex-1 sm:flex-none">Live room →</span></div>
      </div>
    </Link>
  );
}
