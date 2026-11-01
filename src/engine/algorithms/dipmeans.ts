import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { AutoDecision } from "../autoTypes";
import { random } from "../math";
import {
  average,
  baseAnalysis,
  checkedRows,
  initialCenters,
  seedModel,
  candidateLloyd,
  squared,
  traceLloyd,
} from "./autoCommon";

/** Independent geometric envelope implementation of the Hartigan dip statistic.
 * Rebuilds monotone convex hulls on each modal interval rather than AS217's
 * linked-index arrays. Values are in empirical ranks until the final 2n scale.
 */
export function hartiganDip(values: number[]) {
  const x = values.slice().sort((a, b) => a - b),
    n = x.length;
  if (x.some((v) => !Number.isFinite(v)))
    throw new Error("Dip 입력은 유한해야 합니다.");
  if (n < 4 || x[0] === x[n - 1]) return 0;
  const scale = x[n - 1] - x[0];
  if (!Number.isFinite(scale))
    throw new Error("수치 불안정: Dip 범위가 유한하지 않습니다.");
  // A power-of-two rescale preserves binary collinearity. Subtracting the
  // minimum and dividing by an arbitrary range can create spurious hull bends
  // for exactly equally spaced samples (whose allow-zero dip is zero).
  const largest = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const exponent = Math.max(
    -1022,
    Math.min(1022, Math.floor(Math.log2(largest))),
  );
  const z = x.map((v) => v * 2 ** -exponent);
  let low = 0,
    high = n - 1,
    bound = 0;
  const hull = (lo: number, hi: number, lower: boolean) => {
    const chain: number[] = [];
    for (let c = lo; c <= hi; c++) {
      while (chain.length >= 2) {
        const a = chain[chain.length - 2],
          b = chain[chain.length - 1];
        const left = (z[b] - z[a]) * (c - b),
          right = (b - a) * (z[c] - z[b]);
        const turn = left - right;
        if (lower ? turn > 0 : turn < 0) break;
        chain.pop();
      }
      chain.push(c);
    }
    return chain;
  };
  const line = (a: number, b: number, v: number) =>
    a + ((z[v] - z[a]) * (b - a)) / (z[b] - z[a]);
  for (let contraction = 0; contraction < n; contraction++) {
    const lower = hull(low, high, true),
      upper = hull(low, high, false);
    if (lower.length === 2 && upper.length === 2) break;
    let gap = 0,
      newLow = low,
      newHigh = high;
    // A piecewise-linear envelope difference attains its maximum at a vertex.
    let lowerSegment = 0;
    for (let j = 1; j < upper.length - 1; j++) {
      const v = upper[j];
      while (lowerSegment + 1 < lower.length && lower[lowerSegment + 1] < v)
        lowerSegment++;
      const k = lowerSegment;
      const a = lower[k],
        b = lower[Math.min(k + 1, lower.length - 1)];
      if (z[b] > z[a]) {
        const d = v - line(a, b, v) + 1;
        if (d >= gap) {
          gap = d;
          newLow = a;
          newHigh = v;
        }
      }
    }
    let upperSegment = 0;
    for (let j = 1; j < lower.length - 1; j++) {
      const v = lower[j];
      while (upperSegment + 1 < upper.length && upper[upperSegment + 1] < v)
        upperSegment++;
      const k = upperSegment;
      const a = upper[k],
        b = upper[Math.min(k + 1, upper.length - 1)];
      if (z[b] > z[a]) {
        const d = line(a, b, v) - v + 1;
        if (d >= gap) {
          gap = d;
          newLow = v;
          newHigh = b;
        }
      }
    }
    if (gap < bound) break;
    // Tail deviations from each supporting segment; both sides of ECDF jumps
    // matter, hence the rank ±1 terms below.
    for (let j = 0; j + 1 < lower.length && lower[j] < newLow; j++) {
      const a = lower[j],
        b = lower[j + 1];
      let deviation = 1;
      if (z[b] > z[a])
        for (let v = a; v <= b; v++)
          deviation = Math.max(deviation, v - line(a, b, v) + 1);
      bound = Math.max(bound, deviation);
    }
    for (let j = 0; j + 1 < upper.length; j++)
      if (upper[j + 1] > newHigh) {
        const a = upper[j],
          b = upper[j + 1];
        let deviation = 1;
        if (z[b] > z[a])
          for (let v = a; v <= b; v++)
            deviation = Math.max(deviation, line(a, b, v) - v + 1);
        bound = Math.max(bound, deviation);
      }
    if (newLow === low && newHigh === high) break;
    low = newLow;
    high = newHigh;
  }
  return bound / (2 * n);
}

export function dipmeans(p: Point[], o: Params, r: Recorder, input?: Dataset) {
  const x = checkedRows(p, o, input);
  if (
    !Number.isInteger(o.bootstrapSamples) ||
    o.bootstrapSamples < 1 ||
    !Number.isFinite(o.significance) ||
    o.significance < 0 ||
    o.significance >= 1 ||
    !(o.splitViewFraction > 0 && o.splitViewFraction <= 1) ||
    !Number.isInteger(o.minSamples) ||
    o.minSamples < 4
  )
    throw new Error(
      "Dip-Means의 bootstrap 횟수·유의수준·viewer 비율·최소 표본을 확인하세요.",
    );
  const rng = random(o.seed),
    bootstrap = new Map<number, number[]>();
  const nullDips = (n: number) => {
    if (!bootstrap.has(n))
      bootstrap.set(
        n,
        Array.from({ length: o.bootstrapSamples }, () =>
          hartiganDip(Array.from({ length: n }, () => rng())),
        ),
      );
    return bootstrap.get(n)!;
  };
  let model = seedModel(x, initialCenters(x, o.k, o.seed)),
    decisions: AutoDecision[] = [],
    limit = false;
  r.trace.recording!.policy =
    "전체 원본 각 viewer의 실제 거리 dip와 시드 Uniform bootstrap 검정 · 표본 viewer 생략 없음";
  r.emit(
    "initialize",
    "원본 전체 거리분포의 Hartigan dip 단봉성 검정을 수행합니다.",
    {
      labels: model.labels,
      centers: [],
      analysis: baseAnalysis("Dip-Means", x, model.centers),
    },
  );
  for (let round = 0; round < o.maxClusters; round++) {
    model = traceLloyd(x, model.centers, o, r, {
      ...baseAnalysis("Dip-Means", x, model.centers),
      decisions,
    });
    if (model.centers.length >= Math.min(o.maxClusters, x.length)) {
      limit = true;
      break;
    }
    decisions = [];
    let chosen = -1,
      highest = 0,
      chosenDistances: number[] = [];
    for (let cluster = 0; cluster < model.centers.length; cluster++) {
      const subset = x.filter((_, i) => model.labels[i] === cluster);
      if (subset.length < o.minSamples) continue;
      const reference = nullDips(subset.length),
        splitDips: number[] = [];
      let strongest: number[] = [],
        strongestDip = -1;
      for (const viewer of subset) {
        const distances = subset
            .map((row) => Math.sqrt(squared(row, viewer)))
            .sort((a, b) => a - b),
          dip = hartiganDip(distances);
        const probability =
          reference.filter((v) => v >= dip).length / reference.length;
        if (probability <= o.significance) {
          splitDips.push(dip);
          if (dip > strongestDip) {
            strongestDip = dip;
            strongest = distances;
          }
        }
      }
      const fraction = splitDips.length / subset.length,
        score =
          fraction >= o.splitViewFraction && splitDips.length
            ? splitDips.reduce((a, b) => a + b, 0) / splitDips.length
            : 0;
      if (score > highest) {
        highest = score;
        chosen = cluster;
        chosenDistances = strongest;
      }
      decisions.push({
        cluster,
        accepted: false,
        statistic: score,
        threshold: 0,
        reason: score > 0 ? "분할 후보" : "충분한 split viewer 없음",
        viewers: splitDips.length,
        viewerFraction: fraction,
      });
      r.emit(
        "test",
        `군집 ${cluster + 1}: ${splitDips.length}/${subset.length} viewer가 단봉성을 기각, 평균 dip score=${score.toFixed(6)}`,
        {
          focus: model.labels
            .map((v, i) => (v === cluster ? i : -1))
            .filter((i) => i >= 0),
          analysis: {
            ...baseAnalysis("Dip-Means", x, model.centers),
            phase: "viewer-test",
            decisions,
            projections: strongest,
            testValues: reference,
          },
        },
        { score, viewerFraction: fraction, bootstrap: o.bootstrapSamples },
      );
    }
    if (chosen < 0) break;
    const subset = x.filter((_, i) => model.labels[i] === chosen),
      center = average(subset);
    const noncentral = subset.filter((row) => squared(row, center) > 0);
    if (!noncentral.length) break;
    const a = noncentral[Math.floor(rng() * noncentral.length)],
      b = center.map((v, j) => 2 * v - a[j]);
    const children = candidateLloyd(
      subset,
      [a, b],
      o,
      r,
      { ...baseAnalysis("Dip-Means", x, model.centers), decisions },
      chosen,
    );
    if (children.centers.length < 2) break;
    decisions = decisions.map((d) => ({
      ...d,
      accepted: d.cluster === chosen,
    }));
    const centers = model.centers.flatMap((c, j) =>
      j === chosen ? children.centers : [c],
    );
    r.emit(
      "split",
      "score가 가장 큰 군집 하나만 실제 2-Means로 분할합니다.",
      {
        focus: [],
        analysis: {
          ...baseAnalysis("Dip-Means", x, centers),
          phase: "split",
          decisions,
          projections: chosenDistances,
        },
      },
      { cluster: chosen, score: highest },
    );
    model = seedModel(x, centers);
  }
  r.emit(
    "finish",
    limit
      ? "사용자 최대 K에서 종료했습니다. 추가 단봉성 분할 가능성이 남아 있습니다."
      : "충분한 split viewer를 가진 분할 후보가 없습니다. bootstrap 비기각은 단봉성의 증명이 아닙니다.",
    {
      labels: model.labels,
      focus: [],
      centers: [],
      analysis: {
        ...baseAnalysis("Dip-Means", x, model.centers),
        phase: "finish",
        decisions,
        converged: model.converged && !limit,
      },
    },
    {
      clusters: model.centers.length,
      converged: String(model.converged),
      maxKReached: String(limit),
    },
  );
}
