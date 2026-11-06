"use client";
import { useDeferredValue, useMemo, useState } from "react";
import { money, ROLE_LABEL } from "@/lib/format";
import { PlayerPhoto } from "@/components/PlayerPhoto";
export type PubPlayer = { id: string; name: string; photoUrl: string | null; role: string; nationality: string; overseas: boolean; capped: boolean; set: string; rating: number | null; matches: number; runs: number; wickets: number; basePrice: number; status: string; soldPrice: number | null; queueOrder: number | null; viaRtm: boolean; soldTo: { abbreviation: string; color: string } | null; previousTeam: { abbreviation: string; color: string } | null };
const TABS = [["", "All"], ["UPCOMING", "Upcoming"], ["SOLD", "Sold"], ["UNSOLD", "Unsold"]] as const;

export function PlayersBrowser({ players }: { players: PubPlayer[] }) {
  const [q, setQ] = useState(""); const dq = useDeferredValue(q); const [limit, setLimit] = useState(40); const [filters, setFilters] = useState(false); const [role, setRole] = useState(""); const [tab, setTab] = useState(""); const [set, setSet] = useState(""); const [nat, setNat] = useState(""); const [rtm, setRtm] = useState("");
  const sets = useMemo(() => Array.from(new Set(players.map((p) => p.set))), [players]);
  const prevTeams = useMemo(() => Array.from(new Set(players.map((p) => p.previousTeam?.abbreviation).filter(Boolean))) as string[], [players]);
  const upcoming = (s: string) => ["POOL", "WAITING", "LIVE"].includes(s);
  const list = useMemo(() => { const t = dq.trim().toLowerCase(); return players.filter((p) => (!t || p.name.toLowerCase().includes(t)) && (!role || p.role === role) && (!set || p.set === set) && (!nat || (nat === "OS" ? p.overseas : !p.overseas)) && (!rtm || p.previousTeam?.abbreviation === rtm) && (!tab || (tab === "UPCOMING" ? upcoming(p.status) : p.status === tab))); }, [players, dq, role, set, nat, rtm, tab]);
  const shown = list.slice(0, limit);
  const active = [role, set, nat, rtm].filter(Boolean).length;
  const reset = (f: () => void) => { f(); setLimit(40); };
  return (
    <>
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-3 mt-3 border-b border-line/50 bg-pitch/95 px-3 pb-2 pt-2 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
        <div className="flex gap-2">
          <input className="input tap flex-1 sm:max-w-xs" type="search" placeholder="Search player…" value={q} onChange={(e) => reset(() => setQ(e.target.value))} />
          <button className={`btn-ghost tap shrink-0 sm:hidden ${active ? "border-gold/60 text-gold" : ""}`} onClick={() => setFilters((f) => !f)} aria-expanded={filters}>Filters{active ? ` · ${active}` : ""}</button>
        </div>
        <div className="scroll-x mt-2 flex gap-1">{TABS.map(([v, l]) => <button key={v} onClick={() => reset(() => setTab(v))} className={`min-h-9 shrink-0 rounded-md px-3 text-sm font-semibold ${tab === v ? "bg-gold text-black" : "bg-panel-2 text-muted hover:text-ink"}`}>{l}</button>)}<span className="ml-auto shrink-0 self-center pl-2 text-xs text-muted">{list.length} players</span></div>
      </div>
      <div className={`mt-2 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center ${filters ? "grid" : "hidden"}`}>
        <select className="input sm:w-40" value={role} onChange={(e) => reset(() => setRole(e.target.value))}><option value="">All roles</option>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input sm:w-44" value={set} onChange={(e) => reset(() => setSet(e.target.value))}><option value="">All sets</option>{sets.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select className="input sm:w-32" value={nat} onChange={(e) => reset(() => setNat(e.target.value))}><option value="">Any</option><option value="IND">Indian</option><option value="OS">Overseas</option></select>
        <select className="input sm:w-36" value={rtm} onChange={(e) => reset(() => setRtm(e.target.value))}><option value="">RTM: any</option>{prevTeams.map((t) => <option key={t} value={t}>RTM {t}</option>)}</select>
        {active > 0 && <button className="btn-ghost col-span-2 text-sm sm:col-span-1" onClick={() => { setRole(""); setSet(""); setNat(""); setRtm(""); }}>Clear filters</button>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {shown.map((p) => (
          <div key={p.id} className={`card overflow-hidden transition hover:border-gold/50 ${p.status === "LIVE" ? "ring-2 ring-live" : ""}`}>
            <div className="relative aspect-square bg-panel-2">
              <PlayerPhoto src={p.photoUrl} name={p.name} sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw" className="h-full w-full object-cover object-top text-6xl" />
              {p.status === "LIVE" && <span className="absolute left-2 top-2 rounded bg-live px-2 py-0.5 text-xs font-bold text-white"><span className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-white" />ON THE BLOCK</span>}
              {p.status === "SOLD" && <span className="absolute left-2 top-2 rounded bg-emerald-500 px-2 py-0.5 text-xs font-bold text-black">SOLD{p.viaRtm ? " · RTM" : ""}</span>}
              {p.status === "UNSOLD" && <span className="absolute left-2 top-2 rounded bg-zinc-600 px-2 py-0.5 text-xs font-bold text-white">UNSOLD</span>}
              {p.rating != null && <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-bold"><span className="text-gold">★</span> {p.rating}</span>}
              {p.previousTeam && <span className="absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-xs font-bold text-white" style={{ background: p.previousTeam.color }}>RTM {p.previousTeam.abbreviation}</span>}
              {p.overseas && <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-sky-300">✈ OS</span>}
            </div>
            <div className="p-2.5 sm:p-3">
              <div className="truncate text-sm font-bold sm:text-base">{p.name}</div>
              <div className="truncate text-xs text-muted sm:text-xs">{ROLE_LABEL[p.role]} · {p.set}</div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                {p.status === "SOLD" ? <><span className="money font-bold">{money(p.soldPrice)}</span><span className="truncate text-xs font-semibold" style={{ color: p.soldTo?.color }}>{p.soldTo?.abbreviation}</span></> : <><span className="text-xs text-muted">Base</span><span className="money font-bold">{money(p.basePrice)}</span></>}
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="col-span-full py-16 text-center text-muted">No players match.</div>}
      </div>
      {list.length > shown.length && <button className="btn-ghost tap mx-auto mt-4 flex w-full max-w-sm" onClick={() => setLimit((l) => l + 40)}>Show more · {list.length - shown.length} left</button>}
    </>
  );
}
