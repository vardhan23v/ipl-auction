import { cache } from "react";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { supabaseServer } from "./supabase/server";
export { roleHome } from "./auth-client";

/**
 * Sign-in is Supabase Auth: Google, anonymous ("Join as guest", name in user_metadata) and email+password for the platform admin.
 * Our `User` table is the app profile, keyed by the Supabase auth user id. Roles inside an auction (host / owner / spectator)
 * are per room; the platform role is only ADMIN or USER and lives in `User.role`.
 */
export type AppSession = { user: { id: string; name: string; email: string | null; image: string | null; role: Role; isGuest: boolean } };

type Claims = { sub: string; email?: string; is_anonymous?: boolean; user_metadata?: Record<string, unknown> };
type Profile = { role: Role; name: string; image: string | null; isGuest: boolean; email: string | null };

/** Short cache so we don't hit Postgres for the profile on every request; role/name changes show within 30 s. */
const G = globalThis as unknown as { __iplProfiles?: Map<string, { p: Profile; at: number }> };
const profiles = (G.__iplProfiles ??= new Map());

function fromClaims(c: Claims) {
  const m = c.user_metadata ?? {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const name = (str(m.name) ?? str(m.full_name) ?? (c.email ? c.email.split("@")[0] : null) ?? "Guest").slice(0, 40);
  return { name, email: c.email ? c.email.toLowerCase() : null, image: str(m.avatar_url) ?? str(m.picture), isGuest: !!c.is_anonymous };
}

/** Load (or create on first sign-in) the app profile for a Supabase user. */
async function ensureProfile(c: Claims): Promise<Profile> {
  const hit = profiles.get(c.sub);
  if (hit && Date.now() - hit.at < 30_000) return hit.p;
  const meta = fromClaims(c);
  const u = await prisma.user.upsert({
    where: { id: c.sub },
    // Keep a name the user already has; refresh avatar/email from the provider; an anonymous user who links Google stops being a guest.
    update: { image: meta.image ?? undefined, email: meta.email ?? undefined, isGuest: meta.isGuest },
    create: { id: c.sub, name: meta.name, email: meta.email, image: meta.image, isGuest: meta.isGuest, role: "USER" },
    select: { role: true, name: true, image: true, isGuest: true, email: true },
  });
  if (profiles.size > 5000) profiles.clear();
  profiles.set(c.sub, { p: u, at: Date.now() });
  return u;
}

/** Server session for the current request (deduplicated per request), or null when signed out. */
export const getSession = cache(async (): Promise<AppSession | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const sb = await supabaseServer();
  // getClaims verifies the JWT (locally when the project uses asymmetric signing keys) — cheaper than getUser().
  const { data, error } = await sb.auth.getClaims();
  const claims = data?.claims as Claims | undefined;
  if (error || !claims?.sub) return null;
  const p = await ensureProfile(claims);
  return { user: { id: claims.sub, name: p.name, email: p.email, image: p.image, role: p.role, isGuest: p.isGuest } };
});

export async function requireRole(...roles: Role[]) {
  const s = await getSession();
  if (!s?.user || !roles.includes(s.user.role)) return null;
  return s;
}
