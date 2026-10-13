import { prisma } from "./prisma";
import { getSettings } from "@/server/auction-engine";
import { franchiseStrength } from "./rules";

export async function getTeamsWithSquads() {
  const [teams, settings] = await Promise.all([
    prisma.team.findMany({ orderBy: { sortOrder: "asc" }, include: { squad: { include: { player: true }, orderBy: { createdAt: "asc" } }, owner: { select: { name: true } } } }),
    getSettings(),
  ]);
  const strength = Object.fromEntries(teams.map((t) => [t.id, franchiseStrength(t.squad.map((s) => s.player.rating))]));
  return { teams, settings, strength };
}

export async function getStats() {
  const [players, sold, unsold, bids, settings, teams, maxBid, agg, mostExpensive, activeTeam, rtmSales] = await Promise.all([
    prisma.player.count(),
    prisma.player.count({ where: { status: "SOLD" } }),
    prisma.player.count({ where: { status: "UNSOLD" } }),
    prisma.bid.count(),
    getSettings(),
    prisma.team.findMany({ orderBy: { spent: "desc" } }),
    prisma.bid.aggregate({ _max: { amount: true } }),
    prisma.player.aggregate({ _min: { soldPrice: true }, _avg: { soldPrice: true }, _sum: { soldPrice: true }, where: { status: "SOLD" } }),
    prisma.player.findFirst({ where: { status: "SOLD" }, orderBy: { soldPrice: "desc" }, include: { soldTo: true } }),
    prisma.bid.groupBy({ by: ["teamId"], _count: { _all: true }, orderBy: { _count: { teamId: "desc" } }, take: 1 }),
    prisma.squadPlayer.count({ where: { viaRtm: true } }),
  ]);
  const mostActive = activeTeam[0] ? teams.find((t) => t.id === activeTeam[0].teamId) : null;
  return {
    totalPlayers: players, sold, unsold, totalBids: bids, settings, teams, rtmSales,
    totalSpent: agg._sum.soldPrice ?? 0, avgPrice: Math.round(agg._avg.soldPrice ?? 0),
    highestBid: Math.max(maxBid._max.amount ?? 0, mostExpensive?.soldPrice ?? 0), lowestBid: agg._min.soldPrice ?? 0,
    topSpender: teams[0] ?? null, mostExpensive, mostActive: mostActive ? { ...mostActive, bids: activeTeam[0]._count._all } : null,
  };
}
