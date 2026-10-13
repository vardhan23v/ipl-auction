import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { decode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import * as engine from "./auction-engine";
import type { SocketEvent } from "@/types/auction";

interface AuthedSocket extends Socket { data: { userId?: string; role?: string; teamId?: string | null } }

// token bucket: N bids / 2s per user
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

export function attachSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, { path: "/socket.io", cors: { origin: (process.env.CORS_ORIGIN ?? process.env.NEXTAUTH_URL ?? "*").split(",").map((o) => o.trim()), credentials: true } });
  engine.setEmitter((event: SocketEvent, payload: unknown) => io.emit(event, payload));

  io.use(async (socket: AuthedSocket, next) => {
    try {
      const raw = socket.handshake.headers.cookie;
      const fromAuth = (socket.handshake.auth as { token?: string } | undefined)?.token;
      const token = fromAuth ?? cookieValue(raw, "__Secure-next-auth.session-token") ?? cookieValue(raw, "next-auth.session-token");
      if (token && process.env.NEXTAUTH_SECRET) {
        const decoded = await decode({ token: fromAuth ? token : decodeURIComponent(token), secret: process.env.NEXTAUTH_SECRET });
        if (decoded?.uid) { socket.data.userId = decoded.uid as string; socket.data.role = decoded.role as string; socket.data.teamId = (decoded.teamId as string | null) ?? null; }
      }
      next();
    } catch { next(); }
  });

  io.on("connection", async (socket: AuthedSocket) => {
    socket.emit("state:sync", { snapshot: await engine.getSnapshot() });
    io.emit("presence", { clients: io.engine.clientsCount });

    socket.on("state:request", async (cb?: (s: unknown) => void) => { const s = await engine.getSnapshot(); cb?.(s); socket.emit("state:sync", { snapshot: s }); });

    socket.on("bid:place", async (payload: { amount?: number; teamId?: string } | undefined, cb?: (r: unknown) => void) => {
      const reply = (r: { ok: boolean; error?: string; code?: string }) => { cb?.(r); if (!r.ok) socket.emit("bid:rejected", r); };
      const role = socket.data.role ?? "";
      if (!socket.data.userId || !["ADMIN", "AUCTIONEER", "OWNER"].includes(role)) return reply({ ok: false, error: "Sign in as a franchise owner to bid", code: "FORBIDDEN" });
      const teamId = role === "OWNER" ? socket.data.teamId ?? undefined : payload?.teamId;
      if (!teamId) return reply({ ok: false, error: "Pick a franchise to bid for", code: "NO_TEAM" });
      if (!allow(socket.data.userId)) return reply({ ok: false, error: "Too many bids — slow down", code: "RATE_LIMIT" });
      try {
        const bid = await engine.placeBid({ userId: socket.data.userId, teamId, amount: payload?.amount });
        reply({ ok: true });
        io.emit("bid:placed", { bidId: bid.id, teamId: bid.teamId, amount: bid.amount });
      } catch (e) { const err = e as engine.AuctionError; reply({ ok: false, error: err.message, code: err.code ?? "ERROR" }); }
    });

    socket.on("rtm:action", async (payload: { action?: string; amount?: number } | undefined, cb?: (r: unknown) => void) => {
      const reply = (r: { ok: boolean; error?: string; code?: string }) => { cb?.(r); if (!r.ok) socket.emit("bid:rejected", r); };
      if (!socket.data.userId) return reply({ ok: false, error: "Not signed in", code: "FORBIDDEN" });
      if (!payload?.action || !["RTM_USE", "RTM_PASS", "RTM_RAISE", "RTM_KEEP", "RTM_MATCH", "RTM_DECLINE"].includes(payload.action)) return reply({ ok: false, error: "Unknown RTM action", code: "BAD_ACTION" });
      try {
        await engine.rtmAction({ userId: socket.data.userId, action: payload.action as engine.RtmInput["action"], amount: payload.amount });
        reply({ ok: true });
      } catch (e) { const err = e as engine.AuctionError; reply({ ok: false, error: err.message, code: err.code ?? "ERROR" }); }
    });

    socket.on("disconnect", () => io.emit("presence", { clients: io.engine.clientsCount }));
  });

  setInterval(() => io.emit("time", { serverTime: Date.now() }), 5000);
  engine.resumeTimerOnBoot().catch(console.error);
  prisma.$connect().then(() => console.log("[db] connected")).catch((e) => console.error("[db] connection failed", e.message));
  return io;
}
