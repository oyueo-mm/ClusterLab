import { it, expect } from "vitest";
import { run } from "./run";
import { stateAt, speedMultiplier, advance, applyStep } from "./trace";
import { defaults, type Point } from "./types";
import { distance, argmin } from "./math";
const p: Point[] = [
  { x: 0, y: 0 },
  { x: 0.01, y: 0 },
  { x: 0, y: 0.01 },
  { x: 0.8, y: 0.8 },
  { x: 0.81, y: 0.8 },
  { x: 0.8, y: 0.81 },
];
const fit = (points = p, bandwidth = 0.08, iterations = 20) =>
  run("Mean Shift", points, { ...defaults, bandwidth, iterations });
it("finds separated modes and assigns every point to its nearest mode", () => {
  const t = fit(),
    s = stateAt(t, t.steps.length);
  expect(s.centers).toHaveLength(2);
  expect(s.labels[0]).toBe(s.labels[1]);
  expect(s.labels[3]).toBe(s.labels[5]);
  expect(s.labels[0]).not.toBe(s.labels[3]);
  s.labels.forEach((label, i) =>
    expect(label).toBe(argmin(s.centers.map((c) => distance(c, p[i])))),
  );
});
it("bandwidth determines cluster count without K and large bandwidth gives the global mean", () => {
  const small = fit(p, 0.001),
    large = fit(p, 2);
  expect(stateAt(small, small.steps.length).centers).toHaveLength(6);
  const s = stateAt(large, large.steps.length);
  expect(s.centers).toHaveLength(1);
  expect(s.centers[0].x).toBeCloseTo(
    p.reduce((a, b) => a + b.x, 0) / p.length,
    12,
  );
});
it("is deterministic, does not mutate input and does not use K or random seed", () => {
  const original = structuredClone(p),
    t = fit();
  const other = run("Mean Shift", p, {
    ...defaults,
    k: 0,
    seed: 999,
    bandwidth: 0.08,
  });
  expect(other.steps).toEqual(t.steps);
  expect(p).toEqual(original);
});
it("candidates converge, generate actual move events and suppress duplicate modes", () => {
  const t = fit(),
    moves = t.steps.filter((s) => s.kind === "move");
  expect(moves.some((s) => Number(s.result?.displacement) > 0)).toBe(true);
  const final = stateAt(t, t.steps.length);
  expect(final.centers.every((c) => c.converged)).toBe(true);
  expect(t.steps.some((s) => s.kind === "merge")).toBe(true);
  for (const c of final.centers)
    for (const d of final.centers)
      if (c.id !== d.id) expect(distance(c, d)).toBeGreaterThan(0.08);
  for (const step of moves)
    for (const c of step.patch.centers ?? [])
      expect(Number.isFinite(c.x) && Number.isFinite(c.y)).toBe(true);
});
it("snapshot reconstruction and complete reverse patches preserve center IDs, paths and operation states", () => {
  const t = fit();
  expect(t.steps.length).toBeGreaterThan(48);
  for (const snap of t.snapshots)
    expect(stateAt(t, snap.index)).toEqual(snap.state);
  let s = stateAt(t, t.steps.length);
  for (const step of [...t.steps].reverse()) s = applyStep(s, step, true);
  expect(s).toEqual(t.initial);
  for (let i = 0; i < t.steps.length; i++)
    if (t.steps[i].kind === "move") {
      const before = stateAt(t, i),
        after = stateAt(t, i + 1);
      expect(before.centers.map((c) => c.id)).toEqual(
        after.centers.map((c) => c.id),
      );
    }
});
it("duplicate coordinates collapse to a single finite mode", () => {
  const t = fit(Array.from({ length: 8 }, () => ({ x: 0.5, y: 0.5 }))),
    s = stateAt(t, t.steps.length);
  expect(s.centers).toHaveLength(1);
  expect(s.centers[0].x).toBe(0.5);
  expect(s.labels).toEqual(Array(8).fill(0));
});
it.each([0, -1, NaN, Infinity, -Infinity])(
  "rejects invalid bandwidth %s with a clear error",
  (bw) => expect(() => fit(p, bw)).toThrow(/Bandwidth/),
);
it("preserves the partition when coordinates and bandwidth use a different common scale", () => {
  const a = fit(),
    b = fit(
      p.map((v) => ({ x: v.x * 20, y: v.y * 20 })),
      1.6,
    );
  expect(stateAt(a, a.steps.length).labels).toEqual(
    stateAt(b, b.steps.length).labels,
  );
});
it("unified speed is continuous over 1..200, preserves the cursor and reaches the exact final state", () => {
  for (let speed = 2; speed <= 200; speed++) {
    expect(speedMultiplier(speed) / speedMultiplier(speed - 1)).toBeCloseTo(
      2 ** (1 / 18),
      12,
    );
  }
  const t = fit(),
    pos = advance(0, 500, 50, t);
  expect(advance(pos, 0, 200, t)).toBe(pos);
  expect(advance(pos, 20, 200, t)).toBeGreaterThan(advance(pos, 20, 100, t));
  const end = advance(pos, 1e7, 200, t);
  expect(stateAt(t, end)).toEqual(stateAt(t, t.steps.length));
});
