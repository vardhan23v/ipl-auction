"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
type U = { id: string; name: string; email: string; role: string; teamId: string | null; team: { abbreviation: string } | null };
export function UsersTable({ teams }: { teams: { id: string; abbreviation: string }[] }) {
  const [rows, setRows] = useState<U[]>([]); const [f, setF] = useState({ name: "", email: "", password: "", role: "SPECTATOR", teamId: "" }); const { push } = useToast();
  const load = () => fetch("/api/admin/users").then((r) => r.json()).then((j) => setRows(Array.isArray(j) ? j : []));
  useEffect(() => { load(); }, []);
  async function create(e: React.FormEvent) { e.preventDefault(); const r = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, teamId: f.teamId || null }) }); const j = await r.json(); push({ title: r.ok ? "User created" : "Failed", body: j.error, tone: r.ok ? "success" : "error" }); if (r.ok) setF({ name: "", email: "", password: "", role: "SPECTATOR", teamId: "" }); load(); }
  async function del(u: U) { if (!confirm(`Delete ${u.email}?`)) return; const r = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" }); push({ title: r.ok ? "Deleted" : "Failed", tone: r.ok ? "success" : "error" }); load(); }
  async function resetPw(u: U) { const p = prompt(`New password for ${u.email}`); if (!p) return; const r = await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: p }) }); push({ title: r.ok ? "Password updated" : "Failed", tone: r.ok ? "success" : "error" }); }
  return (
    <div>
      <h1 className="display text-4xl">Users</h1>
      <form onSubmit={create} className="card mt-3 grid gap-2 p-4 md:grid-cols-6">
        <input className="input" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <input className="input" placeholder="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <input className="input" placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={6} />
        <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{["ADMIN", "AUCTIONEER", "OWNER", "SPECTATOR"].map((r) => <option key={r}>{r}</option>)}</select>
        <select className="input" value={f.teamId} onChange={(e) => setF({ ...f, teamId: e.target.value })} disabled={f.role !== "OWNER"}><option value="">Franchise…</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.abbreviation}</option>)}</select>
        <button className="btn-gold">Create</button>
      </form>
      <div className="card mt-3 divide-y divide-line/50 text-sm">{rows.map((u) => <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-2"><span><b>{u.name}</b> <span className="text-muted">{u.email}</span> · <span className="rounded bg-panel-2 px-1.5 py-0.5 text-xs">{u.role}</span> {u.team && <span className="text-xs text-gold">{u.team.abbreviation}</span>}</span><span className="flex gap-1"><button className="rounded bg-panel-2 px-2 py-0.5 text-xs" onClick={() => resetPw(u)}>Reset password</button><button className="rounded bg-live/20 px-2 py-0.5 text-xs text-live" onClick={() => del(u)}>Delete</button></span></div>)}</div>
    </div>
  );
}
