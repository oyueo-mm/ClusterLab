import { writeFileSync } from "node:fs";
import os from "node:os";
import { mpckmeans } from "../src/engine/algorithms/mpckmeans";
import { algorithmDefaults } from "../src/engine/types";
import { displayPoints, type ConstrainedDataset } from "../src/engine/dataset";
import { Recorder } from "../src/engine/trace";
import { random } from "../src/engine/math";
const observations = [];
for (const [n, dimensions, k, edges, iterations] of [
  [100, 2, 2, 4, 10],
  [1000, 2, 2, 4, 10],
  [10000, 2, 2, 4, 1],
  [1000, 8, 4, 4, 3],
  [1000, 2, 2, 100, 3],
]) {
  const seed = 42,
    rng = random(seed),
    values = Array.from({ length: n }, (_, i) =>
      Array.from(
        { length: dimensions },
        (_, j) =>
          Math.floor(i / (n / k)) * 4 +
          (rng() - 0.5) * 0.4 * (j % 2 === 0 ? 1 : 3),
      ),
    ),
    mustLink: [number, number][] = Array.from({ length: edges }, (_, i) => [
      2 * i,
      2 * i + 1,
    ]),
    data: ConstrainedDataset = {
      kind: "constrained",
      data: { kind: "numeric", values },
      mustLink,
      cannotLink: [[0, n - 1]],
    },
    params = {
      ...algorithmDefaults("MPCKMeans"),
      k,
      iterations,
      seed,
      constraintPenalty: 0.001,
      tolerance: 1e-9,
    },
    r = new Recorder(n, "MPCKMeans"),
    points = displayPoints(data),
    heap = process.memoryUsage().heapUsed,
    start = performance.now();
  mpckmeans(points, params, r, data);
  const elapsedMs = performance.now() - start,
    a = r.state.analysis;
  if (a?.kind !== "metric-pairwise") throw Error("actual metric");
  // Independent postcondition: exhaustive all-source maxima and fresh full original-pair costs.
  const maxima = a.metrics.map((metric) => {
    let max = 0;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        max = Math.max(
          max,
          values[i].reduce(
            (s, v, q) => s + metric[q] * (v - values[j][q]) ** 2,
            0,
          ),
        );
    return max;
  });
  if (
    maxima.some(
      (v, h) =>
        !Number.isFinite(v) ||
        Math.abs(v - a.diameters[h].value) > 1e-8 * Math.max(1, v),
    )
  )
    throw Error("global maximum mismatch");
  observations.push({
    n,
    dimensions,
    k,
    seed,
    originalMustLink: edges,
    originalCannotLink: 1,
    closureMustCount: a.closureMustCount,
    closureCannotCount: a.closureCannotCount,
    params,
    elapsedMs,
    heapDeltaBytes: process.memoryUsage().heapUsed - heap,
    events: r.trace.steps.length,
    traceEstimatedBytes: r.trace.recording!.estimatedBytes,
    policy: r.trace.recording!.policy,
    objective: a.objective,
    exactMaxima: maxima,
    converged: a.converged,
    stopReason: a.stopReason,
  });
  console.log(
    JSON.stringify({
      n,
      dimensions,
      k,
      edges,
      elapsedMs,
      events: r.trace.steps.length,
    }),
  );
}
writeFileSync(
  "docs/research/mpck-performance.json",
  JSON.stringify(
    {
      environment: {
        node: process.version,
        platform: os.platform(),
        cpu: os.cpus()[0].model,
        logicalCPUs: os.cpus().length,
      },
      scope:
        "Node engine+Recorder, excludes generation/projection/independent maxima/Worker/render. Single observations; heap delta is not peak. 10000 uses one full sweep and is not claimed converged.",
      generator: "floor(i/(n/k))*4+(mulberry32(seed42)-.5)*.4*(axis%2===0?1:3)",
      observations,
    },
    null,
    2,
  ) + "\n",
);
