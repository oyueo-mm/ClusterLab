import type { Point, Params } from "../types";
import { Recorder } from "../trace";
export function jaccard(a: string[], b: string[]) {
  const x = new Set(a),
    y = new Set(b),
    union = new Set([...x, ...y]);
  return union.size ? [...x].filter((v) => y.has(v)).length / union.size : 1;
}
export function rock(p: Point[], o: Params, r: Recorder) {
  if (p.some((v) => !v.features?.length))
    throw new Error(
      "ROCK에는 범주형 attribute=value 토큰이 필요합니다. 범주형 프리셋을 선택하세요.",
    );
  const neighbors = p.map(
    (a, i) =>
      new Set(
        p
          .map((b, j) =>
            i !== j && jaccard(a.features!, b.features!) >= o.threshold
              ? j
              : -1,
          )
          .filter((j) => j >= 0),
      ),
  );
  const edges = neighbors.flatMap((set, i) =>
    [...set]
      .filter((j) => j > i)
      .map((j) => ({
        a: i,
        b: j,
        weight: jaccard(p[i].features!, p[j].features!),
      })),
  );
  r.emit(
    "neighbors",
    "실제 범주형 토큰의 Jaccard 유사도 ≥ θ인 이웃 그래프를 만듭니다. 좌표는 계산에 사용하지 않습니다.",
    { edges },
  );
  const links = p.map((_, i) =>
    p.map((_, j) =>
      i === j ? 0 : [...neighbors[i]].filter((v) => neighbors[j].has(v)).length,
    ),
  );
  r.emit(
    "distance",
    "Link(i,j) = 두 점의 공통 이웃 수를 계산합니다.",
    { focus: [] },
    { links: links.flat().reduce((a, b) => a + b, 0) / 2 },
  );
  const groups = p.map((_, i) => [i]);
  const exponent = 1 + (2 * (1 - o.threshold)) / (1 + o.threshold);
  while (groups.length > o.k) {
    let best = 0,
      ai = -1,
      bi = -1;
    for (let a = 0; a < groups.length; a++)
      for (let b = a + 1; b < groups.length; b++) {
        const link = groups[a].reduce(
            (s, i) => s + groups[b].reduce((t, j) => t + links[i][j], 0),
            0,
          ),
          na = groups[a].length,
          nb = groups[b].length;
        const goodness =
          link / ((na + nb) ** exponent - na ** exponent - nb ** exponent);
        if (goodness > best) {
          best = goodness;
          ai = a;
          bi = b;
        }
      }
    if (ai < 0) break;
    r.emit(
      "distance",
      `공통 이웃 Link 기반 최대 goodness = ${best.toFixed(4)}`,
      { focus: [...groups[ai], ...groups[bi]] },
      { goodness: best },
    );
    groups[ai] = [...groups[ai], ...groups[bi]];
    groups.splice(bi, 1);
    const labels = Array(p.length).fill(-1);
    groups.forEach((g, k) => g.forEach((i) => (labels[i] = k)));
    r.emit("merge", `ROCK 링크 점수로 병합 → ${groups.length}개 군집`, {
      labels,
      metric: [...r.state.metric, best],
      metricName: "ROCK goodness",
    });
  }
  r.emit(
    "finish",
    `군집 ${groups.length}개: ${groups.length > o.k ? "양의 Link가 없어 병합을 종료합니다." : "목표에 도달했습니다."}`,
    {
      labels: p.map((_, i) => groups.findIndex((g) => g.includes(i))),
      focus: [],
    },
  );
}
