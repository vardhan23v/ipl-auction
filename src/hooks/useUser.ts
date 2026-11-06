"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export type ClientUser = { id: string; name: string; image: string | null; isGuest: boolean };

function toUser(u: { id: string; is_anonymous?: boolean; email?: string; user_metadata?: Record<string, unknown> } | null | undefined): ClientUser | null {
  if (!u) return null;
  const m = u.user_metadata ?? {};
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  return { id: u.id, name: s(m.name) ?? s(m.full_name) ?? (u.email ? u.email.split("@")[0] : "Guest"), image: s(m.avatar_url) ?? s(m.picture), isGuest: !!u.is_anonymous };
}

/** The signed-in Supabase user in the browser (null when signed out, undefined while loading). */
export function useUser() {
  const [user, setUser] = useState<ClientUser | null | undefined>(undefined);
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession().then(({ data }) => setUser(toUser(data.session?.user)));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setUser(toUser(session?.user)));
    return () => sub.subscription.unsubscribe();
  }, []);
  return user;
}

/** Sign out everywhere in this browser and go home. */
export async function signOut() {
  await supabaseBrowser().auth.signOut();
  // Full reload so every client cache (realtime channels, router cache) starts clean.
  window.location.assign("/"); // eslint-disable-line @next/next/no-location-assign-relative-destination
}
