"use client";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import { money, ROLE_LABEL } from "@/lib/format";
import { useRoom, roomApi } from "../RoomContext";
type Row = { id: string; name: string; role: string; status: string; basePrice: number; soldPrice: number | null; overseas: boolean; viaRtm: boolean; soldTo: { name: string; abbreviation: string; color: string } | null };
export function RecentResults() {
  const { code } = useRoom();
  const [rows, setRows] = useState<Row[]>([]);
  const load = () => fetch(roomApi(code, "/recent")).then((r) => r.json()).then(setRows).catch(() => {});
  useEffect(() => { load(); const s = getSocket(); const ev = ["player:sold", "player:unsold", "auction:undo", "state:sync"]; ev.forEach((e) => s.on(e, load)); return () => { ev.forEach((e) => s.off(e, load)); }; }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="card p-4">
      <h3 className="display mb-2 text-lg">Recent Results</h3>
      <div className="flex max-h-[420px] flex-col gap-1.5 overflow-auto">
        {rows.length === 0 && <div className="py-8 text-center text-sm text-muted"><span className="floaty inline-block text-2xl">🔨</span><div className="mt-1">The gavel is warming up.</div></div>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg bg-panel-2 px-3 py-2 text-sm">
            <div><div className="font-semibold">{r.name}{r.overseas && <span className="ml-1 text-xs text-sky-300">✈</span>}</div><div className="text-[11px] text-muted">{ROLE_LABEL[r.role]} · base {money(r.basePrice)}</div></div>
            {r.status === "SOLD" ? <div className="text-right"><div className="money font-bold">{money(r.soldPrice)}</div><div className="text-[11px] font-semibold" style={{ color: r.soldTo?.color }}>{r.soldTo?.abbreviation}{r.viaRtm && <span className="ml-1 rounded bg-rtm/20 px-1 text-[9px] text-rtm-2">RTM</span>}</div></div> : <span className="rounded bg-live/20 px-2 py-0.5 text-xs font-bold text-live">UNSOLD</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
