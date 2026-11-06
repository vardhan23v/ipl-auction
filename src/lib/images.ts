/** Remote image hosts the Next.js optimizer may resize (keep in sync with `images.remotePatterns` in next.config.ts). */
export const OPTIMIZED_HOSTS = ["documents.iplt20.com", "img1.hscicdn.com", "upload.wikimedia.org", "static.vecteezy.com", "www.lucknowsupergiants.in", "lucknowsupergiants.in", "static.iplt20.com", "scores.iplt20.com"];

/** True when `src` can go through next/image; anything else (host-edited URLs, SVG avatars) falls back to a plain <img>. */
export function canOptimize(src: string) {
  try { const u = new URL(src); return u.protocol === "https:" && OPTIMIZED_HOSTS.includes(u.hostname) && !u.pathname.endsWith(".svg"); } catch { return false; }
}
