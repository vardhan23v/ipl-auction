import { getSettings } from "@/server/auction-engine";
import { SettingsForm } from "./SettingsForm";
export const dynamic = "force-dynamic";
export default async function Settings() { const s = await getSettings(); return <SettingsForm initial={JSON.parse(JSON.stringify(s))} />; }
