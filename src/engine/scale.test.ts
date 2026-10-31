import { it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { run } from "./run";
import { defaults } from "./types";
import { dataDefaults, dataset } from "../data/presets";
import { stateAt } from "./trace";
import { estimateResources } from "./resources";

it("measures exact K-Means at 100 through 1M points, records honest resource failures", () => {
  const reports = [];
  for (const n of [100, 1_000, 10_000, 100_000, 1_000_000]) {
    const p = dataset("blobs", { ...dataDefaults, count: n });
    const o = { ...defaults, iterations: 5 };
    const before = process.memoryUsage().heapUsed;
    const start = performance.now();
    try {
      const t = run("K-Means", p, o);
      const state = stateAt(t, t.steps.length);
      expect(state.labels).toHaveLength(n);
      expect(state.labels.every((v) => v >= 0)).toBe(true);
      reports.push({
        n,
        dimensions: 2,
        status: "complete",
        elapsedMs: +(performance.now() - start).toFixed(2),
        heapDeltaBytes: process.memoryUsage().heapUsed - before,
        events: t.steps.length,
        traceEstimatedBytes: t.recording?.estimatedBytes,
        recording: t.recording?.policy,
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      expect(error).toMatch(/예산/);
      reports.push({
        n,
        dimensions: 2,
        status: "resource-error",
        elapsedMs: +(performance.now() - start).toFixed(2),
        error,
        estimate: estimateResources("K-Means", n, o),
      });
    }
  }
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/scale-results.json",
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        architecture: process.arch,
        seed: 42,
        iterations: 5,
        reports,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(reports));
}, 60_000);
