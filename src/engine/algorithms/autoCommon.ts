import type { Dataset } from "../dataset";
import { numericRows } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { AutoAnalysis } from "../autoTypes";
import { random } from "../math";
import { symmetricEigen } from "../linalg";
import { DEFAULT_WORKING_BYTES } from "../resources";

export function checkedRows(p: Point[], o: Params, input?: Dataset) {
  const x = numericRows(p, input),
    d = x[0]?.length;
  if (
    x.length !== p.length ||
    x.length < 2 ||
    !d ||
    x.some((v) => v.length !== d || v.some((a) => !Number.isFinite(a)))
  )
    throw new Error(
      "자동 K 입력은 같은 차원의 유한한 원본 벡터 2개 이상이어야 합니다.",
    );
  for (const [name, value] of [
    ["iterations", o.iterations],
    ["k", o.k],
    ["maxClusters", o.maxClusters],
  ] as const)
    if (!Number.isSafeInteger(value) || value < 1)
      throw new Error(`자동 K 파라미터 오류: ${name}`);
  if (o.maxClusters < o.k || !Number.isFinite(o.tolerance) || o.tolerance < 0)
    throw new Error(
      "최대 군집 수는 초기 K 이상이어야 하며 허용오차는 음수가 아니어야 합니다.",
    );
  if (!Number.isSafeInteger(o.seed))
    throw new Error("시드는 유한한 정수여야 합니다.");
  return x;
}
export function squared(a: number[], b: number[]) {
  let value = 0;
  for (let j = 0; j < a.length; j++) value += (a[j] - b[j]) ** 2;
  if (!Number.isFinite(value))
    throw new Error(
      "수치 불안정: 제곱거리가 유한하지 않습니다. 원본 스케일을 조정하세요.",
    );
  if (value === 0 && a.some((v, j) => v !== b[j]))
    throw new Error(
      "수치 불안정: 서로 다른 원본의 제곱거리가 underflow했습니다. 스케일을 조정하세요.",
    );
  return value;
}
export function vectorNorm(a: number[]) {
  return a.reduce((length, v) => Math.hypot(length, v), 0);
}
export function average(x: number[][]): number[] {
  return x[0].map(
    (anchor, j) =>
      anchor + x.reduce((sum, row) => sum + (row[j] - anchor) / x.length, 0),
  );
}
export function initialCenters(x: number[][], k: number, seed: number) {
  const rng = random(seed),
    centers = [x[Math.floor(rng() * x.length)].slice()];
  while (centers.length < Math.min(k, x.length)) {
    const costs = x.map((row) =>
      centers.reduce((cost, c) => Math.min(cost, squared(row, c)), Infinity),
    );
    const total = costs.reduce((a, b) => a + b, 0);
    if (!total) break;
    let u = rng() * total,
      index = costs.length - 1;
    for (let i = 0; i < costs.length; i++)
      if ((u -= costs[i]) < 0) {
        index = i;
        break;
      }
    centers.push(x[index].slice());
  }
  return centers;
}
export function assignment(x: number[][], centers: number[][]) {
  let sse = 0;
  const labels = x.map((row) => {
    let best = 0,
      cost = squared(row, centers[0]);
    for (let j = 1; j < centers.length; j++) {
      const next = squared(row, centers[j]);
      if (next < cost) {
        cost = next;
        best = j;
      }
    }
    sse += cost;
    return best;
  });
  if (!Number.isFinite(sse))
    throw new Error("수치 불안정: SSE가 유한하지 않습니다.");
  return { labels, sse };
}
export interface LloydResult {
  centers: number[][];
  labels: number[];
  sse: number;
  converged: boolean;
}
export function seedModel(x: number[][], centers: number[][]): LloydResult {
  return { centers, ...assignment(x, centers), converged: false };
}
export function candidateLloyd(
  x: number[][],
  initial: number[][],
  o: Params,
  r: Recorder,
  analysis: AutoAnalysis,
  cluster: number,
) {
  const focus = r.state.labels.flatMap((label, i) =>
    label === cluster ? [i] : [],
  );
  r.emit("refine", `부모 ${cluster + 1}: 실제 국소 2-Means 초기 후보`, {
    focus,
    analysis: {
      ...analysis,
      phase: "candidate-initialize",
      proposedCentroids: initial,
      candidateLabels: assignment(x, initial).labels,
    },
  });
  return lloyd(x, initial, o, (phase, result) => {
    r.emit(
      "refine",
      `부모 ${cluster + 1}: 실제 국소 2-Means ${phase === "assign" ? "할당" : "평균 갱신"}`,
      {
        analysis: {
          ...analysis,
          phase: `candidate-${phase}`,
          proposedCentroids: result.centers,
          candidateLabels: result.labels,
        },
      },
      { localSSE: result.sse, clusters: result.centers.length },
    );
  });
}
export function lloyd(
  x: number[][],
  initial: number[][],
  o: Params,
  onStep?: (phase: "assign" | "move", result: LloydResult) => void,
): LloydResult {
  let centers = initial.map((c) => c.slice()),
    old: number[] = [],
    converged = false;
  for (let it = 0; it < o.iterations; it++) {
    const a = assignment(x, centers);
    onStep?.("assign", { centers, ...a, converged: false });
    const groups = centers.map((_, j) => x.filter((_, i) => a.labels[i] === j));
    // Empty centers have no statistical model; remove them and compact labels.
    const next = groups.filter((g) => g.length).map(average);
    const stable =
      a.labels.length === old.length && a.labels.every((v, i) => v === old[i]);
    const movement =
      next.length === centers.length
        ? next.reduce(
            (distance, c, j) => Math.max(distance, squared(c, centers[j])),
            0,
          )
        : Infinity;
    centers = next;
    old = a.labels;
    const updated = assignment(x, centers);
    converged = stable || movement <= o.tolerance ** 2;
    onStep?.("move", { centers, ...updated, converged });
    if (converged) break;
  }
  return { centers, ...assignment(x, centers), converged };
}
export function traceLloyd(
  x: number[][],
  initial: number[][],
  o: Params,
  r: Recorder,
  analysis: AutoAnalysis,
) {
  return lloyd(x, initial, o, (phase, result) => {
    r.emit(
      phase,
      phase === "assign"
        ? "전체 원본 차원의 최근접 중심 할당"
        : "전체 원본 차원의 평균 중심 갱신 및 실제 SSE 평가",
      {
        labels: result.labels,
        centers: [],
        focus: [],
        analysis: {
          ...analysis,
          phase,
          centroids: result.centers,
          sse: result.sse,
          converged: result.converged,
        },
        ...(phase === "move"
          ? {
              metric: [...r.state.metric, result.sse],
              metricName: "Full-feature SSE",
            }
          : {}),
      },
      { sse: result.sse, clusters: result.centers.length },
    );
  });
}
export function principalChildren(x: number[][]) {
  const d = x[0].length,
    estimated = d * d * 128 + x.length * d * 16;
  if (!Number.isFinite(estimated) || estimated > DEFAULT_WORKING_BYTES)
    throw new Error(
      "주성분 공분산 작업 공간 예산 초과. 차원별 원본을 표본화하지 않았습니다.",
    );
  const center = average(x);
  const cov = Array.from({ length: d }, () => Array(d).fill(0) as number[]);
  x.forEach((row) => {
    for (let a = 0; a < d; a++)
      for (let b = 0; b <= a; b++)
        cov[a][b] += ((row[a] - center[a]) * (row[b] - center[b])) / x.length;
  });
  for (let a = 0; a < d; a++) for (let b = 0; b < a; b++) cov[b][a] = cov[a][b];
  const eigen = symmetricEigen(cov),
    index = d - 1,
    value = eigen.values[index];
  if (!(value > 0)) return null;
  const delta = eigen.vectors.map(
    (row) => row[index] * Math.sqrt((2 * value) / Math.PI),
  );
  return [
    center.map((v, j) => v - delta[j]),
    center.map((v, j) => v + delta[j]),
  ];
}
export function baseAnalysis(
  method: string,
  x: number[][],
  centroids: number[][],
): AutoAnalysis {
  return {
    kind: "model-selection",
    method,
    phase: "initialize",
    dimensions: x[0].length,
    centroids,
    sse: assignment(x, centroids).sse,
  };
}
