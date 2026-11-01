import { describe, expect, it, vi } from "vitest";
import {
  makeModelPreset,
  makeExperimentPreset,
  type ModelPreset,
} from "./structuredPresets";
import {
  displayPoints,
  numericRows,
  type Dataset,
  type NumericDataset,
} from "../engine/dataset";
import {
  exportDataset,
  importDataset,
  validateDataset,
} from "../engine/datasetValidation";

function raw(data: Dataset): NumericDataset {
  if (data.kind === "numeric") return data;
  if (data.kind === "constrained") return data.data;
  throw new Error("A real numeric model source is required");
}
const mean = (rows: number[][], column: number) =>
  rows.reduce((s, row) => s + row[column] / rows.length, 0);
const variance = (rows: number[][], column: number, average: number) =>
  rows.reduce((s, row) => s + (row[column] - average) ** 2 / rows.length, 0);
const covariance = (rows: number[][], a: number, b: number) => {
  const first = mean(rows, a),
    second = mean(rows, b);
  return rows.reduce(
    (s, row) => s + ((row[a] - first) * (row[b] - second)) / rows.length,
    0,
  );
};

describe("actual model-input generators and dispatch contracts", () => {
  it("10000 Bernoulli rows have the stated alternating probabilities in all six original dimensions", () => {
    const data = makeExperimentPreset("bernoulli", 10000, 6, 42),
      source = raw(data);
    expect(
      source.values.every(
        (row) => row.length === 6 && row.every((v) => v === 0 || v === 1),
      ),
    ).toBe(true);
    for (const [group, rows] of [
      source.values.slice(0, 5000),
      source.values.slice(5000),
    ].entries()) {
      for (let j = 0; j < 6; j++) {
        const probability = group === j % 2 ? 0.8 : 0.2;
        expect(Math.abs(mean(rows, j) - probability)).toBeLessThan(0.03);
      }
      // Detect reusing the same random bit across the supposedly independent features.
      expect(Math.abs(covariance(rows, 0, 2))).toBeLessThan(0.02);
    }
    expect(data.provenance?.parameters).toMatchObject({
      count: 10000,
      dimensions: 6,
      groups: 2,
      probabilities: "0.2,0.8",
    });
  });

  it("10000 Poisson rows have nonnegative integer support, mean/variance 7 or 1 and the correct zero mass across all dimensions", () => {
    const data = makeModelPreset("poisson", 10000, 5, 42),
      source = raw(data);
    expect(
      source.values.every(
        (row) =>
          row.length === 5 &&
          row.every((v) => Number.isSafeInteger(v) && v >= 0),
      ),
    ).toBe(true);
    for (const [group, rows] of [
      source.values.slice(0, 5000),
      source.values.slice(5000),
    ].entries()) {
      for (let j = 0; j < 5; j++) {
        const rate = group === j % 2 ? 7 : 1,
          average = mean(rows, j),
          observedVariance = variance(rows, j, average);
        expect(Math.abs(average - rate)).toBeLessThan(rate === 7 ? 0.25 : 0.12);
        expect(Math.abs(observedVariance - rate)).toBeLessThan(
          rate === 7 ? 0.8 : 0.2,
        );
        const zeroFrequency =
          rows.filter((row) => row[j] === 0).length / rows.length;
        expect(Math.abs(zeroFrequency - Math.exp(-rate))).toBeLessThan(
          rate === 7 ? 0.003 : 0.035,
        );
      }
    }
    expect(data.provenance?.parameters).toMatchObject({
      count: 10000,
      dimensions: 5,
      rates: "1,7",
    });
  });

  it("Multinomial rows preserve exactly 20 trials and full-dimensional 6:1 profiles with the expected negative count dependence", () => {
    const data = makeExperimentPreset("multinomial", 10000, 5, 42),
      source = raw(data);
    expect(
      source.values.every(
        (row) =>
          row.length === 5 &&
          row.every((v) => Number.isSafeInteger(v) && v >= 0) &&
          row.reduce((s, v) => s + v, 0) === 20,
      ),
    ).toBe(true);
    for (const [group, rows] of [
      source.values.slice(0, 5000),
      source.values.slice(5000),
    ].entries()) {
      for (let j = 0; j < 5; j++) {
        // Five categories: favored weight 6, four weights 1, hence p=.6 or .1.
        const expected = j === group ? 12 : 2;
        expect(Math.abs(mean(rows, j) - expected)).toBeLessThan(
          expected === 12 ? 0.25 : 0.15,
        );
      }
      // Cov(X0,X1)=-20*p0*p1=-1.2, unlike independent per-feature counts.
      expect(Math.abs(covariance(rows, 0, 1) + 1.2)).toBeLessThan(0.4);
    }
    expect(data.provenance?.parameters).toMatchObject({
      trials: 20,
      profileWeights: "favored=6,others=1",
    });
    expect(raw(makeModelPreset("multinomial", 25, 1, 42)).values).toEqual(
      Array.from({ length: 25 }, () => [20]),
    );
  });

  it("25 constrained rows form exactly two ML components whose cross-CL follows the actual separated ND source groups", () => {
    const data = makeExperimentPreset("constrained", 25, 7, 2026);
    if (data.kind !== "constrained")
      throw new Error("A real constrained source is required");
    validateDataset(data);
    const adjacency = Array.from({ length: 25 }, () => new Set<number>()),
      seenPairs = new Set<string>();
    for (const [a, b] of data.mustLink) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(25);
      expect(a).not.toBe(b);
      const key = [Math.min(a, b), Math.max(a, b)].join(":");
      expect(seenPairs.has(key)).toBe(false);
      seenPairs.add(key);
      adjacency[a].add(b);
      adjacency[b].add(a);
    }
    const component = Array(25).fill(-1) as number[],
      groups: number[][] = [];
    for (let start = 0; start < 25; start++)
      if (component[start] < 0) {
        const id = groups.length,
          queue = [start];
        component[start] = id;
        for (let at = 0; at < queue.length; at++)
          for (const next of adjacency[queue[at]])
            if (component[next] < 0) {
              component[next] = id;
              queue.push(next);
            }
        groups.push(queue.sort((a, b) => a - b));
      }
    expect(groups).toEqual([
      Array.from({ length: 13 }, (_, i) => i),
      Array.from({ length: 12 }, (_, i) => i + 13),
    ]);
    expect(seenPairs.size).toBe(23);
    expect(data.cannotLink).toHaveLength(1);
    for (const [a, b] of data.cannotLink)
      expect(component[a]).not.toBe(component[b]);
    const first = groups[0].map((i) => data.data.values[i]),
      second = groups[1].map((i) => data.data.values[i]);
    for (let j = 0; j < 7; j++) {
      expect(Math.abs(mean(first, j))).toBeLessThan(0.3);
      expect(Math.abs(mean(second, j) - 3)).toBeLessThan(0.3);
      expect(mean(second, j) - mean(first, j)).toBeGreaterThan(2.4);
    }
    expect(data.provenance).toMatchObject({
      generator: "clusterlab-constrained-v1",
      seed: 2026,
      parameters: { count: 25, dimensions: 7, groups: 2 },
    });
    expect(data.data.provenance).toMatchObject({
      generator: "clusterlab-numeric-v1",
      seed: 2026,
    });
  });

  it("dispatch, seed, JSON and display projection preserve every feature and provenance beyond the old point limit", () => {
    for (const kind of [
      "bernoulli",
      "poisson",
      "multinomial",
      "constrained",
    ] as ModelPreset[]) {
      const data = makeModelPreset(kind, 1201, 7, 2718),
        snapshot = structuredClone(data),
        source = raw(data);
      expect(makeExperimentPreset(kind, 1201, 7, 2718)).toEqual(data);
      expect(makeModelPreset(kind, 1201, 7, 2718)).toEqual(data);
      expect(raw(makeExperimentPreset(kind, 1201, 7, 2719)).values).not.toEqual(
        source.values,
      );
      validateDataset(data);
      expect(importDataset(exportDataset(data))).toEqual(data);
      expect(source.values).toHaveLength(1201);
      expect(source.featureNames).toHaveLength(7);
      expect(source.values.every((row) => row.length === 7)).toBe(true);
      const projected = displayPoints(source, [6, 4]),
        override = {
          ...source,
          display: projected.map(() => ({ x: 50, y: -20 })),
        };
      expect(numericRows(displayPoints(override), override)).toBe(
        source.values,
      );
      expect(data).toEqual(snapshot);
      expect(data.provenance?.seed).toBe(2718);
      expect(data.provenance?.parameters).toMatchObject({
        count: 1201,
        dimensions: 7,
      });
    }
  });

  it("invalid parameters fail explicitly and excessive actual byte requirements are rejected before any source array allocation", () => {
    for (const kind of [
      "bernoulli",
      "poisson",
      "multinomial",
      "constrained",
    ] as ModelPreset[]) {
      for (const args of [
        [1, 3, 42],
        [3.5, 3, 42],
        [25, 0, 42],
        [25, 2.5, 42],
        [25, 3, Infinity],
        [25, 3, Number.MAX_SAFE_INTEGER + 1],
      ])
        expect(() =>
          makeExperimentPreset(kind, ...(args as [number, number, number])),
        ).toThrow(/개수|차원|시드|정수/);
      const allocation = vi.spyOn(Array, "from").mockImplementation(() => {
        throw new Error("Source allocation occurred before byte preflight");
      });
      let failure: unknown,
        calls = 0;
      try {
        makeExperimentPreset(
          kind,
          Number.MAX_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER,
          42,
        );
      } catch (error) {
        failure = error;
      } finally {
        calls = allocation.mock.calls.length;
        allocation.mockRestore();
      }
      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toMatch(/메모리 예산/);
      expect(calls).toBe(0);
    }
  });
});
