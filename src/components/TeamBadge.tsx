"use client";
import { memo, useState } from "react";
import Image from "next/image";
import { canOptimize } from "@/lib/images";

export const TeamBadge = memo(function TeamBadge({ name, abbreviation, color, logoUrl, size = 40 }: { name: string; abbreviation: string; color: string; logoUrl?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (logoUrl && !broken) {
    const px = Math.round(size * 0.82);
    return (
      <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95" style={{ width: size, height: size, boxShadow: `0 0 0 2px ${color}` }}>
        {canOptimize(logoUrl)
          ? <Image src={logoUrl} alt={name} width={px} height={px} sizes={`${px}px`} className="h-[82%] w-[82%] object-contain" onError={() => setBroken(true)} />
          // eslint-disable-next-line @next/next/no-img-element
          : <img src={logoUrl} alt={name} width={px} height={px} className="h-[82%] w-[82%] object-contain" loading="lazy" decoding="async" onError={() => setBroken(true)} />}
      </div>
    );
  }
  return <div className="display flex shrink-0 items-center justify-center rounded-full font-bold text-black" style={{ width: size, height: size, background: color, fontSize: size * 0.32 }}>{abbreviation}</div>;
});
