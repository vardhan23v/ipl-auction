"use client";
import { Suspense, useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { roleHome } from "@/lib/auth-client";

type Mode = "menu" | "guest" | "staff";

/** Accept `next` / `callbackUrl` only when they point at this site: a path, or an absolute URL on the current origin (stripped to its path). */
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  if (typeof window === "undefined") return null;
  try {
    const u = new URL(raw);
    if (u.origin === window.location.origin) return `${u.pathname}${u.search}${u.hash}` || "/";
  } catch { /* not an absolute URL */ }
  return null;
}

export default function Page() {
  return <Suspense fallback={null}><Login /></Suspense>;
}

function Login() {
  const r = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next")) ?? safeNext(sp.get("callbackUrl"));
  const [mode, setMode] = useState<Mode>("menu");
  const [google, setGoogle] = useState<boolean | null>(null);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/auth/providers").then((r) => r.json()).then((p) => setGoogle(!!p?.google)).catch(() => setGoogle(false)); }, []);

  async function finish(res: { error?: string | null } | undefined, failMsg: string) {
    if (res?.error) { setErr(failMsg); setBusy(false); return; }
    const s = await getSession();
    r.push(next ?? (s?.user ? roleHome(s.user.role) : "/rooms"));
  }
  async function guest(e: React.FormEvent) { e.preventDefault(); setBusy(true); setErr(null); await finish(await signIn("guest", { name, redirect: false }), "Please enter a name (2+ characters)"); }
  async function staff(e: React.FormEvent) { e.preventDefault(); setBusy(true); setErr(null); await finish(await signIn("credentials", { email, password, redirect: false }), "Invalid email or password"); }

  return (
    <main className="stadium relative flex min-h-screen items-center justify-center p-4">
      <div className="card relative w-full max-w-md overflow-hidden p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold via-live to-rtm" />
        <Link href="/" className="display text-sm tracking-widest text-gold">← IPL Auction</Link>
        <h1 className="display mt-3 text-4xl">{mode === "guest" ? "Guest access" : mode === "staff" ? "Staff sign-in" : "Welcome, Manager"}</h1>
        <p className="mb-5 text-sm text-muted">{mode === "guest" ? "Enter a name to join — no account needed." : mode === "staff" ? "Platform admin accounts." : "Sign in to enter the auction hub, then claim your franchise."}</p>

        {mode === "menu" && (
          <div className="flex flex-col gap-3">
            <button className="btn-ghost w-full !py-3 text-base" disabled={google === false || busy} onClick={() => { setBusy(true); signIn("google", { callbackUrl: next ?? "/rooms" }); }} title={google === false ? "Google sign-in is not configured on this server yet" : ""}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>
              Continue with Google{google === false && <span className="text-xs text-muted">(not configured)</span>}
            </button>
            <div className="relative my-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted"><span className="relative z-10 bg-panel px-3">Wait, I&rsquo;m a guest</span><div className="absolute inset-x-0 top-1/2 border-t border-line" /></div>
            <button className="btn-gold w-full !py-3 text-base" onClick={() => setMode("guest")}>👥 Join as Guest</button>
            <div className="mt-2 flex items-center justify-between text-xs text-muted"><button className="hover:text-ink" onClick={() => setMode("staff")}>Admin sign-in</button><Link href="/" className="text-gold">Browse public rooms →</Link></div>
          </div>
        )}

        {mode === "guest" && (
          <form onSubmit={guest} className="flex flex-col gap-3">
            <div><label className="label">Your name</label><input className="input !py-3" autoFocus required minLength={2} maxLength={40} placeholder="e.g. Rohit from Block B" value={name} onChange={(e) => setName(e.target.value)} /></div>
            {err && <div className="rounded-lg bg-live/15 px-3 py-2 text-sm text-live">{err}</div>}
            <button className="btn-gold w-full !py-3 text-base" disabled={busy || name.trim().length < 2}>{busy ? "Entering…" : "Enter the auction hub"}</button>
            <div className="text-[11px] text-muted">Guest sessions last a week on this device. Use Google if you want to come back from another device.</div>
            <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => { setMode("menu"); setErr(null); }}>← Back</button>
          </form>
        )}

        {mode === "staff" && (
          <form onSubmit={staff} className="flex flex-col gap-3">
            <div><label className="label">Email</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
            <div><label className="label">Password</label><input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>
            {err && <div className="rounded-lg bg-live/15 px-3 py-2 text-sm text-live">{err}</div>}
            <button className="btn-gold w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
            <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => { setMode("menu"); setErr(null); }}>← Back</button>
          </form>
        )}
      </div>
    </main>
  );
}
