/** Pure color helpers — safe in both server and client. */

type RGB = [number, number, number];

const STOPS: { p: number; c: RGB }[] = [
  { p: 0, c: [239, 68, 68] }, // red-500
  { p: 0.5, c: [245, 158, 11] }, // amber-500
  { p: 1, c: [34, 197, 94] }, // green-500
];

/** Map a 0..10 score to a red→amber→green color. */
export function scoreColor(score: number): string {
  const s = Math.max(0, Math.min(10, score)) / 10;
  let a = STOPS[0];
  let b = STOPS[1];
  if (s >= 0.5) {
    a = STOPS[1];
    b = STOPS[2];
  }
  const t = (s - a.p) / (b.p - a.p);
  const rgb = a.c.map((v, i) => Math.round(v + (b.c[i] - v) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

const PALETTE = [
  "#6366f1",
  "#06b6d4",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
];

/** Stable color for unscored items, keyed off the id. */
export function neutralColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
