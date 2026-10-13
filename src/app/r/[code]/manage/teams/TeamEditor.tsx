"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { TeamBadge } from "@/components/TeamBadge";
import { money } from "@/lib/format";
type T = { id: string; name: string; abbreviation: string; color: string; color2: string | null; logoUrl: string | null; rtmTotal: number; rtmUsed: number; purse: number; squadCount: number; formerCount: number; owner: string | null };
export function TeamEditor({ code, team }: { code: string; team: T }) {
  const [f, setF] = useState({ name: team.name, abbreviation: team.abbreviation, color: team.color, color2: team.color2 ?? "", logoUrl: team.logoUrl ?? "", rtmTotal: team.rtmTotal });
  const [busy, setBusy] = useState(false); const { push } = useToast(); const r = useRouter();
  const set = (k: string, v: string | number) => setF((x) => ({ ...x, [k]: v }));
  async function send(body: object, msg: string) {
    setBusy(true); const res = await fetch(`/api/rooms/${code}/teams/${team.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const j = await res.json(); setBusy(false);
    push({ title: res.ok ? msg : "Failed", body: res.ok ? undefined : j.error, tone: res.ok ? "success" : "error" }); if (res.ok) r.refresh();
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); send(f, "Franchise saved"); }} className="card p-4">
      <div className="mb-3 flex items-center gap-3"><TeamBadge name={f.name} abbreviation={f.abbreviation} color={f.color} logoUrl={f.logoUrl || null} size={44} /><div className="min-w-0"><div className="display truncate text-2xl">{f.name}</div><div className="text-xs text-muted">Purse {money(team.purse)} · squad {team.squadCount} · RTM {team.rtmUsed}/{team.rtmTotal} · {team.formerCount} RTM-eligible</div></div></div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="col-span-2"><label className="label">Name</label><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div><label className="label">Abbr</label><input className="input" value={f.abbreviation} onChange={(e) => set("abbreviation", e.target.value.toUpperCase())} maxLength={5} /></div>
        <div><label className="label">RTM cards</label><input className="input" type="number" min={0} max={10} value={f.rtmTotal} onChange={(e) => set("rtmTotal", Number(e.target.value))} /></div>
        <div><label className="label">Colour</label><input className="input !p-1" type="color" value={f.color} onChange={(e) => set("color", e.target.value)} /></div>
        <div><label className="label">Accent</label><input className="input !p-1" type="color" value={f.color2 || "#ffffff"} onChange={(e) => set("color2", e.target.value)} /></div>
        <div className="col-span-2"><label className="label">Logo URL</label><input className="input" value={f.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…" /></div>
        <div className="col-span-2 flex items-center justify-between gap-2 text-xs text-muted md:col-span-4">
          <span>Manager: <b className="text-ink">{team.owner ?? "unclaimed"}</b></span>
          <span className="flex gap-2">{team.owner && <button type="button" className="btn-ghost !py-1.5 text-live" disabled={busy} onClick={() => { if (confirm(`Remove ${team.owner} from ${team.name}?`)) send({ kickOwner: true }, "Manager removed"); }}>Remove manager</button>}<button className="btn-gold !py-1.5" disabled={busy}>{busy ? "Saving…" : "Save"}</button></span>
        </div>
      </div>
    </form>
  );
}
