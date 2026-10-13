"use client";
import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { roleHome } from "@/lib/auth-client";
export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) { setErr("Invalid email or password"); setBusy(false); return; }
    const s = await getSession(); r.push(s?.user ? roleHome(s.user.role) : "/live");
  }
  return (
    <main className="stadium relative flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card relative w-full max-w-sm p-7">
        <Link href="/" className="display text-sm tracking-widest text-gold">← IPL Auction</Link>
        <h1 className="display mt-3 text-4xl">Franchise Login</h1>
        <p className="mb-5 text-sm text-muted">Owners, auctioneer and admin sign in here.</p>
        <label className="label">Email</label><input className="input mb-3" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <label className="label">Password</label><input className="input mb-4" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {err && <div className="mb-3 rounded-lg bg-live/15 px-3 py-2 text-sm text-live">{err}</div>}
        <button className="btn-gold w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <div className="mt-4 text-center text-xs text-muted">Just watching? <Link href="/live" className="text-gold">Go to the live auction</Link></div>
      </form>
    </main>
  );
}
