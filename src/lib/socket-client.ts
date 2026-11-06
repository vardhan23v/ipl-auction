"use client";
import { io, type Socket } from "socket.io-client";
let socket: Socket | null = null;
async function fetchToken(): Promise<{ token?: string }> {
  try { const j = await fetch("/api/socket/token").then((r) => r.json()); return j.token ? { token: j.token } : {}; } catch { return {}; }
}
/** Same-origin Socket.IO client; the NextAuth session authenticates owners/staff, spectators connect anonymously. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || undefined, { path: "/socket.io", withCredentials: true, transports: ["websocket", "polling"], reconnection: true, reconnectionDelay: 500, autoConnect: false });
    const s = socket;
    fetchToken().then((auth) => { s.auth = auth; s.connect(); });
    s.io.on("reconnect_attempt", () => { fetchToken().then((auth) => { s.auth = auth; }); });
  }
  return socket;
}
/** Re-authenticate the socket after the user's role/franchise changed (e.g. after claiming a team). */
export async function reconnectSocket() {
  const s = getSocket();
  s.auth = await fetchToken();
  s.disconnect(); s.connect();
}
