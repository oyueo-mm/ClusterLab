import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus, release, totalmem } from "node:os";
import { copkmeans, constraintClosure } from "./algorithms/copkmeans";
import { Recorder, stateAt, applyStep } from "./trace";
import { defaults, type Params } from "./types";
import { displayPoints, type ConstrainedDataset } from "./dataset";
import reference from "./fixtures/constrained-reference.json";
import { copkmeans as lesson } from "../data/lessons/constrained";

function run(
  data: ConstrainedDataset,
  params: Partial<Params> = {},
  points = displayPoints(data),
) {
  const r = new Recorder(points.length, "COP-KMeans");
  copkmeans(
    points,
    { ...defaults, k: 2, iterations: 10, tolerance: 1e-9, ...params },
    r,
    data,
  );
  return r;
}
function source(test: (typeof reference.cases)[number]): ConstrainedDataset {
  return {
    kind: "constrained",
    data: { kind: "numeric", values: test.values },
    mustLink: test.mustLink as [number, number][],
    cannotLink: test.cannotLink as [number, number][],
  };
}
describe("COP-KMeans true pointwise hard constrained clustering", () => {
  it("executes the actual3D lesson mini and checks the hand example with equal centers", () => {
    const data = lesson.experimentDataset;
    if (data?.kind !== "constrained")
      throw new Error("actual constrained mini required");
    const r = run(data, lesson.experimentParams),
      a = r.state.analysis;
    if (a?.kind !== "constraints") throw new Error("missing");
    expect(a.dimensions).toBe(3);
    expect(a.objective).toBeCloseTo(0.2, 12);
    expect(a.activeK).toBe(2);
    const hand = run(source(reference.cases.at(-1)!)),
      h = hand.state.analysis;
    if (h?.kind !== "constraints") throw new Error("missing");
    expect(h.centroids).toEqual([[2.5], [2.5]]);
    expect(h.objective).toBe(13);
    expect(hand.state.labels[0]).toBe(hand.state.labels[3]);
    expect(hand.state.labels[0]).not.toBe(hand.state.labels[1]);
  });
  for (const [index, test] of reference.cases.entries())
    it(`agrees with independent pair-closure/greedy and exhaustive feasibility oracle${index}`, () => {
      const data = source(test),
        options = {
          ...defaults,
          k: test.k,
          iterations: test.iterations,
          tolerance: test.tolerance,
          seed: test.seed,
        },
        r = new Recorder(data.data.values.length, "COP-KMeans");
      if (test.failed) {
        expect(() => copkmeans(displayPoints(data), options, r, data)).toThrow(
          /greedy.*실패/,
        );
        expect(r.trace.steps.some((s) => s.kind === "finish")).toBe(false);
        expect(
          r.state.analysis?.kind === "constraints" &&
            r.state.analysis.stopReason,
        ).toBe("greedy-failure");
      } else copkmeans(displayPoints(data), options, r, data);
      const seedSteps = r.trace.steps.flatMap((s, i) =>
        s.kind === "initialize" ? [i + 1] : [],
      );
      const initial = stateAt(r.trace, seedSteps.at(-1)!).analysis;
      if (initial?.kind !== "constraints")
        throw new Error("missing source state");
      expect(initial.initialization).toEqual(test.initialization);
      seedSteps.forEach((at, i) => {
        const a = stateAt(r.trace, at).analysis;
        if (a?.kind !== "constraints") throw new Error("missing seed trace");
        expect(a.initialization).toEqual(test.initialization.slice(0, i + 1));
        expect(a.centroids).toEqual(
          test.initialization.slice(0, i + 1).map((row) => test.values[row]),
        );
      });
      const states = r.trace.steps.map((step, i) => ({
        kind: step.kind,
        state: stateAt(r.trace, i + 1),
      }));
      for (const expected of test.states) {
        const matches = states.filter(
          (s) =>
            s.state.analysis?.kind === "constraints" &&
            s.state.analysis.iteration === expected.iteration &&
            (expected.phase === "move"
              ? s.state.analysis.phase === "mean-update"
              : s.kind === "test" && s.state.analysis.current === expected.row),
        );
        const actual = matches.at(-1)?.state;
        if (!actual || actual.analysis?.kind !== "constraints")
          throw new Error(`missing ${expected.phase}`);
        expect(actual.labels).toEqual(expected.labels);
        if (expected.phase === "move") {
          actual.analysis.centroids.forEach((v, c) =>
            v.forEach((x, j) =>
              expect(x).toBeCloseTo(expected.centroids![c][j], 11),
            ),
          );
          expect(actual.analysis.objective).toBeCloseTo(
            expected.objective!,
            11,
          );
        } else {
          const candidates = actual.analysis.candidates!;
          expect(candidates.map((c) => c.cluster)).toEqual(
            expected.candidates!.map((c) => c.cluster),
          );
          expect(candidates.map((c) => c.allowed)).toEqual(
            expected.candidates!.map((c) => c.allowed),
          );
          candidates.forEach((c, i) =>
            expect(c.distanceSquared).toBeCloseTo(
              expected.candidates![i].distanceSquared,
              11,
            ),
          );
        }
      }
      let reverse = r.state;
      for (const step of [...r.trace.steps].reverse())
        reverse = applyStep(reverse, step, true);
      expect(reverse).toEqual(r.trace.initial);
      if (!test.failed) {
        const final = r.state.analysis;
        if (final?.kind !== "constraints") throw new Error("missing final");
        expect(final.stopReason).toBe(test.stopReason);
        expect(
          test.feasible.some(
            (f) =>
              f.labels.every((c, i) => c === r.state.labels[i]) &&
              Math.abs(f.sse - final.objective) < 1e-9,
          ),
        ).toBe(true);
      }
    });
  it("a feasible two-color path can fail under this greedy order; failure is not an impossibility proof", () => {
    const test = reference.cases[2];
    expect(test.failed).toBe(true);
    expect(test.feasible.length).toBeGreaterThan(0);
    expect(() => run(source(test), { seed: test.seed })).toThrow(
      /전역|모든 K-분할/,
    );
    expect(reference.cases[3].feasible).toEqual([]);
  });
  it("sparse ML closure propagates CL without making CL transitive and canonicalizes duplicate undirected input", () => {
    const c = constraintClosure(
      7,
      [
        [0, 1],
        [1, 2],
        [1, 0],
      ],
      [
        [2, 3],
        [3, 4],
        [3, 2],
      ],
    );
    expect(c.componentIds).toEqual([0, 0, 0, 1, 2, 3, 4]);
    expect(c.componentSizes).toEqual([3, 1, 1, 1, 1]);
    expect(c.componentCannotLink).toEqual([
      [0, 1],
      [1, 2],
    ]);
    expect(c.neighbors[0]).toEqual([1]);
    expect(c.mustLink).toEqual([
      [0, 1],
      [1, 2],
    ]);
    expect(() =>
      run({
        kind: "constrained",
        data: { kind: "numeric", values: [[0], [1], [2]] },
        mustLink: [
          [0, 1],
          [1, 2],
        ],
        cannotLink: [[0, 2]],
      }),
    ).toThrow(/모순/);
  });
  it("uses every raw dimension, independent of custom display coordinates, with deterministic source ordering and seed", () => {
    const data = source(reference.cases[0]),
      a = run(data, { seed: 42 }),
      b = run(
        data,
        { seed: 42 },
        data.data.values.map(() => ({ x: 0, y: 0 })),
      );
    expect(a.trace.steps).toEqual(b.trace.steps);
    expect(new Set(a.state.labels).size).toBe(2);
    expect(data.data.values.every((v) => v[0] === 0 && v[1] === 0)).toBe(true);
    expect(run(data, { seed: 42 }).trace.steps).toEqual(a.trace.steps);
  });
  it("keeps exactly K initial row indices despite duplicates; reports empty clusters without inventing occupied clusters", () => {
    const data: ConstrainedDataset = {
      kind: "constrained",
      data: { kind: "numeric", values: [[1], [1], [1]] },
      mustLink: [
        [0, 1],
        [1, 2],
      ],
      cannotLink: [],
    };
    const r = run(data, { k: 3 }),
      a = r.state.analysis;
    if (a?.kind !== "constraints") throw new Error("missing");
    expect(new Set(a.initialization).size).toBe(3);
    expect(a.activeK).toBe(1);
    expect(a.emptyClusters).toEqual([1, 2]);
    expect(a.objective).toBe(0);
  });
  it("retains only genuinely tested candidate prefix and audits exact assigned SSE in every actual state", () => {
    const data = source(reference.cases[0]),
      r = run(data);
    for (let i = 1; i <= r.trace.steps.length; i++) {
      const state = stateAt(r.trace, i),
        a = state.analysis;
      if (a?.kind !== "constraints") throw new Error("missing");
      const cost = state.labels.reduce(
        (s, c, row) =>
          c < 0
            ? s
            : s +
              data.data.values[row].reduce(
                (q, v, j) => q + (v - a.centroids[c][j]) ** 2,
                0,
              ),
        0,
      );
      expect(a.objective).toBeCloseTo(cost, 11);
      expect(a.assigned).toBe(state.labels.filter((c) => c >= 0).length);
      if (a.candidates?.some((c) => c.allowed))
        expect(a.candidates.at(-1)!.allowed).toBe(true);
    }
  });
  it("restores all real checkpoints and distinguishes iteration limit from convergence", () => {
    const data: ConstrainedDataset = {
      kind: "constrained",
      data: {
        kind: "numeric",
        values: Array.from({ length: 24 }, (_, i) => [
          i % 3,
          (i % 3) * 4 + i / 100,
          i % 2,
        ]),
      },
      mustLink: [],
      cannotLink: [],
    };
    const r = run(data, { k: 3, seed: 42 });
    expect(r.trace.steps.length).toBeGreaterThan(48);
    expect(r.trace.snapshots.length).toBeGreaterThan(0);
    for (const snapshot of r.trace.snapshots)
      expect(stateAt(r.trace, snapshot.index)).toEqual(snapshot.state);
    const once = run(source(reference.cases[0]), {
        iterations: 1,
        tolerance: 0,
      }),
      a = once.state.analysis;
    if (a?.kind !== "constraints") throw new Error("missing");
    expect(a.converged).toBe(false);
    expect(a.stopReason).toBe("iteration-limit");
  });
  it("rejects wrong source/parameters/numerical or trace-budget failures with no fake finish", () => {
    const data = source(reference.cases[0]);
    for (const options of [
      { k: 0 },
      { k: 5 },
      { seed: NaN },
      { iterations: 0 },
      { tolerance: -1 },
    ])
      expect(() => run(data, options)).toThrow(/파라미터/);
    expect(() =>
      copkmeans(displayPoints(data), defaults, new Recorder(4, "COP-KMeans")),
    ).toThrow(/constrained/);
    expect(() =>
      run({
        ...data,
        data: {
          kind: "numeric",
          values: [[1e308], [-1e308], [1e308], [-1e308]],
        },
      }),
    ).toThrow(/수치/);
    const r = new Recorder(4, "COP-KMeans", 3000);
    expect(() =>
      copkmeans(displayPoints(data), { ...defaults, k: 2 }, r, data),
    ).toThrow(/예산/);
    expect(r.trace.steps.some((s) => s.kind === "finish")).toBe(false);
  });
  it("records100/1000/10000/100000 full-source observations; invariant metadata is shared by Trace events", () => {
    const observations = [];
    for (const n of [100, 1000, 10000, 100000]) {
      const values = Array.from({ length: n }, (_, i) => [
          (i % 2) * 5 + (i % 7) / 100,
          (i % 11) / 100,
          (i % 2) * 3,
        ]),
        data: ConstrainedDataset = {
          kind: "constrained",
          data: { kind: "numeric", values },
          mustLink: [
            [0, 2],
            [1, 3],
          ],
          cannotLink: [[0, 1]],
        };
      const before = process.memoryUsage().heapUsed,
        start = performance.now(),
        r = run(data, { seed: 42, iterations: 10 }),
        a = r.state.analysis;
      const elapsed = performance.now() - start,
        heapDelta = process.memoryUsage().heapUsed - before;
      if (a?.kind !== "constraints") throw new Error("missing");
      expect(a.assigned).toBe(n);
      expect(a.activeK).toBe(2);
      expect(a.componentIds.length).toBe(n);
      expect(r.state.labels[0]).not.toBe(r.state.labels[1]);
      const sums = [Array(3).fill(0) as number[], Array(3).fill(0) as number[]];
      values.forEach((row, i) => row.forEach((v, j) => (sums[i % 2][j] += v)));
      const expected = values.reduce(
        (s, row, i) =>
          s +
          row.reduce((q, v, j) => q + (v - sums[i % 2][j] / (n / 2)) ** 2, 0),
        0,
      );
      expect(a.objective).toBeCloseTo(expected, 7);
      const metadataWrites = r.trace.steps.reduce(
        (s, step) =>
          s +
          (step.analysisDelta?.changes.filter((c) => c.key === "componentIds")
            .length ?? 0),
        0,
      );
      expect(metadataWrites).toBe(1);
      observations.push({
        n,
        dimensions: 3,
        milliseconds: elapsed,
        heapDeltaBytes: heapDelta,
        events: r.trace.steps.length,
        traceEstimatedBytes: r.trace.recording?.estimatedBytes,
        sourceRows: a.assigned,
        activeK: a.activeK,
        objective: a.objective,
        componentIdWrites: metadataWrites,
      });
    }
    mkdirSync(".local", { recursive: true });
    writeFileSync(
      ".local/constrained-performance.json",
      JSON.stringify(
        {
          node: process.version,
          platform: process.platform,
          recordedAt: new Date().toISOString(),
          architecture: process.arch,
          system: {
            cpu: cpus()[0]?.model,
            logicalProcessors: cpus().length,
            osRelease: release(),
            totalMemoryBytes: totalmem(),
          },
          seed: 42,
          k: 2,
          iterations: 10,
          tolerance: 1e-9,
          input: "row i: [i%2*5+(i%7)/100,(i%11)/100,i%2*3]; ML0-2/1-3 CL0-1",
          note: "Single Node engine+Trace observations; generation/Worker/browser excluded; heap delta is not peak; actual all-row/ND computation.",
          observations,
        },
        null,
        2,
      ),
    );
  });
});
