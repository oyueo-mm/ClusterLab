import { describe, expect, it } from "vitest";
import { defaults, type Point, type Algorithm, type Params } from "./types";
import { Recorder, applyStep, stateAt } from "./trace";
import {
  affinity,
  pairwiseSquared,
  updateAvailabilities,
  updateResponsibilities,
} from "./algorithms/affinity";
import { densitypeaks } from "./algorithms/densitypeaks";
import type { NumericDataset } from "./dataset";
import oracle from "./fixtures/messages-density-reference.json";

const p = oracle.values.map((v) => ({ x: v[0], y: v[1] }));
const data: NumericDataset = { kind: "numeric", values: oracle.values };
const params = { ...defaults, iterations: 200, k: 2, epsilon: 0.25 };
const partition = (labels: number[]) =>
  labels.map((v) => labels.map((w) => Number(v === w)));
function compute(a: Algorithm, points = p, o = params, input?: NumericDataset) {
  const r = new Recorder(points.length, a);
  (a === "Affinity Propagation" ? affinity : densitypeaks)(points, o, r, input);
  return r.trace;
}
function closeMatrix(actual: number[][], expected: number[][]) {
  actual.forEach((row, i) =>
    row.forEach((v, j) => expect(v).toBeCloseTo(expected[i][j], 11)),
  );
}
it("AP's first actual R/A matrices agree with independent NumPy arithmetic", () => {
  const zero = p.map(() => p.map(() => 0));
  const r = updateResponsibilities(oracle.similarities, zero, zero, 0.7);
  closeMatrix(r, oracle.firstResponsibility);
  closeMatrix(updateAvailabilities(r, zero, 0.7), oracle.firstAvailability);
  // Diagonal availability must be a positive sum, not clipped as off-diagonal.
  expect(
    updateAvailabilities(
      [
        [1, 2],
        [3, 4],
      ],
      [
        [0, 0],
        [0, 0],
      ],
      0.5,
    ),
  ).toEqual([
    [1.5, 0],
    [0, 1],
  ]);
});
it("AP final partition and observed exemplars agree with sklearn 1.7.2", () => {
  const trace = compute("Affinity Propagation", p, params, data),
    state = stateAt(trace, trace.steps.length);
  expect(partition(state.labels)).toEqual(partition(oracle.affinity.labels));
  expect(state.centers.map((c) => c.id).sort()).toEqual(
    [...oracle.affinity.exemplars].sort(),
  );
  expect(state.analysis?.kind === "affinity" && state.analysis.converged).toBe(
    true,
  );
  const messages = trace.steps.filter((s) => s.kind === "messages");
  expect(
    stateAt(trace, trace.steps.indexOf(messages[0]) + 1).analysis?.phase,
  ).toBe("responsibility");
  expect(
    stateAt(trace, trace.steps.indexOf(messages[1]) + 1).analysis?.phase,
  ).toBe("availability");
});
for (const fixture of oracle.density)
  it(`DPC ${fixture.kernel}: rho/delta/parents/gamma/partition match independent NumPy`, () => {
    const trace = compute(
      "Density Peaks / CFSFDP",
      p,
      { ...params, densityKernel: fixture.kernel },
      data,
    );
    const final = stateAt(trace, trace.steps.length);
    const a = final.analysis;
    expect(a?.kind).toBe("density-peaks");
    if (a?.kind !== "density-peaks") throw new Error("Wrong analysis");
    for (const field of ["rho", "delta", "gamma"] as const)
      a[field].forEach((v, i) => expect(v).toBeCloseTo(fixture[field][i], 11));
    expect(a.parent).toEqual(fixture.parent);
    expect(a.selected).toEqual(fixture.selected);
    expect(a.halo).toEqual(fixture.halo);
    expect(partition(final.labels)).toEqual(partition(fixture.labels));
  });
describe("real all-feature computation and exact trace restoration", () => {
  for (const a of ["Affinity Propagation", "Density Peaks / CFSFDP"] as const)
    it(`${a}: display-independent ND result, deterministic, reversible every step and checkpoint`, () => {
      const fake = p.map(() => ({ x: 0.5, y: 0.5 }));
      const trace = compute(a, fake, params, data),
        again = compute(a, fake, params, data);
      expect(trace.steps).toEqual(again.steps);
      const final = stateAt(trace, trace.steps.length);
      expect(new Set(final.labels).size).toBe(2);
      let s = trace.initial;
      trace.steps.forEach((step, i) => {
        s = applyStep(s, step);
        expect(s).toEqual(stateAt(trace, i + 1));
      });
      [...trace.steps].reverse().forEach((step) => {
        s = applyStep(s, step, true);
      });
      expect(s).toEqual(trace.initial);
      trace.snapshots.forEach((snapshot) =>
        expect(stateAt(trace, snapshot.index)).toEqual(snapshot.state),
      );
    });
});
it("identical points/duplicate centers have explicit finite degenerate handling", () => {
  const identical: Point[] = Array.from({ length: 5 }, () => ({ x: 1, y: 1 }));
  for (const a of ["Affinity Propagation", "Density Peaks / CFSFDP"] as const) {
    const t = compute(a, identical),
      s = stateAt(t, t.steps.length);
    expect(s.labels).toEqual([0, 0, 0, 0, 0]);
    expect(s.centers).toHaveLength(1);
  }
});
it("DPC halo is derived from cross-cluster boundary densities, without overwriting partition", () => {
  const q = [0, 0.1, 0.2, 0.3].map((x) => ({ x, y: 0 }));
  const t = compute("Density Peaks / CFSFDP", q, {
    ...params,
    epsilon: 0.15,
    densityKernel: "cutoff",
  });
  const s = stateAt(t, t.steps.length);
  expect(partition(s.labels)).toEqual(partition([0, 0, 1, 1]));
  expect(s.analysis?.kind === "density-peaks" && s.analysis.halo).toEqual([
    true,
    false,
    false,
    true,
  ]);
  expect(s.labels.every((v) => v >= 0)).toBe(true);
});
it("AP nonconvergence with no exemplars is an error, invalid input is rejected", () => {
  expect(() =>
    compute("Affinity Propagation", p, { ...params, iterations: 1 }),
  ).toThrow(/수렴 실패/);
  const invalid: Partial<Params>[] = [
    { damping: 1 },
    { damping: NaN },
    { preference: Infinity },
    { convergenceWindow: 0 },
  ];
  invalid.forEach((o) =>
    expect(() =>
      compute("Affinity Propagation", p, { ...params, ...o }),
    ).toThrow(/파라미터/),
  );
  expect(() =>
    compute("Density Peaks / CFSFDP", p, { ...params, epsilon: 0 }),
  ).toThrow(/파라미터/);
  expect(() =>
    compute("Density Peaks / CFSFDP", p, { ...params, epsilon: 1e-300 }),
  ).toThrow(/수치 불안정/);
  expect(() =>
    pairwiseSquared([
      { x: 1e308, y: 0 },
      { x: -1e308, y: 0 },
    ]),
  ).toThrow(/수치 불안정/);
  expect(() =>
    pairwiseSquared(p, { kind: "numeric", values: [[0], [1]] }),
  ).toThrow(/입력/);
});
