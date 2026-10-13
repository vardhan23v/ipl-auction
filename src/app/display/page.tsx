import { getSnapshot, getSettings } from "@/server/auction-engine";
import { DisplayScreen } from "./DisplayScreen";
export const dynamic = "force-dynamic";
export const metadata = { title: "Big Screen" };
export default async function DisplayPage() {
  const s = await getSettings();
  if (!s.spectatorAccess) return <div className="flex min-h-screen items-center justify-center text-muted">Spectator access is disabled.</div>;
  return <DisplayScreen initial={await getSnapshot()} />;
}
