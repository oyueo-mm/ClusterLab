import { describe, it, expect } from "vitest";
import reference from "../../docs/research/fpcm-reference.json";
import { fpcm } from "./algorithms/fpcm";
import { algorithmDefaults, type Params } from "./types";
import { Recorder, stateAt, applyStep } from "./trace";
import { displayPoints, type NumericDataset } from "./dataset";
import { fpcmTypicalities, fpcmCenters, fpcmObjective } from "./ndFpcm";
import { ndMemberships } from "./ndFuzzy";
import { nativeResult, runDataset } from "./datasetExecution";
import type { FpcmAnalysis } from "./fpcmTypes";
interface Input {
  name: string;
  values: number[][];
  params?: Partial<{
    k: number;
    seed: number;
    m: number;
    eta: number;
    iterations: number;
    warmIterations: number;
    tolerance: number;
  }>;
}
const close = (a: number, b: number, scale = 1) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(
    Math.max(Math.abs(b) * 1e-7, scale * 1e-8),
  );
function matrix(a: number[][], b: number[][], scale = 1) {
  expect(a.length).toBe(b.length);
  a.forEach((row, i) => {
    expect(row.length).toBe(b[i].length);
    row.forEach((v, j) => close(v, b[i][j], scale));
  });
}
function calculate(input: Input, patch: Partial<Params> = {}, budget?: number) {
  const p = {
      k: 2,
      seed: 42,
      m: 2,
      eta: 2,
      iterations: 60,
      warmIterations: 30,
      tolerance: 1e-9,
      ...input.params,
    },
    o = {
      ...algorithmDefaults("Fuzzy Possibilistic C-Means"),
      k: p.k,
      seed: p.seed,
      fuzziness: p.m,
      typicalityExponent: p.eta,
      iterations: p.iterations,
      warmIterations: p.warmIterations,
      tolerance: p.tolerance,
      ...patch,
    },
    data: NumericDataset = { kind: "numeric", values: input.values },
    r = new Recorder(
      input.values.length,
      "Fuzzy Possibilistic C-Means",
      budget,
    );
  fpcm(displayPoints(data), o, r, data);
  return { data, r, o };
}
describe("FPCM1997 independent NumPy full AO", () => {
  for (const entry of reference.cases)
    it(entry.input.name, () => {
      const { r, o } = calculate(entry.input),
        ref = entry.result,
        a = r.state.analysis;
      if (a?.kind !== "fuzzy-possibilistic") throw Error("missing FPCM");
      const unit = Math.max(...entry.input.values.flat().map(Math.abs), 1e-150),
        costUnit = unit ** 2 * entry.input.values.length * o.k;
      expect(a.initialization).toEqual(ref.initialization);
      matrix(a.centroids, ref.centroids, unit);
      matrix(a.memberships, ref.memberships);
      matrix(a.typicalities, ref.typicalities);
      matrix(a.warmCenters, ref.warmCenters, unit);
      matrix(a.warmMemberships, ref.warmMemberships);
      a.effectiveWeights.forEach((v, j) => close(v, ref.effectiveWeights[j]));
      for (const key of ["fuzzyCost", "typicalityCost", "objective"] as const)
        close(a[key], ref[key], costUnit);
      close(a.fixedPointResidual, ref.fixedPointResidual, unit);
      expect(a.converged).toBe(ref.converged);
      expect(a.warmConverged).toBe(ref.warmConverged);
      expect(a.iteration).toBe(ref.iteration);
      const warm: FpcmAnalysis[] = [],
        main: FpcmAnalysis[] = [];
      let state = r.trace.initial;
      r.trace.steps.forEach((step, index) => {
        state = applyStep(state, step);
        expect(stateAt(r.trace, index + 1)).toEqual(state);
        const current = state.analysis;
        if (current?.kind !== "fuzzy-possibilistic") return;
        if (current.phase === "warm-u" && current.warmIteration > 0)
          warm.push(current);
        if (["t-update", "mean-update"].includes(current.phase))
          main.push(current);
        if (current.weightsReady && current.memberships.length) {
          const distance = entry.input.values.map((row) =>
            current.centroids.map((center) =>
              row.reduce((s, v, j) => s + (v - center[j]) ** 2, 0),
            ),
          );
          matrix(current.distancesSquared, distance, unit ** 2);
          const direct = distance.reduce(
            (s, row, i) =>
              s +
              row.reduce(
                (v, d, j) =>
                  v +
                  (current.memberships[i][j] ** o.fuzziness +
                    current.typicalities[i][j] ** o.typicalityExponent) *
                    d,
                0,
              ),
            0,
          );
          close(current.objective, direct, costUnit);
          current.memberships.forEach((row) =>
            close(
              row.reduce((s, v) => s + v, 0),
              1,
            ),
          );
          for (let j = 0; j < o.k; j++)
            close(
              current.typicalities.reduce((s, row) => s + row[j], 0),
              1,
            );
        }
      });
      expect(warm).toHaveLength(ref.warmStates.length);
      warm.forEach((v, i) => {
        matrix(v.centroids, ref.warmStates[i].centroids, unit);
        matrix(v.memberships, ref.warmStates[i].memberships);
        close(v.warmObjective, ref.warmStates[i].objective, costUnit);
      });
      expect(main).toHaveLength(ref.states.length);
      main.forEach((v, i) => {
        matrix(v.centroids, ref.states[i].centroids, unit);
        matrix(v.memberships, ref.states[i].memberships);
        matrix(v.typicalities, ref.states[i].typicalities);
        close(v.objective, ref.states[i].objective, costUnit);
      });
      for (let i = r.trace.steps.length; i >= 0; i -= 3)
        expect(stateAt(r.trace, i)).toEqual(
          r.trace.steps
            .slice(0, i)
            .reduce((s, step) => applyStep(s, step), r.trace.initial),
        );
      expect(nativeResult(r.state).kind).toBe(
        "memberships-typicalities-centers",
      );
    });
});
it("retains the existing hand block and exact sample replication effect", () => {
  const b = reference.block,
    d = b.distancesSquared,
    u = ndMemberships(d, 2),
    t = fpcmTypicalities(d, 2),
    next = fpcmCenters(b.values, u.logs, t.logs, 2, 2);
  matrix(u.memberships, b.memberships);
  matrix(t.typicalities, b.typicalities);
  matrix(next.centers, b.nextCenters);
  close(
    fpcmObjective(d, u.logs, t.logs, 2, 2).objective,
    b.afterWeights.objective,
  );
  const repeated = d.flatMap((row) => [row, row, row]),
    ur = ndMemberships(repeated, 2),
    tr = fpcmTypicalities(repeated, 2),
    xr = b.values.flatMap((row) => [row, row, row]);
  matrix(tr.typicalities, b.replicatedTypicalities);
  matrix(
    fpcmCenters(xr, ur.logs, tr.logs, 2, 2).centers,
    b.replicatedNextCenters,
  );
  tr.typicalities.forEach((row, i) =>
    row.forEach((v, j) => close(v, t.typicalities[Math.floor(i / 3)][j] / 3)),
  );
  expect(b.nextCenters).not.toEqual(b.replicatedNextCenters);
});
it("zero-distance rows and columns obey separate simplex constraints without epsilon", () => {
  const d = [
      [0, 4],
      [0, 0],
      [4, 0],
    ],
    u = ndMemberships(d, 2).memberships,
    t = fpcmTypicalities(d, 2).typicalities;
  expect(u).toEqual([
    [1, 0],
    [0.5, 0.5],
    [0, 1],
  ]);
  expect(t).toEqual([
    [0.5, 0],
    [0.5, 0.5],
    [0, 0.5],
  ]);
});
it("constant data is a diagnosed degeneracy, not a PCM scale error", () => {
  const { r } = calculate({
      name: "constant",
      values: [[2], [2], [2]],
      params: { k: 3 },
    }),
    a = r.state.analysis;
  if (a?.kind !== "fuzzy-possibilistic") throw Error("analysis");
  expect(a.objective).toBe(0);
  expect(a.coincidentCenters).toBe(3);
  expect(a.distinctAtLeastK).toBe(false);
  expect(a.tColumnSums.every((v) => Math.abs(v - 1) < 1e-12)).toBe(true);
});
it("original ND is independent of display metadata and has the same final native matrices", async () => {
  const x = {
      name: "ND",
      values: [
        [0, 0, 0],
        [0, 0, 1],
        [0, 0, 4],
        [0, 0, 5],
      ],
    },
    { r, o, data } = calculate(x),
    other: NumericDataset = {
      ...data,
      display: data.values.map(() => ({ x: 0.2, y: 0.8 })),
      labels: [9, 8, 7, 6],
    },
    run = await runDataset("Fuzzy Possibilistic C-Means", other, o);
  expect(run.output).toEqual(nativeResult(r.state));
  expect(calculate(x).r.trace.steps).toEqual(r.trace.steps);
});
it("1000 rows use actual full column normalization and preserve final U/T and checkpoints", () => {
  const values = Array.from({ length: 1000 }, (_, i) => [
      i < 500 ? -2 : 2,
      Math.sin(i * 42) * 0.1,
      i * 0.001,
    ]),
    { r } = calculate(
      { name: "large", values },
      { ...algorithmDefaults("Fuzzy Possibilistic C-Means"), iterations: 100 },
    ),
    a = r.state.analysis;
  if (a?.kind !== "fuzzy-possibilistic") throw Error("analysis");
  expect(r.trace.recording!.policy).toContain("중간 행렬만 요약");
  expect(a.memberships).toHaveLength(1000);
  expect(a.typicalities.flat()).toHaveLength(2000);
  a.tColumnSums.forEach((v) => close(v, 1));
  expect(r.trace.recording!.estimatedBytes).toBeLessThan(64 * 1024 * 1024);
  expect(stateAt(r.trace, r.trace.steps.length)).toEqual(r.state);
});
it("invalid exponents, seed, distance and Trace budgets fail explicitly", () => {
  const x = { name: "x", values: [[0], [1], [4]] };
  for (const patch of [
    { fuzziness: 1 },
    { typicalityExponent: 1 },
    { k: 4 },
    { seed: 0.5 },
    { iterations: 0 },
    { tolerance: -1 },
  ])
    expect(() => calculate(x, patch)).toThrow();
  expect(() =>
    calculate({ name: "overflow", values: [[-1e308], [1e308]] }),
  ).toThrow();
  expect(() => calculate(x, {}, 100)).toThrow(/Trace|메모리/);
});
