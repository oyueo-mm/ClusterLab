import { it, expect } from "vitest";
import { interpolateCenters } from "./renderer";
import { type Center, emptyState } from "../engine/types";
import { draw } from "./renderer";
it("centers follow a continuous path with exact endpoints and no one-frame teleport", () => {
  const a: Center[] = [{ x: 0.1, y: 0.2 }],
    b: Center[] = [{ x: 0.9, y: 0.8 }];
  expect(interpolateCenters(a, b, 0)).toEqual([
    { ...b[0], x: 0.1, y: 0.2, cov: undefined },
  ]);
  expect(interpolateCenters(a, b, 0.5)[0].x).toBeCloseTo(0.5);
  expect(interpolateCenters(a, b, 1)[0].x).toBeCloseTo(0.9);
  let previous = a[0];
  for (let i = 1; i <= 144; i++) {
    const next = interpolateCenters(a, b, i / 144)[0];
    expect(Math.hypot(next.x - previous.x, next.y - previous.y)).toBeLessThan(
      0.012,
    );
    previous = next;
  }
});
it("Mean Shift keeps stable IDs through pruning and its bandwidth circle follows the actual interpolated center", () => {
  const a: Center[] = [
      { id: 4, x: 0.1, y: 0.2 },
      { id: 9, x: 0.3, y: 0.4 },
    ],
    b: Center[] = [{ id: 9, x: 0.8, y: 0.7 }];
  expect(interpolateCenters(a, b, 0, true)[0].x).toBe(0.3);
  expect(interpolateCenters(a, b, 0.5, true)[0].x).toBeCloseTo(0.55);
  const from = {
      ...emptyState(0),
      centers: [a[1]],
      activeCenter: 9,
      radius: 0.1,
    },
    to = { ...from, centers: b };
  for (const t of [0, 0.5, 1]) {
    const arcs: number[][] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_target, key) =>
          key === "arc" ? (...args: number[]) => arcs.push(args) : () => {},
        set: () => true,
      },
    ) as CanvasRenderingContext2D;
    draw(ctx, 400, 400, [], from, to, t, {
      algorithm: "Mean Shift",
      view: { zoom: 1, panX: 0, panY: 0 },
      selected: [],
      time: 0,
      decision: false,
    });
    const circle = arcs.find((a) => Math.abs(a[2] - 33) < 1e-9)!;
    expect(circle).toBeDefined();
    const c = interpolateCenters(from.centers, to.centers, t, true)[0];
    expect(circle[0]).toBeCloseTo(35 + c.x * 330);
    expect(circle[1]).toBeCloseTo(35 + (1 - c.y) * 330);
  }
});
it("interpolated Gaussian covariance remains positive definite throughout rotation and scale change", () => {
  const a: Center[] = [{ x: 0.2, y: 0.3, cov: [0.01, 0.004, 0.02] }],
    b: Center[] = [{ x: 0.7, y: 0.8, cov: [0.08, -0.025, 0.03] }];
  for (let i = 0; i <= 100; i++) {
    const [aa, bb, dd] = interpolateCenters(a, b, i / 100)[0].cov!;
    expect(aa * dd - bb * bb).toBeGreaterThan(0);
  }
});
