import type { Point, Params } from "../types";
import { Recorder } from "../trace";
import { distance } from "../math";
import { extractXi } from "./xi";
export function optics(p: Point[], o: Params, r: Recorder) {
  const n = p.length,
    done = new Set<number>(),
    reach = Array(n).fill(Infinity),
    predecessor = Array(n).fill(-1),
    core = p.map((v) => {
      const ds = p
        .map((w) => distance(v, w))
        .filter((d) => d <= o.epsilon)
        .sort((a, b) => a - b);
      return ds.length >= o.minPts ? ds[o.minPts - 1] : Infinity;
    });
  const order: number[] = [];
  r.emit(
    "core",
    "max_eps 내부 이웃의 min_samples번째 거리로 core distance를 계산합니다.",
    { core },
  );
  for (let start = 0; start < n; start++) {
    if (done.has(start)) continue;
    const seeds = new Set<number>([start]);
    while (seeds.size) {
      const i = [...seeds].sort((a, b) => reach[a] - reach[b] || a - b)[0];
      seeds.delete(i);
      if (done.has(i)) continue;
      done.add(i);
      order.push(i);
      r.emit(
        "visit",
        `우선순위 최소 reachability 점 ${i + 1} 방문 (${order.length}/${n})`,
        {
          order: [...order],
          focus: [i],
          reach: [...reach],
          radius: Number.isFinite(core[i]) ? core[i] : o.epsilon,
        },
      );
      if (Number.isFinite(core[i]))
        for (let j = 0; j < n; j++) {
          const d = distance(p[i], p[j]);
          if (!done.has(j) && d <= o.epsilon) {
            const value = Math.max(core[i], d);
            if (value < reach[j]) {
              reach[j] = value;
              predecessor[j] = i;
              seeds.add(j);
              r.emit(
                "distance",
                `점 ${j + 1}의 도달 거리 ← max(core, 거리) = ${value.toFixed(4)}`,
                { reach: [...reach], focus: [i, j] },
                undefined,
                140,
              );
            }
          }
        }
    }
  }
  if (o.extraction === "xi") {
    const result = extractXi(
      order,
      reach,
      predecessor,
      o.xi,
      o.minPts,
      o.minSize,
    );
    const labels = Array(n).fill(-1);
    for (const i of order) {
      labels[i] = result.labels[i];
      r.emit(
        "extract",
        `Xi=${o.xi}: steep 영역 및 predecessor 보정으로 점 ${i + 1}의 군집을 선택합니다.`,
        { labels: [...labels], focus: [i], radius: 0 },
        undefined,
        200,
      );
    }
    r.emit(
      "finish",
      `OPTICS Xi 추출 완료: 계층 구간 ${result.intervals.length}개`,
      { focus: [] },
    );
    return;
  }
  // Standard epsilon extraction from OPTICS ordering (explicitly exposed as such).
  const labels = Array(n).fill(-1);
  let c = -1;
  for (const i of order) {
    if (reach[i] > o.threshold) {
      if (core[i] <= o.threshold) {
        c++;
        labels[i] = c;
      }
    } else if (c >= 0) labels[i] = c;
    r.emit(
      "extract",
      `OPTICS ε-cut=${o.threshold}: 순서 ${i + 1}의 군집을 추출합니다.`,
      { labels: [...labels], focus: [i], radius: 0 },
      undefined,
      180,
    );
  }
  r.emit("finish", "OPTICS ordering 및 ε-cut 추출 완료.", { focus: [] });
}
