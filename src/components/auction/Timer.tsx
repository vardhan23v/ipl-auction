"use client";
import { useEffect, useRef, useState } from "react";
import { mmss } from "@/lib/format";
export function Timer({ ms, running, total, size = "lg", color = "#f5b82e" }: { ms: number; running: boolean; total: number; size?: "lg" | "sm"; color?: string }) {
  const sec = Math.ceil(ms / 1000);
  const prev = useRef(sec); const [tick, setTick] = useState(0);
  useEffect(() => { if (sec !== prev.current) { prev.current = sec; setTick((t) => t + 1); } }, [sec]);
  const pct = total > 0 ? Math.min(1, ms / (total * 1000)) : 0;
  const danger = sec <= 5 && running;
  const r = size === "lg" ? 54 : 26, sw = size === "lg" ? 6 : 4, dim = (r + sw) * 2, c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} stroke="#1f2a44" strokeWidth={sw} fill="none" />
        <circle cx={dim / 2} cy={dim / 2} r={r} stroke={danger ? "#ff2e4d" : color} strokeWidth={sw} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" style={{ transition: "stroke-dashoffset .2s linear" }} />
      </svg>
      <div key={tick} className={`display absolute font-bold tabular-nums ${size === "lg" ? "text-4xl" : "text-base"} ${danger ? "text-live" : ""} ${running ? "tick" : "text-muted"}`}>{mmss(ms)}</div>
    </div>
  );
}
