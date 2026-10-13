"use client";
import { useEffect, useState } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "@/components/Toast";
import { money, ROLE_SHORT } from "@/lib/format";
type Q = { id: string; name: string; role: string; basePrice: number; set: string; status: string; overseas: boolean; previousTeam: { abbreviation: string; color: string } | null };

function Row({ p, i, onStart }: { p: Q; i: number; onStart: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: p.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-3 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm">
      <span {...attributes} {...listeners} className="cursor-grab select-none text-muted" title="Drag to reorder">⠿</span>
      <span className="w-8 text-muted">{i + 1}</span>
      <span className="flex-1 font-semibold">{p.name}{p.overseas && <span className="ml-1 text-xs text-sky-300">✈</span>} <span className="text-xs font-normal text-muted">{ROLE_SHORT[p.role]} · {p.set}</span></span>
      {p.previousTeam && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: p.previousTeam.color }}>RTM {p.previousTeam.abbreviation}</span>}
      <span className="money w-20 text-right">{money(p.basePrice)}</span>
      <button className="rounded bg-gold/20 px-2 py-0.5 text-xs text-gold" onClick={() => onStart(p.id)}>Start now</button>
    </div>
  );
}

export function QueueBoard() {
  const [rows, setRows] = useState<Q[]>([]); const [q, setQ] = useState(""); const [busy, setBusy] = useState(false); const { push } = useToast();
  const load = () => fetch("/api/admin/players/queue").then((r) => r.json()).then((j) => setRows(Array.isArray(j) ? j : []));
  useEffect(() => { load(); }, []);
  async function persist(next: Q[]) { setRows(next); await fetch("/api/admin/players/queue", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: next.map((x) => x.id) }) }); }
  function onDragEnd(e: DragEndEvent) { const { active, over } = e; if (!over || active.id === over.id) return; const a = rows.findIndex((x) => x.id === active.id), b = rows.findIndex((x) => x.id === over.id); persist(arrayMove(rows, a, b)); }
  async function control(action: string, playerId?: string) {
    setBusy(true); const r = await fetch("/api/auction/control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, playerId }) }); const j = await r.json(); setBusy(false);
    push({ title: r.ok ? action.replace(/_/g, " ") : "Failed", body: j.error, tone: r.ok ? "success" : "error" }); load();
  }
  const shown = q ? rows.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.set.toLowerCase().includes(q.toLowerCase())) : rows;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="display text-4xl">Auction Queue</h1><div className="text-sm text-muted">Players remaining: <b className="text-ink">{rows.length}</b> · drag to reorder (disable search first)</div></div>
        <div className="flex gap-2"><button className="btn-ghost" disabled={busy} onClick={() => control("ORDER_BY_SET")}>Order by set</button><button className="btn-ghost" disabled={busy} onClick={() => control("SHUFFLE")}>🔀 Shuffle</button></div>
      </div>
      <input className="input mt-3 w-64" placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 flex flex-col gap-1.5">
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={shown.map((x) => x.id)} strategy={verticalListSortingStrategy}>
            {shown.map((p, i) => <Row key={p.id} p={p} i={q ? rows.indexOf(p) : i} onStart={(id) => control("START_PLAYER", id)} />)}
          </SortableContext>
        </DndContext>
        {rows.length === 0 && <div className="card p-8 text-center text-muted">Queue is empty.</div>}
      </div>
    </div>
  );
}
