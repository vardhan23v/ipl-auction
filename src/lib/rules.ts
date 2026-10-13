/** Official IPL bid-increment ladder (in lakhs). Below ₹1 Cr: 5 L · ₹1–2 Cr: 10 L · ₹2–5 Cr: 20 L · above: 25 L */
export function ladderIncrement(currentBid: number): number {
  if (currentBid < 100) return 5;
  if (currentBid < 200) return 10;
  if (currentBid < 500) return 20;
  return 25;
}
/** The increment to apply on top of `currentBid` given the configured setting (0 = ladder). */
export function incrementFor(currentBid: number, setting: number): number {
  return setting > 0 ? setting : ladderIncrement(currentBid);
}
/** Minimum next valid bid. */
export function minNextBid(currentBid: number, basePrice: number, setting: number): number {
  return currentBid === 0 ? basePrice : currentBid + incrementFor(currentBid, setting);
}
/** Quick-bid options shown to owners/auctioneer. */
export function quickBids(currentBid: number, basePrice: number, setting: number): number[] {
  const first = minNextBid(currentBid, basePrice, setting);
  const inc = incrementFor(Math.max(currentBid, first), setting);
  return [first, first + inc, first + inc * 2, first + inc * 4].filter((v, i, a) => a.indexOf(v) === i);
}
/** Franchise Strength: average career-impact rating of the bought squad. */
export function franchiseStrength(ratings: (number | null | undefined)[]) {
  const r = ratings.filter((x): x is number => typeof x === "number");
  const total = r.reduce((a, b) => a + b, 0);
  return { total, avg: r.length ? Math.round((total / r.length) * 10) / 10 : 0, rated: r.length };
}
