"use client";
import { useEffect, useState } from "react";
import { money, ROLE_SHORT } from "@/lib/format";
import type { TeamSnapshot } from "@/types/auction";
import { TeamBadge } from "../TeamBadge";
import { useRoom, roomApi } from "../RoomContext";
type Squad = { ownerName: string | null; rtmTotal: number; rtmUsed: number; squad: { id: string; price: number; viaRtm: boolean; player: { name: string; role: string; photoUrl: string | null; overseas: boolean; rating: number | null } }[] };

export function RtmCards({ total, used, size = "sm" }: { total: number; used: number; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-3.5 w-2.5" : "h-6 w-4";
  return <span className="inline-flex items-center gap-0.5" title={`RTM cards: ${total - used} of ${total} left`}>{Array.from({ length: total }).map((_, i) => <span key={i} className={`${dim} rounded-[2px] border ${i < total - used ? "border-rtm bg-rtm/70" : "border-line bg-transparent"}`} />)}</span>;
}

export function PursePanel({ teams, highlight, mine, rtmTeam }: { teams: TeamSnapshot[]; highlight?: string | null; mine?: string | null; rtmTeam?: string | null }) {
  const { code } = useRoom();
  const [open, setOpen] = useState<string | null>(null);
  const [squads, setSquads] = useState<Record<string, Squad>>({});
  const load = (id: string) => fetch(roomApi(code, `/squad/${id}`)).then((r) => r.json()).then((d) => setSquads((s) => ({ ...s, [id]: d }))).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` is stable per render; re-fetch when open/teams change
  useEffect(() => { if (open) load(open); }, [open, teams]);
  return (
    <div className="card p-4">
      <h3 className="display mb-1 text-lg">Franchise Purses</h3>
      <div className="mb-2 text-[11px] text-muted">Tap a franchise to see its squad · ▮ RTM cards left</div>
      <div className="flex flex-col gap-2">
        {teams.map((t) => {
          const left = t.maxSquad - t.squadCount;
          const pct = t.purse / (t.purse + t.spent || 1);
          const isOpen = open === t.id; const sq = squads[t.id];
          return (
            <div key={t.id} className={`team-row rounded-lg border ${highlight === t.id ? "border-gold bg-gold/10" : rtmTeam === t.id ? "border-rtm bg-rtm/10" : "border-line bg-panel-2"} ${mine === t.id ? "ring-1 ring-sky-400/60" : ""}`}>
              <button className="w-full p-2.5 text-left" onClick={() => setOpen(isOpen ? null : t.id)} aria-expanded={isOpen}>
                <div className="flex items-center gap-3">
                  <TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{t.abbreviation} <span className="hidden font-normal text-muted xl:inline">· {t.name}</span></span><span className="money text-sm font-bold tabular-nums">{money(t.purse)}</span></div>
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span className="flex items-center gap-2"><RtmCards total={t.rtmTotal} used={t.rtmUsed} /><span>✈ {t.overseasCount}/{t.maxOverseas}</span></span>
                      <span className={left === 0 ? "font-bold text-live" : left <= 2 ? "font-bold text-gold" : ""}>{left === 0 ? "SQUAD FULL" : `${t.squadCount}/${t.maxSquad}`}</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded bg-line"><div className="bar-anim h-full transition-all" style={{ width: `${pct * 100}%`, background: t.color }} /></div>
                  </div>
                  <span className={`text-xs text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-line/60 px-3 py-2">
                  <div className="flex items-center justify-between py-1 text-xs text-muted"><span>Manager: <b className="text-ink">{sq?.ownerName ?? t.ownerName ?? "unclaimed"}</b></span><span>Spent {money(t.spent)}</span></div>
                  {!sq && <div className="py-2 text-center text-xs text-muted">Loading…</div>}
                  {sq?.squad.map((sp) => (
                    <div key={sp.id} className="flex items-center justify-between border-t border-line/40 py-1 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{sp.player.name}</span>
                        <span className="shrink-0 text-[10px] text-muted">{ROLE_SHORT[sp.player.role]}{sp.player.overseas ? " ✈" : ""}</span>
                        {sp.viaRtm && <span className="shrink-0 rounded bg-rtm/20 px-1 text-[9px] font-bold text-rtm-2">RTM</span>}
                      </span>
                      <span className="money text-xs font-bold">{money(sp.price)}</span>
                    </div>
                  ))}
                  {sq && sq.squad.length === 0 && <div className="border-t border-line/40 py-2 text-center text-xs text-muted">No players bought yet</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
