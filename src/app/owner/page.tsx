import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSnapshot, getSettings } from "@/server/auction-engine";
import { money, ROLE_LABEL } from "@/lib/format";
import { OwnerRoom } from "./OwnerRoom";
import { TeamBadge } from "@/components/TeamBadge";
import { RtmCards } from "@/components/auction/PursePanel";
export const dynamic = "force-dynamic";
export const metadata = { title: "My Franchise" };

export default async function OwnerPage() {
  const s = await getSession();
  if (!s?.user) redirect("/login");
  if (s.user.role !== "OWNER" || !s.user.teamId) redirect("/lobby");
  const [team, snap, settings] = await Promise.all([
    prisma.team.findUnique({ where: { id: s.user.teamId }, include: { squad: { include: { player: true }, orderBy: { createdAt: "desc" } }, formerPlayers: { orderBy: [{ basePrice: "desc" }, { name: "asc" }], include: { soldTo: { select: { abbreviation: true, color: true } }, squadEntry: { select: { viaRtm: true } } } } } }),
    getSnapshot(), getSettings(),
  ]);
  if (!team) redirect("/lobby");
  return (
    <>
      <Nav />
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <div className="card flex flex-wrap items-center gap-5 p-4" style={{ borderColor: team.color }}>
          <TeamBadge name={team.name} abbreviation={team.abbreviation} color={team.color} logoUrl={team.logoUrl} size={56} />
          <div><div className="display text-3xl">{team.name}</div><div className="text-sm text-muted">Owner: {team.ownerName ?? s.user.name}</div></div>
          <div className="ml-auto grid grid-cols-3 gap-3 text-center sm:grid-cols-5">
            <div><div className="label">Purse</div><div className="display money text-2xl">{money(team.purse)}</div></div>
            <div><div className="label">Spent</div><div className="display text-2xl">{money(team.spent)}</div></div>
            <div><div className="label">Squad</div><div className="display text-2xl">{team.squadCount}/{settings.maxSquadSize}</div></div>
            <div><div className="label">Overseas</div><div className="display text-2xl">{team.overseasCount}/{settings.maxOverseas}</div></div>
            <div><div className="label">RTM cards</div><div className="mt-1"><RtmCards total={team.rtmTotal} used={team.rtmUsed} size="md" /></div></div>
          </div>
        </div>
      </div>
      <OwnerRoom initial={snap} teamId={team.id} />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 lg:grid-cols-2">
        <div>
          <h3 className="display mb-3 text-2xl">My Squad <span className="text-muted">({team.squad.length})</span></h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {team.squad.map((sp) => (
              <div key={sp.id} className="card flex items-center justify-between p-3"><div><div className="font-semibold">{sp.player.name}{sp.player.overseas && <span className="ml-1 text-xs text-sky-300">✈</span>}{sp.viaRtm && <span className="ml-1 rounded bg-rtm/20 px-1 text-[9px] font-bold text-rtm-2">RTM</span>}</div><div className="text-xs text-muted">{ROLE_LABEL[sp.player.role]} · ★ {sp.player.rating ?? "—"}</div></div><div className="money font-bold">{money(sp.price)}</div></div>
            ))}
            {team.squad.length === 0 && <div className="card p-6 text-center text-sm text-muted sm:col-span-2">No players bought yet. Minimum squad is {settings.minSquadSize}.</div>}
          </div>
        </div>
        <div>
          <h3 className="display mb-3 text-2xl text-rtm-2">My RTM list <span className="text-muted">({team.formerPlayers.length})</span></h3>
          <div className="text-xs text-muted mb-2">Former {team.abbreviation} players you may match for. {team.rtmTotal - team.rtmUsed} of {team.rtmTotal} cards left.</div>
          <div className="card divide-y divide-line/50 text-sm">
            {team.formerPlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2">
                <span className="flex min-w-0 items-center gap-2"><span className="truncate font-semibold">{p.name}</span><span className="text-[11px] text-muted">{ROLE_LABEL[p.role]}{p.overseas ? " ✈" : ""}</span></span>
                <span className="text-xs">{p.status === "SOLD" ? <span style={{ color: p.soldTo?.color }}>{p.soldToId === team.id ? (p.squadEntry?.viaRtm ? "Matched ✔" : "Bought ✔") : `Lost → ${p.soldTo?.abbreviation}`} · <span className="money">{money(p.soldPrice)}</span></span> : p.status === "LIVE" ? <span className="text-live">ON THE BLOCK</span> : p.status === "UNSOLD" ? <span className="text-muted">Unsold</span> : <span className="text-muted">Base {money(p.basePrice)}</span>}</span>
              </div>
            ))}
            {team.formerPlayers.length === 0 && <div className="p-6 text-center text-muted">No RTM-eligible players configured. Ask the admin.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
