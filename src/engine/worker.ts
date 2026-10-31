import { loaders } from "./registry";
import { validateRun } from "./validation";
import { assertResources, DEFAULT_TRACE_BYTES } from "./resources";
import { Recorder } from "./trace";
import type { Algorithm, Point, Params } from "./types";
self.onmessage = async (
  event: MessageEvent<{
    id: number;
    algorithm: Algorithm;
    points: Point[];
    params: Params;
  }>,
) => {
  const { id, algorithm, points, params } = event.data;
  try {
    validateRun(algorithm, points, params);
    const estimate = assertResources(algorithm, points.length, params);
    self.postMessage({ id, progress: { phase: "validated", ...estimate } });
    const engine = await loaders[algorithm]();
    const r = new Recorder(
      points.length,
      algorithm,
      DEFAULT_TRACE_BYTES,
      (events) =>
        self.postMessage({ id, progress: { phase: "computing", events } }),
    );
    const start = performance.now();
    engine(points, params, r);
    r.trace.elapsed = performance.now() - start;
    self.postMessage({ id, trace: r.trace });
  } catch (e) {
    self.postMessage({ id, error: e instanceof Error ? e.message : String(e) });
  }
};
