import type { Point, Params } from "../types";
import { Recorder } from "../trace";
import { distance, argmin, sum, random } from "../math";
export function pam(p: Point[], o: Params, r: Recorder) {
  const k = Math.min(o.k, p.length),
    ds = p.map((a) => p.map((b) => distance(a, b)));
  const cost = (m: number[]) =>
    sum(p.map((_, i) => Math.min(...m.map((j) => ds[i][j]))));
  const medoids: number[] = [];
  const rng = random(o.seed);
  for (let j = 0; j < k; j++) {
    const candidates = p.map((_, i) => i).filter((i) => !medoids.includes(i));
    const best =
      o.initialization === "random"
        ? candidates[Math.floor(rng() * candidates.length)]
        : candidates.reduce(
            (b, i) => (cost([...medoids, i]) < cost([...medoids, b]) ? i : b),
            candidates[0],
          );
    medoids.push(best);
    r.emit(
      "initialize",
      "PAM BUILD: 전체 거리 비용을 가장 줄이는 실제 데이터를 medoid로 선택합니다.",
      { centers: medoids.map((i) => ({ ...p[i], id: i })), focus: [best] },
    );
  }
  const assign = () => p.map((_, i) => argmin(medoids.map((j) => ds[i][j])));
  let current = cost(medoids);
  r.emit("assign", "가장 가까운 medoid에 할당합니다.", {
    labels: assign(),
    metric: [current],
    metricName: "총 거리 비용",
  });
  for (let it = 0; it < o.iterations; it++) {
    let swap: [number, number] | null = null,
      best = current;
    for (let m = 0; m < k; m++)
      for (let h = 0; h < p.length; h++) {
        if (medoids.includes(h)) continue;
        const candidate = [...medoids];
        candidate[m] = h;
        const c = cost(candidate);
        r.emit(
          "swap",
          `Medoid ${medoids[m] + 1} ↔ 점 ${h + 1}: Δcost ${(c - current).toFixed(5)}`,
          { focus: [medoids[m], h], edges: [{ a: medoids[m], b: h }] },
          { delta: c - current },
          100,
        );
        if (c < best - 1e-10) {
          best = c;
          swap = [m, h];
        }
      }
    if (!swap) break;
    medoids[swap[0]] = swap[1];
    current = best;
    r.emit("move", "가장 유리한 교환을 수행하고 재할당합니다.", {
      centers: medoids.map((i) => ({ ...p[i], id: i })),
      labels: assign(),
      metric: [...r.state.metric, current],
      focus: [],
      edges: [],
    });
  }
  r.emit(
    "finish",
    "모든 단일 medoid 교환에 대해 비용이 더 이상 감소하지 않습니다.",
    { focus: [], edges: [] },
  );
}
