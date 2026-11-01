import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  kshape,
  shapeDistance,
  extractShape,
  znShape,
  zeroShift,
} from "./algorithms/kshape";
import type { TimeSeriesDataset } from "./dataset";
import { defaults } from "./types";
import { Recorder, stateAt, applyStep } from "./trace";
import reference from "./fixtures/timeseries-reference.json";

const input = (values: number[][]): TimeSeriesDataset => ({
  kind: "timeseries",
  series: values.map((v, i) => ({
    id: `s${i}`,
    values: v,
    times: v.map((_, j) => j * 0.1),
  })),
});
const points = (n: number) =>
  Array.from({ length: n }, () => ({ x: 999, y: -999 }));
const options = { ...defaults, k: 2, iterations: 20, tolerance: 1e-8 };
describe("independent time-series shape math", () => {
  it("zero-padded full-norm correlation, optimal lag and shifted samples match SciPy", () => {
    for (const c of reference.pairs) {
      const result = shapeDistance(c.reference, c.sequence);
      expect(result.correlation).toEqual(
        c.correlation.map((v) => expect.closeTo(v, 11)),
      );
      expect(result.distance).toBeCloseTo(c.distance, 11);
      expect(result.shift).toBe(c.shift);
      expect(result.aligned).toEqual(
        c.aligned.map((v) => expect.closeTo(v, 11)),
      );
    }
    expect(zeroShift([1, 2, 3], 1)).toEqual([0, 1, 2]);
    expect(zeroShift([1, 2, 3], -1)).toEqual([2, 3, 0]);
  });
  it("QᵀXᵀXQ dominant eigen shape and orientation match independent NumPy", () => {
    const c = reference.shape,
      result = extractShape(c.rows, c.reference);
    expect(result.centroid).toEqual(
      c.centroid.map((v) => expect.closeTo(v, 8)),
    );
    expect(result.eigenvalues).toEqual(
      c.eigenvalues.map((v) => expect.closeTo(v, 8)),
    );
    expect(result.residual).toBeLessThan(1e-8);
    expect(result.aligned).toEqual(
      c.aligned.map((row) => row.map((v) => expect.closeTo(v, 10))),
    );
    const mean = result.centroid.reduce(
      (s, v) => s + v / result.centroid.length,
      0,
    );
    expect(mean).toBeCloseTo(0, 12);
  });
  it("z normalization is amplitude/offset invariant and handles huge/small scale without constant-shape fabrication", () => {
    const a = [-1, 0, 1, 4, 2, -2];
    const z = znShape(a);
    for (const factor of [1e-200, 1e200, 3])
      expect(znShape(a.map((v) => v * factor))).toEqual(
        z.map((v) => expect.closeTo(v, 10)),
      );
    expect(znShape(a.map((v) => v + 9))).toEqual(
      z.map((v) => expect.closeTo(v, 10)),
    );
    expect(znShape([8, 8, 8])).toEqual([0, 0, 0]);
  });
});
describe("actual k-Shape engine", () => {
  it("matches full independent NumPy iterations, all original series and squared SBD objective", () => {
    for (const c of reference.clustering) {
      const r = new Recorder(c.values.length, "K-Shape");
      kshape(
        points(c.values.length),
        { ...options, k: c.k, seed: c.seed },
        r,
        input(c.values),
      );
      expect(r.state.labels).toEqual(c.labels);
      const a = r.state.analysis;
      if (a?.kind !== "timeseries-clustering")
        throw new Error("missing shape analysis");
      expect(a.centroids).toEqual(
        c.centroids.map((row) => row.map((v) => expect.closeTo(v, 7))),
      );
      expect(r.state.metric).toEqual(
        c.objectives.map((v) => expect.closeTo(v, 8)),
      );
      const objective = a.series.reduce(
        (sum, row, i) =>
          sum +
          shapeDistance(a.centroids[r.state.labels[i]], row).distance ** 2,
        0,
      );
      expect(a.objective).toBeCloseTo(objective, 10);
    }
  });
  it("records real alignment/eigen/lag events and restores every forward/reverse/checkpoint state", () => {
    const data = input(reference.clustering[0].values),
      r = new Recorder(data.series.length, "K-Shape");
    kshape(points(data.series.length), options, r, data);
    const again = new Recorder(data.series.length, "K-Shape");
    kshape(
      points(data.series.length).map(() => ({ x: 0, y: 0 })),
      options,
      again,
      data,
    );
    expect(r.trace.steps).toEqual(again.trace.steps);
    expect(r.trace.steps.some((s) => s.kind === "align")).toBe(true);
    expect(r.trace.steps.some((s) => s.kind === "prototype")).toBe(true);
    let state = r.trace.initial;
    r.trace.steps.forEach((step, i) => {
      state = applyStep(state, step);
      expect(state).toEqual(stateAt(r.trace, i + 1));
      const a = state.analysis;
      if (a?.kind === "timeseries-clustering") {
        const actual = a.series.reduce(
          (sum, row, j) =>
            sum +
            shapeDistance(a.centroids[state.labels[j]], row).distance ** 2,
          0,
        );
        expect(a.objective).toBeCloseTo(actual, 10);
      }
    });
    for (const step of r.trace.steps.slice().reverse())
      state = applyStep(state, step, true);
    expect(state).toEqual(r.trace.initial);
    r.trace.snapshots.forEach((c) =>
      expect(stateAt(r.trace, c.index)).toEqual(c.state),
    );
  });
  it("does not accept 2D surrogates, unequal/irregular grids or invalid parameters", () => {
    const data = input(reference.clustering[0].values),
      p = points(data.series.length);
    expect(() => kshape(p, options, new Recorder(p.length, "K-Shape"))).toThrow(
      /timeseries/,
    );
    expect(() =>
      kshape(p, options, new Recorder(p.length, "K-Shape"), {
        ...data,
        series: data.series.map((s, i) =>
          i
            ? s
            : { ...s, times: s.times.map((v, j) => (j === 2 ? v + 0.01 : v)) },
        ),
      }),
    ).toThrow(/시간축/);
    expect(() =>
      kshape(
        p,
        { ...options, k: p.length + 1 },
        new Recorder(p.length, "K-Shape"),
        data,
      ),
    ).toThrow(/확인/);
    expect(() =>
      extractShape([Array(2000).fill(0)], Array(2000).fill(0)),
    ).toThrow(/메모리 예산/);
    const tinyGrid: TimeSeriesDataset = {
      kind: "timeseries",
      series: [0, 1].map((i) => ({
        id: `t${i}`,
        values: [0, 1, 0],
        times: [0, 1e-12, 1e-9],
      })),
    };
    expect(() =>
      kshape(
        points(2),
        { ...options, k: 1 },
        new Recorder(2, "K-Shape"),
        tinyGrid,
      ),
    ).toThrow(/시간축/);
  });
  it("identical/flat shapes report empty clusters explicitly; iteration limits are not convergence", () => {
    const data = input(Array.from({ length: 6 }, () => [3, 3, 3, 3])),
      r = new Recorder(6, "K-Shape");
    kshape(points(6), options, r, data);
    expect(new Set(r.state.labels).size).toBe(1);
    const a = r.state.analysis;
    if (a?.kind !== "timeseries-clustering")
      throw new Error("missing analysis");
    expect(a.emptyClusters).toEqual([1]);
    expect(a.objective).toBe(0);
    const actual = input(reference.clustering[0].values),
      q = new Recorder(12, "K-Shape");
    kshape(points(12), { ...options, iterations: 1 }, q, actual);
    expect(q.trace.steps.at(-1)?.result?.converged).toBe("false");
  });
});
it("records realistic n×length costs and explicit long-series resource preflight", () => {
  const observations = [];
  for (const n of [100, 1000]) {
    const m = 16,
      values = Array.from({ length: n }, (_, i) =>
        Array.from(
          { length: m },
          (_, j) =>
            Math.sin(((j + (i % 3)) * (i % 2 ? 2 : 1) * Math.PI) / 8) +
            0.01 * Math.cos(i + j),
        ),
      );
    const data = input(values),
      r = new Recorder(n, "K-Shape"),
      start = performance.now(),
      before = process.memoryUsage().heapUsed;
    kshape(points(n), { ...options, iterations: 3 }, r, data);
    expect(r.state.labels).toHaveLength(n);
    observations.push({
      n,
      length: m,
      milliseconds: +(performance.now() - start).toFixed(2),
      heapDeltaBytes: process.memoryUsage().heapUsed - before,
      events: r.trace.steps.length,
      traceEstimatedBytes: r.trace.recording?.estimatedBytes,
      recording: r.trace.recording?.policy,
    });
  }
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/timeseries-performance.json",
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        seed: 42,
        k: 2,
        iterations: 3,
        note: "Single Node observation. Generation/Worker transfer/rendering excluded; heap delta is not peak. Direct O(length²) correlations and dense exact eigensolver.",
        observations,
      },
      null,
      2,
    ),
  );
}, 60000);
