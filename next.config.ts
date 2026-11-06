import type { NextConfig } from "next";
import { OPTIMIZED_HOSTS } from "./src/lib/images";

const nextConfig: NextConfig = {
  images: {
    // Player headshots and team logos are remote and often 1000px+; let Next resize them to what's on screen.
    remotePatterns: OPTIMIZED_HOSTS.map((hostname) => ({ protocol: "https" as const, hostname })),
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
};
export default nextConfig;
