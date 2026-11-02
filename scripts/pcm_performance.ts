import { writeFileSync } from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { pcm } from "../src/engine/algorithms/pcm";
import { algorithmDefaults } from "../src/engine/types";
import { displayPoints, type NumericDataset } from "../src/engine/dataset";
import { Recorder } from "../src/engine/trace";
import { random } from "../src/engine/math";
const measurements = [];
for (const n of [100, 1000, 10000]) {
  const dimensions = 4,
    k = 3,
    seed = 42,
    rng = random(seed);
  const values = Array.from({ length: n }, (_, i) =>
    Array.from(
      { length: dimensions },
      (_, j) =>
        (i < n / 3 ? 0 : i < (2 * n) / 3 ? 4 : 8) +
        (rng() - 0.5) * 0.2 +
        j * 0.01,
    ),
  );
  const data: NumericDataset = { kind: "numeric", values },
    params = {
      ...algorithmDefaults("Possibilistic C-Means"),
      k,
      seed,
      iterations: 10,
      tolerance: 1e-9,
    },
    points = displayPoints(data),
    r = new Recorder(n, "Possibilistic C-Means"),
    heapBefore = process.memoryUsage().heapUsed,
    start = performance.now();
  pcm(points, params, r, data);
  const elapsedMs = performance.now() - start,
    heapDeltaBytes = process.memoryUsage().heapUsed - heapBefore,
    a = r.state.analysis;
  if (a?.kind !== "possibilistic") throw Error("missing actual PCM analysis");
  const independentObjective = values.reduce(
    (sum, row, i) =>
      sum +
      a.centroids.reduce(
        (s, c, h) =>
          s +
          a.typicalities[i][h] ** params.typicalityExponent *
            row.reduce((d, v, j) => d + (v - c[j]) ** 2, 0) +
          a.scales[h] * (1 - a.typicalities[i][h]) ** params.typicalityExponent,
        0,
      ),
    0,
  );
  if (
    Math.abs(independentObjective - a.objective) > 1e-6 ||
    a.typicalities.length !== n
  )
    throw Error("full original J mismatch");
  measurements.push({
    n,
    dimensions,
    k,
    seed,
    params,
    matrixCells: n * k,
    elapsedMs,
    heapDeltaBytes,
    events: r.trace.steps.length,
    traceEstimatedBytes: r.trace.recording!.estimatedBytes,
    recording: r.trace.recording!.policy,
    objective: a.objective,
    independentObjective,
    scales: a.scales,
    iteration: a.iteration,
    warmIteration: a.warmIteration,
    stopReason: a.stopReason,
    fixedPointResidual: a.fixedPointResidual,
  });
}
const result = {
  environment: {
    node: process.version,
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0].model,
    logicalCPUs: os.cpus().length,
    ramBytes: os.totalmem(),
  },
  scope:
    "Node engine+Recorder only; generation/projection/transfer/render excluded. Heap delta is not peak or retained memory; single observations.",
  measurements,
};
writeFileSync(
  "docs/research/pcm-performance.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    measurements.map(({ n, elapsedMs, events, traceEstimatedBytes }) => ({
      n,
      elapsedMs,
      events,
      traceEstimatedBytes,
    })),
    null,
    2,
  ),
);
