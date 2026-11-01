import { expect, it } from "vitest";
import { runDataset, nativeResult } from "./datasetExecution";
import { algorithmDefaults } from "./types";
import {
  registry,
  supportsDataset,
  supportsLegacyPoints,
  structuredAlgorithms,
} from "./registry";
import { fields } from "./parameters";
import { stateAt, applyStep } from "./trace";
import type { NumericDataset } from "./dataset";

const source: NumericDataset = {
  kind: "numeric",
  values: [
    [0, 0, 0],
    [0, 0, 0.6],
    [0, 0, 1.2],
  ],
};
const methods = ["BSAS", "MBSAS", "TTSAS"] as const;

it("lazy Dataset APIs return actual distinct sequential partitions and full ND prototypes", async () => {
  for (const method of methods) {
    const params = {
        ...algorithmDefaults(method),
        threshold: method === "TTSAS" ? 0.4 : 1,
        upperThreshold: 1,
      },
      result = await runDataset(method, source, params),
      out = result.output;
    if (out.kind !== "sequential-partition")
      throw new Error("Missing native sequential result");
    expect(result.kind).toBe(out.kind);
    expect(result.computedRows).toBe(3);
    expect(result.sourceDimensions).toBe(3);
    expect(out.method).toBe(method);
    expect(out.centroids).toHaveLength(
      method === "BSAS" ? 1 : method === "MBSAS" ? 2 : 3,
    );
    expect(out.counts).toEqual(
      method === "BSAS" ? [3] : method === "MBSAS" ? [2, 1] : [1, 1, 1],
    );
    expect(out.assignedSSE).toBeCloseTo(
      method === "BSAS" ? 0.72 : method === "MBSAS" ? 0.18 : 0,
      12,
    );
    expect(out.prototypeCounts).toEqual(out.counts);
    expect(out.unassigned).toBe(0);
    expect(out.converged).toBe(true);
    expect(out.labels).toEqual(result.labels);
    expect(out).toEqual(
      nativeResult(stateAt(result.trace, result.trace.steps.length)),
    );
  }
});

it("display projection and unused random seed preserve the complete actual lazy execution", async () => {
  const shifted: NumericDataset = {
    ...source,
    display: [
      { x: -900, y: 5 },
      { x: 70, y: 100 },
      { x: 0.4, y: 0.4 },
    ],
  };
  for (const method of methods) {
    const a = await runDataset(method, source, algorithmDefaults(method)),
      b = await runDataset(method, shifted, {
        ...algorithmDefaults(method),
        seed: 999,
      });
    expect(b.output).toEqual(a.output);
    expect({ ...b.trace, elapsed: 0 }).toEqual({ ...a.trace, elapsed: 0 });
    let state = stateAt(b.trace, b.trace.steps.length);
    for (const step of [...b.trace.steps].reverse())
      state = applyStep(state, step, true);
    expect(state).toEqual(b.trace.initial);
  }
});

it("registry and schemas expose only meaningful raw sequential controls and no random or point-editor substitute", () => {
  expect(new Set(structuredAlgorithms).size).toBe(structuredAlgorithms.length);
  for (const method of methods) {
    expect(supportsDataset(method, "numeric")).toBe(true);
    for (const kind of ["graph", "matrix", "stream", "constrained"] as const)
      expect(supportsDataset(method, kind)).toBe(false);
    expect(supportsLegacyPoints(method)).toBe(false);
    expect(registry[method].seeded).toBe(false);
    expect(registry[method].capabilities.autoK).toBe(true);
    expect(registry[method].unassignedLabel).toBe("미할당");
    expect(registry[method].output).toBe("sequential-partition");
    expect(registry[method].validation).toBe("independent-pyclustering");
    expect(fields[method].map((f) => f.key)).toEqual(
      method === "TTSAS"
        ? ["threshold", "upperThreshold"]
        : ["threshold", "maxClusters"],
    );
  }
});

it("native singleton and large q are valid, TTSAS does not apply q, and invalid thresholds are explicit failures", async () => {
  const one: NumericDataset = { kind: "numeric", values: [[1, 2, 3, 4]] };
  for (const method of methods) {
    const r = await runDataset(method, one, {
      ...algorithmDefaults(method),
      maxClusters: 1002,
    });
    if (r.output.kind !== "sequential-partition")
      throw new Error("Missing result");
    expect(r.output.centroids).toEqual(one.values);
    expect(r.output.counts).toEqual([1]);
  }
  const separated: NumericDataset = {
      kind: "numeric",
      values: [[0], [10], [20]],
    },
    r = await runDataset("TTSAS", separated, {
      ...algorithmDefaults("TTSAS"),
      maxClusters: 0,
    });
  if (r.output.kind !== "sequential-partition")
    throw new Error("Missing result");
  expect(r.output.centroids).toHaveLength(3);
  await expect(
    runDataset("TTSAS", source, {
      ...algorithmDefaults("TTSAS"),
      threshold: 1,
      upperThreshold: 1,
    }),
  ).rejects.toThrow(/upperThreshold/);
  await expect(
    runDataset("BSAS", source, { ...algorithmDefaults("BSAS"), threshold: -1 }),
  ).rejects.toThrow(/파라미터/);
});
