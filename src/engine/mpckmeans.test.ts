import { describe, it, expect } from "vitest";
import reference from "../../docs/research/mpck-reference.json";
import { mpckmeans } from "./algorithms/mpckmeans";
import { algorithmDefaults, type Params } from "./types";
import { Recorder, stateAt, applyStep } from "./trace";
import { displayPoints, type ConstrainedDataset } from "./dataset";
import { nativeResult, runDataset } from "./datasetExecution";
import {
  recommendations,
  generateForRecommendation,
  recommendationParams,
} from "../data/recommendations";
interface Case {
  name: string;
  values: number[][];
  mustLink?: number[][];
  cannotLink?: number[][];
  params?: Partial<Params>;
}
interface Expected {
  error?: string;
  centroids: number[][];
  metrics: number[][];
  labels: number[];
  iteration: number;
  converged: boolean;
  objective: number;
  distanceCost: number;
  logDetCost: number;
  mustLinkCost: number;
  cannotLinkCost: number;
  mustViolations: number;
  cannotViolations: number;
  states: {
    iteration: number;
    centroids: number[][];
    metrics: number[][];
    labels: number[];
    denominators: number[][];
    objective: number;
    assignments: {
      current: number;
      chosen: number;
      labels: number[];
      globalCosts: number[];
    }[];
  }[];
}
function calculate(input: Case, patch: Partial<Params> = {}) {
  const data: ConstrainedDataset = {
    kind: "constrained",
    data: { kind: "numeric", values: input.values },
    mustLink: (input.mustLink ?? []) as [number, number][],
    cannotLink: (input.cannotLink ?? []) as [number, number][],
  };
  const o = {
      ...algorithmDefaults("MPCKMeans"),
      iterations: 20,
      tolerance: 1e-9,
      metricTolerance: 1e-9,
      ...input.params,
      ...patch,
    },
    r = new Recorder(input.values.length, "MPCKMeans");
  mpckmeans(displayPoints(data), o, r, data);
  return { r, o, data };
}
const close = (a: number, b: number) => {
  expect(Number.isFinite(a)).toBe(true);
  expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-7 * Math.max(1, Math.abs(b)));
};
const matrix = (a: number[][], b: number[][]) => {
  expect(a.length).toBe(b.length);
  a.forEach((row, i) => {
    expect(row.length).toBe(b[i].length);
    row.forEach((v, j) => close(v, b[i][j]));
  });
};
describe("MPCKMeans independent NumPy/SciPy full objective oracle", () => {
  for (const entry of reference.cases)
    it(entry.input.name, () => {
      const input = entry.input as Case,
        ref = entry.result as unknown as Expected;
      if (ref.error) {
        expect(() => calculate(input)).toThrow(/모순|특이|분모/);
        return;
      }
      const { r } = calculate(input),
        a = r.state.analysis;
      if (a?.kind !== "metric-pairwise") throw Error("metric state");
      matrix(a.centroids, ref.centroids);
      matrix(a.metrics, ref.metrics);
      expect(r.state.labels).toEqual(ref.labels);
      expect(a.iteration).toBe(ref.iteration);
      expect(a.converged).toBe(ref.converged);
      for (const key of [
        "distanceCost",
        "logDetCost",
        "mustLinkCost",
        "cannotLinkCost",
        "objective",
        "mustViolations",
        "cannotViolations",
      ] as const)
        close(a[key], ref[key]);
      let state = r.trace.initial,
        index = 0,
        assignment = 0,
        sweep = 0;
      for (const step of r.trace.steps) {
        state = applyStep(state, step);
        expect(stateAt(r.trace, ++index)).toEqual(state);
        const current = state.analysis;
        if (current?.kind !== "metric-pairwise") continue;
        if (current.phase === "point-assign") {
          const expected = ref.states[sweep].assignments[assignment++];
          expect(current.current).toBe(expected.current);
          expect(current.chosen).toBe(expected.chosen);
          expect(state.labels).toEqual(expected.labels);
          const candidates = current.candidates!;
          const origin = candidates[0].total;
          candidates.forEach((v, h) =>
            close(
              v.total - origin,
              expected.globalCosts[h] - expected.globalCosts[0],
            ),
          );
        }
        if (current.phase === "metric-update") {
          const expected = ref.states[sweep++];
          assignment = 0;
          matrix(current.centroids, expected.centroids);
          matrix(current.metrics, expected.metrics);
          matrix(current.denominators, expected.denominators);
          close(current.objective, expected.objective);
          expect(state.labels).toEqual(expected.labels);
          current.diameters.forEach((v, h) => {
            let max = 0;
            for (let i = 0; i < input.values.length; i++)
              for (let j = i + 1; j < input.values.length; j++)
                max = Math.max(
                  max,
                  input.values[i].reduce(
                    (s, x, q) =>
                      s + current.metrics[h][q] * (x - input.values[j][q]) ** 2,
                    0,
                  ),
                );
            close(v.value, max);
          });
        }
      }
      expect(sweep).toBe(ref.states.length);
      for (let i = r.trace.steps.length - 1; i >= 0; i--) {
        state = applyStep(state, r.trace.steps[i], true);
        expect(state).toEqual(stateAt(r.trace, i));
      }
      expect(state).toEqual(r.trace.initial);
      expect(nativeResult(r.state).kind).toBe("metric-pairwise-partition");
    });
});
it("verifies independent SciPy gradients, witness switching and all 16 full objectives", () => {
  const g = reference.gradient;
  g.analytic.forEach((row, h) =>
    row.forEach((v, q) => close(v, g.finiteDifference[h][q])),
  );
  expect(g.beforePairs).not.toEqual(g.afterPairs);
  // Independent full cost enumeration has every label assignment, including finite violations.
  expect(reference.enumeration).toHaveLength(16);
  expect(reference.enumeration.some((v) => v.cannotViolations > 0)).toBe(true);
  const distance = (i: number, j: number, h: number) =>
    g.values[i].reduce(
      (s, v, q) => s + g.metrics[h][q] * (v - g.values[j][q]) ** 2,
      0,
    );
  for (const expected of reference.enumeration) {
    const z = expected.labels;
    let value = g.values.reduce(
      (s, row, i) =>
        s +
        row.reduce(
          (t, v, q) => t + g.metrics[z[i]][q] * (v - g.centroids[z[i]][q]) ** 2,
          0,
        ) -
        g.metrics[z[i]].reduce((t, v) => t + Math.log(v), 0),
      0,
    );
    for (const [i, j] of g.mustLink)
      if (z[i] !== z[j])
        value +=
          g.penalty * 0.5 * (distance(i, j, z[i]) + distance(i, j, z[j]));
    for (const [i, j] of g.cannotLink)
      if (z[i] === z[j]) {
        let max = 0;
        for (let a = 0; a < g.values.length; a++)
          for (let b = a + 1; b < g.values.length; b++)
            max = Math.max(max, distance(a, b, z[i]));
        value += g.penalty * (max - distance(i, j, z[i]));
      }
    close(value, expected.objective);
  }
});
it("uses original ND regardless of display coordinates and returns the native metrics", async () => {
  const c = reference.cases.find(
    (v) => v.input.name === "nd-zero-xy-conditioned",
  )!;
  const { r, o, data } = calculate(c.input as Case);
  data.data.display = data.data.values.map(() => ({ x: 0.4, y: 0.4 }));
  const run = await runDataset("MPCKMeans", data, o);
  expect(run.output).toEqual(nativeResult(r.state));
});
it("retains full computation in summary mode and rejects resource/invalid parameters", () => {
  const values = Array.from({ length: 100 }, (_, i) => [
    (i < 50 ? -3 : 3) + Math.sin(i) * 0.2,
    Math.cos(i) * 0.3,
  ]);
  const { r } = calculate({ name: "summary", values }, { iterations: 2 });
  expect(r.trace.recording?.policy).toContain("sweep 요약");
  expect(r.state.labels).toHaveLength(100);
  expect(
    r.trace.steps.some((v) => v.description.includes("전체 원본 최대쌍 탐색")),
  ).toBe(true);
  expect(() =>
    calculate({ name: "bad", values }, { metricConditioning: -1 }),
  ).toThrow(/파라|필요/);
  expect(() =>
    calculate({
      name: "budget",
      values: Array.from(
        { length: 20000 },
        () => Array(600).fill(1) as number[],
      ),
    }),
  ).toThrow(/예산/);
});
it("CL violation on the global maximum pair can have zero penalty", () => {
  const { r } = calculate({
    name: "max",
    values: [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ],
    cannotLink: [[0, 3]],
    params: { k: 1 },
  });
  const a = r.state.analysis;
  if (a?.kind !== "metric-pairwise") throw Error();
  expect(a.cannotViolations).toBe(1);
  close(a.cannotLinkCost, 0);
});
it("all four recommendations run using their own original generators", async () => {
  expect(recommendations.MPCKMeans).toHaveLength(4);
  for (const rec of recommendations.MPCKMeans) {
    const data = generateForRecommendation("MPCKMeans", rec);
    const result = await runDataset(
      "MPCKMeans",
      data,
      recommendationParams("MPCKMeans", rec),
    );
    expect(result.output.kind).toBe("metric-pairwise-partition");
  }
});
