import { afterEach, expect, it, vi } from "vitest";
import { legacyDataset } from "../engine/dataset";
import { emptyState } from "../engine/types";
import { previewFrame } from "../engine/preview";
import { previewPainter } from "./previewPainter";

afterEach(() => vi.unstubAllGlobals());
function setup() {
  vi.stubGlobal("window", { devicePixelRatio: 1 });
  const ellipse = vi.fn();
  const context = new Proxy<Record<string, unknown>>(
    { ellipse },
    {
      get(target, key: string) {
        return (target[key] ??= vi.fn());
      },
    },
  );
  const canvas = { getContext: () => context } as unknown as HTMLCanvasElement;
  const data = legacyDataset([
    { x: 0.1, y: 0.2 },
    { x: 0.6, y: 0.3 },
    { x: 0.8, y: 0.7 },
  ]);
  const state = emptyState(3);
  state.focus = [1, 2];
  state.radius = 0.2;
  return { ellipse, state, draw: previewPainter(canvas, data) };
}
it("draws exactly one query neighborhood with the true horizontal/vertical data scale", () => {
  const { ellipse, state, draw } = setup();
  const frame = previewFrame(state, 1, "neighbors", "query");
  draw(frame, frame, 1);
  expect(ellipse).toHaveBeenCalledOnce();
  const args = ellipse.mock.calls[0];
  expect(args[0]).toBeCloseTo(12 + 0.6 * 276);
  expect(args[1]).toBeCloseTo(138 - 0.3 * 126);
  expect(args[2]).toBeCloseTo(0.2 * 276);
  expect(args[3]).toBeCloseTo(0.2 * 126);
});
it("anchors Mean Shift bandwidth at the recorded moving center rather than its neighbor observations", () => {
  const { ellipse, state, draw } = setup();
  state.centers = [{ x: 0.4, y: 0.5, id: 7 }];
  state.activeCenter = 0;
  const frame = previewFrame(state, 1, "neighbors", "bandwidth");
  draw(frame, frame, 1);
  expect(ellipse).toHaveBeenCalledOnce();
  expect(ellipse.mock.calls[0][0]).toBeCloseTo(12 + 0.4 * 276);
  expect(ellipse.mock.calls[0][1]).toBeCloseTo(138 - 0.5 * 126);
});
