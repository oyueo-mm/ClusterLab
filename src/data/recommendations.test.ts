import { mkdirSync, writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { algorithms } from "../engine/types";
import { registry, supportsDataset } from "../engine/registry";
import { validateDataset } from "../engine/datasetValidation";
import { validateParameters } from "../engine/validation";
import { displayPoints } from "../engine/dataset";
import { Recorder } from "../engine/trace";
import { prepareDataset } from "../engine/datasetExecution";
import {
  datasetRegistry,
  generateForRecommendation,
  recommendations,
  recommendationParams,
} from "./recommendations";

const measurements: object[] = [];
describe("algorithm learning datasets", () => {
  it("requires an explicit recommendation for every engine", () => {
    expect(Object.keys(recommendations).sort()).toEqual([...algorithms].sort());
    expect(Object.values(recommendations).flat()).toHaveLength(220);
  });
  for (const algorithm of algorithms) {
    it(`${algorithm}: reproducible, compatible full input and actual trace`, async () => {
      const entries = recommendations[algorithm];
      expect(entries).toHaveLength(4);
      expect(
        entries.filter((e) => e.role === "additional").length,
      ).toBeGreaterThanOrEqual(2);
      expect(entries[0].role).toBe("default");
      expect(entries.some((e) => e.role === "limit")).toBe(true);
      for (const entry of entries) {
        expect(datasetRegistry[entry.datasetId]).toBeDefined();
        const data = generateForRecommendation(algorithm, entry);
        const original = structuredClone(data);
        expect(data).toEqual(generateForRecommendation(algorithm, entry));
        validateDataset(data);
        const params = recommendationParams(algorithm, entry);
        validateParameters(algorithm, params);
        const points =
          data.kind === "numeric" && data.display
            ? data.display
            : displayPoints(data);
        expect(points).toHaveLength(entry.count);
        const raw = supportsDataset(algorithm, data.kind) ? data : undefined;
        expect(
          raw !== undefined ||
            (data.kind === "numeric" && data.display !== undefined),
        ).toBe(true);
        if (raw) prepareDataset(algorithm, raw, params);
        const recorder = new Recorder(points.length, algorithm);
        const engine = await registry[algorithm].load();
        const start = performance.now();
        engine(points, params, recorder, raw);
        measurements.push({
          algorithm,
          datasetId: entry.datasetId,
          role: entry.role,
          before: datasetRegistry[entry.datasetId].count,
          after: entry.count,
          actual: points.length,
          seed: datasetRegistry[entry.datasetId].seed,
          computationMs: performance.now() - start,
          events: recorder.trace.steps.length,
          traceRetainedEstimate: recorder.trace.recording?.estimatedBytes,
        });
        expect(data).toEqual(original);
        expect(recorder.trace.steps.length).toBeGreaterThan(0);
        expect(recorder.state.labels).toHaveLength(points.length);
      }
    }, 30000);
  }
});

afterAll(() => {
  mkdirSync("docs/preview-scale", { recursive: true });
  writeFileSync(
    "docs/preview-scale/recommendation-computation.json",
    JSON.stringify(measurements, null, 2) + "\n",
  );
});
