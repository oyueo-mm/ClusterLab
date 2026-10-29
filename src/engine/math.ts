import type { Point } from "./types";
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const sq = (a: Point, b: Point) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const distance = (a: Point, b: Point) => Math.sqrt(sq(a, b));
export const mean = (p: Point[], ids: number[]) => ({
  x: ids.reduce((s, i) => s + p[i].x, 0) / ids.length,
  y: ids.reduce((s, i) => s + p[i].y, 0) / ids.length,
});
export const argmin = (xs: number[]) =>
  xs.reduce((best, v, i) => (v < xs[best] ? i : best), 0);
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export function silhouette(p: Point[], labels: number[]) {
  const groups = [...new Set(labels.filter((x) => x >= 0))];
  if (groups.length < 2 || groups.length >= p.length) return null;
  const valid = labels.map((l, i) => (l >= 0 ? i : -1)).filter((i) => i >= 0);
  return (
    sum(
      valid.map((i) => {
        const own = valid.filter((j) => j !== i && labels[j] === labels[i]);
        if (!own.length) return 0;
        const a = sum(own.map((j) => distance(p[i], p[j]))) / own.length;
        const b = Math.min(
          ...groups
            .filter((g) => g !== labels[i])
            .map((g) => {
              const ids = valid.filter((j) => labels[j] === g);
              return sum(ids.map((j) => distance(p[i], p[j]))) / ids.length;
            }),
        );
        return (b - a) / Math.max(a, b, 1e-12);
      }),
    ) / valid.length
  );
}
