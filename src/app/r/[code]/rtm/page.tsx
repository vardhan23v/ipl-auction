import { prisma } from "@/lib/prisma";
import { loadRoomPage } from "@/lib/room-page";
import { TeamBadge } from "@/components/TeamBadge";
import { RtmCards } from "@/components/auction/PursePanel";
import { money, ROLE_SHORT } from "@/lib/format";
import { RoomShell } from "../RoomShell";
export const dynamic = "force-dynamic";
export const metadata = { title: "RTM Board" };
export default async function RtmBoard({ params }: { params: Promise<{ code: string }> }) {
  const { room, access } = await loadRoomPage((await params).code, "any");
  const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { sortOrder: "asc" }, include: { formerPlayers: { orderBy: [{ basePrice: "desc" }, { name: "asc" }], include: { soldTo: { select: { abbreviation: true, color: true } }, squadEntry: { select: { viaRtm: true } } } } } });
  const matched = teams.reduce((n, t) => n + t.formerPlayers.filter((p) => p.squadEntry?.viaRtm).length, 0);
  return (
    <RoomShell room={room} access={access}>
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><div className="text-xs font-semibold uppercase tracking-widest text-rtm-2">Right to match</div><h1 className="display text-4xl md:text-5xl">RTM Board</h1></div>
          <div className="text-sm text-muted">{teams.reduce((n, t) => n + t.rtmTotal - t.rtmUsed, 0)} cards left · {matched} matched so far</div>
        </div>
        <p className="mt-3 max-w-3xl text-sm text-muted">Each franchise may use a Right-To-Match card <b className="text-ink">only on the players in its fixed list below</b> (its squad last season). When one of them is about to be sold elsewhere, the franchise can match the final price and keep them.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {teams.map((t) => (
            <section key={t.id} className="card overflow-hidden">
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${t.color}, ${t.color2 ?? t.color})` }} />
              <div className="p-4 md:p-5">
                <div className="flex items-center gap-3"><TeamBadge name={t.name} abbreviation={t.abbreviation} color={t.color} logoUrl={t.logoUrl} size={44} /><div className="min-w-0 flex-1"><div className="display truncate text-2xl">{t.name}</div><div className="text-xs text-muted">{t.formerPlayers.length} RTM-eligible · {t.ownerName ?? "unclaimed"}</div></div><div className="text-right"><div className="label">{t.rtmTotal - t.rtmUsed} / {t.rtmTotal} left</div><RtmCards total={t.rtmTotal} used={t.rtmUsed} size="md" /></div></div>
                <div className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                  {t.formerPlayers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-line/40 py-1">
                      <span className="flex min-w-0 items-center gap-1.5"><span className="truncate">{p.name}</span><span className="text-[10px] text-muted">{ROLE_SHORT[p.role]}{p.overseas ? " ✈" : ""}</span></span>
                      <span className="shrink-0 text-xs">{p.status === "SOLD" ? (p.soldToId === t.id ? <span className={p.squadEntry?.viaRtm ? "font-bold text-rtm-2" : "text-emerald-400"}>{p.squadEntry?.viaRtm ? "MATCHED" : "Bought"} {money(p.soldPrice)}</span> : <span style={{ color: p.soldTo?.color }}>→ {p.soldTo?.abbreviation} {money(p.soldPrice)}</span>) : p.status === "LIVE" ? <span className="text-live">LIVE</span> : p.status === "UNSOLD" ? <span className="text-muted">unsold</span> : <span className="text-muted">{money(p.basePrice)}</span>}</span>
                    </div>
                  ))}
                  {t.formerPlayers.length === 0 && <div className="py-3 text-muted sm:col-span-2">No eligible players configured.</div>}
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
    </RoomShell>
  );
}
