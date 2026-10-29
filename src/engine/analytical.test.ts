import { it, expect } from "vitest";
import { run } from "./run";
import { stateAt } from "./trace";
import { defaults, type Algorithm, type Point } from "./types";
const line: Point[] = [0, 0.1, 0.2, 0.8, 0.9, 1].map((x) => ({ x, y: 0 }));
const final = (algorithm: Algorithm, points: Point[], options = {}) => {
  const trace = run(algorithm, points, { ...defaults, ...options });
  return stateAt(trace, trace.steps.length);
};
it("hand-calculated DIANA split: [0,.1,.2] versus [.8,.9,1]", () => {
  const labels = final("DIANA", line, { k: 2 }).labels;
  expect(labels[0]).toBe(labels[1]);
  expect(labels[1]).toBe(labels[2]);
  expect(labels[3]).toBe(labels[4]);
  expect(labels[4]).toBe(labels[5]);
  expect(labels[0]).not.toBe(labels[3]);
});
it("hand-calculated global PAM optimum has medoids .1 and .9, total distance .4", () => {
  const state = final("PAM", line, { k: 2 });
  expect(state.centers.map((c) => c.x).sort()).toEqual([0.1, 0.9]);
  expect(state.metric.at(-1)).toBeCloseTo(0.4, 12);
});
it("ROCK: two sets of three identical token sets, common-neighbor links 1, no cross links", () => {
  const points = line.map((p, i) => ({
      ...p,
      features: [`type=${i < 3 ? "a" : "b"}`],
    })),
    labels = final("ROCK", points, { k: 2, threshold: 0.5 }).labels;
  expect(labels[0]).toBe(labels[2]);
  expect(labels[3]).toBe(labels[5]);
  expect(labels[0]).not.toBe(labels[3]);
});
it("LVQ exact fixed-point reference: coincident same-class samples leave prototypes fixed and accuracy 1", () => {
  const points: Point[] = [
      { x: 0, y: 0, label: 0 },
      { x: 0, y: 0, label: 0 },
      { x: 1, y: 1, label: 1 },
      { x: 1, y: 1, label: 1 },
    ],
    state = final("LVQ", points, { k: 1, epochs: 3 });
  expect(state.centers.map((c) => [c.x, c.y])).toEqual([
    [0, 0],
    [1, 1],
  ]);
  expect(state.metric).toEqual([1, 1, 1]);
});
it("SOM exact zero-variance distribution has target .5,.5; quantization converges to that target", () => {
  const points: Point[] = Array.from({ length: 8 }, () => ({ x: 0.5, y: 0.5 })),
    state = final("SOM", points, { grid: 2, epochs: 30 });
  expect(state.metric.at(-1)!).toBeLessThan(1e-5);
  expect(new Set(state.labels).size).toBe(1);
});
