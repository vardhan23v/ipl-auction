"use client";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { useRoom } from "@/components/RoomContext";
import { money, ROLE_SHORT } from "@/lib/format";
import { PlayerForm, type P, type Team } from "./PlayerForm";

export function PlayersTable({ title, fixedStatus, teams }: { title: string; fixedStatus?: string; teams: Team[] }) {
  const { code } = useRoom();
  const [rows, setRows] = useState<P[]>([]); const [q, setQ] = useState(""); const [status, setStatus] = useState(fixedStatus ?? ""); const [role, setRole] = useState(""); const [prev, setPrev] = useState("");
  const [edit, setEdit] = useState<P | null | "new">(null); const [loading, setLoading] = useState(true); const { push } = useToast();
  const api = (p: string) => `/api/rooms/${code}${p}`;
  const load = useCallback(async () => { setLoading(true); const u = new URLSearchParams({ q, status, role, prev }); const r = await fetch(api(`/players?${u}`)); const j = await r.json(); setRows(Array.isArray(j) ? j : []); setLoading(false); }, [q, status, role, prev]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  async function call(path: string, method: string, body?: object, ok?: string) { const r = await fetch(api(path), { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); push({ title: r.ok ? ok ?? "Done" : "Failed", body: r.ok ? undefined : j.error, tone: r.ok ? "success" : "error" }); load(); return j; }
  async function assign(p: P) {
    const abbr = prompt(`Assign ${p.name} to which franchise? (abbreviation, blank = back to pool)`, p.soldTo?.abbreviation ?? ""); if (abbr === null) return;
    const team = teams.find((t) => t.abbreviation.toLowerCase() === abbr.trim().toLowerCase());
    if (abbr.trim() && !team) return push({ title: "Unknown franchise", tone: "error" });
    const price = team ? prompt("Price in lakhs", String(p.soldPrice ?? p.basePrice)) : null;
    await call(`/players/${p.id}/team`, "PUT", { teamId: team?.id ?? null, price: price ? Number(price) : undefined }, team ? `Assigned to ${team.abbreviation}` : "Returned to pool");
  }
  async function importPool(replace: boolean) {
    if (!confirm(replace ? "Re-import the bundled pool and WIPE this room's auction (sales, bids, purses)?" : "Add any missing players from the bundled 273-player pool?")) return;
    const j = await call(`/players/import${replace ? "?replace=1" : ""}`, "POST", undefined, "Pool imported"); if (j?.created != null) push({ title: `${j.created} added`, tone: "info" });
  }
  const statusCls: Record<string, string> = { SOLD: "bg-emerald-500/20 text-emerald-400", UNSOLD: "bg-live/20 text-live", LIVE: "bg-live text-white", SKIPPED: "bg-zinc-600/40 text-zinc-300", WAITING: "bg-gold/20 text-gold", POOL: "bg-panel-2 text-muted" };
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="display text-3xl md:text-4xl">{title}</h1>
        <div className="flex flex-wrap gap-2"><button className="btn-ghost !py-1.5 text-sm" onClick={() => importPool(false)}>⟳ Import pool</button><button className="btn-ghost !py-1.5 text-sm text-live" onClick={() => importPool(true)}>Re-import & wipe</button><button className="btn-gold !py-1.5 text-sm" onClick={() => setEdit("new")}>+ Add player</button></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <input className="input col-span-2 sm:w-56" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        {!fixedStatus && <select className="input sm:w-36" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{["POOL", "WAITING", "LIVE", "SOLD", "UNSOLD", "SKIPPED"].map((s) => <option key={s}>{s}</option>)}</select>}
        {fixedStatus === "UNSOLD" && <select className="input sm:w-36" value={status} onChange={(e) => setStatus(e.target.value)}><option value="UNSOLD">UNSOLD</option><option value="SKIPPED">SKIPPED</option></select>}
        <select className="input sm:w-36" value={role} onChange={(e) => setRole(e.target.value)}><option value="">All roles</option>{Object.entries(ROLE_SHORT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input sm:w-44" value={prev} onChange={(e) => setPrev(e.target.value)}><option value="">RTM list: any</option>{teams.map((t) => <option key={t.id} value={t.id}>RTM {t.abbreviation}</option>)}</select>
        <span className="col-span-2 self-center text-sm text-muted sm:ml-auto">{loading ? "Loading…" : `${rows.length} players`}</span>
      </div>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-panel-2 text-left text-xs uppercase text-muted"><tr><th className="p-2">#</th><th className="p-2">Player</th><th className="p-2">Role</th><th className="p-2">Set</th><th className="p-2">Base</th><th className="p-2">★</th><th className="p-2">RTM</th><th className="p-2">Status</th><th className="p-2">Price / Team</th><th className="p-2">Actions</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-line/50">
                <td className="p-2 text-muted">{p.queueOrder ?? "—"}</td>
                <td className="p-2 font-semibold">{p.name}{p.overseas && <span className="ml-1 text-xs text-sky-300">✈</span>}{!p.capped && <span className="ml-1 text-[10px] text-muted">U</span>}</td>
                <td className="p-2">{ROLE_SHORT[p.role]}</td><td className="p-2 text-muted">{p.set}</td><td className="p-2">{money(p.basePrice)}</td><td className="p-2">{p.rating ?? "—"}</td>
                <td className="p-2">{p.previousTeam ? <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: p.previousTeam.color }}>{p.previousTeam.abbreviation}</span> : <span className="text-muted">—</span>}</td>
                <td className="p-2"><span className={`rounded px-2 py-0.5 text-xs font-bold ${statusCls[p.status]}`}>{p.status}</span></td>
                <td className="p-2">{p.status === "SOLD" ? <span><span className="money font-bold">{money(p.soldPrice)}</span> <span style={{ color: p.soldTo?.color }}>{p.soldTo?.abbreviation}</span>{p.viaRtm && <span className="ml-1 rounded bg-rtm/20 px-1 text-[9px] text-rtm-2">RTM</span>}</span> : "—"}</td>
                <td className="p-2"><div className="flex flex-wrap gap-1">
                  <button className="rounded bg-panel-2 px-2 py-0.5 text-xs" onClick={() => setEdit(p)}>Edit</button>
                  {["UNSOLD", "SKIPPED"].includes(p.status) && <button className="rounded bg-gold/20 px-2 py-0.5 text-xs text-gold" onClick={() => call("/control", "POST", { action: "REQUEUE", playerId: p.id }, "Back in queue")}>Re-queue</button>}
                  {p.status !== "LIVE" && <button className="rounded bg-panel-2 px-2 py-0.5 text-xs" onClick={() => assign(p)}>{p.status === "SOLD" ? "Move" : "Assign"}</button>}
                  {["POOL", "WAITING"].includes(p.status) && <button className="rounded bg-panel-2 px-2 py-0.5 text-xs" onClick={() => call(`/players/${p.id}`, "PATCH", { status: "SKIPPED" }, "Withdrawn")}>Withdraw</button>}
                  {!["LIVE", "SOLD"].includes(p.status) && <button className="rounded bg-live/20 px-2 py-0.5 text-xs text-live" onClick={() => { if (confirm(`Delete ${p.name}?`)) call(`/players/${p.id}`, "DELETE", undefined, "Deleted"); }}>Delete</button>}
                </div></td>
              </tr>
            ))}
            {rows.length === 0 && !loading && <tr><td colSpan={10} className="p-8 text-center text-muted">No players.</td></tr>}
          </tbody>
        </table>
      </div>
      {edit && <PlayerForm player={edit === "new" ? null : edit} teams={teams} onDone={() => { setEdit(null); load(); }} />}
    </div>
  );
}
