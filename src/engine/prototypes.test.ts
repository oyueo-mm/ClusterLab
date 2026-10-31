import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { cure, cureRepresentatives } from "./algorithms/cure";
import { neuralgas, neuralGasStep } from "./algorithms/neuralgas";
import {
  growingneuralgas,
  growingGasStep,
  type GasModel,
} from "./algorithms/growingneuralgas";
import { applyStep, Recorder, stateAt } from "./trace";
import { defaults, type Algorithm, type Params, type Point } from "./types";
import oracle from "./fixtures/prototypes-reference.json";
import katex from "katex";
import {
  cure as cureLesson,
  neuralgas as ngLesson,
  growingneuralgas as gngLesson,
} from "../data/lessons/prototypes";

const point = (row: number[]): Point => ({ x: row[0], y: row[1] });
function comparePoints(actual: Point[], expected: number[][]) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((p, i) => {
    expect(p.x).toBeCloseTo(expected[i][0], 12);
    expect(p.y).toBeCloseTo(expected[i][1], 12);
  });
}
it("CURE independently matches NumPy representative selection, shrink and all-data merges", () => {
  const p = oracle.cure.points.map(point);
  const reps = cureRepresentatives(
    p,
    p.map((_, i) => i),
    oracle.cure.count,
    oracle.cure.shrink,
  );
  expect(reps.selected).toEqual(oracle.cure.chosen);
  comparePoints(reps.representatives, oracle.cure.representatives);
  const r = new Recorder(p.length, "CURE");
  cure(
    p,
    {
      ...defaults,
      k: 2,
      shrink: oracle.cure.shrink,
      representatives: oracle.cure.count,
    },
    r,
  );
  const steps = r.trace.steps.filter((s) => s.kind === "distance");
  expect(steps).toHaveLength(oracle.cure.merges.length);
  steps.forEach((s, i) =>
    expect(s.result?.distance).toBeCloseTo(oracle.cure.merges[i].distance, 12),
  );
  const labels = r.state.labels;
  oracle.cure.partition.forEach((ids) =>
    ids.forEach((i) => expect(labels[i]).toBe(labels[ids[0]])),
  );
  expect(labels[oracle.cure.partition[0][0]]).not.toBe(
    labels[oracle.cure.partition[1][0]],
  );
});
it("CURE shrink endpoints and deterministic duplicate ties are mathematical, not placeholders", () => {
  const p = [0, 2, 6].map((x) => ({ x, y: 0 }));
  const zero = cureRepresentatives(p, [0, 1, 2], 2, 0);
  expect(zero.selected).toEqual([2, 0]);
  comparePoints(zero.representatives, [
    [6, 0],
    [0, 0],
  ]);
  const one = cureRepresentatives(p, [0, 1, 2], 2, 1);
  expect(one.representatives.every((v) => Math.abs(v.x - 8 / 3) < 1e-12)).toBe(
    true,
  );
  expect(
    cureRepresentatives(
      [
        { x: 1, y: 1 },
        { x: 1, y: 1 },
      ],
      [0, 1],
      3,
      0.5,
    ).selected,
  ).toEqual([0, 1]);
});
it("Neural Gas's rank-sensitive update matches independent NumPy and changes non-winners", () => {
  const a = oracle.neuralgas;
  const result = neuralGasStep(
    a.centers.map(point),
    point(a.input),
    a.rate,
    a.lambda_,
  );
  expect(result.ranks).toEqual(a.ranks);
  comparePoints(result.centers, a.updated);
  expect(result.centers[1].x).toBeLessThan(1);
  expect(result.centers[2].x).toBeLessThan(2);
  expect(result.centers[0].x).toBeCloseTo(0.05, 12);
});
it("Growing Neural Gas matches independent NumPy through every error, edge age and insertion", () => {
  const a = oracle.growingneuralgas;
  const model: GasModel = {
    nodes: a.initial.map((row, id) => ({ ...point(row), id, error: 0 })),
    edges: [],
    nextId: 2,
  };
  a.signals.forEach((row, index) => {
    growingGasStep(model, point(row), a, index + 1);
    const expected = a.states[index];
    expect(model.nodes.map((n) => n.id)).toEqual(
      expected.nodes.map((n) => n.id),
    );
    model.nodes.forEach((n, i) => {
      expect(n.x).toBeCloseTo(expected.nodes[i].x, 12);
      expect(n.y).toBeCloseTo(expected.nodes[i].y, 12);
      expect(n.error).toBeCloseTo(expected.nodes[i].error, 12);
    });
    expect(model.edges).toEqual(expected.edges);
  });
  expect(model.nodes).toHaveLength(4);
});
it("Growing Neural Gas removes stale edges and resulting isolated neurons", () => {
  const model: GasModel = {
    nodes: [0, 1, 10, 20].map((x, id) => ({ x, y: 0, id, error: 0 })),
    edges: [
      { a: 0, b: 1, age: 0 },
      { a: 0, b: 2, age: 1 },
      { a: 2, b: 3, age: 2 },
    ],
    nextId: 4,
  };
  growingGasStep(
    model,
    { x: 0.1, y: 0 },
    { ...defaults, maxAge: 1, insertionInterval: 100 },
    1,
  );
  expect(model.nodes.map((n) => n.id)).toEqual([0, 1]);
  expect(model.edges).toEqual([{ a: 0, b: 1, age: 0 }]);
});
const engines = {
  CURE: cure,
  "Neural Gas": neuralgas,
  "Growing Neural Gas": growingneuralgas,
};
it("prototype lessons have parseable formulas and cite distinct source documents", () => {
  for (const lesson of [cureLesson, ngLesson, gngLesson]) {
    expect(lesson.operations.length).toBeGreaterThanOrEqual(4);
    expect(lesson.numerical.steps.length).toBeGreaterThanOrEqual(3);
    expect(
      new Set(lesson.references.map((r) => r.url)).size,
    ).toBeGreaterThanOrEqual(2);
    for (const eq of lesson.equations)
      expect(katex.renderToString(eq.tex, { throwOnError: true })).toContain(
        "katex",
      );
  }
});
describe("2D prototype engine trace integrity", () => {
  for (const [name, engine] of Object.entries(engines)) {
    it(`${name}: seeded actual steps and every forward/reverse state are reproducible`, () => {
      const p = Array.from({ length: 12 }, (_, i) => ({
        x: (i % 3) / 3 + i / 1000,
        y: Math.floor(i / 3) / 4,
      }));
      const o: Params = {
        ...defaults,
        k: 3,
        epochs: 2,
        insertionInterval: 4,
        maxNeurons: 8,
      };
      const a = new Recorder(p.length, name as Algorithm),
        b = new Recorder(p.length, name as Algorithm);
      engine(p, o, a);
      engine(p, o, b);
      expect(a.trace.steps).toEqual(b.trace.steps);
      let state = a.trace.initial;
      a.trace.steps.forEach((step, i) => {
        state = applyStep(state, step);
        expect(state).toEqual(stateAt(a.trace, i + 1));
      });
      expect(state).toEqual(a.state);
      for (const step of [...a.trace.steps].reverse())
        state = applyStep(state, step, true);
      expect(state).toEqual(a.trace.initial);
      expect(a.state.labels.every((v) => v >= 0)).toBe(true);
      if (name === "Growing Neural Gas")
        expect(a.trace.steps.some((s) => s.kind === "insert")).toBe(true);
    });
    it(`${name}: duplicate and identical inputs remain finite without fake results`, () => {
      const p = Array.from({ length: 6 }, () => ({ x: 0.2, y: 0.3 }));
      const r = new Recorder(p.length, name as Algorithm);
      engine(
        p,
        { ...defaults, epochs: 1, insertionInterval: 2, maxNeurons: 5 },
        r,
      );
      expect(r.state.labels).toHaveLength(p.length);
      expect(
        r.state.centers.every(
          (v) => Number.isFinite(v.x) && Number.isFinite(v.y),
        ),
      ).toBe(true);
    });
  }
});
it("invalid algorithm parameters and numerical overflow fail explicitly", () => {
  const p = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ];
  expect(() =>
    cure(p, { ...defaults, shrink: 2 }, new Recorder(2, "CURE")),
  ).toThrow(/파라미터/);
  expect(() =>
    neuralgas(p, { ...defaults, lambda: 0 }, new Recorder(2, "Neural Gas")),
  ).toThrow(/파라미터/);
  expect(() =>
    growingneuralgas(
      p,
      { ...defaults, maxNeurons: 1 },
      new Recorder(2, "Growing Neural Gas"),
    ),
  ).toThrow(/파라미터/);
  expect(() => neuralGasStep(p, { x: 1e308, y: 0 }, 0.2, 2)).toThrow(
    /수치 불안정/,
  );
});
it("records bounded prototype computation/Trace observations without timing assertions", () => {
  const measurements = [];
  for (const [name, engine] of Object.entries(engines))
    for (const n of name === "CURE" ? [100] : [100, 1_000]) {
      const p = Array.from({ length: n }, (_, i) => ({
        x: ((i * 17) % 101) / 101,
        y: ((i * 31) % 103) / 103,
      }));
      const r = new Recorder(n, name as Algorithm);
      const before = process.memoryUsage().heapUsed,
        start = performance.now();
      engine(p, { ...defaults, k: 5, epochs: 1 }, r);
      const elapsedMs = performance.now() - start;
      expect(r.state.labels).toHaveLength(n);
      expect(r.state.labels.every((l) => l >= 0)).toBe(true);
      measurements.push({
        name,
        n,
        dimensions: 2,
        epochs: name === "CURE" ? null : 1,
        elapsedMs: +elapsedMs.toFixed(2),
        heapDeltaBytes: process.memoryUsage().heapUsed - before,
        events: r.trace.steps.length,
        traceEstimatedBytes: r.trace.recording?.estimatedBytes,
      });
    }
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/prototypes-performance.json",
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        seed: 42,
        note: "Single Node observation; heap delta is not peak, no browser transfer/rendering included.",
        measurements,
      },
      null,
      2,
    ),
  );
}, 30_000);
