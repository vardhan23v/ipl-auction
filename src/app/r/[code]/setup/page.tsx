import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadRoomPage } from "@/lib/room-page";
import { RoomShell } from "../RoomShell";
import { SetupWizard, type SetupData } from "./SetupWizard";
export const dynamic = "force-dynamic";
export const metadata = { title: "Set up auction" };

/** Host-only setup before the start: rules, clock & RTM, player pool & order, teams — then Start. */
export default async function SetupPage({ params }: { params: Promise<{ code: string }> }) {
  const { room, access } = await loadRoomPage((await params).code, "host");
  if (room.state !== "WAITING") redirect(`/r/${room.code}/live`);
  const [teams, sets, total, queue] = await Promise.all([
    prisma.team.findMany({ where: { roomId: room.id }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, abbreviation: true, color: true, logoUrl: true, ownerName: true, owner: { select: { name: true } } } }),
    prisma.player.groupBy({ by: ["set"], where: { roomId: room.id }, _count: { _all: true } }),
    prisma.player.count({ where: { roomId: room.id } }),
    prisma.player.findMany({ where: { roomId: room.id }, orderBy: [{ queueOrder: "asc" }, { createdAt: "asc" }], take: 12, select: { id: true, name: true, set: true, basePrice: true } }),
  ]);
  const data: SetupData = {
    settings: { startingPurse: room.startingPurse, maxSquadSize: room.maxSquadSize, minSquadSize: room.minSquadSize, maxOverseas: room.maxOverseas, bidIncrement: room.bidIncrement, timerSeconds: room.timerSeconds, nextPlayerGapSeconds: room.nextPlayerGapSeconds, rtmEnabled: room.rtmEnabled, defaultRtmCards: room.defaultRtmCards, rtmTimerSeconds: room.rtmTimerSeconds, unsoldReentry: room.unsoldReentry, isPublic: room.isPublic },
    teams: teams.map((t) => ({ id: t.id, name: t.name, abbreviation: t.abbreviation, color: t.color, logoUrl: t.logoUrl, owner: t.ownerName ?? t.owner?.name ?? null })),
    sets: sets.map((s) => ({ set: s.set, count: s._count._all })).sort((a, b) => a.set.localeCompare(b.set, undefined, { numeric: true })),
    total, queue,
  };
  return <RoomShell room={room} access={access}><SetupWizard code={room.code} roomName={room.name} data={data} /></RoomShell>;
}
