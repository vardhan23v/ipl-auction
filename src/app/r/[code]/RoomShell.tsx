import { Nav } from "@/components/Nav";
import type { RoomAccess } from "@/types/auction";
export function RoomShell({ room, access, children }: { room: { code: string; name: string }; access: RoomAccess; children: React.ReactNode }) {
  return (<><Nav roomCode={room.code} roomName={room.name} isHost={access.isHost || access.isAdmin} /><div className="page-enter">{children}</div></>);
}
