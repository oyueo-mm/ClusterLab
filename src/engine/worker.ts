import { run } from "./run";
import type { Algorithm, Point, Params } from "./types";
self.onmessage = (
  event: MessageEvent<{
    id: number;
    algorithm: Algorithm;
    points: Point[];
    params: Params;
  }>,
) => {
  const { id, algorithm, points, params } = event.data;
  try {
    self.postMessage({ id, trace: run(algorithm, points, params) });
  } catch (e) {
    self.postMessage({ id, error: e instanceof Error ? e.message : String(e) });
  }
};
