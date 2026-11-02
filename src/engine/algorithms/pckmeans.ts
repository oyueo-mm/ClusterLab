import type { Dataset } from "../dataset";
import type { Params, Point, EventKind } from "../types";
import type { Recorder } from "../trace";
import type { PairwiseAnalysis, PairwiseCandidate } from "../pairwiseTypes";
import { validateDataset } from "../datasetValidation";
import { random } from "../math";
import { constraintClosure } from "./copkmeans";
import { ndSquared, ndMean, ndBounds, projectedCenters } from "../ndMath";
import { DEFAULT_TRACE_BYTES, DEFAULT_WORKING_BYTES } from "../resources";

/** SDM2004 consistent-supervision Euclidean PCKMeans. J=SSE+w*violations. */
export function pckmeans(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  if (input?.kind !== "constrained")
    throw new Error("PCKMeans는 일관된 constrained 원본과 ML/CL이 필요합니다.");
  validateDataset(input);
  if (
    [
      "weights",
      "mustLinkWeights",
      "cannotLinkWeights",
      "constraintWeights",
      "soft",
    ].some((key) => Object.hasOwn(input, key))
  )
    throw new Error(
      "PCKMeans 기본형은 일관된 무가중 pair와 전역 균일 비용만 지원합니다. 관계별 가중치/다른 soft 입력 계약은 지원하지 않습니다.",
    );
  const x = input.data.values,
    n = x.length,
    d = x[0].length,
    k = o.k,
    w = o.constraintPenalty;
  if (
    points.length !== n ||
    !Number.isSafeInteger(k) ||
    k < 1 ||
    k > n ||
    !Number.isSafeInteger(o.iterations) ||
    o.iterations < 1 ||
    !Number.isSafeInteger(o.seed) ||
    !Number.isFinite(w) ||
    w < 0 ||
    !Number.isFinite(o.tolerance) ||
    o.tolerance < 0
  )
    throw new Error(
      "PCKMeans 파라미터: 1≤정수 K≤n, 유한 비음수 제약 비용/허용오차, 정수 seed/반복이 필요합니다.",
    );
  const estimate =
    n * (d * 24 + k * 16 + 192) +
    (input.mustLink.length + input.cannotLink.length) * 192 +
    k * d * 64;
  if (!Number.isFinite(estimate) || estimate > DEFAULT_WORKING_BYTES)
    throw new Error(
      "PCKMeans 작업 메모리 예산 초과. 전체 입력을 버리지 않고 중단합니다.",
    );
  const c = constraintClosure(n, input.mustLink, input.cannotLink),
    rng = random(o.seed),
    bounds = ndBounds(x);
  const groups = Array.from(
    { length: c.componentSizes.length },
    () => [] as number[],
  );
  c.componentIds.forEach((component, i) => groups[component].push(i));
  const neighborhoods = groups
    .filter((g) => g.length > 1)
    .sort((a, b) => b.length - a.length || a[0] - b[0]);
  const detailed =
    n * k * o.iterations * (n * 8 + 512) < DEFAULT_TRACE_BYTES / 3;
  r.trace.recording!.policy = `원본 ${d}차원 전체 PCKMeans · 일관 제약 ML/CL 폐쇄 · J=SSE+w·위반수 (SDM w_p=w/2) · ${detailed ? "실제 후보 비용/즉시 배정" : "전체 계산·sweep별 요약 (개별 후보 기록 생략)"} · 빈 중심 유지`;
  let centroids: number[][] = [],
    labels = Array(n).fill(-2) as number[],
    iteration = 0,
    converged = false,
    stopReason: PairwiseAnalysis["stopReason"];
  const histogram = groups.map(() => Array(k).fill(0) as number[]);
  let metadata = {
    dimensionBounds: bounds,
    componentIds: c.componentIds,
    componentSizes: c.componentSizes,
    componentCannotLink: c.componentCannotLink,
    mustLink: c.mustLink,
    cannotLink: c.cannotLink,
  };
  let costs = {
    distanceCost: 0,
    mustLinkCost: 0,
    cannotLinkCost: 0,
    objective: 0,
    mustViolations: 0,
    cannotViolations: 0,
    originalMustViolations: 0,
    originalCannotViolations: 0,
  };
  const closureMustCount = groups.reduce(
      (s, g) => s + (g.length * (g.length - 1)) / 2,
      0,
    ),
    closureCannotCount = c.componentCannotLink.reduce(
      (s, [a, b]) => s + groups[a].length * groups[b].length,
      0,
    );
  const counts = () =>
    Array.from({ length: k }, (_, j) =>
      histogram.reduce((s, row) => s + row[j], 0),
    );
  const total = () => {
    let distanceCost = 0,
      mustViolations = 0,
      cannotViolations = 0;
    for (let i = 0; i < n; i++)
      distanceCost += ndSquared(x[i], centroids[labels[i]]);
    for (let g = 0; g < groups.length; g++)
      mustViolations +=
        (groups[g].length ** 2 - histogram[g].reduce((s, v) => s + v * v, 0)) /
        2;
    for (const [a, b] of c.componentCannotLink)
      for (let j = 0; j < k; j++)
        cannotViolations += histogram[a][j] * histogram[b][j];
    const mustLinkCost = w * mustViolations,
      cannotLinkCost = w * cannotViolations,
      objective = distanceCost + mustLinkCost + cannotLinkCost;
    if (!Number.isFinite(objective))
      throw new Error(
        "PCKMeans 수치 불안정: 전체 목적함수가 유한하지 않습니다.",
      );
    return {
      distanceCost,
      mustLinkCost,
      cannotLinkCost,
      objective,
      mustViolations,
      cannotViolations,
      originalMustViolations: c.mustLink.filter(
        ([a, b]) => labels[a] !== labels[b],
      ).length,
      originalCannotViolations: c.cannotLink.filter(
        ([a, b]) => labels[a] === labels[b],
      ).length,
    };
  };
  const emit = (
    kind: EventKind,
    phase: string,
    description: string,
    extra: Partial<PairwiseAnalysis> = {},
    metric = false,
  ) => {
    const a: PairwiseAnalysis = {
      kind: "pairwise",
      method: "PCKMeans",
      phase,
      dimensions: d,
      iteration,
      centroids,
      ...metadata,
      closureMustCount,
      closureCannotCount,
      penalty: w,
      counts: counts(),
      ...costs,
      converged,
      stopReason,
      ...extra,
    };
    r.emit(
      kind,
      description,
      {
        labels,
        centers: projectedCenters(centroids, bounds),
        focus: extra.current === undefined ? [] : [extra.current],
        activeCenter: extra.chosen ?? -1,
        analysis: a,
        ...(metric
          ? {
              metric: [...r.state.metric, costs.objective],
              metricName: "PCKMeans SSE + ML/CL 비용",
            }
          : {}),
      },
      { iteration, objective: costs.objective },
    );
    const recorded = r.state.analysis;
    if (recorded?.kind === "pairwise")
      metadata = {
        dimensionBounds: recorded.dimensionBounds,
        componentIds: recorded.componentIds,
        componentSizes: recorded.componentSizes,
        componentCannotLink: recorded.componentCannotLink,
        mustLink: recorded.mustLink,
        cannotLink: recorded.cannotLink,
      };
  };
  emit(
    "initialize",
    "closure",
    "원래 무방향 제약을 중복 제거했습니다. ML 폐쇄/성분 CL 전파를 정확한 희소 histogram으로 계산하며 CL 자체는 전이시키지 않습니다.",
  );
  const add = (center: number[], why: string) => {
    centroids = [...centroids, center];
    emit(
      "initialize",
      "neighborhood-initialize",
      `${centroids.length}번째 실제 초기 중심: ${why}`,
    );
  };
  for (const g of neighborhoods.slice(0, k))
    add(ndMean(x, g), `ML 이웃집합 ${g.length}행의 전체 차원 평균`);
  if (centroids.length < k && neighborhoods.length) {
    const covered = new Set(neighborhoods.flat()),
      extra = groups.find(
        (g) =>
          g.length === 1 &&
          !covered.has(g[0]) &&
          neighborhoods.every((h) =>
            c.neighbors[c.componentIds[g[0]]].includes(c.componentIds[h[0]]),
          ),
      );
    if (extra) add([...x[extra[0]]], "모든 ML 이웃집합과 CL로 연결된 원본 행");
  }
  const global = ndMean(
    x,
    Array.from({ length: n }, (_, i) => i),
  );
  while (centroids.length < k)
    add(
      global.map(
        (v, j) => v + (2 * rng() - 1) * 0.05 * (bounds[j][1] - bounds[j][0]),
      ),
      "전체 평균 ±5% 범위폭의 시드 perturbation (상수 축 유지)",
    );
  labels = x.map((row) => {
    let best = 0;
    for (let j = 1; j < k; j++)
      if (ndSquared(row, centroids[j]) < ndSquared(row, centroids[best]))
        best = j;
    return best;
  });
  labels.forEach((label, i) => histogram[c.componentIds[i]][label]++);
  costs = total();
  emit(
    "assign",
    "initial-labels",
    "모든 원본 행의 초기 최근접 label을 구성했습니다. 이후 전체 현재 label로 실제 soft 비용을 비교합니다.",
    {},
    true,
  );
  for (iteration = 1; iteration <= o.iterations; iteration++) {
    const before = costs.objective,
      order = Array.from({ length: n }, (_, i) => i);
    let changed = 0;
    for (let j = n - 1; j > 0; j--) {
      const h = Math.floor(rng() * (j + 1));
      [order[j], order[h]] = [order[h], order[j]];
    }
    for (const i of order) {
      const old = labels[i],
        component = c.componentIds[i];
      const candidates: PairwiseCandidate[] = centroids.map((v, cluster) => {
        const distanceSquared = ndSquared(x[i], v),
          mustLinkCost =
            w *
            (groups[component].length -
              1 -
              histogram[component][cluster] +
              (old === cluster ? 1 : 0));
        let cannotLinkCost = 0;
        for (const neighbor of c.neighbors[component])
          cannotLinkCost += w * histogram[neighbor][cluster];
        const total = distanceSquared + mustLinkCost + cannotLinkCost;
        if (!Number.isFinite(total))
          throw new Error("PCKMeans 수치 불안정: 후보 비용 overflow.");
        return {
          cluster,
          distanceSquared,
          mustLinkCost,
          cannotLinkCost,
          total,
        };
      });
      let chosen = old;
      for (let j = 0; j < k; j++)
        if (candidates[j].total < candidates[chosen].total) chosen = j;
      if (detailed)
        emit(
          "test",
          "candidate-costs",
          `${i + 1}행: 모든 후보의 원본 제곱거리와 ML/CL 유한 위반 비용. 동률이면 현재 label 유지.`,
          { current: i, candidates, chosen, order },
        );
      if (chosen !== old) {
        histogram[component][old]--;
        histogram[component][chosen]++;
        labels[i] = chosen;
        changed++;
        // Refresh exact totals for detailed events; summary mode avoids n² work.
        if (detailed) costs = total();
      }
      if (detailed)
        emit(
          "assign",
          "point-assign",
          `${i + 1}행 → ${chosen + 1}군집. 유한 비용을 감수한 위반도 정상 배정입니다.`,
          { current: i, candidates, chosen },
        );
    }
    if (!detailed) {
      costs = total();
      emit(
        "assign",
        "sweep-assign",
        "모든 원본의 실제 후보 비용 비교·즉시 갱신을 완료했습니다.",
      );
    }
    const members = Array.from({ length: k }, () => [] as number[]);
    labels.forEach((v, i) => members[v].push(i));
    const next = centroids.map((v, j) =>
      members[j].length ? ndMean(x, members[j]) : v,
    );
    const movement = next.reduce(
      (largest, v, j) => Math.max(largest, ndSquared(v, centroids[j])),
      0,
    );
    centroids = next;
    costs = total();
    if (!changed && movement === 0) {
      converged = true;
      stopReason = "labels-stable";
    } else if (Math.abs(before - costs.objective) <= o.tolerance) {
      converged = true;
      stopReason = "objective-tolerance";
    }
    emit(
      "move",
      "mean-update",
      `${iteration}회 전체 ND 평균 갱신: 거리 ${costs.distanceCost}, ML ${costs.mustLinkCost}, CL ${costs.cannotLinkCost}, J ${costs.objective}.`,
      {},
      true,
    );
    if (converged) break;
  }
  if (!converged) {
    iteration = o.iterations;
    stopReason = "iteration-limit";
  }
  emit(
    "finish",
    "complete",
    `종료: ${stopReason}. 폐쇄 ML 위반 ${costs.mustViolations}개·CL 위반 ${costs.cannotViolations}개. 위반은 계산 실패가 아니며 전역 최적/hard 만족을 보장하지 않습니다.`,
  );
}
