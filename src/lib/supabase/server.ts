import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/** Cookie-based Supabase client for server components, route handlers and server actions. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      // Server components can't set cookies; the proxy (src/proxy.ts) refreshes the session instead.
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* read-only context */ } },
    },
  });
}
