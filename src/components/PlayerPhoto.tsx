"use client";
import { useState } from "react";
/** Headshot with a graceful fallback (remote IPL images sometimes 404). */
export function PlayerPhoto({ src, name, className = "" }: { src: string | null; name: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <div className={`display flex items-center justify-center bg-gradient-to-br from-panel-2 to-panel text-muted/40 ${className}`}><span className="text-[40%] leading-none">{name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className={className} onError={() => setBroken(true)} loading="lazy" />;
}
