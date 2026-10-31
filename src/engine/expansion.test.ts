import { describe, expect, it } from "vitest";
import { run } from "./run";
import { defaults, algorithms } from "./types";
import { applyStep, Recorder, stateAt } from "./trace";
import { memberships } from "./algorithms/fuzzy";
import { assertResources } from "./resources";
import { registry } from "./registry";
import { dataset, dataDefaults, exportData, importData } from "../data/presets";
import {
  createHistory,
  commitHistory,
  undoHistory,
  redoHistory,
} from "../editor/history";
import reference from "./fixtures/expansion-reference.json";

it("FCM agrees with independent vectorized NumPy centers, U and objective", () => {
  const trace = run("Fuzzy C-Means", reference.points, {
    ...defaults,
    k: 2,
    iterations: 200,
    tolerance: 1e-10,
  });
  const final = stateAt(trace, trace.steps.length);
  final.centers.forEach((c, j) => {
    expect(c.x).toBeCloseTo(reference.centers[j][0], 9);
    expect(c.y).toBeCloseTo(reference.centers[j][1], 9);
  });
  final.responsibilities.forEach((row, i) =>
    row.forEach((v, j) =>
      expect(v).toBeCloseTo(reference.memberships[i][j], 9),
    ),
  );
  expect(final.metric.at(-1)).toBeCloseTo(reference.objective, 9);
  final.metric
    .slice(1)
    .forEach((v, i) => expect(v).toBeLessThanOrEqual(final.metric[i] + 1e-10));
});
it("FCM hand calculation .9/.1, zero distances, identical points, fuzzifier near 1", () => {
  expect(
    memberships(
      [{ x: 0.5, y: 0 }],
      [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ],
      2,
    )[0][0],
  ).toBeCloseTo(0.9, 12);
  expect(
    memberships(
      [{ x: 1, y: 1 }],
      [
        { x: 1, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
      2,
    ),
  ).toEqual([[0.5, 0.5, 0]]);
  const t = run(
    "Fuzzy C-Means",
    Array.from({ length: 6 }, () => ({ x: 1, y: 1 })),
    { ...defaults, fuzziness: 1.01 },
  );
  expect(
    stateAt(t, t.steps.length).responsibilities.every((row) =>
      row.every((v) => Math.abs(v - 1 / 3) < 1e-12),
    ),
  ).toBe(true);
});
it("Bisecting returns hand-calculated partition and cost, true split/assign/move order", () => {
  const t = run(
    "Bisecting K-Means",
    [0, 1, 9, 10].map((x) => ({ x, y: 0 })),
    { ...defaults, k: 2 },
  );
  const s = stateAt(t, t.steps.length);
  expect(s.labels[0]).toBe(s.labels[1]);
  expect(s.labels[2]).toBe(s.labels[3]);
  expect(s.labels[0]).not.toBe(s.labels[2]);
  expect(s.centers.map((c) => c.x).sort((a, b) => a - b)).toEqual([0.5, 9.5]);
  expect(s.metric.at(-1)).toBe(1);
  expect(t.steps.map((s) => s.kind)).toContain("split");
  expect(s.tree).toHaveLength(3);
  const identical = run(
    "Bisecting K-Means",
    [
      { x: 1, y: 1 },
      { x: 1, y: 1 },
    ],
    defaults,
  );
  expect(stateAt(identical, identical.steps.length).centers).toHaveLength(1);
});
describe("registry and complete recording", () => {
  for (const a of ["Fuzzy C-Means", "Bisecting K-Means"] as const) {
    it(`${a}: lazy engine agrees with synchronous API; every event reverses`, async () => {
      const p = reference.points,
        o = { ...defaults, k: 2 };
      const r = new Recorder(p.length, a);
      (await registry[a].load())(p, o, r);
      const t = run(a, p, o);
      expect(t.steps).toEqual(r.trace.steps);
      let s = t.initial;
      t.steps.forEach((step, i) => {
        s = applyStep(s, step);
        expect(s).toEqual(stateAt(t, i + 1));
      });
      [...t.steps].reverse().forEach((step) => {
        s = applyStep(s, step, true);
      });
      expect(s).toEqual(t.initial);
    });
  }
  it("has a schema and loader for each executable algorithm", () => {
    expect(Object.keys(registry)).toEqual([...algorithms]);
    expect(Object.values(registry).every((a) => a.parameters.length > 0)).toBe(
      true,
    );
  });
});
it("accepts 10k points through generation/import/export/history and exact K-Means", () => {
  const p = dataset("blobs", { ...dataDefaults, count: 10_000 });
  expect(importData(exportData(p, "json"))).toEqual(p);
  expect(importData(exportData(p, "csv"))).toHaveLength(p.length);
  const h = createHistory({
    points: p,
    preset: "blobs",
    options: dataDefaults,
  });
  const changed = commitHistory(h, {
    ...h.present,
    points: [...p, { x: 0.5, y: 0.5 }],
  });
  expect(undoHistory(changed).present.points).toEqual(p);
  expect(redoHistory(undoHistory(changed)).present.points).toHaveLength(10_001);
  expect(JSON.stringify(changed.past).length).toBeLessThan(2000);
  const t = run("K-Means", p, { ...defaults, iterations: 5 });
  expect(t.recording!.policy).toContain("표본 계산 없음");
  const final = stateAt(t, t.steps.length);
  expect(final.labels).toHaveLength(p.length);
  p.forEach((v, i) => {
    const ds = final.centers.map((c) => (c.x - v.x) ** 2 + (c.y - v.y) ** 2);
    expect(ds[final.labels[i]]).toBe(Math.min(...ds));
  });
});
it("resource policy checks allocation bytes, trace budget fails honestly, invalid parameters fail", () => {
  for (const a of ["Fuzzy C-Means", "Bisecting K-Means"] as const)
    expect(() =>
      run(
        a,
        [
          { x: 1e308, y: 1e308 },
          { x: -1e308, y: -1e308 },
        ],
        defaults,
      ),
    ).toThrow(/수치 불안정/);
  expect(() => assertResources("HDBSCAN", 100_000, defaults)).toThrow(/메모리/);
  expect(() => assertResources("K-Means", 100_000, defaults)).not.toThrow();
  const r = new Recorder(2, "K-Means", 2048);
  expect(() =>
    r.emit("assign", "x", { labels: Array(10_000).fill(0) }),
  ).toThrow(/예산/);
  expect(r.trace.steps).toHaveLength(0);
  expect(() =>
    run("Fuzzy C-Means", reference.points, { ...defaults, fuzziness: 1 }),
  ).toThrow(/파라미터/);
  expect(() =>
    run("Bisecting K-Means", reference.points, { ...defaults, k: NaN }),
  ).toThrow(/파라미터/);
});
