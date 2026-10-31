import type { AlgorithmAnalysis, Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { Dataset } from "../dataset";
import { pairwiseSquared } from "./affinity";
import { DEFAULT_TRACE_BYTES } from "../resources";

/** CFSFDP with explicit top-gamma center selection and stable plateau ordering. */
export function densitypeaks(
  p: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  if (
    !Number.isFinite(o.epsilon) ||
    o.epsilon <= 0 ||
    !Number.isSafeInteger(o.k) ||
    o.k < 1 ||
    !["gaussian", "cutoff"].includes(o.densityKernel)
  )
    throw new Error(
      "Density Peaks 파라미터 오류: 양의 dc, 정수 K≥1, gaussian/cutoff kernel이 필요합니다.",
    );
  const ds = pairwiseSquared(p, input),
    n = p.length;
  const detailed = n * n * 128 < DEFAULT_TRACE_BYTES / 4;
  r.trace.recording!.policy = detailed
    ? "실제 밀도·부모별 δ·점별 할당 기록"
    : "전체 데이터의 밀도·부모·할당을 단계별로 요약 · 표본 계산 없음";
  const rho = Array(n).fill(0) as number[],
    delta = Array(n).fill(0) as number[],
    parent = Array(n).fill(-1) as number[];
  let gamma = Array(n).fill(0) as number[],
    selected: number[] = [];
  let halo: boolean[] | undefined = undefined;
  const analysis = (
    phase: string,
  ): Extract<AlgorithmAnalysis, { kind: "density-peaks" }> => ({
    kind: "density-peaks",
    phase,
    rho,
    delta,
    parent,
    gamma,
    selected,
    cutoff: o.epsilon,
    ...(halo ? { halo } : {}),
  });
  r.emit(
    "initialize",
    "원본 전체 특성의 거리와 dc를 준비합니다. 중심은 γ=ρδ 상위 K개 위치로 선택합니다.",
    { analysis: analysis("distance") },
  );
  const cutoffSquared = o.epsilon ** 2;
  if (!Number.isFinite(cutoffSquared) || cutoffSquared === 0)
    throw new Error(
      "수치 불안정: dc²가 유한한 양수가 아닙니다. 스케일을 조정하세요.",
    );
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const value =
        o.densityKernel === "gaussian"
          ? Math.exp(-ds[i][j] / cutoffSquared)
          : ds[i][j] < cutoffSquared
            ? 1
            : 0;
      rho[i] += value;
      rho[j] += value;
    }
  r.emit(
    "density",
    `자기 자신을 제외하고 ${o.densityKernel} 밀도 ρ를 계산했습니다.`,
    {
      analysis: analysis("density"),
      metric: [...rho],
      metricName: "Local density ρ",
    },
  );
  const order = p.map((_, i) => i).sort((a, b) => rho[b] - rho[a] || a - b);
  let rootDelta = 0;
  for (let rank = 1; rank < n; rank++) {
    const i = order[rank];
    let best = Infinity;
    for (let j = 0; j < rank; j++) {
      const candidate = order[j],
        distance = Math.sqrt(ds[i][candidate]);
      if (distance < best) {
        best = distance;
        parent[i] = candidate;
      }
    }
    delta[i] = best;
    rootDelta = Math.max(rootDelta, best);
    if (detailed)
      r.emit(
        "distance",
        `점 ${i + 1}: 밀도 순위가 앞선 점 중 최근접 부모 ${parent[i] + 1}, δ=${best.toFixed(6)}. 동밀도는 인덱스 순서입니다.`,
        { focus: [i, parent[i]], analysis: analysis("parent") },
        { rho: rho[i], delta: best },
      );
  }
  // Matches the author's MATLAB reference convention for the leading rank.
  delta[order[0]] = rootDelta;
  gamma = rho.map((value, i) => value * delta[i]);
  r.emit(
    "density",
    "최상위 점의 δ를 나머지 δ의 최댓값으로 두고 결정 그래프 (ρ,δ)와 γ를 구성합니다.",
    { order, focus: [], analysis: analysis("decision") },
  );
  const candidates = p
    .map((_, i) => i)
    .sort((a, b) => gamma[b] - gamma[a] || rho[b] - rho[a] || a - b);
  // Always retain the highest density root; without this invariant an all-zero
  // plateau cannot be assigned through its parent graph.
  selected = [order[0]];
  for (const i of candidates) {
    if (selected.length >= Math.min(o.k, n)) break;
    if (!selected.some((j) => ds[i][j] === 0)) selected.push(i);
  }
  const labels = Array(n).fill(-2) as number[];
  selected.forEach((i, k) => {
    labels[i] = k;
  });
  r.emit(
    "extract",
    "최고 밀도 루트와 γ 순위에서 서로 다른 위치의 중심을 선택합니다. 이는 사각형 수동 선택 대신 사용하는 명시적 K 선택 변형입니다.",
    {
      labels,
      centers: selected.map((i) => ({ ...p[i], id: i })),
      analysis: analysis("centers"),
    },
    { clusters: selected.length, requested: o.k },
  );
  const edges: { a: number; b: number }[] = [];
  for (const i of order) {
    if (labels[i] >= 0) continue;
    labels[i] = labels[parent[i]];
    edges.push({ a: i, b: parent[i] });
    if (detailed)
      r.emit(
        "assign",
        `점 ${i + 1}은 최근접 상위 밀도 순위 부모의 군집 ${labels[i] + 1}을 상속합니다.`,
        { labels, focus: [i, parent[i]], edges: [...edges] },
      );
  }
  r.emit(
    "assign",
    "모든 원본 점을 밀도 순서로 할당했습니다. 부모 간선은 실제 할당 경로입니다.",
    { labels, edges, focus: [], analysis: analysis("assignment") },
  );
  const border = selected.map(() => 0);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (labels[i] !== labels[j] && ds[i][j] <= cutoffSquared) {
        const average = (rho[i] + rho[j]) / 2;
        border[labels[i]] = Math.max(border[labels[i]], average);
        border[labels[j]] = Math.max(border[labels[j]], average);
      }
  halo = rho.map((value, i) => value < border[labels[i]]);
  r.emit(
    "extract",
    "다른 군집의 dc 이웃 쌍에서 경계 밀도를 계산해 halo를 별도 표시합니다. 원래 분할 레이블은 유지합니다.",
    {
      roles: halo.map((v) => (v ? "halo" : "density-core")),
      analysis: analysis("halo"),
    },
    { halo: halo.filter(Boolean).length },
  );
  r.emit(
    "finish",
    "Density Peaks의 밀도·부모·중심 선택·할당·halo 계산을 마쳤습니다.",
    { analysis: analysis("finish"), focus: [] },
    { clusters: selected.length },
  );
}
