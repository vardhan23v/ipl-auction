"use client";
import Link from "next/link";
import { useAuction } from "@/hooks/useAuction";
import { money, STATE_LABEL } from "@/lib/format";
import { Timer } from "./auction/Timer";
import { PlayerPhoto } from "./PlayerPhoto";
export function LivePreview() {
  const a = useAuction();
  const s = a.snap;
  if (!s) return <div className="card p-8 text-center text-muted">Connecting to the auction floor…</div>;
  const p = s.currentPlayer; const highest = s.teams.find((t) => t.id === s.highestTeamId);
  return (
    <Link href="/live" className="card sheen block overflow-hidden transition hover:border-gold/50">
      <div className="grid gap-4 p-5 md:grid-cols-[120px_1fr_auto] md:items-center">
        <div className="h-28 w-28 overflow-hidden rounded-xl border border-line bg-panel-2"><PlayerPhoto src={p?.photoUrl ?? null} name={p?.name ?? "IPL"} className="h-full w-full object-cover object-top text-5xl" /></div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest"><span className={`h-2 w-2 rounded-full ${["WAITING", "COMPLETED"].includes(s.state) ? "bg-muted" : "live-dot bg-live"}`} />{STATE_LABEL[s.state]}</div>
          <div className="display truncate text-3xl md:text-4xl">{p?.name ?? (s.state === "WAITING" ? "Auction starts soon" : "Next player coming up")}</div>
          <div className="mt-1 text-sm text-muted">{p ? <>Base {money(p.basePrice)} · Current <b className="money">{s.currentBid ? money(s.currentBid) : "—"}</b>{highest && <> · <span style={{ color: highest.color }}>{highest.name}</span></>}</> : `${s.soldCount} sold · ${s.unsoldCount} unsold · ${s.playersRemaining} remaining`}</div>
        </div>
        <div className="flex items-center gap-4">{s.timerRunning && <Timer ms={a.remainingMs} running total={s.timerSeconds} size="sm" />}<span className="btn-red">Enter live room →</span></div>
      </div>
    </Link>
  );
}
