import { describe, it, expect } from "vitest";
import {
  makeStructuredPreset,
  type StructuredPreset,
} from "./structuredPresets";
import { displayPoints, numericRows } from "../engine/dataset";
import {
  exportDataset,
  importDataset,
  validateDataset,
} from "../engine/datasetValidation";
import {
  createDatasetHistory,
  commitDatasetHistory,
  undoDatasetHistory,
  redoDatasetHistory,
} from "../editor/datasetHistory";

const kinds: StructuredPreset[] = [
  "numeric",
  "categorical",
  "mixed",
  "graph",
  "matrix",
  "timeseries",
  "stream",
];
describe("structured preset source contracts", () => {
  for (const kind of kinds)
    it(`${kind}: seeded generation and JSON preserve every row beyond the former600-point cap`, () => {
      const data = makeStructuredPreset(kind, 1201, 5, 2718);
      validateDataset(data);
      expect(data).toEqual(makeStructuredPreset(kind, 1201, 5, 2718));
      expect(importDataset(exportDataset(data))).toEqual(data);
      expect(data.provenance?.generator).toBe(`clusterlab-${kind}-v1`);
      expect(data.provenance?.seed).toBe(2718);
      expect(data.provenance?.parameters.count).toBe(1201);
      const points = displayPoints(data);
      expect(points).toHaveLength(1201);
      expect(
        points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
      ).toBe(true);
      if (
        data.kind === "numeric" ||
        data.kind === "categorical" ||
        data.kind === "matrix"
      ) {
        expect(data.values.every((row) => row.length === 5)).toBe(true);
      } else if (data.kind === "mixed") {
        expect(data.numeric.every((row) => row.length === 5)).toBe(true);
        expect(data.categorical.every((row) => row.length === 2)).toBe(true);
        expect(data.provenance?.parameters.categoricalColumns).toBe(2);
      } else if (data.kind === "timeseries") {
        expect(data.provenance?.parameters.dimensions).toBe(32);
        expect(
          data.series.every(
            (s) => s.times.length === 32 && s.values.length === 32,
          ),
        ).toBe(true);
      } else if (data.kind === "stream") {
        expect(data.samples.every((s) => s.values.length === 5)).toBe(true);
        expect(
          data.samples.every(
            (s, i) => i === 0 || s.time >= data.samples[i - 1].time,
          ),
        ).toBe(true);
        expect(
          data.samples.some(
            (s, i) => i > 0 && s.time - data.samples[i - 1].time === 81,
          ),
        ).toBe(true);
      } else if (data.kind === "graph") {
        const neighbors = new Map(
          data.nodes.map((n) => [n.id, new Set<string>()]),
        );
        const edges = new Set<string>();
        for (const e of data.edges) {
          expect(e.weight).toBe(1);
          expect(e.source).not.toBe(e.target);
          const key = [e.source, e.target].sort().join(":");
          expect(edges.has(key)).toBe(false);
          edges.add(key);
          neighbors.get(e.source)!.add(e.target);
          neighbors.get(e.target)!.add(e.source);
        }
        const seen = new Set([data.nodes[0].id]),
          queue = [data.nodes[0].id];
        for (let i = 0; i < queue.length; i++)
          for (const next of neighbors.get(queue[i])!)
            if (!seen.has(next)) {
              seen.add(next);
              queue.push(next);
            }
        expect(seen.size).toBe(1201);
      }
    });
  it("projection and display overrides preserve all original numeric dimensions and generator metadata", () => {
    const source = makeStructuredPreset("numeric", 24, 5, 42);
    if (source.kind !== "numeric") throw new Error("numeric preset required");
    const before = structuredClone(source),
      points = displayPoints(source, [4, 3]);
    expect(numericRows(points, source)).toBe(source.values);
    expect(numericRows(points, source).every((row) => row.length === 5)).toBe(
      true,
    );
    const override = {
      ...source,
      display: points.map(() => ({ x: 0.25, y: 0.75 })),
    };
    expect(numericRows(displayPoints(override), override)).toBe(source.values);
    expect(source).toEqual(before);
  });
  it("an actual mixed categorical cell edit has a sparse undo delta and retains all numeric source rows", () => {
    const h = createDatasetHistory(makeStructuredPreset("mixed", 1201, 5, 42));
    if (h.present.kind !== "mixed") throw new Error("mixed preset required");
    const categories = [...h.present.categorical];
    categories[1000] = [...categories[1000]];
    categories[1000][1] = "edited";
    const edited = commitDatasetHistory(h, {
      ...h.present,
      categorical: categories,
    });
    expect(edited.past[0]).toHaveLength(1);
    expect(edited.past[0][0].path).toEqual(["categorical", 1000, 1]);
    expect(JSON.stringify(edited.past).length).toBeLessThan(300);
    if (edited.present.kind !== "mixed") throw new Error("mixed source lost");
    expect(edited.present.numeric).toBe(h.present.numeric);
    expect(edited.present.categorical).toHaveLength(1201);
    expect(edited.present.provenance).toBe(h.present.provenance);
    expect(undoDatasetHistory(edited).present).toEqual(h.present);
    expect(redoDatasetHistory(undoDatasetHistory(edited)).present).toEqual(
      edited.present,
    );
    expect(importDataset(exportDataset(edited.present))).toEqual(
      edited.present,
    );
  });
  it("resource refusal depends on requested allocation dimensions and rejects invalid generator values before allocation", () => {
    expect(() => makeStructuredPreset("numeric", 1201, 5, 42)).not.toThrow();
    expect(() => makeStructuredPreset("numeric", 1201, 10000, 42)).toThrow(
      /메모리 예산/,
    );
    expect(() =>
      makeStructuredPreset("numeric", Number.MAX_SAFE_INTEGER, 2, 42),
    ).toThrow(/메모리 예산/);
    for (const [n, d, seed] of [
      [1, 3, 42],
      [24, 0, 42],
      [24, 1.5, 42],
      [24, 3, NaN],
      [Infinity, 3, 42],
    ])
      expect(() => makeStructuredPreset("numeric", n, d, seed)).toThrow();
    const valid = makeStructuredPreset("numeric", 24, 3, 42);
    expect(() =>
      validateDataset({
        ...valid,
        provenance: {
          generator: "bad",
          seed: 42,
          parameters: { sigma: Infinity },
        },
      }),
    ).toThrow(/provenance/);
  });
});
