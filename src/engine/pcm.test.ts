import { describe, it, expect } from "vitest";
import fixture from "../../docs/research/pcm-reference.json";
import { pcm } from "./algorithms/pcm";
import { algorithmDefaults, type Params } from "./types";
import { Recorder, stateAt, applyStep } from "./trace";
import { displayPoints, type NumericDataset } from "./dataset";
import {
  pcmTypicalities,
  pcmObjective,
  ndMemberships,
  logWeightedCenters,
} from "./ndFuzzy";
import { memberships as original2DMemberships } from "./algorithms/fuzzy";
import { runDataset } from "./datasetExecution";
import { compactPreview } from "./preview";
import type { PossibilisticAnalysis } from "./possibilisticTypes";

interface ReferenceInput {
  name: string;
  values: number[][];
  params?: Partial<{
    k: number;
    seed: number;
    m: number;
    eta: number;
    kappa: number;
    mode: string;
    scale: number;
    warmIterations: number;
    iterations: number;
    tolerance: number;
  }>;
}

const close = (actual: number, expected: number, unit = 1) =>
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    Math.max(Math.abs(expected) * 1e-7, unit * 1e-8),
  );
const matrix = (actual: number[][], expected: number[][], unit = 1) => {
  expect(actual.length).toBe(expected.length);
  actual.forEach((row, i) => {
    expect(row.length).toBe(expected[i].length);
    row.forEach((value, j) => close(value, expected[i][j], unit));
  });
};
function configuration(input: ReferenceInput): Params {
  const p = {
    k: 2,
    seed: 42,
    m: 2,
    eta: 2,
    kappa: 1,
    mode: "fcm",
    scale: 1,
    warmIterations: 30,
    iterations: 60,
    tolerance: 1e-9,
    ...input.params,
  };
  return {
    ...algorithmDefaults("Possibilistic C-Means"),
    k: p.k,
    seed: p.seed,
    fuzziness: p.m,
    typicalityExponent: p.eta,
    scaleCoefficient: p.kappa,
    pcmScaleMode: p.mode,
    pcmScale: p.scale,
    warmIterations: p.warmIterations,
    iterations: p.iterations,
    tolerance: p.tolerance,
  };
}
function calculate(
  input: ReferenceInput,
  patch: Partial<Params> = {},
  budget?: number,
) {
  const data: NumericDataset = { kind: "numeric", values: input.values },
    o = { ...configuration(input), ...patch },
    r = new Recorder(data.values.length, "Possibilistic C-Means", budget);
  pcm(displayPoints(data), o, r, data);
  return { data, o, r };
}
describe("PCM1993 independent direct-power NumPy AO", () => {
  for (const entry of fixture.cases)
    it(entry.input.name, () => {
      if (!entry.result) {
        expect(() => calculate(entry.input)).toThrow(/Ω/);
        return;
      }
      const ref = entry.result,
        { r, o } = calculate(entry.input),
        a = r.state.analysis;
      if (a?.kind !== "possibilistic")
        throw Error("missing actual PCM analysis");
      const coordinateUnit = Math.max(
          ...entry.input.values.flat().map(Math.abs),
          1e-150,
        ),
        costUnit = coordinateUnit ** 2 * entry.input.values.length * o.k;
      expect(a.initialization).toEqual(ref.initialIndices);
      matrix(a.warmCenters, ref.warmCenters, coordinateUnit);
      matrix(a.warmMemberships, ref.warmMemberships);
      matrix(a.centroids, ref.centroids, coordinateUnit);
      matrix(a.typicalities, ref.typicalities);
      matrix(a.distancesSquared, ref.distances, coordinateUnit ** 2);
      a.scales.forEach((v, h) => close(v, ref.scales[h], coordinateUnit ** 2));
      a.effectiveWeights.forEach((v, h) => close(v, ref.effectiveWeights[h]));
      a.logEffectiveWeights.forEach((v, h) =>
        close(v, ref.logEffectiveWeights[h]),
      );
      for (const field of ["distanceCost", "penaltyCost", "objective"] as const)
        close(a[field], ref[field], costUnit);
      close(a.fixedPointResidual, ref.fixedPointResidual, coordinateUnit);
      expect(a.warmConverged).toBe(ref.warmConverged);
      expect(a.converged).toBe(ref.converged);
      expect(a.stopReason).toBe(ref.stopReason);
      a.rowSums.forEach((v, i) => close(v, ref.rowSums[i]));
      const warmStates: PossibilisticAnalysis[] = [];
      const pcmStates: PossibilisticAnalysis[] = [];
      let state = r.trace.initial;
      r.trace.steps.forEach((step, index) => {
        state = applyStep(state, step);
        expect(stateAt(r.trace, index + 1)).toEqual(state);
        const current = state.analysis;
        if (current?.kind !== "possibilistic") return;
        if (current.phase === "fcm-memberships" && current.warmIteration > 0)
          warmStates.push(current);
        if (
          current.phase === "typicality-update" ||
          current.phase === "mean-update"
        )
          pcmStates.push(current);
        if (current.typicalities.length) {
          const dist = entry.input.values.map((row) =>
            current.centroids.map((center) =>
              row.reduce((s, v, j) => s + (v - center[j]) ** 2, 0),
            ),
          );
          matrix(current.distancesSquared, dist, coordinateUnit ** 2);
          const directDistance = dist.reduce(
            (sum, row, i) =>
              sum +
              row.reduce(
                (s, v, h) =>
                  s + current.typicalities[i][h] ** o.typicalityExponent * v,
                0,
              ),
            0,
          );
          const directPenalty = current.typicalities.reduce(
            (sum, row) =>
              sum +
              row.reduce(
                (s, t, h) =>
                  s + current.scales[h] * (1 - t) ** o.typicalityExponent,
                0,
              ),
            0,
          );
          close(current.objective, directDistance + directPenalty, costUnit);
        }
      });
      expect(warmStates.length).toBe(ref.warmStates.length);
      warmStates.forEach((state, i) => {
        matrix(state.centroids, ref.warmStates[i].centroids, coordinateUnit);
        matrix(state.warmMemberships, ref.warmStates[i].memberships);
        close(state.warmObjective, ref.warmStates[i].objective, costUnit);
      });
      expect(pcmStates.length).toBe(ref.states.length);
      pcmStates.forEach((state, i) => {
        expect(state.phase).toBe(ref.states[i].phase);
        matrix(state.centroids, ref.states[i].centroids, coordinateUnit);
        matrix(state.typicalities, ref.states[i].typicalities);
        close(state.objective, ref.states[i].objective, costUnit);
      });
      for (const step of [...r.trace.steps].reverse())
        state = applyStep(state, step, true);
      expect(state).toEqual(r.trace.initial);
      for (const snapshot of r.trace.snapshots)
        expect(stateAt(r.trace, snapshot.index)).toEqual(snapshot.state);
      for (let j = 1; j < r.state.metric.length; j++)
        expect(r.state.metric[j]).toBeLessThanOrEqual(
          r.state.metric[j - 1] + costUnit * 1e-10,
        );
      const final = pcmTypicalities(a.distancesSquared, a.scales, a.exponent);
      matrix(final.typicalities, a.typicalities);
      const clip = compactPreview(r.trace);
      expect(clip.frames.length).toBeLessThanOrEqual(36);
      expect(clip.frames.at(-1)?.labels).toEqual(r.state.labels);
    });
});
it("retains FUZZY_FORMULAS hand block, scalar optimum and exact FCM normalization distinction", () => {
  const block = fixture.block,
    u = ndMemberships(block.distances, 2),
    t = pcmTypicalities(block.distances, block.scales, 2);
  matrix(u.memberships, block.memberships);
  matrix(t.typicalities, block.typicalities);
  matrix(
    logWeightedCenters(block.values, t.logs, 2).centers,
    block.nextCenters,
  );
  close(
    pcmObjective(block.distances, t.logs, block.scales, 2).objective,
    block.beforeMove.objective,
  );
  expect(t.typicalities[1].reduce((a, b) => a + b, 0)).toBeGreaterThan(1.1);
  u.memberships.forEach((row) =>
    close(
      row.reduce((a, b) => a + b, 0),
      1,
    ),
  );
  const point = pcmTypicalities([[4]], [1], 2);
  close(point.typicalities[0][0], fixture.scalar.typicality);
  close(pcmObjective([[4]], point.logs, [1], 2).objective, 0.8);
  expect(fixture.scalar.gridMinimumTypicality).toBe(0.2);
  close(fixture.scalar.derivative, 0);
  matrix(
    original2DMemberships(
      block.values.map((row) => ({ x: row[0], y: 0 })),
      block.centroids.map((row) => ({ x: row[0], y: 0 })),
      2,
    ),
    u.memberships,
  );
});
it("constant auto scales fail, explicit positive scales return diagnosed degeneracy without epsilon", () => {
  const input = fixture.cases.find(
      (c) => c.input.name === "constant-manual",
    )!.input,
    { r } = calculate(input),
    a = r.state.analysis;
  if (a?.kind !== "possibilistic") throw Error("missing");
  expect(a.distinctAtLeastK).toBe(false);
  expect(a.coincidentCenters).toBe(3);
  expect(a.scales).toEqual([1, 1, 1]);
  expect(a.rowSums).toEqual([3, 3, 3]);
  expect(a.counts).toEqual([3, 0, 0]);
  a.effectiveWeights.forEach((value) => close(value, 3));
  expect(() => calculate(input, { pcmScaleMode: "fcm" })).toThrow(/epsilon/);
});
it("log-domain positive ratios survive rounded-zero typicalities and effective masses", () => {
  const input = fixture.cases[0].input,
    { r } = calculate(input, {
      pcmScaleMode: "manual",
      pcmScale: Number.MIN_VALUE,
      iterations: 2,
      tolerance: 0,
    }),
    a = r.state.analysis;
  if (a?.kind !== "possibilistic") throw Error("missing");
  expect(a.roundedTypicalities).toBeGreaterThan(0);
  expect(a.logTypicalities.flat().every(Number.isFinite)).toBe(true);
  expect(a.centroids.flat().every(Number.isFinite)).toBe(true);
  const initial = r.trace.steps
    .map((_, i) => stateAt(r.trace, i + 1).analysis)
    .find(
      (a) =>
        a?.kind === "possibilistic" &&
        a.weightsBasis === "pcm" &&
        a.underflowWeights > 0,
    );
  expect(initial).toBeDefined();
});
it("same original ND source and seed reproduce; custom display/labels never enter calculation", async () => {
  const input = fixture.cases[1].input,
    { data, o, r } = calculate(input),
    changed = {
      ...data,
      display: data.values.map(() => ({ x: 999, y: -999 })),
      labels: data.values.map(() => 8),
    };
  const second = new Recorder(data.values.length, "Possibilistic C-Means");
  pcm(displayPoints(changed), o, second, changed);
  expect(second.state).toEqual(r.state);
  const repeated = calculate(input).r;
  expect(repeated.trace).toEqual(r.trace);
  const native = await runDataset("Possibilistic C-Means", changed, o);
  expect(native.computedRows).toBe(4);
  expect(native.sourceDimensions).toBe(3);
  expect(native.output.kind).toBe("typicalities-and-centers");
  if (native.output.kind !== "typicalities-and-centers")
    throw Error("missing native output");
  matrix(
    native.output.typicalities,
    r.state.analysis?.kind === "possibilistic"
      ? r.state.analysis.typicalities
      : [],
  );
});
it("seed initialization and a 1000-row summarized Trace retain all original rows and final T cells", () => {
  const input = {
      name: "large",
      values: Array.from({ length: 1000 }, (_, i) => [
        i < 500 ? i * 0.0001 : 3 + i * 0.0001,
        Math.sin(i) * 0.1,
        i % 3,
      ]),
      params: { k: 2, iterations: 100, warmIterations: 50 },
    },
    first = calculate(input),
    a = first.r.state.analysis;
  if (a?.kind !== "possibilistic") throw Error("missing");
  expect(a.typicalities.length).toBe(1000);
  expect(a.typicalities.flat().length).toBe(2000);
  expect(a.counts.reduce((a, b) => a + b, 0)).toBe(1000);
  expect(first.r.trace.recording?.policy).toContain(
    "전체 T/거리 행렬은 최종 기록",
  );
  expect(first.r.trace.recording!.estimatedBytes).toBeLessThan(64 * 1048576);
  expect(
    calculate({ ...input, params: { ...input.params, seed: 137 } }).r.trace
      .steps,
  ).not.toEqual(first.r.trace.steps);
});
it("invalid parameters, lost FCM mass, tiny/huge distances and Trace budget failures are explicit", () => {
  const input = fixture.cases[0].input;
  for (const p of [
    { typicalityExponent: 1 },
    { fuzziness: 1 },
    { scaleCoefficient: 0 },
    { pcmScale: 0 },
    { k: 4 },
    { warmIterations: 0 },
    { pcmScaleMode: "entropy" },
    { seed: NaN },
  ])
    expect(() => calculate(input, p)).toThrow();
  expect(() =>
    logWeightedCenters([[0], [1]], [[-Infinity], [-Infinity]], 2),
  ).toThrow(/가중치/);
  expect(() => calculate({ ...input, values: [[0], [1e200], [4]] })).toThrow(
    /수치/,
  );
  expect(() =>
    calculate({ ...input, values: [[0], [1e-200], [4e-200]] }),
  ).toThrow(/수치/);
  expect(() => calculate(input, {}, 256)).toThrow(/Trace/);
});
