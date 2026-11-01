import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type {
  ConstraintAnalysis,
  ConstraintCandidate,
} from "../constraintTypes";
import { random } from "../math";
import { DEFAULT_TRACE_BYTES, DEFAULT_WORKING_BYTES } from "../resources";
import { validateDataset } from "../datasetValidation";
import { squared } from "./autoCommon";

/** Sparse representation of ML closure and induced CL; never materializes n² pairs. */
export function constraintClosure(
  n: number,
  ml: [number, number][],
  cl: [number, number][],
) {
  const parent = Array.from({ length: n }, (_, i) => i),
    rank = new Uint8Array(n);
  const root = (a: number): number => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  for (const [a, b] of ml) {
    let u = root(a),
      v = root(b);
    if (u === v) continue;
    if (rank[u] < rank[v]) [u, v] = [v, u];
    parent[v] = u;
    if (rank[u] === rank[v]) rank[u]++;
  }
  const ids = new Map<number, number>(),
    componentIds = parent.map((_, i) => {
      const r = root(i);
      if (!ids.has(r)) ids.set(r, ids.size);
      return ids.get(r)!;
    }),
    componentSizes = Array(ids.size).fill(0) as number[];
  componentIds.forEach((c) => componentSizes[c]++);
  const canonical = (pairs: [number, number][]) =>
    [
      ...new Map(
        pairs.map(([a, b]) => {
          const p: [number, number] = a <= b ? [a, b] : [b, a];
          return [p.join(":"), p] as const;
        }),
      ).values(),
    ].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const mustLink = canonical(ml),
    cannotLink = canonical(cl),
    componentCannotLink = canonical(
      cannotLink.map(([a, b]) => [componentIds[a], componentIds[b]]),
    );
  for (const [a, b] of componentCannotLink)
    if (a === b)
      throw new Error(
        "COP-KMeans 제약 모순: Must-Link 전이 성분 내부의 Cannot-Link가 있습니다.",
      );
  const neighbors = Array.from({ length: ids.size }, () => [] as number[]);
  for (const [a, b] of componentCannotLink) {
    neighbors[a].push(b);
    neighbors[b].push(a);
  }
  return {
    componentIds,
    componentSizes,
    componentCannotLink,
    mustLink,
    cannotLink,
    neighbors,
  };
}

/** Exactly K distinct observed row indices, even if coordinates coincide. */
export function copInitialIndices(
  x: number[][],
  k: number,
  seed: number,
  onSelected?: (
    indices: number[],
    reason: "first" | "squared-distance" | "zero-distance-fallback",
  ) => void,
) {
  const rng = random(seed),
    chosen = [Math.floor(rng() * x.length)],
    used = new Set(chosen);
  onSelected?.([...chosen], "first");
  const nearest = x.map((row) => squared(row, x[chosen[0]]));
  while (chosen.length < k) {
    let scale = 0;
    for (let i = 0; i < x.length; i++)
      if (!used.has(i)) scale = Math.max(scale, nearest[i]);
    let next = -1;
    if (scale > 0) {
      let total = 0;
      for (let i = 0; i < x.length; i++)
        if (!used.has(i)) total += nearest[i] / scale;
      let target = rng() * total;
      for (let i = 0; i < x.length; i++)
        if (!used.has(i) && (target -= nearest[i] / scale) < 0) {
          next = i;
          break;
        }
    }
    const fallback = next < 0;
    if (fallback) next = x.findIndex((_, i) => !used.has(i));
    chosen.push(next);
    used.add(next);
    onSelected?.(
      [...chosen],
      fallback ? "zero-distance-fallback" : "squared-distance",
    );
    for (let i = 0; i < x.length; i++)
      nearest[i] = Math.min(nearest[i], squared(x[i], x[next]));
  }
  return chosen;
}

/** COP pointwise greedy assignment. Original row order; fresh assignments per pass. */
export function copkmeans(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  if (!input || input.kind !== "constrained")
    throw new Error(
      "COP-KMeans는 실제 constrained 원본 수치·Must-Link·Cannot-Link 데이터가 필요합니다.",
    );
  validateDataset(input);
  const x = input.data.values,
    n = x.length,
    d = x[0].length;
  if (n < 1 || points.length !== n)
    throw new Error("COP-KMeans 원본/표시 행 수가 같고 1행 이상이어야 합니다.");
  if (
    !Number.isSafeInteger(o.k) ||
    o.k < 1 ||
    o.k > n ||
    !Number.isSafeInteger(o.iterations) ||
    o.iterations < 1 ||
    !Number.isSafeInteger(o.seed) ||
    !Number.isFinite(o.tolerance) ||
    o.tolerance < 0
  )
    throw new Error(
      "COP-KMeans 파라미터 오류: 1≤정수 K≤n, 양의 정수 iterations, 정수 seed, 유한 tolerance≥0이 필요합니다.",
    );
  const estimate =
    n * (d * 24 + 176) +
    (input.mustLink.length + input.cannotLink.length) * 176 +
    o.k * d * 64;
  if (!Number.isFinite(estimate) || estimate > DEFAULT_WORKING_BYTES)
    throw new Error(
      `COP-KMeans 작업 메모리 예산 초과: 추정 ${(estimate / 1048576).toFixed(1)}MiB. 입력을 버리지 않고 중단합니다.`,
    );
  const closure = constraintClosure(n, input.mustLink, input.cannotLink);
  let centroids: number[][] = [],
    labels = Array(n).fill(-2) as number[],
    assigned = 0,
    activeK = 0,
    objective = 0,
    iteration = 0,
    converged = false,
    emptyClusters: number[] = [],
    stopReason: ConstraintAnalysis["stopReason"];
  let metadata = {
    dimensionBounds: x[0].map((_, j) => {
      let lo = Infinity,
        hi = -Infinity;
      for (const row of x) {
        lo = Math.min(lo, row[j]);
        hi = Math.max(hi, row[j]);
      }
      return [lo, hi] as [number, number];
    }),
    componentIds: closure.componentIds,
    componentSizes: closure.componentSizes,
    componentCannotLink: closure.componentCannotLink,
    mustLink: closure.mustLink,
    cannotLink: closure.cannotLink,
    initialization: [] as number[],
  };
  const detailed =
    n * n * o.iterations * (32 + o.k * 48) < DEFAULT_TRACE_BYTES / 4;
  r.trace.recording!.policy = `전체 원본 ${d}차원·원본 순서 COP pointwise greedy · sparse ML closure/성분 CL · 매 pass 새 할당 · ${detailed ? "실제 후보 검사·점 할당" : "전체 계산·pass별 할당/평균 요약(개별 검사는 생략)"} · 빈 중심 유지`;
  const analysis = (
    phase: string,
    extra: Partial<ConstraintAnalysis> = {},
  ): ConstraintAnalysis => ({
    kind: "constraints",
    method: "COP-KMeans",
    phase,
    dimensions: d,
    iteration,
    centroids,
    ...metadata,
    assigned,
    activeK,
    objective,
    emptyClusters,
    converged,
    stopReason,
    ...extra,
  });
  const emit = (
    kind: "initialize" | "test" | "assign" | "move" | "finish",
    phase: string,
    description: string,
    extra: Partial<ConstraintAnalysis> = {},
    metric = false,
  ) =>
    r.emit(
      kind,
      description,
      {
        labels,
        centers: [],
        focus: extra.current === undefined ? [] : [extra.current],
        analysis: analysis(phase, extra),
        ...(metric
          ? {
              metric: [...r.state.metric, objective],
              metricName: "Hard-feasible assigned SSE",
            }
          : {}),
      },
      { assigned, objective, iteration },
    );
  copInitialIndices(x, o.k, o.seed, (indices, reason) => {
    centroids = indices.map((i) => [...x[i]]);
    metadata = { ...metadata, initialization: indices };
    emit(
      "initialize",
      "seed-initialize",
      `${indices.length}번째 실제 초기 중심: ${indices.at(-1)! + 1}행 · ${reason === "first" ? "시드 균등 첫 선택" : reason === "squared-distance" ? "전체 원본의 최근접 제곱거리 비례 선택" : "남은 제곱거리가0이어서 남은 행 인덱스순 선택"}. 원본을 ML 성분 평균으로 축약하지 않습니다.`,
      { current: indices.at(-1) },
    );
    // Reuse Recorder's immutable clone, avoiding repeated n/E metadata copies.
    const recorded = r.state.analysis;
    if (recorded?.kind !== "constraints")
      throw new Error("COP-KMeans 내부 분석 상태 오류.");
    metadata = {
      dimensionBounds: recorded.dimensionBounds,
      componentIds: recorded.componentIds,
      componentSizes: recorded.componentSizes,
      componentCannotLink: recorded.componentCannotLink,
      mustLink: recorded.mustLink,
      cannotLink: recorded.cannotLink,
      initialization: recorded.initialization!,
    };
  });
  for (iteration = 1; iteration <= o.iterations; iteration++) {
    const previous = labels;
    labels = Array(n).fill(-2) as number[];
    assigned = 0;
    activeK = 0;
    objective = 0;
    const componentLabels = Array(closure.componentSizes.length).fill(
        -1,
      ) as number[],
      witness = componentLabels.map(() => -1),
      counts = Array(o.k).fill(0) as number[];
    if (detailed)
      emit(
        "assign",
        "pass-start",
        "새 pass의 아직 미할당된 관계를 실패로 처리하지 않고, 실제 처리된 행의 ML/CL만 검사합니다.",
      );
    for (let i = 0; i < n; i++) {
      const component = closure.componentIds[i],
        distances = centroids
          .map((c, cluster) => ({ cluster, distanceSquared: squared(x[i], c) }))
          .sort(
            (a, b) =>
              a.distanceSquared - b.distanceSquared || a.cluster - b.cluster,
          ),
        candidates: ConstraintCandidate[] = [];
      let chosen = -1;
      for (const candidate of distances) {
        const blockers: ConstraintCandidate["blockers"] = [],
          forced = componentLabels[component];
        if (forced >= 0 && forced !== candidate.cluster)
          blockers.push({
            kind: "must-link",
            point: witness[component],
            component,
            label: forced,
          });
        for (const adjacent of closure.neighbors[component])
          if (componentLabels[adjacent] === candidate.cluster)
            blockers.push({
              kind: "cannot-link",
              point: witness[adjacent],
              component: adjacent,
              label: candidate.cluster,
            });
        candidates.push({ ...candidate, allowed: !blockers.length, blockers });
        if (detailed)
          emit(
            "test",
            "candidate-test",
            `${i + 1}행의 ${candidate.cluster + 1}번 중심 후보: 실제 제곱거리 ${candidate.distanceSquared.toPrecision(6)} · ${blockers.length ? "이미 할당된 관계로 거부" : "제약을 위반하지 않아 수용"}`,
            { current: i, candidates },
          );
        if (!blockers.length) {
          chosen = candidate.cluster;
          break;
        }
      }
      if (chosen < 0) {
        stopReason = "greedy-failure";
        emit(
          "test",
          "greedy-failure",
          `${i + 1}행을 현재 순서·초깃값에서 배치할 수 없습니다. 전역 불가능성 증명이 아니며 부분 할당을 완료 결과로 반환하지 않습니다.`,
          { current: i, candidates },
        );
        throw new Error(
          `COP-KMeans greedy 할당 실패: ${i + 1}행, pass ${iteration}. 현재 시드·원본 순서에서 허용 군집이 없습니다. 모든 K-분할이 불가능하다는 증명은 아닙니다.`,
        );
      }
      labels[i] = chosen;
      if (!counts[chosen]) activeK++;
      counts[chosen]++;
      assigned++;
      objective += squared(x[i], centroids[chosen]);
      if (!Number.isFinite(objective))
        throw new Error(
          "COP-KMeans 수치 불안정: 전체 SSE가 유한하지 않습니다.",
        );
      if (componentLabels[component] < 0) {
        componentLabels[component] = chosen;
        witness[component] = i;
      }
      if (detailed)
        emit(
          "assign",
          "point-assign",
          `${i + 1}행을 실제 허용된 ${chosen + 1}번 군집에 할당했습니다.`,
          { current: i, candidates },
        );
    }
    if (!detailed)
      emit(
        "assign",
        "pass-assign",
        "모든 원본 행의 실제 거리·후보 제약 검사를 마쳤습니다. 상세 개별 후보 이벤트 대신 전체 pass 결과를 기록합니다.",
      );
    // Anchor-relative weighted accumulation avoids unnecessary overflowing coordinate sums.
    const next = centroids.map((c) => [...c]),
      anchors = centroids.map(() => -1),
      sums = centroids.map(() => Array(d).fill(0) as number[]);
    for (let i = 0; i < n; i++) {
      const c = labels[i];
      if (anchors[c] < 0) anchors[c] = i;
      for (let j = 0; j < d; j++)
        sums[c][j] += (x[i][j] - x[anchors[c]][j]) / counts[c];
    }
    emptyClusters = [];
    let movement = 0;
    for (let c = 0; c < o.k; c++) {
      if (!counts[c]) {
        emptyClusters.push(c);
        continue;
      }
      next[c] = sums[c].map((v, j) => x[anchors[c]][j] + v);
      if (next[c].some((v) => !Number.isFinite(v)))
        throw new Error(
          "COP-KMeans 수치 불안정: 실제 평균이 유한하지 않습니다.",
        );
      movement = Math.max(movement, Math.sqrt(squared(next[c], centroids[c])));
    }
    centroids = next;
    objective = 0;
    for (let i = 0; i < n; i++)
      objective += squared(x[i], centroids[labels[i]]);
    if (!Number.isFinite(objective))
      throw new Error("COP-KMeans 수치 불안정: 갱신 SSE가 유한하지 않습니다.");
    if (labels.every((v, i) => v === previous[i])) stopReason = "labels-stable";
    else if (movement <= o.tolerance) stopReason = "center-tolerance";
    converged = stopReason !== undefined;
    emit(
      "move",
      "mean-update",
      `전체 원본 평균을 갱신했습니다. 실제 최대 중심 이동 ${movement.toPrecision(6)}, 빈 군집 ${emptyClusters.length}개는 이전 중심을 유지합니다.`,
      {},
      true,
    );
    if (converged) break;
  }
  if (!converged) {
    iteration = o.iterations;
    stopReason = "iteration-limit";
  }
  // Audit the sparse closure representation against all actually supplied relations.
  for (const [a, b] of closure.mustLink)
    if (labels[a] !== labels[b])
      throw new Error("COP-KMeans 내부 오류: 최종 ML 위반.");
  for (const [a, b] of closure.cannotLink)
    if (labels[a] === labels[b])
      throw new Error("COP-KMeans 내부 오류: 최종 CL 위반.");
  emit(
    "finish",
    "finish",
    converged
      ? `실제 hard 제약을 모두 만족하며 ${stopReason === "labels-stable" ? "동일 할당" : "명시적 중심 이동 허용오차"}로 종료했습니다.`
      : "반복 한도로 종료했습니다. 실제 hard 제약을 만족하는 마지막 할당·평균을 반환하며 고정점 수렴을 주장하지 않습니다.",
  );
}
