"use client";
import { memo, useState } from "react";
import { money } from "@/lib/format";
import type { TeamSnapshot } from "@/types/auction";
import { TeamBadge } from "../TeamBadge";
import { Sheet } from "../Sheet";
import { PursePanel } from "./PursePanel";

/** Compact horizontal purse chips; tap to open the full list with squads. */
export const PurseStrip = memo(function PurseStrip({ teams, highlight, mine, rtmTeam }: { teams: TeamSnapshot[]; highlight?: string | null; mine?: string | null; rtmTeam?: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="scroll-x -mx-4 flex gap-2 px-4 pb-1">
        {teams.map((t) => {
          const lead = highlight === t.id, me = mine === t.id, rtm = rtmTeam === t.id;
          return (
            <button key={t.id} onClick={() => setOpen(true)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${lead ? "border-gold bg-gold/10" : rtm ? "border-rtm bg-rtm/10" : me ? "border-sky-400/60 bg-panel" : "border-line bg-panel"}`}>
              <TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={28} />
              <span className="leading-tight"><span className="block text-xs font-bold">{t.abbreviation}{me ? " · you" : ""}</span><span className="money block text-sm font-bold">{money(t.purse)}</span><span className="block text-xs text-muted">{t.squadCount}/{t.maxSquad}</span></span>
            </button>
          );
        })}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Franchises">
        <div className="pb-2"><PursePanel teams={teams} highlight={highlight} mine={mine} rtmTeam={rtmTeam} /></div>
      </Sheet>
    </>
  );
});
