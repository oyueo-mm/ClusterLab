import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { AutoDecision } from "../autoTypes";
import { random } from "../math";
import {
  average,
  assignment,
  baseAnalysis,
  checkedRows,
  initialCenters,
  seedModel,
  candidateLloyd,
  squared,
  traceLloyd,
  vectorNorm,
} from "./autoCommon";

/** The published X-means score (not a corrected spherical-Gaussian MLE BIC). */
export function xmeansBIC(
  x: number[][],
  centers: number[][],
  labels: number[],
) {
  const n = x.length,
    k = centers.length,
    d = x[0].length;
  if (n <= k) return -Infinity;
  const counts = centers.map((_, j) => labels.filter((v) => v === j).length);
  if (counts.some((v) => !v)) return -Infinity;
  const sse = x.reduce((s, row, i) => s + squared(row, centers[labels[i]]), 0);
  if (!Number.isFinite(sse))
    throw new Error("수치 불안정: X-Means SSE가 유한하지 않습니다.");
  if (sse === 0) return Infinity;
  const variance = sse / (n - k);
  if (!(variance > 0 && Number.isFinite(variance)))
    throw new Error("수치 불안정: X-Means 분산이 유효하지 않습니다.");
  const score =
    counts.reduce(
      (ll, size) =>
        ll +
        size * Math.log(size / n) -
        (size / 2) * Math.log(2 * Math.PI) -
        ((size * d) / 2) * Math.log(variance) -
        (size - k) / 2,
      0,
    ) -
    ((k * (d + 1)) / 2) * Math.log(n);
  if (Number.isNaN(score))
    throw new Error("수치 불안정: X-Means BIC가 정의되지 않았습니다.");
  return score;
}
export function xmeans(p: Point[], o: Params, r: Recorder, input?: Dataset) {
  const x = checkedRows(p, o, input),
    rng = random(o.seed);
  let centers = initialCenters(x, o.k, o.seed),
    model = seedModel(x, centers),
    best = model,
    bestScore = -Infinity;
  let decisions: AutoDecision[] = [],
    stopped = false;
  r.emit(
    "initialize",
    "국소 2-Means 분할을 원문 X-Means BIC로 검사합니다. 계산은 원본 전체 차원입니다.",
    {
      centers: [],
      labels: model.labels,
      analysis: baseAnalysis("X-Means", x, model.centers),
    },
  );
  for (let round = 0; round < o.maxClusters; round++) {
    model = traceLloyd(x, model.centers, o, r, {
      ...baseAnalysis("X-Means", x, model.centers),
      decisions,
    });
    const score = xmeansBIC(x, model.centers, model.labels);
    if (score > bestScore || best.centers.length === model.centers.length) {
      best = model;
      bestScore = score;
    }
    if (model.centers.length >= Math.min(o.maxClusters, x.length)) {
      stopped = true;
      break;
    }
    const next: number[][] = [];
    decisions = [];
    for (let cluster = 0; cluster < model.centers.length; cluster++) {
      const subset = x.filter((_, i) => model.labels[i] === cluster),
        center = model.centers[cluster];
      if (
        subset.length < 3 ||
        subset.every((row) => squared(row, center) === 0)
      ) {
        next.push(center);
        continue;
      }
      const scale = Math.sqrt(assignment(subset, [center]).sse / subset.length);
      const direction = center.map(() => rng() - 0.5);
      let norm = vectorNorm(direction);
      if (!norm) {
        direction[0] = 1;
        norm = 1;
      }
      const children = candidateLloyd(
        subset,
        [
          center.map((v, j) => v + (scale * direction[j]) / norm),
          center.map((v, j) => v - (scale * direction[j]) / norm),
        ],
        o,
        r,
        { ...baseAnalysis("X-Means", x, model.centers), decisions },
        cluster,
      );
      const before = xmeansBIC(
          subset,
          [average(subset)],
          Array(subset.length).fill(0),
        ),
        after =
          children.centers.length === 2
            ? xmeansBIC(subset, children.centers, children.labels)
            : -Infinity;
      const room =
        next.length + 2 + (model.centers.length - cluster - 1) <= o.maxClusters;
      const accepted = after > before && room && children.centers.length === 2;
      const decision: AutoDecision = {
        cluster,
        accepted,
        statistic: Number.isFinite(after - before) ? after - before : 0,
        threshold: 0,
        reason: !room
          ? "사용자 최대 K"
          : accepted
            ? "국소 BIC 개선"
            : "국소 BIC 개선 없음",
        before: Number.isFinite(before) ? before : undefined,
        after: Number.isFinite(after) ? after : undefined,
      };
      decisions.push(decision);
      r.emit(
        "test",
        `군집 ${cluster + 1}: 원문 BIC의 부모/두 자식 비교 · ${accepted ? "분할 수용" : "부모 유지"}`,
        {
          focus: model.labels
            .map((v, i) => (v === cluster ? i : -1))
            .filter((i) => i >= 0),
          analysis: {
            ...baseAnalysis("X-Means", x, model.centers),
            phase: "bic-test",
            decisions,
            proposedCentroids: children.centers,
          },
        },
        { accepted: String(accepted), clusters: model.centers.length },
      );
      next.push(...(accepted ? children.centers : [center]));
    }
    if (next.length === model.centers.length) break;
    centers = next;
    r.emit(
      "split",
      "통과한 국소 분할을 함께 적용하고 전체 K-Means를 다시 정제합니다.",
      {
        focus: [],
        analysis: {
          ...baseAnalysis("X-Means", x, centers),
          phase: "split",
          decisions,
        },
      },
      { clusters: centers.length },
    );
    model = seedModel(x, centers);
  }
  // The original search returns the best global score encountered, not necessarily the largest K.
  r.emit(
    "finish",
    "탐색 중 전역 X-Means BIC가 가장 높은 실제 분할을 반환합니다. 원문 점수의 알려진 정규화 한계와 사용자 최대 K를 명시합니다.",
    {
      labels: best.labels,
      focus: [],
      centers: [],
      metric: [...r.state.metric, best.sse],
      analysis: {
        ...baseAnalysis("X-Means", x, best.centers),
        phase: "finish",
        decisions,
        converged: best.converged && !stopped,
      },
    },
    {
      clusters: best.centers.length,
      converged: String(best.converged),
      maxKReached: String(stopped),
    },
  );
}
