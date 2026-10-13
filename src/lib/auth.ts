import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";
export { roleHome } from "./auth-client";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email.toLowerCase().trim() } });
        if (!user) return null;
        if (!(await bcrypt.compare(creds.password, user.passwordHash))) return null;
        await prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN" } }).catch(() => {});
        return { id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.teamId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.role = (user as { role: Role }).role; token.teamId = (user as { teamId: string | null }).teamId; token.uid = user.id; }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid as string; session.user.role = token.role as Role; session.user.teamId = (token.teamId as string | null) ?? null;
      return session;
    },
  },
};
export const getSession = () => getServerSession(authOptions);
export async function requireRole(...roles: Role[]) {
  const s = await getSession();
  if (!s?.user || !roles.includes(s.user.role)) return null;
  return s;
}
