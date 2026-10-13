import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadRoomPage } from "@/lib/room-page";
import { getSnapshot } from "@/server/auction-engine";
import { money, ROLE_LABEL } from "@/lib/format";
import { TeamBadge } from "@/components/TeamBadge";
import { RtmCards } from "@/components/auction/PursePanel";
import { RoomShell } from "../RoomShell";
import { OwnerRoom } from "./OwnerRoom";
export const dynamic = "force-dynamic";
export const metadata = { title: "My Franchise" };

export default async function OwnerPage({ params }: { params: Promise<{ code: string }> }) {
  const { room, access, session } = await loadRoomPage((await params).code, "member");
  if (!access.teamId) redirect(`/r/${room.code}`);
  const [team, snap] = await Promise.all([
    prisma.team.findUnique({ where: { id: access.teamId }, include: { squad: { include: { player: true }, orderBy: { createdAt: "desc" } }, formerPlayers: { orderBy: [{ basePrice: "desc" }, { name: "asc" }], include: { soldTo: { select: { abbreviation: true, color: true } }, squadEntry: { select: { viaRtm: true } } } } } }),
    getSnapshot(room.id),
  ]);
  if (!team) redirect(`/r/${room.code}`);
  return (
    <RoomShell room={room} access={access}>
      <div className="mx-auto max-w-7xl px-3 pt-3 md:px-4 md:pt-4">
        <div className="card flex flex-wrap items-center gap-3 p-3 md:gap-5 md:p-4" style={{ borderColor: team.color }}>
          <TeamBadge name={team.name} abbreviation={team.abbreviation} color={team.color} logoUrl={team.logoUrl} size={48} />
          <div className="min-w-0"><div className="display truncate text-2xl md:text-3xl">{team.name}</div><div className="text-xs text-muted md:text-sm">Manager: {team.ownerName ?? session?.user.name}</div></div>
          <div className="ml-auto grid w-full grid-cols-5 gap-2 text-center sm:w-auto sm:gap-3">
            <div><div className="label !text-[9px] md:!text-xs">Purse</div><div className="display money text-lg md:text-2xl">{money(team.purse)}</div></div>
            <div><div className="label !text-[9px] md:!text-xs">Spent</div><div className="display text-lg md:text-2xl">{money(team.spent)}</div></div>
            <div><div className="label !text-[9px] md:!text-xs">Squad</div><div className="display text-lg md:text-2xl">{team.squadCount}/{room.maxSquadSize}</div></div>
            <div><div className="label !text-[9px] md:!text-xs">Overseas</div><div className="display text-lg md:text-2xl">{team.overseasCount}/{room.maxOverseas}</div></div>
            <div><div className="label !text-[9px] md:!text-xs">RTM</div><div className="mt-1 flex justify-center"><RtmCards total={team.rtmTotal} used={team.rtmUsed} size="md" /></div></div>
          </div>
        </div>
      </div>
      <OwnerRoom code={room.code} access={access} initial={snap} teamId={team.id} />
      <div className="mx-auto grid max-w-7xl gap-6 px-3 pb-28 md:px-4 md:pb-10 lg:grid-cols-2">
        <div>
          <h3 className="display mb-3 text-2xl">My Squad <span className="text-muted">({team.squad.length})</span></h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {team.squad.map((sp) => <div key={sp.id} className="card flex items-center justify-between p-3"><div><div className="font-semibold">{sp.player.name}{sp.player.overseas && <span className="ml-1 text-xs text-sky-300">✈</span>}{sp.viaRtm && <span className="ml-1 rounded bg-rtm/20 px-1 text-[9px] font-bold text-rtm-2">RTM</span>}</div><div className="text-xs text-muted">{ROLE_LABEL[sp.player.role]} · ★ {sp.player.rating ?? "—"}</div></div><div className="money font-bold">{money(sp.price)}</div></div>)}
            {team.squad.length === 0 && <div className="card p-6 text-center text-sm text-muted sm:col-span-2">No players bought yet. Minimum squad is {room.minSquadSize}.</div>}
          </div>
        </div>
        <div>
          <h3 className="display mb-3 text-2xl text-rtm-2">My RTM list <span className="text-muted">({team.formerPlayers.length})</span></h3>
          <div className="mb-2 text-xs text-muted">Former {team.abbreviation} players you may match for. {team.rtmTotal - team.rtmUsed} of {team.rtmTotal} cards left. <Link href={`/r/${room.code}/rtm`} className="text-rtm-2 underline">Full board</Link></div>
          <div className="card divide-y divide-line/50 text-sm">
            {team.formerPlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2">
                <span className="flex min-w-0 items-center gap-2"><span className="truncate font-semibold">{p.name}</span><span className="text-[11px] text-muted">{ROLE_LABEL[p.role]}{p.overseas ? " ✈" : ""}</span></span>
                <span className="shrink-0 text-xs">{p.status === "SOLD" ? <span style={{ color: p.soldTo?.color }}>{p.soldToId === team.id ? (p.squadEntry?.viaRtm ? "Matched ✔" : "Bought ✔") : `Lost → ${p.soldTo?.abbreviation}`} · <span className="money">{money(p.soldPrice)}</span></span> : p.status === "LIVE" ? <span className="text-live">ON THE BLOCK</span> : p.status === "UNSOLD" ? <span className="text-muted">Unsold</span> : <span className="text-muted">Base {money(p.basePrice)}</span>}</span>
              </div>
            ))}
            {team.formerPlayers.length === 0 && <div className="p-6 text-center text-muted">No RTM-eligible players configured.</div>}
          </div>
        </div>
      </div>
    </RoomShell>
  );
}
