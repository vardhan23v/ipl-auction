import { prisma } from "./prisma";
import { franchiseStrength } from "./rules";

export async function getTeamsWithSquads(roomId: string) {
  const teams = await prisma.team.findMany({ where: { roomId }, orderBy: { sortOrder: "asc" }, include: { squad: { include: { player: true }, orderBy: { createdAt: "asc" } }, owner: { select: { name: true, image: true } } } });
  const strength = Object.fromEntries(teams.map((t) => [t.id, franchiseStrength(t.squad.map((s) => s.player.rating))]));
  return { teams, strength };
}

export async function getStats(roomId: string) {
  const [players, sold, unsold, bids, teams, maxBid, agg, mostExpensive, activeTeam, rtmSales] = await Promise.all([
    prisma.player.count({ where: { roomId } }),
    prisma.player.count({ where: { roomId, status: "SOLD" } }),
    prisma.player.count({ where: { roomId, status: "UNSOLD" } }),
    prisma.bid.count({ where: { roomId } }),
    prisma.team.findMany({ where: { roomId }, orderBy: { spent: "desc" } }),
    prisma.bid.aggregate({ where: { roomId }, _max: { amount: true } }),
    prisma.player.aggregate({ _min: { soldPrice: true }, _avg: { soldPrice: true }, _sum: { soldPrice: true }, where: { roomId, status: "SOLD" } }),
    prisma.player.findFirst({ where: { roomId, status: "SOLD" }, orderBy: { soldPrice: "desc" }, include: { soldTo: true } }),
    prisma.bid.groupBy({ by: ["teamId"], where: { roomId }, _count: { _all: true }, orderBy: { _count: { teamId: "desc" } }, take: 1 }),
    prisma.squadPlayer.count({ where: { roomId, viaRtm: true } }),
  ]);
  const mostActive = activeTeam[0] ? teams.find((t) => t.id === activeTeam[0].teamId) : null;
  return {
    totalPlayers: players, sold, unsold, totalBids: bids, teams, rtmSales,
    totalSpent: agg._sum.soldPrice ?? 0, avgPrice: Math.round(agg._avg.soldPrice ?? 0),
    highestBid: Math.max(maxBid._max.amount ?? 0, mostExpensive?.soldPrice ?? 0), lowestBid: agg._min.soldPrice ?? 0,
    topSpender: teams[0] ?? null, mostExpensive, mostActive: mostActive ? { ...mostActive, bids: activeTeam[0]._count._all } : null,
  };
}
