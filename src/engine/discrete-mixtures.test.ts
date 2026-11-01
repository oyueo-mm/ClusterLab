import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { random } from "./math";
import { bernoulli } from "./algorithms/bernoulli";
import { poisson } from "./algorithms/poisson";
import { multinomial } from "./algorithms/multinomial";
import {
  discreteExpectation,
  discreteMaximization,
  discreteLogMass,
  poissonLogMass,
} from "./algorithms/discreteMixtureCommon";
import type { DiscreteMixtureMethod } from "./mixtureTypes";
import { defaults } from "./types";
import { Recorder, stateAt, applyStep } from "./trace";
import reference from "./fixtures/discrete-mixtures-reference.json";

const points = (n: number) =>
  Array.from({ length: n }, () => ({ x: 999, y: -999 }));
const binary = reference.clustering.find(
  (c) => c.method === "Bernoulli Mixture",
)!;
const options = {
  ...defaults,
  k: 2,
  iterations: 40,
  tolerance: 1e-9,
  seed: 42,
};
const engines = {
  "Bernoulli Mixture": bernoulli,
  "Poisson Mixture": poisson,
  "Multinomial Mixture": multinomial,
};
const matrixClose = (a: number[][], b: number[][], precision = 9) =>
  expect(a).toEqual(
    b.map((row) => row.map((v) => expect.closeTo(v, precision))),
  );

describe("independent discrete probability and weighted-EM math", () => {
  it("three distribution E/M steps match independent SciPy PMF and NumPy sufficient statistics", () => {
    for (const c of reference.steps) {
      const method = c.method as DiscreteMixtureMethod,
        model = { parameters: c.parameters, weights: c.weights };
      const e = discreteExpectation(method, c.rows, model);
      matrixClose(e.responsibilities, c.responsibilities);
      matrixClose(e.sums, c.sums);
      expect(e.counts).toEqual(c.counts.map((v) => expect.closeTo(v, 10)));
      expect(e.logLikelihood).toBeCloseTo(c.logLikelihood, 10);
      const m = discreteMaximization(method, e, model);
      matrixClose(m.parameters, c.nextParameters);
      expect(m.weights).toEqual(
        c.nextWeights.map((v) => expect.closeTo(v, 10)),
      );
    }
  });
  it("Bernoulli hand example recovers 16/17 posterior and 49/68 weighted MLE", () => {
    const c = reference.steps[0],
      e = discreteExpectation("Bernoulli Mixture", c.rows, {
        parameters: c.parameters,
        weights: c.weights,
      });
    expect(e.responsibilities[0][0]).toBeCloseTo(16 / 17, 13);
    expect(e.counts).toEqual([2, 2]);
    const m = discreteMaximization("Bernoulli Mixture", e, {
      parameters: c.parameters,
      weights: c.weights,
    });
    expect(m.parameters[0][0]).toBeCloseTo(49 / 68, 13);
  });
  it("support boundaries implement zero events without NaN and retain multinomial coefficients", () => {
    expect(discreteLogMass("Bernoulli Mixture", [0, 1], [0, 1])).toBe(0);
    expect(discreteLogMass("Bernoulli Mixture", [1, 0], [0, 1])).toBe(
      -Infinity,
    );
    expect(
      discreteLogMass("Multinomial Mixture", [1, 1], [0.8, 0.2]),
    ).toBeCloseTo(Math.log(0.32), 12);
    expect(discreteLogMass("Multinomial Mixture", [0, 0], [1, 0])).toBe(0);
    for (const c of reference.poissonLogMass) {
      const result = poissonLogMass(c.x, c.rate);
      if (c.logMass === null) expect(result).toBe(-Infinity);
      else expect(result).toBeCloseTo(c.logMass, 7);
    }
    expect(poissonLogMass(1e15, 1e15)).toBeCloseTo(
      -0.5 * Math.log(2 * Math.PI * 1e15) - 1 / 12e15,
      12,
    );
  });
  it("log-sum-exp keeps high-dimensional tiny likelihoods finite", () => {
    const row = Array(2000).fill(1) as number[],
      model = {
        parameters: [
          Array(2000).fill(0.01),
          Array(2000).fill(0.02),
        ] as number[][],
        weights: [0.5, 0.5],
      };
    const e = discreteExpectation("Bernoulli Mixture", [row], model);
    expect(Number.isFinite(e.logLikelihood)).toBe(true);
    expect(e.responsibilities[0][1]).toBe(1);
  });
  it("zero components and zero-total profiles keep valid parameters without pseudo-counts", () => {
    const model = {
        parameters: [
          [0.2, 0.8],
          [0.7, 0.3],
        ],
        weights: [1, 0],
      },
      e = discreteExpectation(
        "Bernoulli Mixture",
        [
          [1, 0],
          [0, 1],
        ],
        model,
      ),
      m = discreteMaximization("Bernoulli Mixture", e, model);
    expect(m.weights).toEqual([1, 0]);
    expect(m.parameters[1]).toEqual(model.parameters[1]);
    const z = discreteExpectation(
        "Multinomial Mixture",
        [
          [0, 0],
          [0, 0],
        ],
        model,
      ),
      next = discreteMaximization("Multinomial Mixture", z, model);
    expect(next.parameters).toEqual(model.parameters);
    expect(() =>
      discreteExpectation("Bernoulli Mixture", [[1]], {
        parameters: [[0]],
        weights: [1],
      }),
    ).toThrow(/확률|표현/);
  });
});

describe("actual discrete mixture full original engines", () => {
  it("matches independent seeded NumPy EM including full posterior, likelihood and completed iterations", () => {
    for (const c of reference.clustering) {
      const method = c.method as DiscreteMixtureMethod;
      const r = new Recorder(c.rows.length, method);
      engines[method](
        points(c.rows.length),
        {
          ...options,
          k: c.k,
          seed: c.seed,
          iterations: c.iterations,
          tolerance: c.tolerance,
        },
        r,
        { kind: "numeric", values: c.rows },
      );
      const a = r.state.analysis;
      if (a?.kind !== "discrete-mixture")
        throw new Error("missing actual mixture");
      matrixClose(a.parameters, c.parameters, 8);
      matrixClose(r.state.responsibilities, c.responsibilities, 8);
      expect(a.weights).toEqual(c.weights.map((v) => expect.closeTo(v, 9)));
      expect(a.logLikelihood).toBeCloseTo(c.logLikelihood, 8);
      expect(a.iterations).toBe(c.completedIterations);
      expect(a.converged).toBe(c.converged);
      expect(r.state.labels).toEqual(c.labels);
      const history = r.trace.steps
        .filter((s) => s.kind === "maximization")
        .map((s) => Number(s.result!.logLikelihood));
      expect(history).toEqual(c.history.map((v) => expect.closeTo(v, 8)));
    }
  });
  it("count engines preserve zero-rate boundaries, variable row lengths, zero-length observations and limited convergence", () => {
    for (const method of ["Poisson Mixture", "Multinomial Mixture"] as const) {
      const rows =
          method === "Poisson Mixture"
            ? [
                [0, 0],
                [0, 0],
                [0, 0],
              ]
            : [
                [0, 0],
                [0, 0],
                [0, 0],
              ],
        r = new Recorder(rows.length, method);
      engines[method](points(rows.length), options, r, {
        kind: "numeric",
        values: rows,
      });
      const a = r.state.analysis;
      if (a?.kind !== "discrete-mixture")
        throw new Error("missing count mixture");
      expect(a.logLikelihood).toBeCloseTo(0, 12);
      expect(a.converged).toBe(true);
      if (method === "Poisson Mixture")
        expect(a.parameters).toEqual([
          [0, 0],
          [0, 0],
        ]);
      else {
        a.parameters.forEach((p) =>
          expect(p.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 13),
        );
        expect(a.warnings.length).toBeGreaterThan(0);
      }
      const c = reference.clustering.find((c) => c.method === method)!;
      const limited = new Recorder(c.rows.length, method);
      engines[method](
        points(c.rows.length),
        { ...options, iterations: 1, tolerance: 0 },
        limited,
        { kind: "numeric", values: c.rows },
      );
      expect(
        limited.state.analysis?.kind === "discrete-mixture" &&
          limited.state.analysis.converged,
      ).toBe(false);
      for (const invalid of [
        [[-1, 2]],
        [[0.5, 1]],
        [[Number.MAX_SAFE_INTEGER + 1, 0]],
      ])
        expect(() =>
          engines[method](
            points(invalid.length),
            { ...options, k: 1 },
            new Recorder(invalid.length, method),
            { kind: "numeric", values: invalid },
          ),
        ).toThrow(/정수/);
    }
    const rows = [[Number.MAX_SAFE_INTEGER, 1]];
    expect(() =>
      multinomial(
        points(1),
        { ...options, k: 1 },
        new Recorder(1, "Multinomial Mixture"),
        { kind: "numeric", values: rows },
      ),
    ).toThrow(/행.*합|안전/);
  });
  it("count engines have true reversible/checkpointed ND posteriors independent of display projection", () => {
    for (const method of ["Poisson Mixture", "Multinomial Mixture"] as const) {
      const rows = Array.from({ length: 70 }, (_, i) =>
          Array.from({ length: 5 }, (_, j) => (i * (j + 7) + j) % 13),
        ),
        opts = { ...options, k: 3, iterations: 70, tolerance: 0 };
      const r = new Recorder(rows.length, method),
        other = new Recorder(rows.length, method);
      engines[method](points(rows.length), opts, r, {
        kind: "numeric",
        values: rows,
      });
      engines[method](
        points(rows.length).map((_, i) => ({ x: i, y: -i })),
        opts,
        other,
        { kind: "numeric", values: rows },
      );
      expect(r.trace).toEqual(other.trace);
      let state = r.trace.initial;
      for (let i = 0; i < r.trace.steps.length; i++) {
        state = applyStep(state, r.trace.steps[i]);
        expect(state).toEqual(stateAt(r.trace, i + 1));
        const a = state.analysis;
        if (a?.kind !== "discrete-mixture")
          throw new Error("missing count analysis");
        const e = discreteExpectation(method, rows, {
          parameters: a.parameters,
          weights: a.weights,
        });
        matrixClose(state.responsibilities, e.responsibilities, 11);
        expect(a.logLikelihood).toBeCloseTo(e.logLikelihood, 10);
      }
      for (let i = r.trace.steps.length - 1; i >= 0; i--) {
        state = applyStep(state, r.trace.steps[i], true);
        expect(state).toEqual(stateAt(r.trace, i));
      }
      expect(state).toEqual(r.trace.initial);
      for (const checkpoint of r.trace.snapshots)
        expect(stateAt(r.trace, checkpoint.index)).toEqual(checkpoint.state);
    }
  });
  it("all recorded posterior states match their actual current parameters and log-likelihood", () => {
    const r = new Recorder(binary.rows.length, "Bernoulli Mixture");
    bernoulli(
      points(binary.rows.length),
      { ...options, tolerance: 0, iterations: 60 },
      r,
      { kind: "numeric", values: binary.rows },
    );
    for (let i = 1; i <= r.trace.steps.length; i++) {
      const s = stateAt(r.trace, i),
        a = s.analysis;
      if (a?.kind !== "discrete-mixture") throw new Error("missing analysis");
      const e = discreteExpectation(a.method, a.sourceValues, {
        parameters: a.parameters,
        weights: a.weights,
      });
      matrixClose(s.responsibilities, e.responsibilities, 12);
      expect(a.logLikelihood).toBeCloseTo(e.logLikelihood, 12);
      expect(a.effectiveCounts).toEqual(e.counts);
      s.responsibilities.forEach((row) =>
        expect(row.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 13),
      );
    }
    for (let i = 1; i < r.state.metric.length; i++)
      expect(r.state.metric[i]).toBeGreaterThanOrEqual(
        r.state.metric[i - 1] - 1e-9,
      );
  });
  it("forward, reverse, arbitrary seek and saved checkpoint restoration preserve all actual math", () => {
    const rows = Array.from({ length: 80 }, (_, i) =>
      Array.from({ length: 6 }, (_, j) =>
        (i * (j + 5) + j * j) % 11 < 5 ? 1 : 0,
      ),
    );
    const r = new Recorder(rows.length, "Bernoulli Mixture");
    bernoulli(
      points(rows.length),
      { ...options, k: 3, iterations: 90, tolerance: 0 },
      r,
      { kind: "numeric", values: rows },
    );
    let state = r.trace.initial;
    for (let i = 0; i < r.trace.steps.length; i++) {
      state = applyStep(state, r.trace.steps[i]);
      expect(state).toEqual(stateAt(r.trace, i + 1));
    }
    for (let i = r.trace.steps.length - 1; i >= 0; i--) {
      state = applyStep(state, r.trace.steps[i], true);
      expect(state).toEqual(stateAt(r.trace, i));
    }
    expect(state).toEqual(r.trace.initial);
    expect(stateAt(r.trace, r.trace.steps.length)).toEqual(r.state);
    expect(r.trace.snapshots.length).toBeGreaterThan(0);
    for (const checkpoint of r.trace.snapshots)
      expect(stateAt(r.trace, checkpoint.index)).toEqual(checkpoint.state);
  });
  it("all-constant bits yield exact boundary MLE; limited runs are not marked converged", () => {
    const rows = [
        [0, 1],
        [0, 1],
        [0, 1],
      ],
      r = new Recorder(3, "Bernoulli Mixture");
    bernoulli(points(3), options, r, { kind: "numeric", values: rows });
    const a = r.state.analysis;
    if (a?.kind !== "discrete-mixture") throw new Error("missing analysis");
    expect(a.parameters).toEqual([
      [0, 1],
      [0, 1],
    ]);
    expect(a.logLikelihood).toBeCloseTo(0, 12);
    const limited = new Recorder(binary.rows.length, "Bernoulli Mixture");
    bernoulli(
      points(binary.rows.length),
      { ...options, iterations: 1, tolerance: 0 },
      limited,
      { kind: "numeric", values: binary.rows },
    );
    expect(
      limited.state.analysis?.kind === "discrete-mixture" &&
        limited.state.analysis.converged,
    ).toBe(false);
  });
  it("seeded ND computation ignores display coordinates and preserves immutable source trace", () => {
    const rows = binary.rows.map((row) => [...row]),
      r = new Recorder(rows.length, "Bernoulli Mixture"),
      other = new Recorder(rows.length, "Bernoulli Mixture");
    bernoulli(points(rows.length), options, r, {
      kind: "numeric",
      values: rows,
    });
    bernoulli(
      points(rows.length).map((_, i) => ({ x: i * 0.1, y: 1 - i * 0.03 })),
      options,
      other,
      { kind: "numeric", values: rows },
    );
    expect(r.trace).toEqual(other.trace);
    rows[0][0] = 1 - rows[0][0];
    expect(
      r.state.analysis?.kind === "discrete-mixture" &&
        r.state.analysis.sourceValues[0][0],
    ).toBe(binary.rows[0][0]);
  });
  it("rejects invalid support, shapes, parameters and real working byte requirements without truncation", () => {
    const execute = (rows: number[][], change = {}) =>
      bernoulli(
        points(rows.length),
        { ...options, ...change },
        new Recorder(rows.length, "Bernoulli Mixture"),
        { kind: "numeric", values: rows },
      );
    for (const rows of [
      [],
      [[]],
      [[0], [1, 0]],
      [[0, NaN]],
      [[0.2, 1]],
      [[2, 0]],
    ])
      expect(() => execute(rows)).toThrow();
    for (const change of [
      { k: 0 },
      { k: 99 },
      { iterations: 0 },
      { tolerance: -1 },
      { seed: Infinity },
    ])
      expect(() => execute(binary.rows, change)).toThrow();
    expect(() =>
      execute([Array(1e6).fill(0), Array(1e6).fill(1)], { k: 2 }),
    ).toThrow(/메모리/);
  });
});

it("records reproducible full-input performance observations without a point-count cap", () => {
  const observations: Record<string, unknown>[] = [];
  const cases: [DiscreteMixtureMethod, number][] = (
    Object.keys(engines) as DiscreteMixtureMethod[]
  ).flatMap((method) =>
    [100, 1000, 10000].map(
      (n) => [method, n] as [DiscreteMixtureMethod, number],
    ),
  );
  cases.push(["Poisson Mixture", 100000]);
  for (const [method, n] of cases) {
    const rng = random(42),
      lambdaCount = (rate: number) => {
        const threshold = Math.exp(-rate);
        let product = 1,
          x = 0;
        do {
          product *= rng();
          x++;
        } while (product > threshold);
        return x - 1;
      };
    const rows = Array.from({ length: n }, (_, i) => {
      const group = i < n / 2 ? 0 : 1;
      if (method === "Bernoulli Mixture")
        return Array.from({ length: 3 }, () =>
          rng() < (group ? 0.85 : 0.15) ? 1 : 0,
        );
      if (method === "Poisson Mixture")
        return Array.from({ length: 3 }, () => lambdaCount(group ? 7 : 1));
      const counts = [0, 0, 0],
        total = group ? 20 : 10;
      for (let token = 0; token < total; token++) {
        const draw = rng(),
          theta = group ? [0.1, 0.1, 0.8] : [0.8, 0.1, 0.1];
        counts[draw < theta[0] ? 0 : draw < theta[0] + theta[1] ? 1 : 2]++;
      }
      return counts;
    });
    const r = new Recorder(n, method),
      heapBefore = process.memoryUsage().heapUsed,
      start = performance.now();
    engines[method](
      points(n),
      { ...options, iterations: 4, tolerance: 1e-6 },
      r,
      { kind: "numeric", values: rows },
    );
    const elapsed = performance.now() - start,
      a = r.state.analysis;
    if (a?.kind !== "discrete-mixture")
      throw new Error("missing benchmark analysis");
    expect(r.state.labels).toHaveLength(n);
    expect(a.sourceValues).toHaveLength(n);
    expect(Number.isFinite(a.logLikelihood)).toBe(true);
    observations.push({
      method,
      rows: n,
      dimensions: 3,
      k: 2,
      seed: 42,
      maxIterations: 4,
      tolerance: 1e-6,
      elapsedMs: elapsed,
      heapBefore,
      heapAfter: process.memoryUsage().heapUsed,
      completedIterations: a.iterations,
      converged: a.converged,
      traceEvents: r.trace.steps.length,
      estimatedTraceBytes: r.trace.recording!.estimatedBytes,
      recordingPolicy: r.trace.recording!.policy,
    });
  }
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/discrete-mixtures-performance.json",
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        runner:
          "Vitest / Node; one observation per case; no forced GC; not peak memory or browser FPS",
        generator: {
          seed: 42,
          dimensions: 3,
          groups: 2,
          Bernoulli: [0.15, 0.85],
          PoissonRates: [1, 7],
          multinomialProfiles: [
            [0.8, 0.1, 0.1],
            [0.1, 0.1, 0.8],
          ],
          multinomialTotals: [10, 20],
        },
        observations,
      },
      null,
      2,
    ) + "\n",
  );
});
