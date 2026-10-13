"use client";
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (<html lang="en"><body style={{ background: "#07090f", color: "#e8ecf5", fontFamily: "system-ui", display: "grid", placeItems: "center", minHeight: "100vh" }}><div style={{ textAlign: "center" }}><h1>Something went wrong</h1><p style={{ opacity: .7 }}>{error.message}</p><button onClick={reset} style={{ background: "#f5b82e", border: 0, padding: "8px 16px", borderRadius: 8, fontWeight: 600 }}>Reload</button></div></body></html>);
}
