import { prisma } from "@/lib/prisma";
import { TeamEditor } from "./TeamEditor";
export const dynamic = "force-dynamic";
export default async function Teams() {
  const teams = await prisma.team.findMany({ orderBy: { sortOrder: "asc" }, include: { owner: { select: { email: true } }, _count: { select: { formerPlayers: true } } } });
  return (<div><h1 className="display text-4xl">Franchises</h1><p className="mt-1 text-sm text-muted">Edit names, colours, logos, owner logins and the number of RTM cards per franchise.</p><div className="mt-4 grid gap-3 lg:grid-cols-2">{teams.map((t) => <TeamEditor key={t.id} team={{ ...t, ownerLogin: t.owner?.email ?? null, formerCount: t._count.formerPlayers }} />)}</div></div>);
}
