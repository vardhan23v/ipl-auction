import { prisma } from "@/lib/prisma";
import { PlayersTable } from "./PlayersTable";
export const dynamic = "force-dynamic";
export default async function Players() {
  const teams = await prisma.team.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, abbreviation: true, color: true } });
  return <PlayersTable title="Players & RTM lists" teams={teams} />;
}
