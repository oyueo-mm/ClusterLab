import { describe, it, expect } from "vitest";
import { hartiganDip, dipmeans } from "./algorithms/dipmeans";
import { logNormalCDF, gaussianAD, gmeans } from "./algorithms/gmeans";
import { xmeans, xmeansBIC } from "./algorithms/xmeans";
import { dpmeans } from "./algorithms/dpmeans";
import { defaults, type Algorithm, type Point } from "./types";
import { displayPoints, type NumericDataset } from "./dataset";
import { Recorder, stateAt, applyStep } from "./trace";
import reference from "./fixtures/auto-models-reference.json";
import { mkdirSync, writeFileSync } from "node:fs";
import { dataset, dataDefaults } from "../data/presets";
import {
  initialCenters,
  squared,
  principalChildren,
} from "./algorithms/autoCommon";

const opts = {
  ...defaults,
  k: 1,
  maxClusters: 8,
  iterations: 40,
  tolerance: 1e-10,
  lambda: 0.2,
  significance: 0.0001,
  splitViewFraction: 0.01,
  bootstrapSamples: 100,
  minSamples: 8,
};
describe("independent auto-K mathematical kernels", () => {
  it("Hartigan geometric envelopes match independent diptest0.11 on random, tied and multimodal samples", () => {
    for (const { values, dip } of reference.dip)
      expect(hartiganDip(values), JSON.stringify(values)).toBeCloseTo(dip, 11);
  });
  it("stable normal log-CDF and original G-Means AD correction match SciPy log_ndtr", () => {
    for (const { z, value } of reference.logCDF)
      expect(Math.abs(logNormalCDF(z) - value)).toBeLessThanOrEqual(
        1e-10 + Math.abs(value) * 2e-15,
      );
    for (const a of reference.ad) {
      const actual = gaussianAD(a.values);
      expect(actual.statistic).toBeCloseTo(a.statistic, 9);
      expect(actual.standardized).toEqual(
        expect.arrayContaining(
          a.standardized.map((v) => expect.closeTo(v, 10)),
        ),
      );
    }
  });
  it("published X-Means BIC uses true multidimensional residuals and local sample counts", () => {
    const x = reference.bic.values;
    expect(xmeansBIC(x, [[0, 0, 1.1]], Array(6).fill(0))).toBeCloseTo(
      reference.bic.single,
      10,
    );
    expect(
      xmeansBIC(
        x,
        [
          [0, 0, 0.1],
          [0, 0, 2.1],
        ],
        [0, 0, 0, 1, 1, 1],
      ),
    ).toBeCloseTo(reference.bic.pair, 10);
  });
  it("DP-Means sequential creation/means/penalized objective match independent NumPy", () => {
    for (const c of reference.dp) {
      const data: NumericDataset = { kind: "numeric", values: c.values };
      const r = new Recorder(c.values.length, "DP-Means");
      dpmeans(displayPoints(data), { ...opts, lambda: c.penalty }, r, data);
      expect(r.state.labels).toEqual(c.labels);
      expect(r.state.metric).toEqual(
        expect.arrayContaining(c.objectives.map((v) => expect.closeTo(v, 11))),
      );
      expect(r.state.analysis?.kind).toBe("model-selection");
      if (r.state.analysis?.kind === "model-selection") {
        expect(r.state.analysis.centroids).toEqual(
          c.centroids.map((row) => row.map((v) => expect.closeTo(v, 11))),
        );
        expect(r.state.analysis.sse).toBeCloseTo(c.sse, 11);
      }
      for (let i = 1; i < r.state.metric.length; i++)
        expect(r.state.metric[i]).toBeLessThanOrEqual(
          r.state.metric[i - 1] + 1e-10,
        );
    }
  });
});

it("records actual initial and local Lloyd center changes; rejects numerical underflow", () => {
  const data: NumericDataset = { kind: "numeric", values };
  for (const [name, engine] of engines.filter(
    ([name]) => name !== "DP-Means",
  )) {
    const r = execute(name, engine, data);
    const first = stateAt(r.trace, 1).analysis;
    expect(first?.kind).toBe("model-selection");
    if (first?.kind === "model-selection")
      expect(first.centroids).toEqual(
        initialCenters(values, opts.k, opts.seed),
      );
    expect(r.trace.steps.some((step) => step.kind === "refine")).toBe(true);
    const candidateStates = r.trace.steps
      .map((_, i) => stateAt(r.trace, i + 1).analysis)
      .filter(
        (a) => a?.kind === "model-selection" && a.phase === "candidate-move",
      );
    expect(candidateStates.length).toBeGreaterThan(0);
  }
  expect(() => squared([0], [1e-200])).toThrow(/underflow/);
  expect(() =>
    principalChildren([Array(2000).fill(0), Array(2000).fill(1)]),
  ).toThrow(/예산/);
  expect(() =>
    gaussianAD(Array.from({ length: 8 }, (_, i) => i * 1e-200)),
  ).toThrow(/underflow/);
});

it("records realistic full-input automatic-model observations without speed assertions", () => {
  const observations = [];
  for (const [name, engine] of engines) {
    for (const n of name === "Dip-Means" ? [100] : [100, 1000]) {
      const points = dataset("blobs", { ...dataDefaults, count: n });
      const params = {
        ...opts,
        iterations: 12,
        bootstrapSamples: 50,
        significance: name === "Dip-Means" ? 0.05 : 0.0001,
      };
      const r = new Recorder(n, name),
        start = performance.now(),
        before = process.memoryUsage().heapUsed;
      engine(points, params, r);
      expect(r.state.labels).toHaveLength(n);
      expect(r.state.labels.every((v) => v >= 0)).toBe(true);
      observations.push({
        algorithm: name,
        n,
        dimensions: 2,
        milliseconds: +(performance.now() - start).toFixed(2),
        heapDeltaBytes: process.memoryUsage().heapUsed - before,
        events: r.trace.steps.length,
        traceEstimatedBytes: r.trace.recording?.estimatedBytes,
        clusters: new Set(r.state.labels).size,
        converged:
          r.state.analysis?.kind === "model-selection"
            ? r.state.analysis.converged
            : undefined,
      });
    }
  }
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/auto-models-performance.json",
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        seed: 42,
        maxK: 8,
        iterations: 12,
        dipBootstrap: 50,
        note: "Single Node observation; input generation and browser Worker transfer/rendering excluded. Heap delta is not peak. Dip is evaluated at 100 only due to expensive all-viewer testing.",
        observations,
      },
      null,
      2,
    ),
  );
}, 60000);

const engines = [
  ["X-Means", xmeans],
  ["G-Means", gmeans],
  ["Dip-Means", dipmeans],
  ["DP-Means", dpmeans],
] as const;
const values = Array.from({ length: 32 }, (_, i) => [
  0,
  0,
  (i < 16 ? 0 : 3) + (i % 16) * 0.006,
]);
function execute(
  name: Algorithm,
  engine: (typeof engines)[number][1],
  data: NumericDataset,
  params = opts,
  p?: Point[],
) {
  const r = new Recorder(data.values.length, name);
  engine(p ?? displayPoints(data), params, r, data);
  return r;
}
describe("actual auto-K engines", () => {
  for (const [name, engine] of engines) {
    it(`${name}: full third dimension, actual decisions, seed and reversible/checkpoint state`, () => {
      const data: NumericDataset = { kind: "numeric", values };
      const r = execute(name, engine, data),
        again = execute(
          name,
          engine,
          data,
          opts,
          values.map(() => ({ x: 999, y: -999 })),
        );
      expect(r.state.labels).toEqual(again.state.labels);
      expect(new Set(r.state.labels).size).toBeGreaterThanOrEqual(2);
      expect(r.state.labels[0]).not.toBe(r.state.labels[16]);
      expect(
        r.trace.steps.some((s) => s.kind === "split" || s.kind === "insert"),
      ).toBe(true);
      expect(r.trace.steps).toEqual(again.trace.steps);
      let state = r.trace.initial;
      r.trace.steps.forEach((step, i) => {
        state = applyStep(state, step);
        expect(state).toEqual(stateAt(r.trace, i + 1));
      });
      expect(state).toEqual(r.state);
      for (const step of r.trace.steps.slice().reverse())
        state = applyStep(state, step, true);
      expect(state).toEqual(r.trace.initial);
      for (const c of r.trace.snapshots)
        expect(stateAt(r.trace, c.index)).toEqual(c.state);
    });
    it(`${name}: identical points stay one cluster; finite errors and maximum model K are explicit`, () => {
      const data: NumericDataset = {
        kind: "numeric",
        values: Array.from({ length: 10 }, () => [2, 2, 2]),
      };
      const r = execute(name, engine, data);
      expect(new Set(r.state.labels).size).toBe(1);
      expect(() =>
        execute(name, engine, {
          kind: "numeric",
          values: [
            [0, 0],
            [Infinity, 0],
          ],
        }),
      ).toThrow(/유한/);
      expect(() =>
        execute(name, engine, data, { ...opts, maxClusters: 0 }),
      ).toThrow(/파라미터/);
      const limited = execute(
        name,
        engine,
        { kind: "numeric", values },
        { ...opts, maxClusters: 1 },
      );
      expect(new Set(limited.state.labels).size).toBe(1);
    });
  }
  it("rejects false statistical domains instead of accepting fabricated tests", () => {
    const data: NumericDataset = { kind: "numeric", values };
    expect(() =>
      execute("G-Means", gmeans, data, { ...opts, significance: 0.123 }),
    ).toThrow(/유의수준/);
    expect(() =>
      execute("Dip-Means", dipmeans, data, { ...opts, bootstrapSamples: 0 }),
    ).toThrow(/bootstrap/);
    expect(() => gaussianAD([1, 2, 3])).toThrow(/8개/);
    expect(() => hartiganDip([0, Infinity, 2, 3])).toThrow(/유한/);
    expect(() =>
      execute("DP-Means", dpmeans, data, { ...opts, lambda: 0 }),
    ).toThrow(/λ/);
  });
});
