import { Nav } from "@/components/Nav";
import { RoomTabBar } from "@/components/RoomTabBar";
import type { RoomAccess } from "@/types/auction";
export function RoomShell({ room, access, children }: { room: { code: string; name: string }; access: RoomAccess; children: React.ReactNode }) {
  const isHost = access.isHost || access.isAdmin;
  return (<>
    <Nav roomCode={room.code} roomName={room.name} isHost={isHost} />
    <div className="page-enter pb-tabbar">{children}</div>
    <RoomTabBar code={room.code} isHost={isHost} hasTeam={!!access.teamId} />
  </>);
}
