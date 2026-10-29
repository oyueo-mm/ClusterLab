import { it, expect } from "vitest";
import { interpolateCenters } from "./renderer";
import { type Center } from "../engine/types";
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
it("interpolated Gaussian covariance remains positive definite throughout rotation and scale change", () => {
  const a: Center[] = [{ x: 0.2, y: 0.3, cov: [0.01, 0.004, 0.02] }],
    b: Center[] = [{ x: 0.7, y: 0.8, cov: [0.08, -0.025, 0.03] }];
  for (let i = 0; i <= 100; i++) {
    const [aa, bb, dd] = interpolateCenters(a, b, i / 100)[0].cov!;
    expect(aa * dd - bb * bb).toBeGreaterThan(0);
  }
});
