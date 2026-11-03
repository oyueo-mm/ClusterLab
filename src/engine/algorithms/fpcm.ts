import type { Dataset } from "../dataset";
import type { Point, Params, EventKind } from "../types";
import type { Recorder } from "../trace";
import type { FpcmAnalysis } from "../fpcmTypes";
import { validateDataset } from "../datasetValidation";
import { copInitialIndices } from "./copkmeans";
import { ndBounds, projectedCenters } from "../ndMath";
import {
  distancesSquared,
  ndMemberships,
  logWeightedCenters,
  centerMovement,
} from "../ndFuzzy";
import { fpcmTypicalities, fpcmObjective, fpcmCenters } from "../ndFpcm";
import { DEFAULT_TRACE_BYTES, DEFAULT_WORKING_BYTES } from "../resources";
export function fpcm(points: Point[], o: Params, r: Recorder, input?: Dataset) {
  if (input?.kind !== "numeric")
    throw Error("FPCM은 원본 NumericDataset 전체 차원을 사용합니다.");
  validateDataset(input);
  const x = input.values,
    n = x.length,
    d = x[0].length,
    k = o.k,
    m = o.fuzziness,
    eta = o.typicalityExponent;
  if (
    points.length !== n ||
    !Number.isSafeInteger(k) ||
    k < 1 ||
    k > n ||
    ![o.iterations, o.warmIterations].every(
      (v) => Number.isSafeInteger(v) && v > 0,
    ) ||
    !Number.isSafeInteger(o.seed) ||
    ![m, eta].every((v) => Number.isFinite(v) && v > 1) ||
    !Number.isFinite(o.tolerance) ||
    o.tolerance < 0
  )
    throw Error(
      "FPCM: 정수1≤K≤n, m/η>1, 양의 정수 반복·유한 비음수 허용오차·정수 시드가 필요합니다.",
    );
  const estimate = n * (d * 24 + k * 208 + 256) + k * d * 80;
  if (!Number.isFinite(estimate) || estimate > DEFAULT_WORKING_BYTES)
    throw Error("FPCM 작업 메모리 예산 초과. 원본을 잘라 계산하지 않습니다.");
  const record =
    n * k * (o.warmIterations + o.iterations) * 96 < DEFAULT_TRACE_BYTES / 4;
  r.trace.recording!.policy = `원본 ${d}D 전체 FPCM1997 · U 행 합1/T 열 합1 · ND FCM 초기화 · ${record ? "실제 중간 U/T/거리" : "전체 정규화·계산, 중간 행렬만 요약·최종 전체 U/T"} · epsilon 없음`;
  let bounds = ndBounds(x),
    centroids: number[][] = [],
    initialization: number[] = [],
    warmCenters: number[][] = [],
    warmMemberships: number[][] = [],
    u: number[][] = [],
    logU: number[][] = [],
    t: number[][] = [],
    logT: number[][] = [],
    distances: number[][] = [];
  let warmIteration = 0,
    warmConverged = false,
    warmDone = false,
    warmObjective = 0,
    iteration = 0,
    movement = 0,
    fixedPointResidual = 0,
    converged = false,
    stopReason: FpcmAnalysis["stopReason"],
    weightsReady = false;
  let uRowSums: number[] = [],
    tColumnSums: number[] = [],
    tRowSums: number[] = [],
    effectiveWeights: number[] = [],
    logEffectiveWeights: number[] = [],
    counts: number[] = Array(k).fill(0) as number[],
    labels: number[] = Array(n).fill(-2) as number[];
  let costs = { fuzzyCost: 0, typicalityCost: 0, objective: 0 };
  const distinct = new Set<string>();
  for (const row of x) {
    distinct.add(JSON.stringify(row));
    if (distinct.size >= k) break;
  }
  const distinctAtLeastK = distinct.size >= k;
  const updateLabels = () => {
    labels = logU.map((row) => {
      let best = 0;
      for (let j = 1; j < k; j++) if (row[j] > row[best]) best = j;
      return best;
    });
    counts = Array(k).fill(0) as number[];
    for (const label of labels) counts[label]++;
  };
  const emit = (
    kind: EventKind,
    phase: string,
    description: string,
    metric = false,
    final = false,
  ) => {
    let coincidentCenters = 0;
    if (centroids.length === k)
      for (let a = 0; a < k; a++)
        for (let b = a + 1; b < k; b++)
          if (centerMovement([centroids[a]], [centroids[b]]) === 0)
            coincidentCenters++;
    const keep = record || final,
      analysis: FpcmAnalysis = {
        kind: "fuzzy-possibilistic",
        method: "FPCM1997",
        phase,
        dimensions: d,
        dimensionBounds: bounds,
        centroids,
        initialization,
        memberships: keep ? u : [],
        typicalities: keep ? t : [],
        distancesSquared: keep ? distances : [],
        warmCenters,
        warmMemberships: warmDone ? warmMemberships : record ? u : [],
        warmObjective,
        warmIteration,
        warmConverged,
        iteration,
        fuzziness: m,
        exponent: eta,
        matricesRecorded: keep,
        weightsReady,
        uRowSums,
        tColumnSums,
        tRowSums,
        effectiveWeights,
        logEffectiveWeights,
        counts,
        ...costs,
        movement,
        fixedPointResidual,
        coincidentCenters,
        distinctAtLeastK,
        roundedWeights: effectiveWeights.filter((v) => v === 0).length,
        converged,
        stopReason,
      };
    r.emit(
      kind,
      description,
      {
        labels,
        centers: projectedCenters(centroids, bounds),
        ...(keep ? { responsibilities: u } : {}),
        analysis,
        ...(metric
          ? {
              metric: [...r.state.metric, costs.objective],
              metricName: "FPCM1997 목적함수 (U 행/T 열 제약)",
            }
          : {}),
      },
      { iteration, objective: costs.objective },
    );
    if (r.state.analysis?.kind === "fuzzy-possibilistic") {
      const a = r.state.analysis;
      bounds = a.dimensionBounds;
      initialization = a.initialization;
      warmCenters = a.warmCenters;
      if (warmDone) warmMemberships = a.warmMemberships;
      uRowSums = a.uRowSums;
      tColumnSums = a.tColumnSums;
      tRowSums = a.tRowSums;
      effectiveWeights = a.effectiveWeights;
      logEffectiveWeights = a.logEffectiveWeights;
      counts = a.counts;
    }
  };
  copInitialIndices(x, k, o.seed, (ids) => {
    initialization = ids;
    centroids = ids.map((i) => [...x[i]]);
    emit("initialize", "seed", `원본 ND 초기 중심 ${ids.length}/${k}.`);
  });
  const fuzzy = () => {
    const normalized = ndMemberships(distances, m);
    u = normalized.memberships;
    logU = normalized.logs;
    updateLabels();
    warmObjective = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < k; j++)
        if (distances[i][j] > 0)
          warmObjective += Math.exp(m * logU[i][j] + Math.log(distances[i][j]));
    if (!Number.isFinite(warmObjective))
      throw Error("FPCM 준비 FCM 목적 overflow.");
  };
  distances = distancesSquared(x, centroids);
  fuzzy();
  emit("expectation", "warm-u", "원본 ND FCM 준비 U 행 정규화.");
  for (warmIteration = 1; warmIteration <= o.warmIterations; warmIteration++) {
    const next = logWeightedCenters(x, logU, m);
    movement = centerMovement(centroids, next.centers);
    centroids = next.centers;
    distances = distancesSquared(x, centroids);
    warmObjective = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < k; j++)
        if (distances[i][j] > 0)
          warmObjective += Math.exp(m * logU[i][j] + Math.log(distances[i][j]));
    if (!Number.isFinite(warmObjective))
      throw Error("FPCM 준비 FCM 목적 overflow.");
    emit("maximization", "warm-mean", "실제 u^m 원본 ND 평균.");
    fuzzy();
    emit("expectation", "warm-u", "갱신된 중심에서 ND FCM U와 목적.");
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
    "warm-complete",
    "실제 ND FCM 비교 기준을 보존했습니다. FPCM의 U/T와 다른 모형입니다.",
  );
  const updateU = () => {
    const normalized = ndMemberships(distances, m);
    u = normalized.memberships;
    logU = normalized.logs;
    uRowSums = u.map((row) => row.reduce((s, v) => s + v, 0));
    updateLabels();
  };
  const updateT = () => {
    const normalized = fpcmTypicalities(distances, eta);
    t = normalized.typicalities;
    logT = normalized.logs;
    tColumnSums = Array.from({ length: k }, (_, j) =>
      t.reduce((s, row) => s + row[j], 0),
    );
    tRowSums = t.map((row) => row.reduce((s, v) => s + v, 0));
    weightsReady = true;
  };
  for (iteration = 1; iteration <= o.iterations; iteration++) {
    distances = distancesSquared(x, centroids);
    emit("distance", "distances", "모든 원본 행·중심의 ND 제곱거리.");
    updateU();
    if (weightsReady) {
      costs = fpcmObjective(distances, logU, logT, m, eta);
      const current = fpcmCenters(x, logU, logT, m, eta);
      effectiveWeights = current.masses;
      logEffectiveWeights = current.logMasses;
    }
    emit(
      "expectation",
      "u-update",
      "FPCM U: 각 표본의 모든 군집에 대해 행 합1.",
    );
    updateT();
    costs = fpcmObjective(distances, logU, logT, m, eta);
    const next = fpcmCenters(x, logU, logT, m, eta);
    effectiveWeights = next.masses;
    logEffectiveWeights = next.logMasses;
    emit(
      "typicality",
      "t-update",
      "FPCM T: 각 군집의 모든 원본 표본에 대해 열 합1. 행 정규화하지 않습니다.",
      true,
    );
    movement = centerMovement(centroids, next.centers);
    centroids = next.centers;
    distances = distancesSquared(x, centroids);
    costs = fpcmObjective(distances, logU, logT, m, eta);
    emit("move", "mean-update", "실제 (U^m+T^η) 원본 가중 평균과 목적.", true);
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
  updateU();
  updateT();
  costs = fpcmObjective(distances, logU, logT, m, eta);
  const next = fpcmCenters(x, logU, logT, m, eta);
  effectiveWeights = next.masses;
  logEffectiveWeights = next.logMasses;
  fixedPointResidual = centerMovement(centroids, next.centers);
  emit(
    "typicality",
    "final-weights",
    "반환 중심에서 U/T를 재평가하고 실제 평균 고정점 잔차를 계산했습니다.",
    true,
    true,
  );
  emit(
    "finish",
    "complete",
    `FPCM1997 종료: ${stopReason}. U 행 합1/T 열 합1, 표본 복제 불변 모형이 아닙니다.`,
    false,
    true,
  );
}
