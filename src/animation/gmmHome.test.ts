import { it, expect } from "vitest";
import {
  homeRounds,
  roundData,
  roundParams,
  homeSpeed,
} from "../data/homeRounds";
import { run } from "../engine/run";
import { advance, speedMultiplier, stateAt } from "../engine/trace";
import { draw, interpolateCenters } from "./renderer";
it("does not call ellipse before a viewport is measured or while it is collapsed", () => {
  const trace = run("GMM", roundData(homeRounds[0]), roundParams("GMM"));
  const gaussian = stateAt(trace, 1);
  let calls = 0;
  const ctx = new Proxy(
    {},
    {
      get: () => () => {
        calls++;
      },
      set: () => true,
    },
  ) as CanvasRenderingContext2D;
  for (const [w, h] of [
    [0, 0],
    [1, 1],
    [70, 60],
    [300, 0],
    [0, 240],
  ]) {
    draw(ctx, w, h, [], gaussian, gaussian, 0, {
      algorithm: "GMM",
      view: { zoom: 1, panX: 0, panY: 0 },
      selected: [],
      time: 0,
      decision: false,
      minimal: true,
    });
  }
  expect(calls).toBe(0);
});
for (const round of homeRounds.filter((r) => r.algorithms.includes("GMM"))) {
  it(`GMM home ${round.preset}: readable E/M time, actual probabilities and continuously rendered ellipses`, () => {
    const points = roundData(round),
      trace = run("GMM", points, roundParams("GMM"));
    const speed = homeSpeed(trace);
    expect(trace.steps[0].kind).toBe("initialize");
    for (const step of trace.steps)
      expect(step.duration / speedMultiplier(speed)).toBeGreaterThanOrEqual(
        450 - 1e-8,
      );
    let position = 0;
    const visited = new Set<number>();
    while (position < trace.steps.length) {
      visited.add(Math.floor(position));
      position = advance(position, 1000 / 60, speed, trace);
    }
    expect(visited.size).toBe(trace.steps.length);
    trace.steps.forEach((s, i) => {
      const from = stateAt(trace, i),
        to = stateAt(trace, i + 1);
      for (const row of to.responsibilities)
        expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
      if (s.kind !== "maximization") return;
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const ellipses: number[][] = [],
          rotations: number[] = [];
        const ctx = new Proxy(
          {},
          {
            get: (_target, key) =>
              key === "ellipse"
                ? (...args: number[]) => ellipses.push(args)
                : key === "rotate"
                  ? (v: number) => rotations.push(v)
                  : () => {},
            set: () => true,
          },
        ) as CanvasRenderingContext2D;
        draw(ctx, 180, 160, points, from, to, t, {
          algorithm: "GMM",
          view: { zoom: 1, panX: 0, panY: 0 },
          selected: [],
          time: 0,
          decision: false,
          minimal: true,
        });
        expect(ellipses.length).toBe(6);
        expect(
          ellipses.every(
            (e) => e[2] > 0 && e[3] > 0 && e.every(Number.isFinite),
          ),
        ).toBe(true);
        const centers = interpolateCenters(from.centers, to.centers, t);
        centers.forEach((c, j) => {
          const [a, b, d] = c.cov!;
          expect(a * d - b * b).toBeGreaterThan(0);
          expect(rotations[j]).toBeCloseTo(-0.5 * Math.atan2(2 * b, a - d));
          const l1 = (a + d + Math.sqrt((a - d) ** 2 + 4 * b * b)) / 2;
          expect(ellipses[j * 2][2]).toBeCloseTo(Math.sqrt(l1) * 100 * 2);
        });
      }
    });
    const final = stateAt(trace, trace.steps.length);
    expect(final.centers.length).toBe(3);
    expect(final.labels.every((l) => l >= 0)).toBe(true);
  });
}
