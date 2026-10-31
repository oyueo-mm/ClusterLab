import { expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { dataset, dataDefaults } from "../data/presets";
import { algorithmDefaults } from "./types";
import { run } from "./run";
import { stateAt } from "./trace";
import { assertResources } from "./resources";

it("measures full-input minibatch training across 100–1M points and explicit dense resource failures", () => {
  const observations = [];
  for (const n of [100, 1000, 10000, 100000, 1000000]) {
    const points = dataset("blobs", { ...dataDefaults, count: n });
    const params = {
      ...algorithmDefaults("Mini-Batch K-Means"),
      epochs: 2,
      batchSize: 256,
    };
    const start = performance.now(),
      before = process.memoryUsage().heapUsed;
    try {
      const trace = run("Mini-Batch K-Means", points, params),
        state = stateAt(trace, trace.steps.length);
      expect(state.labels).toHaveLength(n);
      expect(state.labels.every((v) => v >= 0)).toBe(true);
      const a = state.analysis;
      if (a?.kind !== "centroid-variant") throw new Error("analysis missing");
      expect(a.counts?.reduce((sum, v) => sum + v, 0)).toBe(2 * n);
      observations.push({
        n,
        status: "complete",
        milliseconds: +(performance.now() - start).toFixed(2),
        heapDeltaBytes: process.memoryUsage().heapUsed - before,
        events: trace.steps.length,
        traceEstimatedBytes: trace.recording?.estimatedBytes,
        visited: a.counts?.reduce((sum, v) => sum + v, 0),
        recording: trace.recording?.policy,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (n <= 10000) throw error;
      expect(message).toMatch(/예산/);
      observations.push({
        n,
        status: "resource-error",
        milliseconds: +(performance.now() - start).toFixed(2),
        message,
      });
    }
  }
  expect(() =>
    assertResources(
      "Spectral Clustering",
      100000,
      algorithmDefaults("Spectral Clustering"),
    ),
  ).toThrow(/메모리 예산/);
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/platform-scale-results.json",
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        seed: 42,
        k: 3,
        epochs: 2,
        batchSize: 256,
        note: "Single Node observation, generation/Worker transfer/rendering excluded; heap delta is not peak memory.",
        observations,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(observations));
}, 60000);
