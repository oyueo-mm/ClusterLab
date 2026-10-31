import { describe, it, expect } from "vitest";
import { run } from "./run";
import { algorithms, defaults, type Algorithm, type Point } from "./types";
import { stateAt, advance, applyStep } from "./trace";
import {
  dataset,
  dataDefaults,
  presets,
  exportData,
  importData,
} from "../data/presets";
import { silhouette, sq } from "./math";
const p: Point[] = [
  { x: 0, y: 0 },
  { x: 0.01, y: 0 },
  { x: 0, y: 0.01 },
  { x: 0.8, y: 0.8 },
  { x: 0.81, y: 0.8 },
  { x: 0.8, y: 0.81 },
];
const partition = (labels: number[]) =>
  labels
    .map((l) =>
      labels
        .map((m, j) => (l === m && l >= 0 ? j : -1))
        .filter((j) => j >= 0)
        .join(","),
    )
    .join("|");
describe("algorithm invariants", () => {
  for (const algorithm of algorithms)
    it(`${algorithm}: real events, deterministic result, reversible trace`, () => {
      const points =
        algorithm === "ROCK"
          ? dataset("categorical", { ...dataDefaults, count: 18 })
          : algorithm === "LVQ"
            ? dataset("labeled", { ...dataDefaults, count: 18 })
            : p;
      const o = {
        ...defaults,
        k: 2,
        minSize: 3,
        minPts: 3,
        epochs: 2,
        iterations: algorithm === "Affinity Propagation" ? 200 : 5,
        threshold: algorithm === "ROCK" ? 0.5 : 0.06,
      };
      const trace = run(algorithm, points, o),
        again = run(algorithm, points, o);
      expect(trace.steps.length).toBeGreaterThan(1);
      expect(trace.steps).toEqual(again.steps);
      const final = stateAt(trace, trace.steps.length);
      expect(final.labels).toHaveLength(points.length);
      expect(final.labels.every((l) => l >= -1)).toBe(true);
      let state = final;
      for (const step of [...trace.steps].reverse())
        state = applyStep(state, step, true);
      expect(state).toEqual(trace.initial);
      expect(stateAt(trace, 0)).toEqual(trace.initial);
      for (const snapshot of trace.snapshots)
        expect(stateAt(trace, snapshot.index)).toEqual(snapshot.state);
    });
  for (const algorithm of [
    "K-Means",
    "DBSCAN",
    "HDBSCAN",
    "AGNES",
    "DIANA",
    "PAM",
    "GMM",
    "BIRCH",
  ] as Algorithm[])
    it(`${algorithm}: separated reference partition`, () => {
      const trace = run(algorithm, p, {
          ...defaults,
          k: 2,
          minSize: 3,
          minPts: 3,
          epsilon: 0.04,
          threshold: 0.04,
          iterations: 12,
        }),
        final = stateAt(trace, trace.steps.length);
      expect(partition(final.labels)).toBe(partition([0, 0, 0, 1, 1, 1]));
    });
  it("K-Means inertia and GMM log likelihood are monotonic", () => {
    for (const algorithm of ["K-Means", "GMM"] as Algorithm[]) {
      const trace = run(
        algorithm,
        dataset("anisotropic", dataDefaults),
        defaults,
      );
      const values = stateAt(trace, trace.steps.length).metric;
      for (let i = 1; i < values.length; i++)
        expect(
          algorithm === "GMM"
            ? values[i] - values[i - 1]
            : values[i - 1] - values[i],
        ).toBeGreaterThanOrEqual(-1e-6);
    }
  });
  it("PAM medoids are observed data; all individual swaps are non-improving", () => {
    const trace = run("PAM", p, { ...defaults, k: 2 }),
      s = stateAt(trace, trace.steps.length),
      cost = (centers: Point[]) =>
        p.reduce(
          (sum, v) =>
            sum + Math.min(...centers.map((c) => Math.sqrt(sq(v, c)))),
          0,
        ),
      current = cost(s.centers);
    s.centers.forEach((c) =>
      expect(p.some((v) => v.x === c.x && v.y === c.y)).toBe(true),
    );
    for (let j = 0; j < s.centers.length; j++)
      for (const point of p)
        expect(
          cost(s.centers.map((c, i) => (i === j ? point : c))),
        ).toBeGreaterThanOrEqual(current - 1e-10);
  });
  it("GMM responsibility rows sum to one; covariances stay positive definite", () => {
    const trace = run(
        "GMM",
        dataset("duplicates", { ...dataDefaults, count: 30 }),
        defaults,
      ),
      s = stateAt(trace, trace.steps.length);
    s.responsibilities.forEach((row) =>
      expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10),
    );
    s.centers.forEach((c) => {
      const [a, b, d] = c.cov!;
      expect(a * d - b * b).toBeGreaterThan(0);
    });
  });
  it("DBSCAN recovers noise and core/border distinctions", () => {
    const points = [...p, { x: 2, y: 2 }],
      trace = run("DBSCAN", points, { ...defaults, epsilon: 0.04, minPts: 3 }),
      s = stateAt(trace, trace.steps.length);
    expect(s.labels.at(-1)).toBe(-1);
    expect(s.roles.at(-1)).toBe("noise");
    expect(s.roles[0]).toBe("core");
  });
  it("HDBSCAN handles duplicate coordinates and tie levels without NaN", () => {
    const points = [...p, ...p],
      trace = run("HDBSCAN", points, { ...defaults, minSize: 3, minPts: 3 }),
      s = stateAt(trace, trace.steps.length);
    expect(s.tree.every((n) => Number.isFinite(n.stability))).toBe(true);
    expect(new Set(s.labels.filter((l) => l >= 0)).size).toBe(2);
  });
  it("ROCK ignores display coordinates", () => {
    const points = dataset("categorical", { ...dataDefaults, count: 21 }),
      o = { ...defaults, threshold: 0.5 },
      a = run("ROCK", points, o),
      b = run(
        "ROCK",
        points.map((v, i) => ({ ...v, x: i * 100, y: -i })),
        o,
      );
    expect(stateAt(a, a.steps.length).labels).toEqual(
      stateAt(b, b.steps.length).labels,
    );
  });
  it("LVQ and ROCK reject incompatible inputs; Ward rejects Manhattan", () => {
    expect(() => run("LVQ", p, defaults)).toThrow(/label/);
    expect(() => run("ROCK", p, defaults)).toThrow(/범주형/);
    expect(() =>
      run("AGNES", p, { ...defaults, linkage: "ward", metric: "manhattan" }),
    ).toThrow(/Ward/);
  });
  it("BIRCH CF summaries conserve N, LS, SS and capacity after recursive splits", () => {
    const points = dataset("uniform", { ...dataDefaults, count: 70 }),
      o = { ...defaults, branching: 3, threshold: 0.02 },
      trace = run("BIRCH", points, o),
      s = stateAt(trace, trace.steps.length);
    const root = s.tree.find((n) => n.parent === undefined)!;
    expect(root.n).toBe(points.length);
    const leafEntries = s.tree.filter(
      (n) => n.ls && !s.tree.some((c) => c.parent === n.id),
    );
    expect(leafEntries.reduce((a, b) => a + b.n!, 0)).toBe(points.length);
    expect(leafEntries.reduce((a, b) => a + b.ls![0], 0)).toBeCloseTo(
      points.reduce((a, b) => a + b.x, 0),
      10,
    );
    for (const node of s.tree.filter((n) => !n.ls))
      expect(
        s.tree.filter((c) => c.parent === node.id).length,
      ).toBeLessThanOrEqual(o.branching);
    expect(trace.steps.some((s) => s.kind === "tree-split")).toBe(true);
  });
  it("OPTICS ordering is a permutation and epsilon extraction matches DBSCAN on reference", () => {
    const o = { ...defaults, minPts: 3, epsilon: 1.5, threshold: 0.04 },
      trace = run("OPTICS", p, o),
      s = stateAt(trace, trace.steps.length),
      db = run("DBSCAN", p, { ...o, epsilon: o.threshold });
    expect([...s.order].sort((a, b) => a - b)).toEqual(p.map((_, i) => i));
    expect(partition(s.labels)).toEqual(
      partition(stateAt(db, db.steps.length).labels),
    );
  });
  it("SOM learns topology with decreasing error on a simple distribution", () => {
    const trace = run(
        "SOM",
        dataset("uniform", { ...dataDefaults, count: 40 }),
        { ...defaults, epochs: 5, grid: 3 },
      ),
      s = stateAt(trace, trace.steps.length);
    expect(s.centers.length).toBe(9);
    expect(s.edges.length).toBe(12);
    expect(s.metric.at(-1)!).toBeLessThan(s.metric[0]);
  });
});
describe("playback and datasets", () => {
  it("elapsed-time playback is frame-rate independent and speed changes preserve position", () => {
    const trace = run("K-Means", p, { ...defaults, k: 2 });
    let a = 0,
      b = 0;
    for (let i = 0; i < 60; i++) a = advance(a, 1000 / 60, 50, trace);
    for (let i = 0; i < 144; i++) b = advance(b, 1000 / 144, 50, trace);
    expect(a).toBeCloseTo(b, 10);
    expect(advance(a, 0, 100, trace)).toBe(a);
    expect(advance(a, 20, 100, trace)).toBeGreaterThan(a);
    expect(advance(0, 1e8, 200, trace)).toBe(trace.steps.length);
  });
  it("32 presets are distinct, deterministic and finite", () => {
    expect(presets.length).toBeGreaterThanOrEqual(30);
    const hashes = new Set(
      presets.map(([id]) => {
        const a = dataset(id, dataDefaults);
        expect(a).toEqual(dataset(id, dataDefaults));
        expect(
          a.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
        ).toBe(true);
        return JSON.stringify(a);
      }),
    );
    expect(hashes.size).toBe(presets.length);
  });
  it("CSV and JSON roundtrip preserve coordinates, labels and categorical attributes", () => {
    const points = dataset("categorical", { ...dataDefaults, count: 10 }).map(
      (p, i) => ({ ...p, label: i % 3 }),
    );
    for (const format of ["json", "csv"] as const)
      expect(importData(exportData(points, format))).toEqual(points);
    expect(() => importData("x,y\nNaN,0")).toThrow();
    expect(() => importData('{"points":[]}')).toThrow();
  });
  it("Silhouette is independent of numeric label names", () => {
    expect(silhouette(p, [0, 0, 0, 1, 1, 1])).toBeCloseTo(
      silhouette(p, [8, 8, 8, 4, 4, 4])!,
      12,
    );
  });
});
