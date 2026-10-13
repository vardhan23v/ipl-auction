"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { TeamBadge } from "@/components/TeamBadge";
import { money } from "@/lib/format";
type T = { id: string; name: string; abbreviation: string; color: string; color2: string | null; logoUrl: string | null; ownerName: string | null; ownerEmail: string | null; ownerLogin: string | null; rtmTotal: number; rtmUsed: number; purse: number; squadCount: number; formerCount: number };
export function TeamEditor({ team }: { team: T }) {
  const [f, setF] = useState({ name: team.name, abbreviation: team.abbreviation, color: team.color, color2: team.color2 ?? "", logoUrl: team.logoUrl ?? "", ownerName: team.ownerName ?? "", ownerEmail: team.ownerEmail ?? "", ownerPassword: "", rtmTotal: team.rtmTotal });
  const [busy, setBusy] = useState(false); const { push } = useToast(); const r = useRouter();
  const set = (k: string, v: string | number) => setF((x) => ({ ...x, [k]: v }));
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const body: Record<string, unknown> = { ...f }; if (!f.ownerPassword) delete body.ownerPassword;
    const res = await fetch(`/api/admin/teams/${team.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json(); setBusy(false);
    push({ title: res.ok ? "Franchise saved" : "Failed", body: res.ok ? undefined : j.error, tone: res.ok ? "success" : "error" });
    if (res.ok) { set("ownerPassword", ""); r.refresh(); }
  }
  return (
    <form onSubmit={save} className="card p-4">
      <div className="mb-3 flex items-center gap-3"><TeamBadge name={f.name} abbreviation={f.abbreviation} color={f.color} logoUrl={f.logoUrl || null} size={44} /><div><div className="display text-2xl">{f.name}</div><div className="text-xs text-muted">Purse {money(team.purse)} · squad {team.squadCount} · RTM used {team.rtmUsed}/{team.rtmTotal} · {team.formerCount} RTM-eligible players</div></div></div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="col-span-2"><label className="label">Name</label><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div><label className="label">Abbr</label><input className="input" value={f.abbreviation} onChange={(e) => set("abbreviation", e.target.value.toUpperCase())} maxLength={5} /></div>
        <div><label className="label">RTM cards</label><input className="input" type="number" min={0} max={10} value={f.rtmTotal} onChange={(e) => set("rtmTotal", Number(e.target.value))} /></div>
        <div><label className="label">Colour</label><input className="input !p-1" type="color" value={f.color} onChange={(e) => set("color", e.target.value)} /></div>
        <div><label className="label">Accent</label><input className="input !p-1" type="color" value={f.color2 || "#ffffff"} onChange={(e) => set("color2", e.target.value)} /></div>
        <div className="col-span-2"><label className="label">Logo URL</label><input className="input" value={f.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…" /></div>
        <div className="col-span-2"><label className="label">Owner name</label><input className="input" value={f.ownerName} onChange={(e) => set("ownerName", e.target.value)} /></div>
        <div className="col-span-2"><label className="label">Owner email (login)</label><input className="input" type="email" value={f.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} /></div>
        <div className="col-span-2"><label className="label">Set owner password</label><input className="input" type="text" value={f.ownerPassword} onChange={(e) => set("ownerPassword", e.target.value)} placeholder="leave blank to keep" autoComplete="off" /></div>
        <div className="col-span-2 flex items-end justify-end gap-2 text-xs text-muted">{team.ownerLogin ? `Login: ${team.ownerLogin}` : "No owner login yet"}<button className="btn-gold" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
      </div>
    </form>
  );
}
