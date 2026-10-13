import { getSnapshot } from "@/server/auction-engine";
import { json } from "@/lib/api";
export const dynamic = "force-dynamic";
export async function GET() { return json(await getSnapshot()); }
