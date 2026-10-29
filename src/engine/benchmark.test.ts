import { it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { run } from "./run";
import { algorithms, defaults } from "./types";
import { dataset, dataDefaults } from "../data/presets";
it("records reproducible computation / trace sizes at 120 points without timing assertions", () => {
  const results = algorithms.map((algorithm) => {
    const points = dataset(
        algorithm === "LVQ"
          ? "labeled"
          : algorithm === "ROCK"
            ? "categorical"
            : "blobs",
        dataDefaults,
      ),
      params = { ...defaults, threshold: algorithm === "ROCK" ? 0.5 : 0.055 },
      trace = run(algorithm, points, params);
    expect(trace.steps.length).toBeGreaterThan(1);
    return {
      algorithm,
      points: points.length,
      events: trace.steps.length,
      computationMs: +trace.elapsed.toFixed(2),
      traceBytes: JSON.stringify(trace).length,
    };
  });
  mkdirSync(".local", { recursive: true });
  writeFileSync(".local/benchmark.json", JSON.stringify(results, null, 2));
  console.info(JSON.stringify(results));
}, 30000);
