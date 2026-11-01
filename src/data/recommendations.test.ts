import { describe, expect, it } from "vitest";
import { algorithms } from "../engine/types";
import { registry, supportsDataset } from "../engine/registry";
import { validateDataset } from "../engine/datasetValidation";
import { validateParameters } from "../engine/validation";
import { displayPoints } from "../engine/dataset";
import { Recorder } from "../engine/trace";
import { prepareDataset } from "../engine/datasetExecution";
import {
  datasetRegistry,
  generateRecommended,
  recommendations,
  recommendationParams,
} from "./recommendations";

describe("algorithm learning datasets", () => {
  it("requires an explicit recommendation for every engine", () => {
    expect(Object.keys(recommendations).sort()).toEqual([...algorithms].sort());
  });
  for (const algorithm of algorithms) {
    it(`${algorithm}: reproducible, compatible full input and actual trace`, async () => {
      const entries = recommendations[algorithm];
      expect(entries.length).toBeGreaterThanOrEqual(4);
      expect(
        entries.filter((e) => e.role === "additional").length,
      ).toBeGreaterThanOrEqual(2);
      expect(entries[0].role).toBe("default");
      expect(entries.some((e) => e.role === "limit")).toBe(true);
      for (const entry of entries) {
        expect(datasetRegistry[entry.datasetId]).toBeDefined();
        const data = generateRecommended(entry.datasetId);
        const original = structuredClone(data);
        expect(data).toEqual(generateRecommended(entry.datasetId));
        validateDataset(data);
        const params = recommendationParams(algorithm, entry);
        validateParameters(algorithm, params);
        const points =
          data.kind === "numeric" && data.display
            ? data.display
            : displayPoints(data);
        const raw = supportsDataset(algorithm, data.kind) ? data : undefined;
        expect(
          raw !== undefined ||
            (data.kind === "numeric" && data.display !== undefined),
        ).toBe(true);
        if (raw) prepareDataset(algorithm, raw, params);
        const recorder = new Recorder(points.length, algorithm);
        const engine = await registry[algorithm].load();
        engine(points, params, recorder, raw);
        expect(data).toEqual(original);
        expect(recorder.trace.steps.length).toBeGreaterThan(0);
        expect(recorder.state.labels).toHaveLength(points.length);
      }
    }, 30000);
  }
});
