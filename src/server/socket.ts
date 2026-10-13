import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { decode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { normalizeCode } from "@/lib/room";
import * as engine from "./auction-engine";
import type { SocketEvent } from "@/types/auction";

interface AuthedSocket extends Socket { data: { userId?: string; role?: string; roomId?: string } }

const buckets = new Map<string, { tokens: number; ts: number }>();
function allow(key: string, max = 8, windowMs = 2000) {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: max, ts: now };
  b.tokens = Math.min(max, b.tokens + ((now - b.ts) / windowMs) * max); b.ts = now;
  if (b.tokens < 1) { buckets.set(key, b); return false; }
  b.tokens -= 1; buckets.set(key, b); return true;
}
function cookieValue(header: string | undefined, name: string) {
  return header?.split(";").map((c) => c.trim()).find((c) => c.startsWith(name + "="))?.slice(name.length + 1);
}
const channel = (roomId: string) => `room:${roomId}`;

export function attachSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, { path: "/socket.io", cors: { origin: (process.env.CORS_ORIGIN ?? process.env.NEXTAUTH_URL ?? "*").split(",").map((o) => o.trim()), credentials: true } });
  engine.setEmitter((roomId: string, event: SocketEvent, payload: unknown) => io.to(channel(roomId)).emit(event, payload));

  io.use(async (socket: AuthedSocket, next) => {
    try {
      const raw = socket.handshake.headers.cookie;
      const fromAuth = (socket.handshake.auth as { token?: string } | undefined)?.token;
      const token = fromAuth ?? cookieValue(raw, "__Secure-next-auth.session-token") ?? cookieValue(raw, "next-auth.session-token");
      if (token && process.env.NEXTAUTH_SECRET) {
        const decoded = await decode({ token: fromAuth ? token : decodeURIComponent(token), secret: process.env.NEXTAUTH_SECRET });
        if (decoded?.uid) { socket.data.userId = decoded.uid as string; socket.data.role = decoded.role as string; }
      }
      next();
    } catch { next(); }
  });

  const presence = async (roomId: string) => { const n = (await io.in(channel(roomId)).fetchSockets()).length; io.to(channel(roomId)).emit("presence", { clients: n }); };

  io.on("connection", (socket: AuthedSocket) => {
    /** Join a room's channel by code; sends the current snapshot. */
    socket.on("room:join", async (payload: { code?: string } | undefined, cb?: (r: unknown) => void) => {
      const code = normalizeCode(payload?.code ?? "");
      const room = await prisma.room.findUnique({ where: { code }, select: { id: true } });
      if (!room) return cb?.({ ok: false, error: "Room not found" });
      if (socket.data.roomId && socket.data.roomId !== room.id) { socket.leave(channel(socket.data.roomId)); presence(socket.data.roomId); }
      socket.data.roomId = room.id;
      socket.join(channel(room.id));
      const snapshot = await engine.getSnapshot(room.id);
      socket.emit("state:sync", { snapshot });
      cb?.({ ok: true });
      presence(room.id);
    });

    socket.on("state:request", async (cb?: (s: unknown) => void) => {
      if (!socket.data.roomId) return;
      const s = await engine.getSnapshot(socket.data.roomId); cb?.(s); socket.emit("state:sync", { snapshot: s });
    });

    socket.on("bid:place", async (payload: { amount?: number; teamId?: string } | undefined, cb?: (r: unknown) => void) => {
      const reply = (r: { ok: boolean; error?: string; code?: string }) => { cb?.(r); if (!r.ok) socket.emit("bid:rejected", r); };
      if (!socket.data.userId) return reply({ ok: false, error: "Sign in to bid", code: "FORBIDDEN" });
      if (!socket.data.roomId) return reply({ ok: false, error: "Join a room first", code: "NO_ROOM" });
      // Owners always bid for their own franchise; the host may name any team.
      let teamId = payload?.teamId;
      const own = await prisma.team.findFirst({ where: { roomId: socket.data.roomId, ownerId: socket.data.userId }, select: { id: true } });
      const room = await prisma.room.findUnique({ where: { id: socket.data.roomId }, select: { hostId: true } });
      const isHost = room?.hostId === socket.data.userId || socket.data.role === "ADMIN";
      if (!isHost) teamId = own?.id;
      if (!teamId) return reply({ ok: false, error: "Claim a franchise before bidding", code: "NO_TEAM" });
      if (!allow(socket.data.userId)) return reply({ ok: false, error: "Too many bids — slow down", code: "RATE_LIMIT" });
      try {
        const bid = await engine.placeBid({ roomId: socket.data.roomId, userId: socket.data.userId, teamId, amount: payload?.amount });
        reply({ ok: true });
        io.to(channel(socket.data.roomId)).emit("bid:placed", { bidId: bid.id, teamId: bid.teamId, amount: bid.amount });
      } catch (e) { const err = e as engine.AuctionError; reply({ ok: false, error: err.message, code: err.code ?? "ERROR" }); }
    });

    socket.on("rtm:action", async (payload: { action?: string; amount?: number } | undefined, cb?: (r: unknown) => void) => {
      const reply = (r: { ok: boolean; error?: string; code?: string }) => { cb?.(r); if (!r.ok) socket.emit("bid:rejected", r); };
      if (!socket.data.userId || !socket.data.roomId) return reply({ ok: false, error: "Not signed in", code: "FORBIDDEN" });
      if (!payload?.action || !["RTM_USE", "RTM_PASS", "RTM_RAISE", "RTM_KEEP", "RTM_MATCH", "RTM_DECLINE"].includes(payload.action)) return reply({ ok: false, error: "Unknown RTM action", code: "BAD_ACTION" });
      try {
        await engine.rtmAction({ roomId: socket.data.roomId, userId: socket.data.userId, action: payload.action as engine.RtmInput["action"], amount: payload.amount });
        reply({ ok: true });
      } catch (e) { const err = e as engine.AuctionError; reply({ ok: false, error: err.message, code: err.code ?? "ERROR" }); }
    });

    socket.on("disconnect", () => { if (socket.data.roomId) presence(socket.data.roomId); });
  });

  setInterval(() => io.emit("time", { serverTime: Date.now() }), 5000);
  engine.resumeTimersOnBoot().catch(console.error);
  prisma.$connect().then(() => console.log("[db] connected")).catch((e) => console.error("[db] connection failed", e.message));
  return io;
}
