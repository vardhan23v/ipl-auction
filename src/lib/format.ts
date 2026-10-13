/** Money is stored in lakhs. 12000 → ₹120 Cr · 1125 → ₹11.25 Cr · 75 → ₹75 L */
export function money(l: number | null | undefined): string {
  if (l == null) return "—";
  const neg = l < 0; const v = Math.abs(Math.round(l));
  let s: string;
  if (v >= 100) { const cr = v / 100; s = `₹${Number.isInteger(cr) ? cr : cr.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")} Cr`; }
  else s = `₹${v} L`;
  return neg ? "-" + s : s;
}
/** Short form for tight spaces: 1125 → 11.25Cr, 75 → 75L */
export function moneyShort(l: number | null | undefined): string {
  if (l == null) return "—";
  const v = Math.round(l);
  if (Math.abs(v) >= 100) { const cr = v / 100; return `${Number.isInteger(cr) ? cr : cr.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}Cr`; }
  return `${v}L`;
}
/** Spoken form: 225 → "2 crore 25 lakh" */
export function moneySpoken(l: number): string {
  const cr = Math.floor(l / 100), lk = l % 100;
  if (cr === 0) return `${lk} lakh`;
  return lk ? `${cr} crore ${lk} lakh` : `${cr} crore`;
}

export const ROLE_LABEL: Record<string, string> = { BATSMAN: "Batter", BOWLER: "Bowler", ALL_ROUNDER: "All-Rounder", WICKETKEEPER: "Wicket-Keeper" };
export const ROLE_SHORT: Record<string, string> = { BATSMAN: "BAT", BOWLER: "BOWL", ALL_ROUNDER: "AR", WICKETKEEPER: "WK" };
export const STATE_LABEL: Record<string, string> = { WAITING: "Not started", LIVE: "Live", PAUSED: "Paused", PLAYER_LIVE: "Bidding", RTM_OFFER: "RTM · Decision", RTM_RAISE: "RTM · Final raise", RTM_MATCH: "RTM · Match?", SOLD: "Sold", UNSOLD: "Unsold", COMPLETED: "Completed" };

export function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
