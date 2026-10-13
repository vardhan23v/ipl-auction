import Link from "next/link";
import { redirect } from "next/navigation";
import type { AuctionState } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { DeleteRoomButton } from "./AdminActions";
export const dynamic = "force-dynamic";
export const metadata = { title: "Platform admin" };

const LIVE_STATES: AuctionState[] = ["LIVE", "PLAYER_LIVE", "PAUSED", "SOLD", "UNSOLD", "RTM_OFFER", "RTM_RAISE", "RTM_MATCH"];

function stateClass(state: AuctionState): string {
  if (state === "COMPLETED") return "border-line bg-panel-2 text-muted";
  if (state === "WAITING") return "border-line bg-panel-2 text-ink";
  if (state.startsWith("RTM")) return "border-rtm/50 bg-rtm/15 text-rtm-2";
  if (state === "PAUSED") return "border-gold/50 bg-gold/10 text-gold";
  return "border-live/50 bg-live/15 text-live";
}

function fmtDate(d: Date): string {
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function renderStat(label: string, value: number, accent?: string) {
  return (
    <div key={label} className="card p-4">
      <div className="label">{label}</div>
      <div className={`display text-3xl font-bold ${accent ?? "text-ink"}`}>{value}</div>
    </div>
  );
}

export default async function AdminPage() {
  const s = await getSession();
  if (!s?.user) redirect("/login?next=/admin");
  if (s.user.role !== "ADMIN") redirect("/rooms");

  const [rooms, users, roomsTotal, roomsLive, usersTotal, guests] = await Promise.all([
    prisma.room.findMany({
      orderBy: { lastActiveAt: "desc" }, take: 200,
      select: { id: true, code: true, name: true, state: true, isPublic: true, createdAt: true, lastActiveAt: true, host: { select: { name: true, email: true } }, _count: { select: { members: true, players: true } } },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" }, take: 300,
      select: { id: true, name: true, email: true, role: true, isGuest: true, createdAt: true, _count: { select: { hostedRooms: true, memberships: true } } },
    }),
    prisma.room.count(),
    prisma.room.count({ where: { state: { in: LIVE_STATES } } }),
    prisma.user.count(),
    prisma.user.count({ where: { isGuest: true } }),
  ]);

  const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted whitespace-nowrap";
  const td = "px-3 py-2 align-middle whitespace-nowrap";

  return (
    <div className="stadium min-h-screen">
      <Nav />
      <main className="page-enter mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display text-3xl font-bold tracking-wide sm:text-4xl">Platform <span className="text-gold">admin</span></h1>
            <p className="mt-1 text-sm text-muted">Every room and user on this instance. Signed in as {s.user.name ?? s.user.email}.</p>
          </div>
          <Link href="/rooms" className="btn-ghost !px-3 !py-1.5 text-sm">My rooms</Link>
        </div>

        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {renderStat("Rooms", roomsTotal)}
          {renderStat("Live now", roomsLive, "text-live")}
          {renderStat("Users", usersTotal, "text-gold")}
          {renderStat("Guests", guests)}
        </section>

        <section className="card sheen mb-8 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="display text-xl font-bold tracking-wide">Rooms</h2>
            <span className="text-xs text-muted">{rooms.length} shown</span>
          </div>
          <div className="scroll-x">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="bg-panel-2/60">
                <tr>
                  <th className={th}>Code</th><th className={th}>Name</th><th className={th}>State</th><th className={th}>Visibility</th><th className={th}>Host</th>
                  <th className={`${th} text-right`}>Members</th><th className={`${th} text-right`}>Players</th><th className={th}>Last active</th><th className={th}>Created</th><th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 && <tr><td colSpan={10} className="px-3 py-8 text-center text-muted">No rooms yet.</td></tr>}
                {rooms.map((r) => (
                  <tr key={r.id} className="border-t border-line/60 hover:bg-panel-2/40">
                    <td className={td}><Link href={`/r/${r.code}`} className="font-mono font-bold tracking-widest text-gold hover:underline">{r.code}</Link></td>
                    <td className={`${td} max-w-[14rem] truncate`} title={r.name}>{r.name}</td>
                    <td className={td}><span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stateClass(r.state)}`}>{LIVE_STATES.includes(r.state) && <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-live" />}{r.state.replace("_", " ")}</span></td>
                    <td className={`${td} text-xs`}>{r.isPublic ? <span className="text-ink">Public</span> : <span className="text-muted">Private</span>}</td>
                    <td className={td}><div className="max-w-[12rem] truncate">{r.host.name}</div><div className="max-w-[12rem] truncate text-[11px] text-muted">{r.host.email}</div></td>
                    <td className={`${td} text-right tabular-nums`}>{r._count.members}</td>
                    <td className={`${td} text-right tabular-nums`}>{r._count.players}</td>
                    <td className={`${td} text-xs text-muted`}>{fmtDate(r.lastActiveAt)}</td>
                    <td className={`${td} text-xs text-muted`}>{fmtDate(r.createdAt)}</td>
                    <td className={`${td} text-right`}><DeleteRoomButton code={r.code} name={r.name} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="display text-xl font-bold tracking-wide">Users</h2>
            <span className="text-xs text-muted">{users.length} shown</span>
          </div>
          <div className="scroll-x">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="bg-panel-2/60">
                <tr>
                  <th className={th}>Name</th><th className={th}>Email</th><th className={th}>Role</th><th className={th}>Guest</th>
                  <th className={`${th} text-right`}>Hosted</th><th className={`${th} text-right`}>Memberships</th><th className={th}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">No users yet.</td></tr>}
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-line/60 hover:bg-panel-2/40">
                    <td className={`${td} max-w-[12rem] truncate font-medium`} title={u.name}>{u.name}</td>
                    <td className={`${td} max-w-[16rem] truncate text-muted`} title={u.email}>{u.email}</td>
                    <td className={td}><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${u.role === "ADMIN" ? "border-gold/50 bg-gold/10 text-gold" : "border-line bg-panel-2 text-muted"}`}>{u.role}</span></td>
                    <td className={`${td} text-xs`}>{u.isGuest ? <span className="text-muted">Guest</span> : <span className="text-ink">—</span>}</td>
                    <td className={`${td} text-right tabular-nums`}>{u._count.hostedRooms}</td>
                    <td className={`${td} text-right tabular-nums`}>{u._count.memberships}</td>
                    <td className={`${td} text-xs text-muted`}>{fmtDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
