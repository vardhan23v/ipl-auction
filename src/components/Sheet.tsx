"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";

/** Bottom sheet for phones (centered dialog from md up). Closes on backdrop tap or Escape. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: React.ReactNode; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center md:items-center" role="dialog" aria-modal="true">
      <button aria-label="Close" className="fade-in absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="sheet-up safe-b relative max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-panel px-4 pt-2 md:max-w-lg md:rounded-2xl md:pb-4">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line md:hidden" />
        {title && <div className="mb-3 flex items-center justify-between"><div className="display text-xl">{title}</div><button className="btn-ghost tap !px-3" onClick={onClose} aria-label="Close">✕</button></div>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
