"use client";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import type { useAuction } from "@/hooks/useAuction";
import { money, ROLE_SHORT } from "@/lib/format";
import { RtmPanel } from "./RtmPanel";
import { Sheet } from "../Sheet";
import { useRoom, roomApi } from "../RoomContext";
import type { AuctionSnapshot } from "@/types/auction";
type A = ReturnType<typeof useAuction>;
type Q = { id: string; name: string; role: string; basePrice: number; set: string; overseas: boolean; previousTeam: { abbreviation: string } | null };

/** Host actions shared by the desktop console and the phone host dock. */
function useHostActions(s: AuctionSnapshot) {
  const { push } = useToast(); const { code } = useRoom();
  const [busy, setBusy] = useState<string | null>(null); const [queue, setQueue] = useState<Q[]>([]);
  // Reload the queue only when it can have changed (player started/sold/undone, auction started) — never per bid.
  const queueKey = `${s.state === "WAITING"}|${s.playersRemaining}|${s.currentPlayer?.id ?? ""}`;
  useEffect(() => {
    const ctl = new AbortController();
    fetch(roomApi(code, "/players/queue"), { signal: ctl.signal }).then((r) => r.json()).then((q) => Array.isArray(q) && setQueue(q)).catch(() => {});
    return () => ctl.abort();
  }, [code, queueKey]);
  const act = useCallback(async (action: string, confirmMsg?: string, playerId?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return false;
    setBusy(action);
    try {
      const r = await fetch(roomApi(code, "/control"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, playerId }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { push({ title: "Action failed", body: j.error, tone: "error" }); return false; }
      return true;
    } finally { setBusy(null); }
  }, [code, push]);
  const st = s.state; const p = s.currentPlayer; const highest = s.teams.find((t) => t.id === s.highestTeamId);
  const can = {
    start: ["LIVE", "SOLD", "UNSOLD"].includes(st),
    unsold: st === "PLAYER_LIVE" && s.currentBid === 0,
    next: st === "SOLD" || st === "UNSOLD" || (st === "LIVE" && !p),
    undo: ["SOLD", "UNSOLD", "LIVE", "PLAYER_LIVE"].includes(st),
    complete: ["LIVE", "PAUSED", "SOLD", "UNSOLD", "PLAYER_LIVE"].includes(st),
  };
  const msg = {
    unsold: `Mark ${p?.name} UNSOLD?`,
    undo: "Undo the last SOLD/UNSOLD/SKIP? Purse, squad and RTM cards are restored.",
    complete: "End the auction now? Players still in the queue stay unsold and the results become final.",
  };
  const reset = async () => { if (!window.confirm("RESET the auction? All sales, bids, purses and RTM usage will be wiped.")) return; if (!window.confirm("Are you absolutely sure? This cannot be undone.")) return; await act("RESET_AUCTION"); };
  return { busy, queue, act, can, msg, reset, highest, p, st };
}

function hostRtmSide(s: AuctionSnapshot, userId: string | undefined) {
  const rt = s.teams.find((t) => t.id === s.rtm?.teamId); const bd = s.teams.find((t) => t.id === s.rtm?.bidderTeamId);
  const r = !!userId && rt?.ownerId === userId; const b = !!userId && bd?.ownerId === userId;
  return r && b ? "both" : r ? "rtm" : b ? "bidder" : null;
}

/** Searchable list of queued players to put on the block. */
function PlayerPicker({ queue, onPick, disabled }: { queue: Q[]; onPick: (id: string) => void; disabled: boolean }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => { const t = q.trim().toLowerCase(); return (t ? queue.filter((x) => x.name.toLowerCase().includes(t) || x.set.toLowerCase().includes(t)) : queue).slice(0, 60); }, [q, queue]);
  return (
    <div className="flex flex-col gap-2">
      <input className="input tap" placeholder={`Search ${queue.length} queued players…`} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex max-h-[50dvh] flex-col divide-y divide-line/50 overflow-y-auto rounded-lg border border-line">
        {list.map((x, i) => (
          <button key={x.id} disabled={disabled} onClick={() => onPick(x.id)} className="tap flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-panel-2 disabled:opacity-40">
            <span className="min-w-0"><span className="block truncate font-semibold">{!q && i === 0 && <span className="mr-1 text-gold">Next ›</span>}{x.name}{x.overseas && <span className="ml-1 text-sky-300">✈</span>}</span><span className="block truncate text-xs text-muted">{ROLE_SHORT[x.role]} · {x.set}{x.previousTeam ? ` · RTM ${x.previousTeam.abbreviation}` : ""}</span></span>
            <span className="money shrink-0 text-sm font-bold">{money(x.basePrice)}</span>
          </button>
        ))}
        {list.length === 0 && <div className="p-4 text-center text-sm text-muted">No players match.</div>}
      </div>
    </div>
  );
}

/** Desktop host console (md+). */
export const AuctioneerPanel = memo(function AuctioneerPanel({ a, isAdmin }: { a: A; isAdmin: boolean }) {
  const { access } = useRoom(); const s = a.snap!;
  const { busy, queue, act, can, msg, reset, highest, p, st } = useHostActions(s);
  const [pick, setPick] = useState("");
  const btn = (ac: string, label: string, enabled: boolean, cls = "btn-ghost", confirm?: string) => (
    <button key={ac} className={`${cls} w-full`} disabled={!enabled || !!busy} onClick={() => act(ac, confirm)}>{busy === ac ? "…" : label}</button>
  );
  return (
    <div className="flex flex-col gap-4">
      <RtmPanel a={a} canAct={hostRtmSide(s, access?.userId ?? undefined)} />
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="display text-lg">Host Console</h3><span className="rounded bg-panel-2 px-2 py-0.5 text-xs font-bold">{st}</span></div>
        {st === "WAITING" && <div className="mb-3 grid gap-2 md:grid-cols-3">{btn("START_AUCTION", "▶ START AUCTION", true, "btn-green")}{btn("ORDER_BY_SET", "Order queue by set", true, "btn-ghost")}{btn("SHUFFLE", "🔀 Shuffle queue", true, "btn-ghost")}</div>}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <div className="col-span-2 flex gap-1 md:col-span-2">
            <select className="input" value={pick} onChange={(e) => setPick(e.target.value)} disabled={!can.start}>
              <option value="">Next in queue ({queue.length})</option>
              {queue.slice(0, 200).map((q) => <option key={q.id} value={q.id}>{q.name} · {money(q.basePrice)} · {q.set}{q.previousTeam ? ` · RTM ${q.previousTeam.abbreviation}` : ""}</option>)}
            </select>
            <button className="btn-gold whitespace-nowrap" disabled={!can.start || !!busy} onClick={() => act("START_PLAYER", undefined, pick || undefined).then(() => setPick(""))}>START PLAYER</button>
          </div>
          {st === "PAUSED" ? btn("RESUME", "RESUME", true, "btn-green") : btn("PAUSE", "PAUSE", st === "LIVE" || st === "PLAYER_LIVE")}
          {st === "PLAYER_LIVE" && !s.timerRunning ? btn("START_TIMER", "▶ TIMER", true) : btn("PAUSE_TIMER", "⏸ TIMER", st === "PLAYER_LIVE" && s.timerRunning)}
          {btn("RESET_TIMER", "↺ RESET TIMER", st === "PLAYER_LIVE" || st === "PAUSED", "btn-ghost")}
          {btn("UNSOLD", "UNSOLD", can.unsold, "btn-red", msg.unsold)}
          {btn("SKIP", "SKIP", can.unsold, "btn-ghost", "Skip this player?")}
          {btn("NEXT", "NEXT PLAYER ▶", can.next, "btn-gold")}
          {btn("UNDO", "↩ UNDO LAST", can.undo, "btn-ghost", msg.undo)}
          {isAdmin && btn("COMPLETE", "■ COMPLETE AUCTION", can.complete, "btn-red", msg.complete)}
          {isAdmin && <button className="btn-ghost w-full text-live" disabled={!!busy} onClick={reset}>⟲ RESET AUCTION</button>}
        </div>
        <div className="mt-4 rounded-xl border border-line bg-panel-2/60 p-3 text-xs text-muted">Only a franchise&apos;s manager can bid, from the Live screen on their phone{access?.teamId ? " — your own franchise has the BID button above" : ""}. Unclaimed franchises sit out; RTM is offered only to franchises that have a manager.</div>
        {st === "PLAYER_LIVE" && s.currentBid > 0 && <div className="mt-3 rounded-lg bg-gold/15 px-3 py-2 text-sm text-gold">Highest: {highest?.name} at {money(s.currentBid)} — sold automatically when the clock ends{s.timerRunning ? "" : " (clock paused — press ▶ TIMER)"}.{p?.rtmAvailable && <span className="ml-1 text-rtm-2">{p.previousTeamAbbr} can RTM.</span>}</div>}
      </div>
    </div>
  );
});

function HostBtn({ ac, label, enabled, cls = "btn-ghost", confirm, grow = true, busy, act }: { ac: string; label: string; enabled: boolean; cls?: string; confirm?: string; grow?: boolean; busy: string | null; act: (ac: string, confirm?: string) => Promise<boolean> }) {
  return <button className={`${cls} tap ${grow ? "flex-1" : ""} text-base`} disabled={!enabled || !!busy} onClick={() => act(ac, confirm)}>{busy === ac ? "…" : label}</button>;
}

/**
 * Phone host dock: the 2–3 actions the auctioneer needs right now, sized for thumbs.
 * Everything else (pick a player, pause, skip, undo, queue order) sits in the "More" sheet, with destructive actions in a separate danger section.
 */
export function HostDock({ a, isAdmin }: { a: A; isAdmin: boolean }) {
  const { access } = useRoom(); const s = a.snap!;
  const { busy, queue, act, can, msg, reset, highest, p, st } = useHostActions(s);
  const [more, setMore] = useState(false); const [picker, setPicker] = useState(false);
  const startPick = async (id: string) => { setPicker(false); setMore(false); await act("START_PLAYER", undefined, id); };
  const rtmSide = hostRtmSide(s, access?.userId ?? undefined);

  let status: React.ReactNode = null;
  if (st === "PLAYER_LIVE") status = s.currentBid > 0 ? <>High: <b style={{ color: highest?.color }}>{highest?.abbreviation}</b> <b className="money">{money(s.currentBid)}</b>{p?.rtmAvailable && <span className="text-rtm-2"> · RTM {p.previousTeamAbbr}</span>}</> : <>No bids yet · base <b className="money">{money(p?.basePrice ?? 0)}</b></>;
  else if (st === "WAITING") status = <>{queue.length} players queued</>;
  else if (st === "SOLD" || st === "UNSOLD" || st === "LIVE") status = <>Up next: <b className="text-ink">{queue[0]?.name ?? "—"}</b></>;
  else if (st === "PAUSED") status = <>Auction paused</>;
  else if (st === "COMPLETED") status = <>Auction complete</>;

  return (
    <div className="flex flex-col gap-1.5">
      {st.startsWith("RTM") ? <RtmPanel a={a} canAct={rtmSide} compact /> : (<>
        <div className="flex items-center justify-between gap-2 text-xs text-muted"><span className="truncate">{status}</span><span className="shrink-0 rounded bg-panel-2 px-1.5 py-0.5 font-bold">HOST</span></div>
        <div className="flex gap-2">
          {st === "WAITING" && <HostBtn busy={busy} act={act} ac="START_AUCTION" label="▶ START AUCTION" enabled cls="btn-green" />}
          {st === "PAUSED" && <HostBtn busy={busy} act={act} ac="RESUME" label="▶ RESUME" enabled cls="btn-green" />}
          {st === "PLAYER_LIVE" && (s.currentBid > 0
            ? <div className="tap flex flex-1 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 px-2 text-center text-sm font-semibold text-gold">{s.timerRunning ? `Sells to ${highest?.abbreviation ?? ""} at 0:00` : "Clock paused"}</div>
            : <HostBtn busy={busy} act={act} ac="UNSOLD" label="UNSOLD" enabled={can.unsold} cls="btn-red" confirm={msg.unsold} />)}
          {st === "PLAYER_LIVE" && (s.timerRunning ? <HostBtn busy={busy} act={act} ac="PAUSE_TIMER" label="⏸" enabled grow={false} /> : <HostBtn busy={busy} act={act} ac="START_TIMER" label="▶ Clock" enabled grow={false} />)}
          {can.next && <HostBtn busy={busy} act={act} ac="NEXT" label="NEXT ▶" enabled cls="btn-gold" />}
          {can.start && <button className="btn-ghost tap" disabled={!!busy} onClick={() => setPicker(true)}>Pick</button>}
          {st !== "COMPLETED" && <button className="btn-ghost tap !px-4" onClick={() => setMore(true)} aria-label="More host actions">•••</button>}
        </div>
      </>)}

      <Sheet open={picker} onClose={() => setPicker(false)} title="Put a player on the block">
        <PlayerPicker queue={queue} onPick={startPick} disabled={!can.start || !!busy} />
      </Sheet>
      <Sheet open={more} onClose={() => setMore(false)} title="Host controls">
        <div className="grid grid-cols-2 gap-2">
          {can.start && <button className="btn-gold tap col-span-2" onClick={() => { setMore(false); setPicker(true); }}>Pick a player…</button>}
          {st === "PAUSED" ? <HostBtn busy={busy} act={act} ac="RESUME" label="Resume auction" enabled cls="btn-green" /> : <HostBtn busy={busy} act={act} ac="PAUSE" label="Pause auction" enabled={st === "LIVE" || st === "PLAYER_LIVE"} />}
          <HostBtn busy={busy} act={act} ac="RESET_TIMER" label="↺ Reset clock" enabled={st === "PLAYER_LIVE" || st === "PAUSED"} />
          <HostBtn busy={busy} act={act} ac="SKIP" label="Skip player" enabled={can.unsold} confirm="Skip this player?" />
          {st === "WAITING" && <><HostBtn busy={busy} act={act} ac="ORDER_BY_SET" label="Order by set" enabled /><HostBtn busy={busy} act={act} ac="SHUFFLE" label="🔀 Shuffle" enabled /></>}
        </div>
        <div className="mt-4 border-t border-line/60 pt-3 pb-2">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-live">Danger zone</div>
          <div className="grid grid-cols-2 gap-2">
            <HostBtn busy={busy} act={act} ac="UNDO" label="↩ Undo last" enabled={can.undo} confirm={msg.undo} />
            {isAdmin && <HostBtn busy={busy} act={act} ac="COMPLETE" label="■ End auction" enabled={can.complete} cls="btn-red" confirm={msg.complete} />}
            {isAdmin && <button className="btn-ghost tap col-span-2 text-live" disabled={!!busy} onClick={reset}>⟲ Reset whole auction</button>}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
