import type { Dataset } from "../dataset";
import type { Point, Params, EventKind } from "../types";
import type { Recorder } from "../trace";
import type { PossibilisticAnalysis } from "../possibilisticTypes";
import { validateDataset } from "../datasetValidation";
import { copInitialIndices } from "./copkmeans";
import { ndBounds, projectedCenters } from "../ndMath";
import {
  centerMovement,
  distancesSquared,
  ndMemberships,
  logWeightedCenters,
  clusterWeights,
  pcmTypicalities,
  pcmObjective,
} from "../ndFuzzy";
import { DEFAULT_TRACE_BYTES, DEFAULT_WORKING_BYTES } from "../resources";

/** Krishnapuram/Keller 1993 objective, fixed positive per-cluster scales, full ND AO. */
export function pcm(points: Point[], o: Params, r: Recorder, input?: Dataset) {
  if (input?.kind !== "numeric")
    throw new Error(
      "PCM은 실제 원본 NumericDataset의 전체 수치 차원이 필요합니다.",
    );
  validateDataset(input);
  const x = input.values,
    n = x.length,
    d = x[0].length,
    k = o.k,
    eta = o.typicalityExponent,
    m = o.fuzziness;
  if (
    points.length !== n ||
    !Number.isSafeInteger(k) ||
    k < 1 ||
    k > n ||
    ![o.iterations, o.warmIterations].every(
      (v) => Number.isSafeInteger(v) && v > 0,
    ) ||
    !Number.isSafeInteger(o.seed) ||
    !Number.isFinite(eta) ||
    eta <= 1 ||
    !Number.isFinite(m) ||
    m <= 1 ||
    !Number.isFinite(o.scaleCoefficient) ||
    o.scaleCoefficient <= 0 ||
    !Number.isFinite(o.tolerance) ||
    o.tolerance < 0 ||
    !["fcm", "manual"].includes(o.pcmScaleMode) ||
    !Number.isFinite(o.pcmScale) ||
    o.pcmScale <= 0
  )
    throw new Error(
      "PCM 파라미터: 1≤정수 K≤n, η/m>1, κ/수동 Ω>0, 유한 비음수 허용오차·정수 시드·양의 정수 반복이 필요합니다.",
    );
  const estimated = n * (d * 24 + k * 160 + 224) + k * d * 80;
  if (!Number.isFinite(estimated) || estimated > DEFAULT_WORKING_BYTES)
    throw new Error(
      "PCM 작업 메모리 예산 초과. 원본을 잘라 계산하지 않습니다.",
    );
  const bounds = ndBounds(x),
    recordMatrices =
      n * k * (o.warmIterations + o.iterations) * 64 < DEFAULT_TRACE_BYTES / 4;
  r.trace.recording!.policy = `원본 ${d}차원 전체 PCM1993 · ND FCM 초기화 · ${o.pcmScaleMode === "fcm" ? "FCM Ω=κ·가중분산 후 고정" : "수동 양수 Ω 고정"} · 행 합 정규화 없음 · ${recordMatrices ? "매 반복 실제 거리/U/T 행렬" : "모든 행 계산·매 반복 최대 전형성/행합/중심, 전체 T/거리 행렬은 최종 기록"} · 로그 가중치 비율 (epsilon 없음)`;
  let centroids: number[][] = [],
    initialization: number[] = [],
    warmIteration = 0,
    warmConverged = false,
    warmDone = false,
    warmCenters: number[][] = [],
    warmMemberships: number[][] = [],
    warmObjective = 0;
  let iteration = 0,
    scales: number[] = [],
    distances: number[][] = [],
    u: number[][] = [],
    logU: number[][] = [],
    typicalities: number[][] = [],
    logT: number[][] = [],
    maxima: number[] = [],
    rowSums: number[] = [],
    labels = Array(n).fill(-2) as number[];
  let effectiveWeights: number[] = [],
    logEffectiveWeights: number[] = [],
    weightsBasis: "fcm" | "pcm" = "fcm",
    counts = Array(k).fill(0) as number[],
    movement = 0,
    fixedPointResidual = 0,
    converged = false,
    stopReason: PossibilisticAnalysis["stopReason"];
  let costs = { distanceCost: 0, penaltyCost: 0, objective: 0 },
    roundedTypicalities = 0;
  const unique = new Set<string>();
  for (const row of x) {
    unique.add(JSON.stringify(row));
    if (unique.size >= k) break;
  }
  const distinctAtLeastK = unique.size >= k;
  let dimensionBounds = bounds;
  const argmax = (rows: number[][]) =>
    rows.map((row) => {
      let best = 0;
      for (let h = 1; h < row.length; h++) if (row[h] > row[best]) best = h;
      return best;
    });
  const updateCounts = () => {
    counts = Array(k).fill(0) as number[];
    for (const label of labels) if (label >= 0) counts[label]++;
  };
  const emit = (
    kind: EventKind,
    phase: string,
    description: string,
    metric = false,
    finalMatrices = false,
  ) => {
    let coincidentCenters = 0,
      nearCenters = 0;
    if (centroids.length === k)
      for (let a = 0; a < centroids.length; a++)
        for (let b = a + 1; b < centroids.length; b++) {
          const distance = centerMovement([centroids[a]], [centroids[b]]);
          if (distance === 0) coincidentCenters++;
          if (distance <= o.tolerance) nearCenters++;
        }
    const keep = recordMatrices || finalMatrices;
    const analysis: PossibilisticAnalysis = {
      kind: "possibilistic",
      method: "PCM1993",
      phase,
      dimensions: d,
      dimensionBounds,
      centroids,
      initialization,
      warmIteration,
      warmConverged,
      warmCenters: warmDone ? warmCenters : [],
      warmMemberships: warmDone ? warmMemberships : recordMatrices ? u : [],
      warmObjective,
      iteration,
      scales,
      scaleMode: o.pcmScaleMode,
      scaleCoefficient: o.scaleCoefficient,
      fuzziness: m,
      exponent: eta,
      typicalities: keep ? typicalities : [],
      logTypicalities: keep ? logT : [],
      distancesSquared: keep ? distances : [],
      matricesRecorded: keep,
      maxima,
      rowSums,
      effectiveWeights,
      logEffectiveWeights,
      weightsBasis,
      counts,
      ...costs,
      movement,
      fixedPointResidual,
      lowTypicalityCount: maxima.reduce((sum, v) => sum + (v < 0.1 ? 1 : 0), 0),
      coincidentCenters,
      nearCenters,
      distinctAtLeastK,
      roundedTypicalities,
      underflowWeights: effectiveWeights.filter((v) => v === 0).length,
      converged,
      stopReason,
    };
    r.emit(
      kind,
      description,
      {
        labels,
        centers: projectedCenters(centroids, bounds),
        analysis,
        ...(metric
          ? {
              metric: [...r.state.metric, costs.objective],
              metricName: "PCM1993 목적함수 (고정 Ω)",
            }
          : {}),
      },
      { iteration, objective: costs.objective },
    );
    if (r.state.analysis?.kind === "possibilistic") {
      dimensionBounds = r.state.analysis.dimensionBounds;
      initialization = r.state.analysis.initialization;
      scales = r.state.analysis.scales;
      maxima = r.state.analysis.maxima;
      rowSums = r.state.analysis.rowSums;
      effectiveWeights = r.state.analysis.effectiveWeights;
      logEffectiveWeights = r.state.analysis.logEffectiveWeights;
      counts = r.state.analysis.counts;
      if (warmDone) {
        warmCenters = r.state.analysis.warmCenters;
        warmMemberships = r.state.analysis.warmMemberships;
      }
    }
  };
  copInitialIndices(x, k, o.seed, (indices) => {
    initialization = indices;
    centroids = indices.map((i) => [...x[i]]);
    emit(
      "initialize",
      "fcm-seed",
      `${indices.length}번째 원본 ND K-Means++ 중심: ${indices.at(-1)! + 1}행. 화면 좌표를 계산에 사용하지 않습니다.`,
    );
  });
  const fuzzyObjective = () => {
    let value = 0;
    for (let i = 0; i < n; i++)
      for (let h = 0; h < k; h++)
        if (distances[i][h] > 0)
          value += Math.exp(m * logU[i][h] + Math.log(distances[i][h]));
    if (!Number.isFinite(value))
      throw new Error("수치 불안정: ND FCM 목적함수 overflow.");
    return value;
  };
  const fuzzyState = () => {
    const membership = ndMemberships(distances, m);
    u = membership.memberships;
    logU = membership.logs;
    labels = argmax(logU);
    updateCounts();
    warmObjective = fuzzyObjective();
    const weights = Array.from({ length: k }, (_, h) =>
      clusterWeights(logU, m, h),
    );
    effectiveWeights = weights.map((v) => v.mass);
    logEffectiveWeights = weights.map((v) => v.logMass);
  };
  distances = distancesSquared(x, centroids);
  fuzzyState();
  emit(
    "expectation",
    "fcm-memberships",
    "실제 원본 ND FCM 소속도. 이 U의 행 합은1이며 PCM 전형성과 다릅니다.",
  );
  for (warmIteration = 1; warmIteration <= o.warmIterations; warmIteration++) {
    const weighted = logWeightedCenters(x, logU, m);
    movement = centerMovement(centroids, weighted.centers);
    centroids = weighted.centers;
    effectiveWeights = weighted.masses;
    logEffectiveWeights = weighted.logMasses;
    distances = distancesSquared(x, centroids);
    warmObjective = fuzzyObjective();
    emit(
      "maximization",
      "fcm-centers",
      `${warmIteration}회 실제 ND FCM u^m 중심 갱신.`,
    );
    fuzzyState();
    emit(
      "expectation",
      "fcm-memberships",
      `${warmIteration}회 갱신된 원본 중심에서 실제 FCM U와 목적을 계산했습니다.`,
    );
    if (movement <= o.tolerance) {
      warmConverged = true;
      break;
    }
  }
  if (!warmConverged) warmIteration = o.warmIterations;
  warmDone = true;
  warmCenters = centroids;
  warmMemberships = u;
  emit(
    "initialize",
    "fcm-complete",
    `ND FCM 준비 종료: ${warmConverged ? "중심 허용오차" : "초기화 반복 한도"}. 같은 원본의 비교 기준 U/중심을 보존합니다.`,
  );
  scales = Array.from({ length: k }, (_, h) => {
    if (o.pcmScaleMode === "manual") return o.pcmScale;
    const { weights, sum } = clusterWeights(logU, m, h);
    let variance = 0;
    for (let i = 0; i < n; i++)
      variance += (weights[i] / sum) * distances[i][h];
    const scale = o.scaleCoefficient * variance;
    if (!Number.isFinite(scale) || scale <= 0)
      throw new Error(
        `PCM Ω_${h + 1}는 양수여야 합니다. FCM 원본 가중분산이0/비유한입니다. 상수·중복/영분산이면 양수 수동 Ω를 명시하세요. epsilon으로 대체하지 않습니다.`,
      );
    return scale;
  });
  emit(
    "initialize",
    "scales-fixed",
    `군집별 Ω를 ${o.pcmScaleMode === "fcm" ? "κ·FCM 원본 가중분산으로 추정" : "사용자 양수로 지정"}하고 고정했습니다. κ=${o.scaleCoefficient}와 군집 수 K=${k}는 다릅니다.`,
  );
  const typicalityState = () => {
    const next = pcmTypicalities(distances, scales, eta);
    typicalities = next.typicalities;
    logT = next.logs;
    labels = argmax(logT);
    updateCounts();
    maxima = typicalities.map((row) => Math.max(...row));
    rowSums = typicalities.map((row) => row.reduce((s, v) => s + v, 0));
    roundedTypicalities = 0;
    for (let i = 0; i < n; i++)
      for (let h = 0; h < k; h++)
        if (
          distances[i][h] > 0 &&
          (typicalities[i][h] === 0 || typicalities[i][h] === 1)
        )
          roundedTypicalities++;
    costs = pcmObjective(distances, logT, scales, eta);
    weightsBasis = "pcm";
    const weighted = logWeightedCenters(x, logT, eta);
    effectiveWeights = weighted.masses;
    logEffectiveWeights = weighted.logMasses;
    return weighted.centers;
  };
  for (iteration = 1; iteration <= o.iterations; iteration++) {
    distances = distancesSquared(x, centroids);
    emit(
      "distance",
      "pcm-distances",
      `${iteration}회: 모든 원본 행과 모든 중심의 실제 ND 제곱거리입니다.`,
    );
    const next = typicalityState();
    emit(
      "typicality",
      "typicality-update",
      `${iteration}회: 독립 전형성을 갱신했습니다. 표본별 합을1로 정규화하지 않습니다.`,
      true,
    );
    movement = centerMovement(centroids, next);
    centroids = next;
    distances = distancesSquared(x, centroids);
    costs = pcmObjective(distances, logT, scales, eta);
    emit(
      "move",
      "mean-update",
      `${iteration}회: t^η 가중평균으로 원본 중심을 이동했습니다. 실제 J=${costs.objective}.`,
      true,
    );
    if (movement <= o.tolerance) {
      converged = true;
      stopReason = "center-tolerance";
      break;
    }
  }
  if (!converged) {
    iteration = o.iterations;
    stopReason = "iteration-limit";
  }
  const next = typicalityState();
  fixedPointResidual = centerMovement(centroids, next);
  emit(
    "typicality",
    "final-typicalities",
    "반환할 실제 최종 중심에서 전체 전형성·거리·목적을 다시 평가했습니다. 평균 고정점 잔차는 별도 진단입니다.",
    true,
    true,
  );
  emit(
    "finish",
    "complete",
    `PCM1993 종료: ${stopReason}. 전형성은 확률이 아니며 행 합1을 요구하지 않습니다. 고정점 잔차 ${fixedPointResidual}. 중복 중심·낮은 전형성/표현 반올림은 분석에서 확인하세요.`,
    false,
    true,
  );
}
