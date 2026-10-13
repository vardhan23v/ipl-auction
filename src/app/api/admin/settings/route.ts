import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, parse, handle, json, audit } from "@/lib/api";
import { getSettings, emitSnapshot } from "@/server/auction-engine";
export const dynamic = "force-dynamic";

const schema = z.object({
  auctionName: z.string().min(2).max(80).optional(),
  auctionDate: z.string().nullable().optional(),
  startingPurse: z.coerce.number().int().min(100).optional(),
  maxSquadSize: z.coerce.number().int().min(1).max(30).optional(),
  minSquadSize: z.coerce.number().int().min(0).max(30).optional(),
  maxOverseas: z.coerce.number().int().min(0).max(30).optional(),
  bidIncrement: z.coerce.number().int().min(0).optional(),
  timerSeconds: z.coerce.number().int().min(5).max(120).optional(),
  rtmTimerSeconds: z.coerce.number().int().min(5).max(180).optional(),
  autoTimer: z.boolean().optional(),
  autoSell: z.boolean().optional(),
  rtmEnabled: z.boolean().optional(),
  defaultRtmCards: z.coerce.number().int().min(0).max(10).optional(),
  spectatorAccess: z.boolean().optional(),
  unsoldReentry: z.boolean().optional(),
});

export async function GET() { const g = await guard("ADMIN"); if ("error" in g) return g.error; return json(await getSettings()); }
export async function PATCH(req: Request) {
  const g = await guard("ADMIN"); if ("error" in g) return g.error;
  try {
    const data = await parse(req, schema);
    const auction = await prisma.auction.findUnique({ where: { id: 1 } });
    const started = auction && auction.state !== "WAITING";
    if (data.startingPurse !== undefined) {
      if (started) return json({ error: "Starting purse can only change before the auction starts" }, 409);
      await prisma.team.updateMany({ data: { startingPurse: data.startingPurse, purse: data.startingPurse } });
    }
    if (data.defaultRtmCards !== undefined && !started) await prisma.team.updateMany({ data: { rtmTotal: data.defaultRtmCards } });
    const s = await prisma.auctionSettings.update({ where: { id: 1 }, data: { ...data, auctionDate: data.auctionDate ? new Date(data.auctionDate) : data.auctionDate === null ? null : undefined } });
    await audit(g.session.user.id, "SETTINGS_UPDATE", "AuctionSettings", "1", data);
    await emitSnapshot("state:sync");
    return json(s);
  } catch (e) { return handle(e); }
}
