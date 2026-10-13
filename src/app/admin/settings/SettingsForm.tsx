"use client";
import { useState } from "react";
import { useToast } from "@/components/Toast";
type S = { auctionName: string; auctionDate: string | null; startingPurse: number; maxSquadSize: number; minSquadSize: number; maxOverseas: number; bidIncrement: number; timerSeconds: number; rtmTimerSeconds: number; autoTimer: boolean; autoSell: boolean; rtmEnabled: boolean; defaultRtmCards: number; spectatorAccess: boolean; unsoldReentry: boolean };
export function SettingsForm({ initial }: { initial: S }) {
  const [f, setF] = useState<S>(initial); const [busy, setBusy] = useState(false); const { push } = useToast();
  const set = <K extends keyof S>(k: K, v: S[K]) => setF((x) => ({ ...x, [k]: v }));
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const body = { ...f, auctionDate: f.auctionDate ? new Date(f.auctionDate).toISOString() : null };
    const r = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json(); setBusy(false); push({ title: r.ok ? "Settings saved" : "Failed", body: j.error, tone: r.ok ? "success" : "error" });
  }
  const num = (k: keyof S, label: string, hint?: string) => <div key={k}><label className="label">{label}</label><input className="input" type="number" value={Number(f[k])} onChange={(e) => set(k, Number(e.target.value) as S[typeof k])} />{hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}</div>;
  const bool = (k: keyof S, label: string, hint?: string) => <label key={k} className="flex items-start gap-3 rounded-lg border border-line bg-panel-2 p-3 text-sm"><input type="checkbox" className="mt-1" checked={!!f[k]} onChange={(e) => set(k, e.target.checked as S[typeof k])} /><span><b>{label}</b>{hint && <div className="text-xs text-muted">{hint}</div>}</span></label>;
  return (
    <form onSubmit={save} className="max-w-3xl">
      <h1 className="display text-4xl">Settings</h1>
      <div className="card mt-3 grid gap-3 p-4 md:grid-cols-3">
        <div className="md:col-span-2"><label className="label">Auction name</label><input className="input" value={f.auctionName} onChange={(e) => set("auctionName", e.target.value)} /></div>
        <div><label className="label">Date</label><input className="input" type="datetime-local" value={f.auctionDate ? f.auctionDate.slice(0, 16) : ""} onChange={(e) => set("auctionDate", e.target.value || null)} /></div>
        {num("startingPurse", "Purse per franchise (lakhs)", "12000 = ₹120 Cr. Only before the auction starts.")}
        {num("maxSquadSize", "Max squad size")}{num("minSquadSize", "Min squad size", "Used for the Franchise Strength ranking.")}
        {num("maxOverseas", "Max overseas players")}
        {num("bidIncrement", "Bid increment (lakhs)", "0 = official IPL ladder (5 / 10 / 20 / 25 L).")}
        {num("timerSeconds", "Bid timer (seconds)")}
        {num("rtmTimerSeconds", "RTM decision timer (seconds)", "Per RTM step; no answer = default outcome.")}
        {num("defaultRtmCards", "RTM cards per franchise", "Applied to all franchises until the auction starts; per-team override on the Franchises page.")}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {bool("autoTimer", "Start timer automatically", "The clock starts the moment a player comes up.")}
        {bool("autoSell", "Auto-sell when the timer ends", "Highest bidder wins (after the RTM window); no bids = unsold. Off = auctioneer decides.")}
        {bool("rtmEnabled", "Right-To-Match enabled", "Turn off for a plain auction without RTM.")}
        {bool("spectatorAccess", "Public live room", "/live and /display open without login.")}
        {bool("unsoldReentry", "Unsold players can re-enter")}
      </div>
      <button className="btn-gold mt-4" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
    </form>
  );
}
