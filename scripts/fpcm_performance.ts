import { writeFileSync } from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { fpcm } from "../src/engine/algorithms/fpcm";
import { algorithmDefaults } from "../src/engine/types";
import { displayPoints, type NumericDataset } from "../src/engine/dataset";
import { Recorder } from "../src/engine/trace";
import { random } from "../src/engine/math";
const observations = [];
for (const [n, dimensions, k] of [
  [100, 4, 3],
  [1000, 4, 3],
  [10000, 4, 3],
  [1000, 8, 4],
  [1000, 2, 2],
]) {
  const seed = 42,
    rng = random(seed),
    values = Array.from({ length: n }, (_, i) =>
      Array.from(
        { length: dimensions },
        (_, j) => Math.floor(i / (n / k)) * 4 + (rng() - 0.5) * 0.2 + j * 0.01,
      ),
    ),
    data: NumericDataset = { kind: "numeric", values },
    params = {
      ...algorithmDefaults("Fuzzy Possibilistic C-Means"),
      k,
      seed,
      warmIterations: 30,
      iterations: 10,
      tolerance: 1e-9,
    },
    points = displayPoints(data),
    r = new Recorder(n, "Fuzzy Possibilistic C-Means"),
    heap = process.memoryUsage().heapUsed,
    start = performance.now();
  fpcm(points, params, r, data);
  const elapsedMs = performance.now() - start,
    a = r.state.analysis;
  if (a?.kind !== "fuzzy-possibilistic") throw Error("actual FPCM");
  const independent = values.reduce(
    (s, row, i) =>
      s +
      a.centroids.reduce(
        (v, c, j) =>
          v +
          (a.memberships[i][j] ** params.fuzziness +
            a.typicalities[i][j] ** params.typicalityExponent) *
            row.reduce((d, x, h) => d + (x - c[h]) ** 2, 0),
        0,
      ),
    0,
  );
  if (
    Math.abs(independent - a.objective) > 1e-6 ||
    a.memberships.length !== n ||
    a.typicalities.length !== n ||
    a.tColumnSums.some((v) => Math.abs(v - 1) > 1e-8)
  )
    throw Error("full-source objective/normalization mismatch");
  observations.push({
    n,
    dimensions,
    k,
    seed,
    params,
    elapsedMs,
    heapDeltaBytes: process.memoryUsage().heapUsed - heap,
    matrixCellsEach: n * k,
    events: r.trace.steps.length,
    traceEstimatedBytes: r.trace.recording!.estimatedBytes,
    recording: r.trace.recording!.policy,
    objective: a.objective,
    independentObjective: independent,
    uRowSumsMaxError: Math.max(...a.uRowSums.map((v) => Math.abs(v - 1))),
    tColumnSums: a.tColumnSums,
    stopReason: a.stopReason,
  });
}
writeFileSync(
  "docs/research/fpcm-performance.json",
  JSON.stringify(
    {
      environment: {
        node: process.version,
        platform: os.platform(),
        cpu: os.cpus()[0].model,
        logicalCPUs: os.cpus().length,
      },
      scope:
        "Node engine+Recorder, excludes generation/projection/Worker/render; heap delta is not peak; single observations",
      generator: "floor(i/(n/k))*4+(mulberry32(seed42)-0.5)*0.2+j*0.01",
      observations,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    observations.map(
      ({ n, dimensions, k, elapsedMs, events, traceEstimatedBytes }) => ({
        n,
        dimensions,
        k,
        elapsedMs,
        events,
        traceEstimatedBytes,
      }),
    ),
    null,
    2,
  ),
);
