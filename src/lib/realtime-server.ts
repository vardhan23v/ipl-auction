import type { SocketEvent } from "@/types/auction";

/** Supabase Realtime channel name for a room. Clients subscribe with `supabase.channel(roomTopic(code))`. */
export const roomTopic = (code: string) => `room:${code.toUpperCase()}`;

/**
 * Publish broadcast messages to a room's public Realtime channel through Supabase's HTTP broadcast API
 * (no long-lived socket needed, so it works from Vercel functions). Snapshots are public auction state —
 * spectators can watch without signing in — so the channel is public; all writes still go through our API.
 */
export async function publish(code: string, messages: { event: SocketEvent; payload: unknown }[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.warn("[realtime] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping broadcast"); return; }
  const topic = roomTopic(code);
  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ messages: messages.map((m) => ({ topic, event: m.event, payload: m.payload, private: false })) }),
      cache: "no-store",
    });
    if (!res.ok) console.error("[realtime] broadcast failed", res.status, await res.text().catch(() => ""));
  } catch (e) { console.error("[realtime] broadcast error", e); }
}
