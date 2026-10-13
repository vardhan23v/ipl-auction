import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";
export { roleHome } from "./auth-client";

export const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/**
 * Sign-in like crickauction.in: "Continue with Google" or "Join as guest" (just a name).
 * Everyone starts as a SPECTATOR and claims a franchise in the lobby to become its OWNER.
 * Staff (admin / auctioneer) keep an email + password login.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    ...(googleEnabled ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })] : []),
    CredentialsProvider({
      id: "guest",
      name: "Guest",
      credentials: { name: { label: "Display name", type: "text" } },
      async authorize(creds) {
        const name = creds?.name?.trim().slice(0, 40);
        if (!name || name.length < 2) return null;
        const user = await prisma.user.create({ data: { name, email: `guest_${randomBytes(6).toString("hex")}@guest.ipl.local`, role: "SPECTATOR", isGuest: true, passwordHash: await bcrypt.hash(randomBytes(16).toString("hex"), 4) } });
        await prisma.auditLog.create({ data: { userId: user.id, action: "GUEST_JOIN" } }).catch(() => {});
        return { id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.teamId };
      },
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Staff login",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email.toLowerCase().trim() } });
        if (!user || user.isGuest) return null;
        if (!(await bcrypt.compare(creds.password, user.passwordHash))) return null;
        await prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN" } }).catch(() => {});
        return { id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.teamId };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      const email = (user.email ?? "").toLowerCase();
      if (!email) return false;
      // Upsert the Google account as an app user (keeps role/team if they already exist).
      const existing = await prisma.user.findUnique({ where: { email } });
      const image = (profile as { picture?: string } | undefined)?.picture ?? user.image ?? null;
      const u = existing
        ? await prisma.user.update({ where: { email }, data: { image, name: existing.name || user.name || email } })
        : await prisma.user.create({ data: { name: user.name ?? email.split("@")[0], email, image, role: "SPECTATOR", passwordHash: await bcrypt.hash(randomBytes(16).toString("hex"), 4) } });
      user.id = u.id; (user as { role: Role }).role = u.role; (user as { teamId: string | null }).teamId = u.teamId;
      await prisma.auditLog.create({ data: { userId: u.id, action: existing ? "LOGIN_GOOGLE" : "SIGNUP_GOOGLE" } }).catch(() => {});
      return true;
    },
    async jwt({ token, user }) {
      if (user) { token.uid = user.id; token.role = (user as { role: Role }).role; token.teamId = (user as { teamId: string | null }).teamId; }
      // Role/franchise can change after sign-in (claiming a team, admin edits) — re-read on every session check.
      if (token.uid) {
        const u = await prisma.user.findUnique({ where: { id: token.uid as string }, select: { role: true, teamId: true, name: true, image: true } });
        if (u) { token.role = u.role; token.teamId = u.teamId; token.name = u.name; token.picture = u.image ?? token.picture; } else { delete token.uid; }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid as string; session.user.role = (token.role as Role) ?? "SPECTATOR"; session.user.teamId = (token.teamId as string | null) ?? null;
      if (token.name) session.user.name = token.name as string;
      return session;
    },
  },
};
/** Server session; a stale cookie for a deleted user (e.g. an expired guest) counts as signed out. */
export const getSession = async () => { const s = await getServerSession(authOptions); return s?.user?.id ? s : null; };
export async function requireRole(...roles: Role[]) {
  const s = await getSession();
  if (!s?.user || !roles.includes(s.user.role)) return null;
  return s;
}
