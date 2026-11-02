import { writeFileSync } from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { pckmeans } from "../src/engine/algorithms/pckmeans";
import { algorithmDefaults } from "../src/engine/types";
import { displayPoints, type ConstrainedDataset } from "../src/engine/dataset";
import { Recorder } from "../src/engine/trace";
import { random } from "../src/engine/math";
const measurements = [];
for (const [n, dense] of [
  [100, false],
  [1000, false],
  [10000, false],
  [1000, true],
] as const) {
  const d = 4,
    k = 3,
    seed = 42,
    rng = random(seed),
    middle = Math.ceil(n / 3);
  const values = Array.from({ length: n }, (_, i) =>
    Array.from(
      { length: d },
      (_, j) =>
        (i < n / 3 ? 0 : i < (2 * n) / 3 ? 4 : 8) +
        (rng() - 0.5) * 0.2 +
        j * 0.01,
    ),
  );
  const mustLink: [number, number][] = dense
    ? Array.from(
        { length: n - 1 },
        (_, i) => [i, i + 1] as [number, number],
      ).filter(([i]) => i !== n / 2 - 1)
    : [
        [0, 1],
        [1, 2],
        [2, 3],
        [middle, middle + 1],
        [middle + 1, middle + 2],
        [n - 2, n - 1],
      ];
  const cannotLink: [number, number][] = dense
    ? [[0, n - 1]]
    : [
        [0, middle],
        [0, n - 1],
        [middle, n - 1],
      ];
  const input: ConstrainedDataset = {
    kind: "constrained",
    data: { kind: "numeric", values },
    mustLink,
    cannotLink,
  };
  const params = {
    ...algorithmDefaults("PCKMeans"),
    k,
    seed,
    iterations: 10,
    tolerance: 1e-9,
  };
  const points = displayPoints(input),
    recorder = new Recorder(n, "PCKMeans"),
    heapBefore = process.memoryUsage().heapUsed,
    start = performance.now();
  pckmeans(points, params, recorder, input);
  const elapsedMs = performance.now() - start,
    heapDeltaBytes = process.memoryUsage().heapUsed - heapBefore,
    a = recorder.state.analysis;
  if (a?.kind !== "pairwise") throw Error("missing actual analysis");
  const independentSSE = values.reduce(
    (sum, row, i) =>
      sum +
      row.reduce(
        (s, v, j) => s + (v - a.centroids[recorder.state.labels[i]][j]) ** 2,
        0,
      ),
    0,
  );
  if (
    Math.abs(independentSSE - a.distanceCost) > 1e-7 ||
    recorder.state.labels.some((v) => v < 0)
  )
    throw Error("full original SSE mismatch");
  measurements.push({
    algorithm: "PCKMeans",
    n,
    dimensions: d,
    k,
    seed,
    params,
    mustLink: mustLink.length,
    cannotLink: cannotLink.length,
    closureMustCount: a.closureMustCount,
    closureCannotCount: a.closureCannotCount,
    denseClosure: dense,
    elapsedMs,
    events: recorder.trace.steps.length,
    traceEstimatedBytes: recorder.trace.recording!.estimatedBytes,
    heapDeltaBytes,
    objective: a.objective,
    distanceCost: a.distanceCost,
    independentSSE,
    counts: a.counts,
    stopReason: a.stopReason,
    recording: recorder.trace.recording!.policy,
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
    "Node engine+Recorder only; generation/projection/Worker transfer/render excluded. Heap delta is not peak or retained memory; single observations.",
  measurements,
};
writeFileSync(
  "docs/research/pckmeans-performance.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    measurements.map(
      ({ n, denseClosure, elapsedMs, events, traceEstimatedBytes }) => ({
        n,
        denseClosure,
        elapsedMs,
        events,
        traceEstimatedBytes,
      }),
    ),
    null,
    2,
  ),
);
