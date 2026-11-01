import { describe, it, expect } from "vitest";
import { DenStreamModel, denstream } from "./algorithms/denstream";
import { defaults, type Point } from "./types";
import { Recorder, stateAt, applyStep } from "./trace";
import reference from "./fixtures/denstream-reference.json";

describe("DenStream actual online moments and time", () => {
  for (const [index, test] of reference.cases.entries())
    it(`agrees with independent observation-weight oracle ${index}`, () => {
      const model = new DenStreamModel(
        { ...defaults, ...test, streamInitSize: 0 },
        test.samples[0].values.length,
      );
      for (let i = 0; i < test.samples.length; i++) {
        const sample = test.samples[i],
          expected = test.states[i];
        const result = model.insert(sample.values, sample.time);
        expect(result.id).toBe(expected.assigned);
        const actual = model.snapshot();
        expect(actual.map((c) => c.id)).toEqual(
          expected.micro.map((c) => c.id),
        );
        actual.forEach((c, j) => {
          const other = expected.micro[j];
          expect(c.potential).toBe(other.potential);
          expect(c.weight).toBeCloseTo(other.weight, 12);
          expect(c.radius).toBeCloseTo(other.radius, 10);
          c.center.forEach((v, d) => expect(v).toBeCloseTo(other.center[d], 8));
        });
      }
      expect(model.pruneInterval).toBe(test.pruneInterval);
    });
  it("jumped timestamps prune exactly as all intermediate empty ticks", () => {
    const o = { ...defaults, streamInitSize: 0, decayRate: 0.05 };
    const a = new DenStreamModel(o, 2),
      b = new DenStreamModel(o, 2);
    for (let time = 0; time < 5; time++) {
      a.insert([0, 0], time);
      b.insert([0, 0], time);
    }
    a.insert([1, 1], 200);
    for (let time = 5; time < 200; time++) b.advance(time);
    b.insert([1, 1], 200);
    expect(a.snapshot()).toEqual(b.snapshot());
    expect(a.snapshot()).toHaveLength(1);
    expect(a.snapshot()[0].potential).toBe(false);
  });
  it("arrival at prune boundary precedes same-tick pruning and can preserve potential CF", () => {
    const o = {
      ...defaults,
      streamInitSize: 0,
      decayRate: 1,
      beta: 0.6,
      minWeight: 3,
    };
    const a = new DenStreamModel(o, 1);
    a.insert([0], 0);
    a.insert([0], 0);
    a.insert([0], 0);
    expect(a.pruneInterval).toBe(2);
    a.insert([0], 2);
    // 3/4+1=1.75 is below beta*mu=1.8, so it is correctly removed AFTER merging.
    expect(a.snapshot()).toHaveLength(0);
    const b = new DenStreamModel(o, 1);
    for (let j = 0; j < 4; j++) b.insert([0], 0);
    b.insert([0], 2); // 4/4+1=2 is retained. Pruning before arrival would remove it.
    expect(b.snapshot()[0].weight).toBe(2);
    expect(b.snapshot()[0].potential).toBe(true);
  });
  it("offline core is based on own weight; adjacent non-core micros do not become core by summing neighbors", () => {
    const model = new DenStreamModel(
      { ...defaults, beta: 0.5, minWeight: 5, epsilon: 0.1 },
      1,
    );
    model.initialize([[0], [0], [0], [0.15], [0.15], [0.15]], 0);
    expect(model.snapshot()).toHaveLength(2);
    expect(model.snapshot().every((c) => c.potential && c.label === -1)).toBe(
      true,
    );
  });
  it("validates parameters, monotone times, dimensions and numerical overflow", () => {
    expect(
      () => new DenStreamModel({ ...defaults, beta: 0.5, minWeight: 2 }, 2),
    ).toThrow(/βμ/);
    expect(() => new DenStreamModel({ ...defaults, decayRate: 0 }, 2)).toThrow(
      /파라미터/,
    );
    const model = new DenStreamModel(defaults, 2);
    model.insert([0, 0], 1);
    expect(() => model.insert([0, 0], 0)).toThrow(/시각/);
    expect(() => model.insert([1], 2)).toThrow(/차원/);
    expect(() => model.insert([1e308, 1e308], 2)).toThrow(/수치/);
  });
  it("uses all raw stream dimensions, preserves every row, actual events and exact reverse/checkpoints", () => {
    const input = {
      kind: "stream" as const,
      samples: Array.from({ length: 60 }, (_, i) => ({
        time: i,
        values: [0, 0, i % 2 ? 5 : 0],
      })),
    };
    const points: Point[] = input.samples.map(() => ({ x: 0, y: 0 }));
    const options = { ...defaults, streamInitSize: 0 };
    const r = new Recorder(points.length, "DenStream");
    denstream(points, options, r, input);
    const final = stateAt(r.trace, r.trace.steps.length);
    expect(final.analysis?.kind).toBe("stream");
    if (final.analysis?.kind !== "stream")
      throw new Error("missing stream analysis");
    expect(final.analysis.processed).toBe(60);
    expect(final.analysis.dimensions).toBe(3);
    expect(final.analysis.microClusters).toHaveLength(2);
    expect(new Set(final.labels)).toHaveProperty("size", 2);
    expect(r.trace.steps.some((s) => s.kind === "decay")).toBe(true);
    let state = final;
    for (const step of [...r.trace.steps].reverse())
      state = applyStep(state, step, true);
    expect(state).toEqual(r.trace.initial);
    for (const snapshot of r.trace.snapshots)
      expect(stateAt(r.trace, snapshot.index)).toEqual(snapshot.state);
    const again = new Recorder(points.length, "DenStream");
    denstream(points, options, again, input);
    expect(again.trace.steps).toEqual(r.trace.steps);
  });
});
