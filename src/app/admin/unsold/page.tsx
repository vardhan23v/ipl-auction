import { prisma } from "@/lib/prisma";
import { PlayersTable } from "../players/PlayersTable";
export const dynamic = "force-dynamic";
export default async function Unsold() { const teams = await prisma.team.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, abbreviation: true, color: true } }); return <PlayersTable title="Unsold & skipped players" fixedStatus="UNSOLD" teams={teams} />; }
