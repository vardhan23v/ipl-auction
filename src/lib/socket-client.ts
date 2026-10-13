"use client";
import { io, type Socket } from "socket.io-client";
let socket: Socket | null = null;
/** Same-origin Socket.IO client; the NextAuth cookie authenticates owners/auctioneers, spectators connect anonymously. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || undefined, { path: "/socket.io", withCredentials: true, transports: ["websocket", "polling"], reconnection: true, reconnectionDelay: 500, autoConnect: false });
    const s = socket;
    fetch("/api/socket/token").then((r) => r.json()).then((j: { token: string | null }) => { s.auth = j.token ? { token: j.token } : {}; s.connect(); }).catch(() => s.connect());
    s.io.on("reconnect_attempt", () => { fetch("/api/socket/token").then((r) => r.json()).then((j: { token: string | null }) => { s.auth = j.token ? { token: j.token } : {}; }).catch(() => {}); });
  }
  return socket;
}
