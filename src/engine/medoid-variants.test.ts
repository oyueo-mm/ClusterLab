import { it, expect, describe } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { clara, fullMedoidAssignment, medoidSample } from "./algorithms/clara";
import { clarans } from "./algorithms/clarans";
import { random } from "./math";
import { defaults, type Algorithm, type Point, type Params } from "./types";
import { Recorder, applyStep, stateAt } from "./trace";
import oracle from "./fixtures/medoid-variants-reference.json";

const p: Point[] = oracle.points.map(([x, y]) => ({ x, y }));
const options = {
  ...defaults,
  k: 2,
  sampleSize: 6,
  numLocal: 3,
  maxNeighbors: 40,
  iterations: 20,
};
const key = (medoids: number[]) =>
  [...medoids].sort((a, b) => a - b).join(",") as keyof typeof oracle.costs;
it("CLARA full sample and CLARANS seeded search reach independent exhaustive tiny optimum", () => {
  for (const [name, engine] of [
    ["CLARA", clara],
    ["CLARANS", clarans],
  ] as const) {
    const r = new Recorder(p.length, name);
    engine(p, options, r);
    const medoids = r.state.centers.map((c) => c.id!);
    expect(oracle.costs[key(medoids)]).toBeCloseTo(oracle.optimum, 12);
    expect(
      r.state.analysis?.kind === "medoids" && r.state.analysis.fullCost,
    ).toBeCloseTo(oracle.optimum, 12);
    expect(r.state.labels).toEqual(fullMedoidAssignment(p, medoids).labels);
    p.forEach((_, i) =>
      p.forEach((_, j) =>
        expect(r.state.labels[i] === r.state.labels[j]).toBe(
          oracle.partition[i] === oracle.partition[j],
        ),
      ),
    );
  }
});
it("every CLARANS proposal uses true full objective and resets rejected count on acceptance", () => {
  const r = new Recorder(p.length, "CLARANS");
  clarans(p, options, r);
  let accepted = 0,
    rejected = 0;
  r.trace.steps.forEach((step, i) => {
    if (step.kind === "swap") {
      const before = stateAt(r.trace, i),
        proposal = stateAt(r.trace, i + 1);
      const ids = before.centers.map((c) => c.id!);
      const [old, incoming] = proposal.focus;
      const candidate = ids.map((id) => (id === old ? incoming : id));
      const expected = oracle.costs[key(candidate)],
        current = oracle.costs[key(ids)];
      expect(step.result?.candidateCost).toBeCloseTo(expected, 12);
      expect(step.result?.delta).toBeCloseTo(expected - current, 12);
      expect(step.result?.accepted).toBe(String(expected < current));
      expect(proposal.centers).toEqual(before.centers); // proposing isn't an accepted move
    }
    if (step.kind === "move") {
      expect(step.result?.consecutiveRejected).toBe(0);
      accepted++;
    }
    if (step.kind === "visit") rejected++;
    if (step.kind === "extract")
      expect(step.result?.consecutiveRejected).toBe(options.maxNeighbors);
  });
  expect(accepted).toBeGreaterThan(0);
  expect(rejected).toBeGreaterThan(0);
});
it("CLARA samples contain best prior medoids, yet scores and assigns all rows", () => {
  const points = Array.from({ length: 30 }, (_, i) => ({
    x: i / 29,
    y: (i % 3) / 100,
  }));
  const r = new Recorder(points.length, "CLARA");
  clara(points, { ...options, sampleSize: 7 }, r);
  let bestMedoids: number[] = [];
  r.trace.steps.forEach((_, i) => {
    const s = stateAt(r.trace, i + 1),
      analysis = s.analysis;
    if (analysis?.kind !== "medoids") return;
    if (analysis.phase === "sample") {
      expect(new Set(analysis.sample).size).toBe(7);
      bestMedoids.forEach((id) => expect(analysis.sample).toContain(id));
    }
    if (analysis.phase === "full-evaluation") {
      expect(s.labels).toHaveLength(points.length);
      const actual = fullMedoidAssignment(
        points,
        s.centers.map((c) => c.id!),
      );
      expect(analysis.fullCost).toBeCloseTo(actual.cost, 12);
      if (analysis.accepted) bestMedoids = s.centers.map((c) => c.id!);
    }
  });
  expect(r.trace.recording?.policy).toContain("표본");
  expect(r.state.labels.every((v) => v >= 0)).toBe(true);
});
it("reservoir sampling is reproducible, unique, keeps mandatory medoids and is not prefix truncation", () => {
  const a = medoidSample(1000, 20, [17, 999], random(42));
  expect(a).toEqual(medoidSample(1000, 20, [17, 999], random(42)));
  expect(new Set(a).size).toBe(20);
  expect(a).toContain(17);
  expect(a).toContain(999);
  expect(a.some((id) => id > 500 && id < 999)).toBe(true);
});
describe("medoid variant event integrity", () => {
  for (const [name, engine] of [
    ["CLARA", clara],
    ["CLARANS", clarans],
  ] as const) {
    it(`${name}: all real states replay and reverse exactly with seeded determinism`, () => {
      const a = new Recorder(p.length, name),
        b = new Recorder(p.length, name);
      engine(p, options, a);
      engine(p, options, b);
      expect(a.trace.steps).toEqual(b.trace.steps);
      let s = a.trace.initial;
      a.trace.steps.forEach((step, i) => {
        s = applyStep(s, step);
        expect(s).toEqual(stateAt(a.trace, i + 1));
      });
      expect(s).toEqual(a.state);
      [...a.trace.steps].reverse().forEach((step) => {
        s = applyStep(s, step, true);
      });
      expect(s).toEqual(a.trace.initial);
      expect(
        a.state.centers.every((c) => p[c.id!].x === c.x && p[c.id!].y === c.y),
      ).toBe(true);
    });
    it(`${name}: duplicate/all-identical and K=n cases give finite genuine assignments`, () => {
      for (const points of [
        Array.from({ length: 6 }, () => ({ x: 1, y: 1 })),
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      ]) {
        const r = new Recorder(points.length, name);
        engine(points, options, r);
        expect(r.state.labels.every((v) => v >= 0)).toBe(true);
        expect(
          r.state.analysis?.kind === "medoids" && r.state.analysis.fullCost,
        ).toBe(0);
      }
    });
  }
});
it("medoid variant invalid parameters and overflow are explicit errors", () => {
  expect(() =>
    clara(p, { ...options, sampleSize: 1 }, new Recorder(p.length, "CLARA")),
  ).toThrow(/파라미터/);
  expect(() =>
    clara(p, { ...options, iterations: 0 }, new Recorder(p.length, "CLARA")),
  ).toThrow(/파라미터/);
  expect(() =>
    clarans(
      p,
      { ...options, maxNeighbors: 0 },
      new Recorder(p.length, "CLARANS"),
    ),
  ).toThrow(/파라미터/);
  expect(() =>
    fullMedoidAssignment(
      [
        { x: 1e308, y: 0 },
        { x: -1e308, y: 0 },
      ],
      [0],
    ),
  ).toThrow(/수치 불안정/);
});
it("records scalable full-input medoid evaluations without an n² original distance cache", () => {
  const measurements = [];
  for (const [name, engine, n] of [
    ["CLARA", clara, 10_000],
    ["CLARANS", clarans, 1_000],
  ] as const) {
    const points = Array.from({ length: n }, (_, i) => ({
      x: (i % 101) / 101,
      y: ((i * 7) % 97) / 97,
    }));
    const r = new Recorder(n, name as Algorithm);
    const start = performance.now(),
      before = process.memoryUsage().heapUsed;
    const o: Params = {
      ...defaults,
      k: 3,
      sampleSize: 20,
      numLocal: 2,
      maxNeighbors: 10,
      iterations: 5,
    };
    engine(points, o, r);
    expect(r.state.labels).toHaveLength(n);
    expect(r.state.labels.every((v) => v >= 0)).toBe(true);
    measurements.push({
      name,
      n,
      milliseconds: +(performance.now() - start).toFixed(2),
      heapDeltaBytes: process.memoryUsage().heapUsed - before,
      events: r.trace.steps.length,
      traceEstimatedBytes: r.trace.recording?.estimatedBytes,
    });
  }
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/medoid-variants-performance.json",
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        seed: 42,
        observations: measurements,
        note: "One Node observation. Heap delta is not peak; browser transfer/rendering excluded.",
      },
      null,
      2,
    ),
  );
}, 30_000);
