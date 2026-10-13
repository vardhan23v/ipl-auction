"use client";
import { useState } from "react";
import { ROLE_LABEL } from "@/lib/format";
export type Team = { id: string; name: string; abbreviation: string; color: string };
export type P = { id: string; name: string; photoUrl: string | null; role: string; nationality: string; overseas: boolean; capped: boolean; set: string; basePrice: number; rating: number | null; matches: number; runs: number; wickets: number; average: number | null; strikeRate: number | null; economy: number | null; highScore: string | null; bestBowling: string | null; status: string; queueOrder: number | null; soldPrice: number | null; previousTeamId: string | null; soldTo: { name: string; abbreviation: string; color: string } | null; previousTeam: { abbreviation: string; color: string } | null };
const EMPTY = { name: "", photoUrl: "", role: "BATSMAN", nationality: "India", overseas: false, capped: true, set: "Set 1", basePrice: 30, rating: "", matches: 0, runs: 0, wickets: 0, average: "", strikeRate: "", economy: "", highScore: "", bestBowling: "", previousTeamId: "" };

export function PlayerForm({ player, teams, onDone }: { player: P | null; teams: Team[]; onDone: () => void }) {
  const [f, setF] = useState<Record<string, string | number | boolean>>(player ? { ...EMPTY, ...Object.fromEntries(Object.entries(player).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ""])) } : EMPTY);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const set = (k: string, v: string | number | boolean) => setF((x) => ({ ...x, [k]: v }));
  const num = (k: string) => f[k] === "" ? null : Number(f[k]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const body = { ...f, rating: num("rating"), average: num("average"), strikeRate: num("strikeRate"), economy: num("economy"), highScore: f.highScore || null, bestBowling: f.bestBowling || null, previousTeamId: f.previousTeamId || null };
    const r = await fetch(player ? `/api/admin/players/${player.id}` : "/api/admin/players", { method: player ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) { setErr(j.error); return; } onDone();
  }
  const field = (k: string, label: string, type = "text", span = 1) => <div key={k} style={{ gridColumn: `span ${span}` }}><label className="label">{label}</label><input className="input" type={type} value={String(f[k] ?? "")} onChange={(e) => set(k, type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} /></div>;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onDone}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="card max-h-[90vh] w-full max-w-3xl overflow-auto p-6">
        <h3 className="display text-3xl">{player ? `Edit ${player.name}` : "Add player"}</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {field("name", "Name", "text", 2)}
          <div><label className="label">Role</label><select className="input" value={String(f.role)} onChange={(e) => set("role", e.target.value)}>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          {field("set", "Set")}
          {field("nationality", "Nationality")}
          <div className="flex items-end gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={!!f.overseas} onChange={(e) => set("overseas", e.target.checked)} /> Overseas</label><label className="flex items-center gap-2"><input type="checkbox" checked={!!f.capped} onChange={(e) => set("capped", e.target.checked)} /> Capped</label></div>
          {field("basePrice", "Base price (lakhs)", "number")}
          {field("rating", "Rating (0–100)", "number")}
          <div className="col-span-2 md:col-span-4 rounded-lg border border-rtm/40 bg-rtm/5 p-3">
            <label className="label text-rtm-2">RTM — previous franchise (fixed list)</label>
            <select className="input" value={String(f.previousTeamId)} onChange={(e) => set("previousTeamId", e.target.value)}><option value="">None — no franchise can RTM this player</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.abbreviation} · {t.name}</option>)}</select>
            <div className="mt-1 text-xs text-muted">Only this franchise may use a Right-To-Match card on the player.</div>
          </div>
          {field("matches", "Matches", "number")}{field("runs", "Runs", "number")}{field("wickets", "Wickets", "number")}{field("average", "Average", "number")}
          {field("strikeRate", "Strike rate", "number")}{field("economy", "Economy", "number")}{field("highScore", "High score")}{field("bestBowling", "Best bowling")}
          {field("photoUrl", "Photo URL", "text", 4)}
        </div>
        {err && <div className="mt-3 rounded-lg bg-live/15 px-3 py-2 text-sm text-live">{err}</div>}
        <div className="mt-4 flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onDone}>Cancel</button><button className="btn-gold" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
      </form>
    </div>
  );
}
