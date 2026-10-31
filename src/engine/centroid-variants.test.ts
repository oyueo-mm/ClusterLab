import { describe, expect, it } from "vitest";
import {
  kmedians,
  coordinateMedian,
  manhattan,
  observedInitialization,
} from "./algorithms/kmedians";
import { minibatch, miniBatchStep } from "./algorithms/minibatch";
import { applyStep, Recorder, stateAt } from "./trace";
import { defaults, type Algorithm, type Params, type Point } from "./types";
import fixture from "./fixtures/centroid-variants-reference.json";
import katex from "katex";
import {
  kmedians as medianLesson,
  minibatch as batchLesson,
} from "../data/lessons/centroidVariants";

const o = {
  ...defaults,
  k: fixture.k,
  seed: fixture.seed,
  epochs: fixture.minibatch.epochs,
  batchSize: fixture.minibatch.batchSize,
};
function compute(a: Algorithm, p = fixture.points, params = o) {
  const r = new Recorder(p.length, a);
  (a === "K-Medians" ? kmedians : minibatch)(p, params, r);
  return r.trace;
}
const partition = (labels: number[]) =>
  labels.map((v) => labels.map((w) => Number(v === w)));
it("L1 coordinate median is a minimizer and differs from the arithmetic mean", () => {
  expect(coordinateMedian([0, 1, 2, 20])).toBe(1.5);
  expect(coordinateMedian([0, 1, 20])).toBe(1);
  const points = [
    { x: 0, y: 0 },
    { x: 1, y: 2 },
    { x: 2, y: 1 },
    { x: 20, y: 20 },
  ];
  const t = compute("K-Medians", points, { ...o, k: 1 }),
    s = stateAt(t, t.steps.length);
  expect(s.centers[0]).toMatchObject({ x: 1.5, y: 1.5 });
  expect(s.metric.at(-1)).toBe(42);
  expect(
    points.reduce((sum, p) => sum + manhattan(p, { x: 5.75, y: 5.75 }), 0),
  ).toBe(57);
  s.metric
    .slice(1)
    .forEach((v, i) => expect(v).toBeLessThanOrEqual(s.metric[i] + 1e-12));
});
it("K-Medians all centers/labels/L1 objective match independent NumPy", () => {
  const t = compute("K-Medians"),
    s = stateAt(t, t.steps.length);
  expect(s.centers.map((c) => [c.x, c.y])).toEqual(fixture.kmedians.centers);
  expect(partition(s.labels)).toEqual(partition(fixture.kmedians.labels));
  expect(s.metric.at(-1)).toBe(fixture.kmedians.objective);
});
it("Mini-Batch freezes batch assignments before cumulative updates", () => {
  const update = miniBatchStep(
    [
      { x: 4, y: 0 },
      { x: 6, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ],
    [0, 0],
  );
  expect(update.assignments).toEqual([0, 1]);
  expect(update.centers).toEqual([
    { x: 4, y: 0 },
    { x: 6, y: 0 },
  ]);
  expect(update.counts).toEqual([1, 1]);
  const cumulative = miniBatchStep([{ x: 10, y: 0 }], [{ x: 3, y: 0 }], [2]);
  expect(cumulative.centers[0].x).toBeCloseTo(16 / 3, 12);
  expect(cumulative.counts).toEqual([3]);
});
it("Mini-Batch every batch, counts, final centers and full SSE match independent NumPy weighted sums", () => {
  const t = compute("Mini-Batch K-Means"),
    s = stateAt(t, t.steps.length);
  const steps = t.steps
    .map((_, index) => stateAt(t, index + 1))
    .filter(
      (state) =>
        state.analysis?.kind === "centroid-variant" &&
        state.analysis.phase === "batch-update",
    );
  expect(steps).toHaveLength(fixture.minibatch.history.length);
  steps.forEach((step, index) => {
    const a = step.analysis;
    expect(a?.kind === "centroid-variant" && a.batch).toEqual(
      fixture.minibatch.history[index].batch,
    );
    expect(a?.kind === "centroid-variant" && a.counts).toEqual(
      fixture.minibatch.history[index].counts,
    );
    step.centers.forEach((c, j) => {
      expect(c.x).toBeCloseTo(
        fixture.minibatch.history[index].centers[j][0],
        11,
      );
      expect(c.y).toBeCloseTo(
        fixture.minibatch.history[index].centers[j][1],
        11,
      );
    });
  });
  expect(partition(s.labels)).toEqual(partition(fixture.minibatch.labels));
  expect(s.metric.at(-1)).toBeCloseTo(fixture.minibatch.objective, 11);
  expect(s.analysis?.kind === "centroid-variant" && s.analysis.counts).toEqual(
    fixture.minibatch.counts,
  );
  expect(fixture.minibatch.counts.reduce((a, b) => a + b, 0)).toBe(
    o.epochs * fixture.points.length,
  );
});
describe("centroid variants shared invariants", () => {
  for (const a of ["K-Medians", "Mini-Batch K-Means"] as const)
    it(`${a}: deterministic actual phases and exact every-step reverse/checkpoint restoration`, () => {
      const t = compute(a),
        again = compute(a);
      expect(t.steps).toEqual(again.steps);
      expect(t.steps.map((s) => s.kind)).toContain("assign");
      expect(t.steps.map((s) => s.kind)).toContain("move");
      let state = t.initial;
      t.steps.forEach((step, i) => {
        state = applyStep(state, step);
        expect(state).toEqual(stateAt(t, i + 1));
      });
      [...t.steps].reverse().forEach((step) => {
        state = applyStep(state, step, true);
      });
      expect(state).toEqual(t.initial);
      const same = compute(
          a,
          Array.from({ length: 5 }, () => ({ x: 2, y: 3 })),
        ),
        final = stateAt(same, same.steps.length);
      expect(final.centers).toHaveLength(1);
      expect(final.labels).toEqual([0, 0, 0, 0, 0]);
      expect(final.metric.at(-1)).toBe(0);
    });
});
it("batch visit coverage and epoch-summary recording never truncate original input", () => {
  const points: Point[] = Array.from({ length: 2000 }, (_, i) => ({
    x: i / 2000,
    y: i % 2,
  }));
  const t = compute("Mini-Batch K-Means", points, {
    ...o,
    batchSize: 1,
    epochs: 2,
  });
  const s = stateAt(t, t.steps.length);
  expect(t.recording?.policy).toContain("요약");
  expect(s.labels).toHaveLength(points.length);
  expect(
    s.analysis?.kind === "centroid-variant" &&
      s.analysis.counts?.reduce((a, b) => a + b, 0),
  ).toBe(4000);
});
it("invalid parameter, empty input and numerical overflow produce errors", () => {
  expect(() => observedInitialization([], 2, 42)).toThrow(/입력/);
  expect(() => coordinateMedian([])).toThrow(/빈/);
  expect(() =>
    compute("K-Medians", fixture.points, { ...o, iterations: NaN }),
  ).toThrow(/반복/);
  for (const opts of [
    { batchSize: 0 },
    { epochs: 0 },
    { batchSize: 1.5 },
  ] as Partial<Params>[])
    expect(() =>
      compute("Mini-Batch K-Means", fixture.points, { ...o, ...opts }),
    ).toThrow(/파라미터/);
  expect(() =>
    compute("K-Medians", [
      { x: -1e308, y: 0 },
      { x: 1e308, y: 0 },
    ]),
  ).toThrow(/수치 불안정/);
  expect(() =>
    compute("Mini-Batch K-Means", [
      { x: -1e308, y: 0 },
      { x: 1e308, y: 0 },
    ]),
  ).toThrow(/수치 불안정/);
});
it("centroid variant guide equations are valid KaTeX and cite independent definitions", () => {
  for (const lesson of [medianLesson, batchLesson]) {
    expect(lesson.operations.length).toBeGreaterThanOrEqual(4);
    expect(lesson.numerical.steps.length).toBeGreaterThanOrEqual(3);
    expect(lesson.references.length).toBeGreaterThanOrEqual(2);
    lesson.equations.forEach((eq) =>
      expect(katex.renderToString(eq.tex, { throwOnError: true })).toContain(
        "katex",
      ),
    );
  }
});
