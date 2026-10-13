"use client";
import { useMemo, useState } from "react";
import { money, ROLE_LABEL } from "@/lib/format";
import { PlayerPhoto } from "@/components/PlayerPhoto";
export type PubPlayer = { id: string; name: string; photoUrl: string | null; role: string; nationality: string; overseas: boolean; capped: boolean; set: string; rating: number | null; matches: number; runs: number; wickets: number; basePrice: number; status: string; soldPrice: number | null; queueOrder: number | null; viaRtm: boolean; soldTo: { abbreviation: string; color: string } | null; previousTeam: { abbreviation: string; color: string } | null };
const TABS = [["", "All"], ["UPCOMING", "Upcoming"], ["SOLD", "Sold"], ["UNSOLD", "Unsold"]] as const;

export function PlayersBrowser({ players }: { players: PubPlayer[] }) {
  const [q, setQ] = useState(""); const [role, setRole] = useState(""); const [tab, setTab] = useState(""); const [set, setSet] = useState(""); const [nat, setNat] = useState(""); const [rtm, setRtm] = useState("");
  const sets = useMemo(() => Array.from(new Set(players.map((p) => p.set))), [players]);
  const prevTeams = useMemo(() => Array.from(new Set(players.map((p) => p.previousTeam?.abbreviation).filter(Boolean))) as string[], [players]);
  const upcoming = (s: string) => ["POOL", "WAITING", "LIVE"].includes(s);
  const list = players.filter((p) => (!q || p.name.toLowerCase().includes(q.toLowerCase())) && (!role || p.role === role) && (!set || p.set === set) && (!nat || (nat === "OS" ? p.overseas : !p.overseas)) && (!rtm || p.previousTeam?.abbreviation === rtm) && (!tab || (tab === "UPCOMING" ? upcoming(p.status) : p.status === tab)));
  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">{TABS.map(([v, l]) => <button key={v} onClick={() => setTab(v)} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === v ? "bg-gold text-black" : "bg-panel-2 text-muted hover:text-ink"}`}>{l}</button>)}</div>
        <input className="input w-48" placeholder="Search player…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-40" value={role} onChange={(e) => setRole(e.target.value)}><option value="">All roles</option>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input w-44" value={set} onChange={(e) => setSet(e.target.value)}><option value="">All sets</option>{sets.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select className="input w-32" value={nat} onChange={(e) => setNat(e.target.value)}><option value="">Any</option><option value="IND">Indian</option><option value="OS">Overseas</option></select>
        <select className="input w-36" value={rtm} onChange={(e) => setRtm(e.target.value)}><option value="">RTM: any</option>{prevTeams.map((t) => <option key={t} value={t}>RTM {t}</option>)}</select>
        <span className="ml-auto text-sm text-muted">{list.length} shown</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {list.map((p) => (
          <div key={p.id} className={`card overflow-hidden transition hover:border-gold/50 ${p.status === "LIVE" ? "ring-2 ring-live" : ""}`}>
            <div className="relative aspect-square bg-panel-2">
              <PlayerPhoto src={p.photoUrl} name={p.name} className="h-full w-full object-cover object-top text-6xl" />
              {p.status === "LIVE" && <span className="absolute left-2 top-2 rounded bg-live px-2 py-0.5 text-[10px] font-bold text-white"><span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-white" />ON THE BLOCK</span>}
              {p.status === "SOLD" && <span className="absolute left-2 top-2 rounded bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-black">SOLD{p.viaRtm ? " · RTM" : ""}</span>}
              {p.status === "UNSOLD" && <span className="absolute left-2 top-2 rounded bg-zinc-600 px-2 py-0.5 text-[10px] font-bold text-white">UNSOLD</span>}
              {p.rating != null && <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-bold"><span className="text-gold">★</span> {p.rating}</span>}
              {p.previousTeam && <span className="absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: p.previousTeam.color }}>RTM {p.previousTeam.abbreviation}</span>}
              {p.overseas && <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-sky-300">✈ OS</span>}
            </div>
            <div className="p-3">
              <div className="truncate font-bold">{p.name}</div>
              <div className="truncate text-xs text-muted">{ROLE_LABEL[p.role]} · {p.set}</div>
              <div className="mt-2 flex items-center justify-between text-sm">
                {p.status === "SOLD" ? <><span className="money font-bold">{money(p.soldPrice)}</span><span className="truncate text-xs font-semibold" style={{ color: p.soldTo?.color }}>{p.soldTo?.abbreviation}</span></> : <><span className="text-xs text-muted">Base</span><span className="money font-bold">{money(p.basePrice)}</span></>}
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="col-span-full py-16 text-center text-muted">No players match.</div>}
      </div>
    </>
  );
}
