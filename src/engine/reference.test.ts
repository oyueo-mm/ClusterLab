import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { run } from "./run";
import { stateAt } from "./trace";
import { defaults, type Algorithm, type Point, type Params } from "./types";
interface Fixture {
  name: string;
  algorithm: Algorithm;
  points: Point[];
  params: Partial<Params>;
  labels: number[];
  heights?: number[];
  order?: number[];
  reach?: (number | null)[];
}
const path = new URL("./fixtures/reference.json", import.meta.url);
let fixtures: Fixture[] = [];
try {
  fixtures = JSON.parse(readFileSync(path, "utf8")).cases;
} catch {
  /* generated explicitly by scripts/generate-reference.py */
}
const equivalent = (a: number[], b: number[]) =>
  a.every(
    (l, i) =>
      l < 0 === b[i] < 0 &&
      a.every((m, j) => (l === m && l >= 0) === (b[i] === b[j] && b[i] >= 0)),
  );
describe("independent sklearn / scipy reference", () => {
  it("checked-in reference fixtures exist", () =>
    expect(fixtures.length).toBeGreaterThanOrEqual(20));
  for (const f of fixtures)
    it(f.name, () => {
      const trace = run(f.algorithm, f.points, { ...defaults, ...f.params }),
        state = stateAt(trace, trace.steps.length);
      expect(equivalent(state.labels, f.labels)).toBe(true);
      if (f.heights)
        state.metric.forEach((height, i) =>
          expect(height).toBeCloseTo(f.heights![i], 9),
        );
      if (f.reach)
        state.reach.forEach((value, i) =>
          f.reach![i] === null
            ? expect(value).toBe(Infinity)
            : expect(value).toBeCloseTo(f.reach![i]!, 10),
        );
    });
});
