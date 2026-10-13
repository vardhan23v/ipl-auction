import { loadRoomPage } from "@/lib/room-page";
import { SettingsForm } from "./SettingsForm";
export const dynamic = "force-dynamic";
export default async function Settings({ params }: { params: Promise<{ code: string }> }) {
  const { room } = await loadRoomPage((await params).code, "host");
  const { name, isPublic, startingPurse, maxSquadSize, minSquadSize, maxOverseas, bidIncrement, timerSeconds, rtmTimerSeconds, autoTimer, autoSell, rtmEnabled, defaultRtmCards, unsoldReentry, state } = room;
  return <SettingsForm code={room.code} started={state !== "WAITING"} initial={{ name, isPublic, startingPurse, maxSquadSize, minSquadSize, maxOverseas, bidIncrement, timerSeconds, rtmTimerSeconds, autoTimer, autoSell, rtmEnabled, defaultRtmCards, unsoldReentry }} />;
}
