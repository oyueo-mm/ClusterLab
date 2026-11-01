import { it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { run } from "./run";
import { algorithms, algorithmDefaults } from "./types";
import { dataset, dataDefaults } from "../data/presets";
import { lessons } from "../data/lessons";
import { displayPoints } from "./dataset";
it("records reproducible computation / trace sizes at 120 points without timing assertions", () => {
  const results = algorithms.map((algorithm) => {
    const input = lessons[algorithm].experimentDataset;
    const points = input
        ? displayPoints(input)
        : dataset(
            algorithm === "LVQ"
              ? "labeled"
              : ["ROCK", "K-Modes", "K-Prototypes"].includes(algorithm)
                ? "categorical"
                : "blobs",
            dataDefaults,
          ),
      params = {
        ...algorithmDefaults(algorithm),
        threshold: algorithm === "ROCK" ? 0.5 : 0.055,
      },
      trace = run(algorithm, points, params, input);
    expect(trace.steps.length).toBeGreaterThan(1);
    const serialized = JSON.stringify(trace);
    return {
      algorithm,
      points: points.length,
      events: trace.steps.length,
      computationMs: +trace.elapsed.toFixed(2),
      traceBytes: serialized.length,
      traceMeasure: "JSON string code units (legacy field), not retained heap",
      traceUtf8Bytes: Buffer.byteLength(serialized, "utf8"),
    };
  });
  mkdirSync(".local", { recursive: true });
  writeFileSync(".local/benchmark.json", JSON.stringify(results, null, 2));
  console.info(JSON.stringify(results));
}, 30000);
