"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CODE_LEN = 6;
const clean = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LEN);

/** "Join a room by code" — six characters, uppercase, then `/r/CODE`. The room page handles sign-in if needed. */
export function JoinByCode({ compact = false }: { compact?: boolean }) {
  const r = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = code.length === CODE_LEN;
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    r.push(`/r/${code}`);
  }
  return (
    <form onSubmit={submit} className={`flex w-full flex-col gap-2 sm:flex-row ${compact ? "" : "mx-auto max-w-md"}`} aria-label="Join a room by code">
      <input
        value={code}
        onChange={(e) => setCode(clean(e.target.value))}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={CODE_LEN}
        placeholder="ROOM CODE"
        aria-label="Room code"
        className="input !py-3 text-center font-mono text-xl font-bold tracking-[.35em] uppercase placeholder:tracking-widest placeholder:text-base placeholder:font-sans"
      />
      <button type="submit" disabled={!ready || busy} className="btn-gold !px-6 !py-3 text-base sm:shrink-0">{busy ? "Opening…" : "Join room"}</button>
    </form>
  );
}
