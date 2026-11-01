import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { AutoDecision } from "../autoTypes";
import {
  baseAnalysis,
  checkedRows,
  initialCenters,
  seedModel,
  candidateLloyd,
  principalChildren,
  traceLloyd,
  vectorNorm,
} from "./autoCommon";

/** log Φ(z): a convergent Laplace continued fraction for tails, Simpson near zero. */
export function logNormalCDF(z: number): number {
  if (!Number.isFinite(z)) throw new Error("정규 CDF 입력은 유한해야 합니다.");
  if (z > 0) return Math.log1p(-Math.exp(logNormalCDF(-z)));
  const a = -z;
  if (a >= 1) {
    let tail = 0;
    for (let j = 512; j >= 1; j--) tail = j / (a + tail);
    return (-a * a) / 2 - Math.log(2 * Math.PI) / 2 - Math.log(a + tail);
  }
  const steps = 512,
    h = a / steps;
  let total = 1 + Math.exp((-a * a) / 2);
  for (let j = 1; j < steps; j++)
    total += (j % 2 ? 4 : 2) * Math.exp(-((j * h) ** 2) / 2);
  return Math.log(0.5 - (h * total) / (3 * Math.sqrt(2 * Math.PI)));
}
export function gaussianAD(values: number[]) {
  const n = values.length;
  if (n < 8)
    throw new Error("G-Means 정규성 검정은 최소 8개 표본을 요구합니다.");
  const mean = values.reduce((s, v) => s + v / n, 0),
    variance = values.reduce((s, v) => s + (v - mean) ** 2 / (n - 1), 0);
  if (!Number.isFinite(variance))
    throw new Error("정규성 검정 분산이 유한하지 않습니다.");
  if (!variance) {
    if (values.some((v) => v !== values[0]))
      throw new Error("수치 불안정: 정규성 검정 분산이 underflow했습니다.");
    return { statistic: 0, standardized: values.map(() => 0) };
  }
  const standardized = values
    .map((v) => (v - mean) / Math.sqrt(variance))
    .sort((a, b) => a - b);
  const sum = standardized.reduce(
    (s, z, i) =>
      s +
      (2 * (i + 1) - 1) *
        (logNormalCDF(z) + logNormalCDF(-standardized[n - i - 1])),
    0,
  );
  const statistic = Math.max(0, (-n - sum / n) * (1 + 4 / n - 25 / (n * n)));
  return { statistic, standardized };
}
export const gmeansCritical = new Map([[0.0001, 1.8692]]);
export function gmeans(p: Point[], o: Params, r: Recorder, input?: Dataset) {
  const x = checkedRows(p, o, input),
    critical = gmeansCritical.get(o.significance);
  if (critical === undefined)
    throw new Error(
      "G-Means 유의수준은 지원되는 원문/Stephens 임계값 수준을 선택하세요.",
    );
  if (!Number.isInteger(o.minSamples) || o.minSamples < 8)
    throw new Error("G-Means 최소 검정 표본은 8 이상이어야 합니다.");
  let centers = initialCenters(x, o.k, o.seed),
    model = seedModel(x, centers),
    decisions: AutoDecision[] = [],
    maxReached = false;
  r.emit(
    "initialize",
    "실제 2-Means 분할 방향의 정규성 검정으로 K를 늘립니다.",
    {
      labels: model.labels,
      centers: [],
      analysis: baseAnalysis("G-Means", x, model.centers),
    },
  );
  for (let round = 0; round < o.maxClusters; round++) {
    model = traceLloyd(x, model.centers, o, r, {
      ...baseAnalysis("G-Means", x, model.centers),
      decisions,
    });
    if (model.centers.length >= Math.min(o.maxClusters, x.length)) {
      maxReached = true;
      break;
    }
    const next: number[][] = [];
    decisions = [];
    for (let cluster = 0; cluster < model.centers.length; cluster++) {
      const subset = x.filter((_, i) => model.labels[i] === cluster);
      if (subset.length < o.minSamples) {
        next.push(model.centers[cluster]);
        continue;
      }
      const seeds = principalChildren(subset);
      if (!seeds) {
        next.push(model.centers[cluster]);
        continue;
      }
      const children = candidateLloyd(
        subset,
        seeds,
        o,
        r,
        { ...baseAnalysis("G-Means", x, model.centers), decisions },
        cluster,
      );
      if (children.centers.length !== 2) {
        next.push(model.centers[cluster]);
        continue;
      }
      const direction = children.centers[0].map(
          (v, j) => v - children.centers[1][j],
        ),
        norm = vectorNorm(direction);
      if (!norm) {
        next.push(model.centers[cluster]);
        continue;
      }
      const projected = subset.map((row) =>
        row.reduce((s, v, j) => s + (v * direction[j]) / norm, 0),
      );
      const { statistic, standardized } = gaussianAD(projected),
        room =
          next.length + 2 + (model.centers.length - cluster - 1) <=
          o.maxClusters;
      const accepted = statistic > critical && room;
      decisions.push({
        cluster,
        accepted,
        statistic,
        threshold: critical,
        reason: !room
          ? "사용자 최대 K"
          : accepted
            ? "정규성 기각"
            : "정규성 기각 근거 없음",
      });
      r.emit(
        "test",
        `군집 ${cluster + 1}: 실제 A²*=${statistic.toFixed(6)}, 임계값 ${critical} · ${accepted ? "분할 수용" : "부모 유지"}`,
        {
          focus: model.labels
            .map((v, i) => (v === cluster ? i : -1))
            .filter((i) => i >= 0),
          analysis: {
            ...baseAnalysis("G-Means", x, model.centers),
            phase: "normality-test",
            decisions,
            projections: standardized,
            proposedCentroids: children.centers,
          },
        },
        { statistic, critical, accepted: String(accepted) },
      );
      next.push(...(accepted ? children.centers : [model.centers[cluster]]));
    }
    if (next.length === model.centers.length) break;
    centers = next;
    r.emit(
      "split",
      "기각된 부모를 실제 두 자식으로 교체한 뒤 전체 원본으로 정제합니다.",
      {
        focus: [],
        analysis: {
          ...baseAnalysis("G-Means", x, centers),
          phase: "split",
          decisions,
        },
      },
      { clusters: centers.length },
    );
    model = seedModel(x, centers);
  }
  r.emit(
    "finish",
    maxReached
      ? "사용자 최대 K로 종료했습니다. 모든 정규성 가설의 채택을 뜻하지 않습니다."
      : "더 수용할 정규성 분할이 없습니다. 비기각은 정규분포의 증명이 아닙니다.",
    {
      labels: model.labels,
      centers: [],
      focus: [],
      analysis: {
        ...baseAnalysis("G-Means", x, model.centers),
        phase: "finish",
        decisions,
        converged: model.converged && !maxReached,
      },
    },
    {
      clusters: model.centers.length,
      converged: String(model.converged),
      maxKReached: String(maxReached),
    },
  );
}
