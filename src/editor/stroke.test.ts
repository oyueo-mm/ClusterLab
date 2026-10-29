import { expect, it } from "vitest";
import { PointStroke, POINT_SPACING } from "./stroke";
import { unproject } from "../animation/renderer";

it("interpolates every 12 CSS pixels through a fast 600px segment (50 samples)", () => {
  const samples = new PointStroke({ x: 100, y: 100 }).advance(
    { x: 700, y: 100 },
    600,
  );
  expect(samples).toHaveLength(50);
  expect(samples[0]).toEqual({ x: 112, y: 100 });
  expect(samples.at(-1)).toEqual({ x: 700, y: 100 });
  expect(
    samples.every(
      (p, i) =>
        i === 0 || Math.abs(p.x - samples[i - 1].x - POINT_SPACING) < 1e-8,
    ),
  ).toBe(true);
});
it("samples equally for slow and fast drags without adding stationary duplicates", () => {
  const stroke = new PointStroke({ x: 0, y: 0 });
  const slow = [];
  for (let x = 0; x <= 120; x++) {
    slow.push(...stroke.advance({ x, y: 0 }, 600));
    expect(stroke.advance({ x, y: 0 }, 600)).toEqual([]);
  }
  expect(slow).toEqual(
    new PointStroke({ x: 0, y: 0 }).advance({ x: 120, y: 0 }, 600),
  );
});
it("carries unused distance around corners instead of resetting each event", () => {
  const stroke = new PointStroke({ x: 0, y: 0 });
  expect(stroke.advance({ x: 6, y: 0 }, 600)).toEqual([]);
  expect(stroke.advance({ x: 6, y: 6 }, 600)).toEqual([{ x: 6, y: 6 }]);
  expect(stroke.advance({ x: 6, y: 30 }, 600)).toEqual([
    { x: 6, y: 18 },
    { x: 6, y: 30 },
  ]);
});
it("caps interpolation at remaining capacity, even on extremely long paths", () => {
  const stroke = new PointStroke({ x: 0, y: 0 });
  expect(stroke.advance({ x: 1e9, y: 0 }, 10)).toHaveLength(10);
  expect(stroke.advance({ x: 0, y: 0 }, 0)).toEqual([]);
});
it("maps CSS samples through the existing zoom/pan transform, independent of DPR", () => {
  const view = { zoom: 2, panX: 24, panY: -12 };
  const start = { x: 324, y: 188 };
  const world = unproject(start.x, start.y, 600, 400, view);
  expect(world).toEqual({ x: 0.5, y: 0.5 });
  const [next] = new PointStroke(start).advance(
    { x: start.x + 12, y: start.y },
    600,
  );
  expect(unproject(next.x, next.y, 600, 400, view).x - world.x).toBeCloseTo(
    12 / 680,
    12,
  );
});
