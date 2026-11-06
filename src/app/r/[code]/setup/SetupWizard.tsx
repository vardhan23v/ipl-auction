"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { TeamBadge } from "@/components/TeamBadge";

type Settings = { startingPurse: number; maxSquadSize: number; minSquadSize: number; maxOverseas: number; bidIncrement: number; timerSeconds: number; nextPlayerGapSeconds: number; rtmEnabled: boolean; defaultRtmCards: number; rtmTimerSeconds: number; unsoldReentry: boolean; isPublic: boolean };
type Team = { id: string; name: string; abbreviation: string; color: string; logoUrl: string | null; owner: string | null };
export type SetupData = { settings: Settings; teams: Team[]; sets: { set: string; count: number }[]; total: number; queue: { id: string; name: string; set: string; basePrice: number }[] };

const STEPS = ["Rules", "Clock & RTM", "Players", "Teams", "Start"] as const;
const ROLES = [["BATSMAN", "Batters"], ["WICKETKEEPER", "Keepers"], ["ALL_ROUNDER", "All-rounders"], ["BOWLER", "Bowlers"]] as const;

async function call(url: string, method: string, body?: object) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Something went wrong");
  return j;
}

/* ---- small form pieces ---- */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><div className="text-sm font-semibold">{label}</div>{hint && <div className="text-xs text-muted">{hint}</div>}</div><div className="shrink-0">{children}</div></div>;
}
function Choice<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {options.map(([v, l]) => <button key={String(v)} type="button" onClick={() => onChange(v)} className={`min-h-9 rounded-lg px-3 text-sm font-semibold transition ${value === v ? "bg-gold text-black" : "bg-panel-2 text-muted hover:text-ink"}`}>{l}</button>)}
    </div>
  );
}
function Stepper({ value, min, max, step = 1, onChange, format }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="btn-ghost h-9 w-9 !p-0 text-lg" disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} aria-label="Less">−</button>
      <div className="min-w-16 text-center font-semibold tabular-nums">{format ? format(value) : value}</div>
      <button type="button" className="btn-ghost h-9 w-9 !p-0 text-lg" disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))} aria-label="More">+</button>
    </div>
  );
}
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative h-7 w-12 rounded-full transition ${on ? "bg-gold" : "bg-line"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-black transition-all ${on ? "left-6" : "left-1"}`} /></button>;
}

/** Host setup before the start. Settings save as you change them; the last step starts the auction. */
export function SetupWizard({ code, roomName, data }: { code: string; roomName: string; data: SetupData }) {
  const r = useRouter(); const { push } = useToast();
  const [step, setStep] = useState(0);
  const [s, setS] = useState<Settings>(data.settings);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const pending = useRef<Partial<Settings>>({}); const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const api = (p: string) => `/api/rooms/${code}${p}`;

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setS((cur) => ({ ...cur, [k]: v }));
    pending.current = { ...pending.current, [k]: v };
    setSaved("saving"); clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const body = pending.current; pending.current = {};
      try { await call(api("/settings"), "PATCH", body); setSaved("saved"); } catch (e) { setSaved("idle"); push({ title: "Not saved", body: (e as Error).message, tone: "error" }); }
    }, 400);
  }
  useEffect(() => () => clearTimeout(timer.current), []);

  /* ---- players ---- */
  const [roles, setRoles] = useState<string[]>(ROLES.map(([k]) => k));
  const [capped, setCapped] = useState<"all" | "capped" | "uncapped">("all");
  const [overseas, setOverseas] = useState<"all" | "indian" | "overseas">("all");
  const [sets, setSets] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ keep: number; remove: number } | null>(null);
  const [total, setTotal] = useState(data.total);
  const [queue, setQueue] = useState(data.queue);
  const [busy, setBusy] = useState<string | null>(null);
  const filter = useMemo(() => ({ roles, capped, overseas, sets }), [roles, capped, overseas, sets]);
  const filterActive = roles.length < 4 || capped !== "all" || overseas !== "all" || sets.length > 0;
  useEffect(() => {
    if (!roles.length) return;
    const t = setTimeout(() => { call(api("/players/exclude"), "POST", { ...filter, dryRun: true }).then(setPreview).catch(() => setPreview(null)); }, 250);
    return () => clearTimeout(t);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  async function refreshQueue() { const q = await fetch(api("/players/queue")).then((x) => x.json()).catch(() => []); if (Array.isArray(q)) { setQueue(q.slice(0, 12)); setTotal(q.length); } }
  async function applyFilter() {
    if (!preview || !window.confirm(`Remove ${preview.remove} players and keep ${preview.keep} for this auction?`)) return;
    setBusy("filter");
    try { const j = await call(api("/players/exclude"), "POST", filter); push({ title: `${j.keep} players in this auction`, tone: "success" }); await refreshQueue(); setRoles(ROLES.map(([k]) => k)); setCapped("all"); setOverseas("all"); setSets([]); }
    catch (e) { push({ title: "Filter failed", body: (e as Error).message, tone: "error" }); } finally { setBusy(null); }
  }
  async function restorePool() {
    if (!window.confirm("Bring back the full player pool?")) return;
    setBusy("restore");
    try { await call(api("/players/import?replace=1"), "POST"); await refreshQueue(); push({ title: "Full pool restored", tone: "success" }); r.refresh(); }
    catch (e) { push({ title: "Failed", body: (e as Error).message, tone: "error" }); } finally { setBusy(null); }
  }
  async function order(action: "ORDER_BY_SET" | "SHUFFLE") {
    setBusy(action);
    try { await call(api("/control"), "POST", { action }); await refreshQueue(); push({ title: action === "SHUFFLE" ? "Queue shuffled" : "Ordered by set", tone: "success" }); }
    catch (e) { push({ title: "Failed", body: (e as Error).message, tone: "error" }); } finally { setBusy(null); }
  }

  /* ---- teams ---- */
  const [teams, setTeams] = useState<Team[]>(data.teams);
  async function saveTeam(t: Team, patch: Partial<Team>) {
    setTeams((all) => all.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    try { await call(api(`/teams/${t.id}`), "PATCH", patch); } catch (e) { push({ title: "Not saved", body: (e as Error).message, tone: "error" }); }
  }
  async function removeTeam(t: Team) {
    if (!window.confirm(`Take ${t.name} out of this auction?${t.owner ? ` ${t.owner} will become a spectator.` : ""}`)) return;
    try { await call(api(`/teams/${t.id}`), "DELETE"); setTeams((all) => all.filter((x) => x.id !== t.id)); } catch (e) { push({ title: "Failed", body: (e as Error).message, tone: "error" }); }
  }
  async function restoreTeams() {
    try { await call(api("/teams"), "POST"); const list = await fetch(api("/teams")).then((x) => x.json()); setTeams(list.map((t: Team & { ownerName: string | null; owner: { name: string } | null }) => ({ id: t.id, name: t.name, abbreviation: t.abbreviation, color: t.color, logoUrl: t.logoUrl, owner: t.ownerName ?? t.owner?.name ?? null }))); }
    catch (e) { push({ title: "Failed", body: (e as Error).message, tone: "error" }); }
  }

  /* ---- start ---- */
  async function start() {
    setBusy("start");
    try { await call(api("/control"), "POST", { action: "START_AUCTION" }); r.push(`/r/${code}/live`); }
    catch (e) { push({ title: "Could not start", body: (e as Error).message, tone: "error" }); setBusy(null); }
  }
  const claimed = teams.filter((t) => t.owner).length;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-44 pt-4 md:pb-28 md:pt-8">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0"><div className="text-xs font-semibold uppercase tracking-widest text-gold">Set up</div><h1 className="display truncate text-3xl">{roomName}</h1></div>
        <div className="shrink-0 text-xs text-muted">{saved === "saving" ? "Saving…" : saved === "saved" ? "Saved ✓" : ""}</div>
      </div>

      <nav className="scroll-x -mx-4 mt-4 flex gap-1 px-4" aria-label="Setup steps">
        {STEPS.map((l, i) => <button key={l} onClick={() => setStep(i)} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${step === i ? "bg-gold text-black" : "bg-panel-2 text-muted"}`}><span className="tabular-nums opacity-70">{i + 1}</span>{l}</button>)}
      </nav>

      <section className="card mt-4 divide-y divide-line/60 px-4">
        {step === 0 && (<>
          <Field label="Purse per franchise"><Stepper value={s.startingPurse} min={1000} max={30000} step={500} onChange={(v) => set("startingPurse", v)} format={money} /></Field>
          <Field label="Max squad size"><Stepper value={s.maxSquadSize} min={5} max={30} onChange={(v) => set("maxSquadSize", v)} /></Field>
          <Field label="Min squad size" hint="Squads below this rank last in results"><Stepper value={s.minSquadSize} min={0} max={s.maxSquadSize} onChange={(v) => set("minSquadSize", v)} /></Field>
          <Field label="Max overseas players"><Stepper value={s.maxOverseas} min={0} max={s.maxSquadSize} onChange={(v) => set("maxOverseas", v)} /></Field>
          <Field label="Bid increments"><Choice value={s.bidIncrement} options={[[0, "IPL ladder"], [10, "₹10 L"], [25, "₹25 L"]]} onChange={(v) => set("bidIncrement", v)} /></Field>
          <Field label="Public room" hint="Listed on the home page"><Toggle on={s.isPublic} onChange={(v) => set("isPublic", v)} /></Field>
        </>)}

        {step === 1 && (<>
          <Field label="Bid clock" hint="Resets on every bid; sells at zero"><Choice value={s.timerSeconds} options={[[10, "10s"], [15, "15s"], [20, "20s"], [30, "30s"]]} onChange={(v) => set("timerSeconds", v)} /></Field>
          <Field label="Pause between players" hint="Result shows, then the next player comes up"><Choice value={s.nextPlayerGapSeconds} options={[[3, "3s"], [4, "4s"], [6, "6s"], [10, "10s"]]} onChange={(v) => set("nextPlayerGapSeconds", v)} /></Field>
          <Field label="Right-To-Match cards"><Toggle on={s.rtmEnabled} onChange={(v) => set("rtmEnabled", v)} /></Field>
          {s.rtmEnabled && <Field label="RTM cards per franchise"><Stepper value={s.defaultRtmCards} min={0} max={5} onChange={(v) => set("defaultRtmCards", v)} /></Field>}
          {s.rtmEnabled && <Field label="RTM decision time"><Choice value={s.rtmTimerSeconds} options={[[10, "10s"], [20, "20s"], [30, "30s"]]} onChange={(v) => set("rtmTimerSeconds", v)} /></Field>}
          <Field label="Unsold players return" hint="One more round at the end"><Toggle on={s.unsoldReentry} onChange={(v) => set("unsoldReentry", v)} /></Field>
        </>)}

        {step === 2 && (
          <div className="py-4">
            <div className="flex items-baseline justify-between"><div className="text-sm font-semibold">Who is in the auction</div><div className="text-sm text-muted"><b className="text-ink">{total}</b> players now</div></div>
            <div className="mt-3 flex flex-wrap gap-1">
              {ROLES.map(([k, l]) => { const on = roles.includes(k); return <button key={k} onClick={() => setRoles(on ? roles.filter((x) => x !== k) : [...roles, k])} className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${on ? "bg-gold text-black" : "bg-panel-2 text-muted"}`}>{l}</button>; })}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Choice value={capped} options={[["all", "Capped + uncapped"], ["capped", "Capped only"], ["uncapped", "Uncapped only"]]} onChange={setCapped} />
              <Choice value={overseas} options={[["all", "All nations"], ["indian", "Indian only"], ["overseas", "Overseas only"]]} onChange={setOverseas} />
            </div>
            <details className="mt-3 rounded-lg bg-panel-2/60 px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold">Sets {sets.length ? `· ${sets.length} chosen` : "· all"}</summary>
              <div className="mt-2 flex flex-wrap gap-1">{data.sets.map((x) => { const on = sets.includes(x.set); return <button key={x.set} onClick={() => setSets(on ? sets.filter((y) => y !== x.set) : [...sets, x.set])} className={`min-h-8 rounded-md px-2 text-xs font-semibold ${on ? "bg-gold text-black" : "bg-panel text-muted"}`}>{x.set} <span className="opacity-60">{x.count}</span></button>; })}</div>
            </details>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="btn-gold tap" disabled={!filterActive || !preview || !roles.length || !!busy} onClick={applyFilter}>{busy === "filter" ? "Applying…" : preview && filterActive ? `Keep ${preview.keep} players` : "Choose a filter"}</button>
              <button className="btn-ghost tap" disabled={!!busy} onClick={restorePool}>{busy === "restore" ? "…" : "Restore full pool"}</button>
            </div>

            <div className="mt-6 text-sm font-semibold">Order</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn-ghost tap" disabled={!!busy} onClick={() => order("ORDER_BY_SET")}>By set (IPL style)</button>
              <button className="btn-ghost tap" disabled={!!busy} onClick={() => order("SHUFFLE")}>🔀 Shuffle</button>
              <Link className="btn-ghost tap" href={`/r/${code}/manage/queue`}>Drag to reorder</Link>
            </div>
            <ol className="mt-3 divide-y divide-line/50 rounded-lg bg-panel-2/60 text-sm">
              {queue.map((p, i) => <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2"><span className="min-w-0 truncate"><span className="mr-2 text-muted tabular-nums">{i + 1}</span>{p.name}</span><span className="shrink-0 text-xs text-muted">{p.set} · {money(p.basePrice)}</span></li>)}
              {total > queue.length && <li className="px-3 py-2 text-xs text-muted">…and {total - queue.length} more</li>}
            </ol>
          </div>
        )}

        {step === 3 && (
          <div className="py-2">
            {teams.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2.5">
                <label className="relative shrink-0 cursor-pointer" title="Change colour"><TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={40} /><input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={t.color} onChange={(e) => saveTeam(t, { color: e.target.value })} /></label>
                <div className="min-w-0 flex-1">
                  <input className="w-full bg-transparent text-sm font-semibold outline-none focus:text-gold" defaultValue={t.name} maxLength={40} onBlur={(e) => { const v = e.target.value.trim(); if (v.length >= 2 && v !== t.name) saveTeam(t, { name: v }); }} />
                  <div className="text-xs text-muted">{t.abbreviation}{t.owner ? ` · ${t.owner}` : " · unclaimed"}</div>
                </div>
                <button className="btn-ghost !px-3 !py-1.5 text-sm text-muted hover:text-live" disabled={teams.length <= 2} onClick={() => removeTeam(t)}>Remove</button>
              </div>
            ))}
            {teams.length < 10 && <button className="btn-ghost tap my-2 w-full" onClick={restoreTeams}>Restore removed franchises</button>}
          </div>
        )}

        {step === 4 && (
          <div className="py-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[["Franchises", `${teams.length} (${claimed} claimed)`], ["Players", String(total)], ["Purse", money(s.startingPurse)], ["Squad", `${s.minSquadSize}–${s.maxSquadSize} · ${s.maxOverseas} overseas`], ["Clock", `${s.timerSeconds}s · ${s.nextPlayerGapSeconds}s between players`], ["RTM", s.rtmEnabled ? `${s.defaultRtmCards} cards · ${s.rtmTimerSeconds}s` : "Off"]].map(([l, v]) => <div key={l} className="rounded-lg bg-panel-2/70 p-3"><div className="text-xs uppercase tracking-wider text-muted">{l}</div><div className="mt-0.5 font-semibold">{v}</div></div>)}
            </div>
            {claimed < 2 && <p className="mt-3 rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold">Only {claimed} franchise{claimed === 1 ? " has" : "s have"} a manager. Unclaimed teams sit out — share the room code first.</p>}
            <p className="mt-3 text-sm text-muted">Once started, players come up one after another automatically. You can pause, undo the last sale, or end the auction from the ⋯ menu on the Live screen.</p>
          </div>
        )}
      </section>

      <div className="safe-x fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-line/70 bg-pitch/95 px-4 py-2 backdrop-blur md:bottom-0 md:pb-[max(.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-2xl gap-2">
          {step > 0 && <button className="btn-ghost tap" onClick={() => setStep(step - 1)}>Back</button>}
          {step < STEPS.length - 1
            ? <button className="btn-gold tap flex-1 text-base" onClick={() => setStep(step + 1)}>Next: {STEPS[step + 1]}</button>
            : <button className="btn-green tap flex-1 text-base" disabled={busy === "start" || saved === "saving"} onClick={start}>{busy === "start" ? "Starting…" : "▶ Start the auction"}</button>}
        </div>
      </div>
    </main>
  );
}
