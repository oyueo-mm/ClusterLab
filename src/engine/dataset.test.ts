import { describe, expect, it } from "vitest";
import { displayPoints, legacyDataset, type Dataset } from "./dataset";
import {
  validateDataset,
  exportDataset,
  importDataset,
} from "./datasetValidation";
import { runDataset } from "./datasetExecution";
import { algorithmDefaults } from "./types";
import { stateAt } from "./trace";

const examples: Dataset[] = [
  {
    kind: "numeric",
    values: [
      [0, 0, 0],
      [0, 0, 5],
    ],
    featureNames: ["x", "y", "z"],
  },
  {
    kind: "categorical",
    values: [
      ["a", "b"],
      ["b", "c"],
    ],
  },
  { kind: "mixed", numeric: [[1], [2]], categorical: [["a"], ["b"]] },
  {
    kind: "graph",
    directed: false,
    nodes: [{ id: "a" }, { id: "b" }],
    edges: [{ source: "a", target: "b", weight: 2 }],
  },
  {
    kind: "matrix",
    values: [
      [1, 2],
      [3, 4],
    ],
    rowNames: ["a", "b"],
    columnNames: ["c", "d"],
  },
  { kind: "timeseries", series: [{ id: "a", times: [0, 2], values: [1, 3] }] },
  {
    kind: "stream",
    samples: [
      { time: 0, values: [1, 2] },
      { time: 1, values: [2, 3] },
    ],
  },
  {
    kind: "constrained",
    data: {
      kind: "numeric",
      values: [
        [0, 1],
        [1, 2],
        [3, 4],
      ],
    },
    mustLink: [[0, 1]],
    cannotLink: [[1, 2]],
  },
];
describe("discriminated data contracts", () => {
  for (const data of examples)
    it(`${data.kind}: exact schema round trip`, () => {
      expect(() => validateDataset(data)).not.toThrow();
      expect(importDataset(exportDataset(data))).toEqual(data);
    });
  it("rejects inconsistent rows/edges/time/constraints with concrete errors", () => {
    expect(() =>
      validateDataset({ kind: "numeric", values: [[1, 2], [3]] }),
    ).toThrow(/2행/);
    expect(() =>
      validateDataset({
        kind: "graph",
        directed: false,
        nodes: [{ id: "a" }, { id: "a" }],
        edges: [],
      }),
    ).toThrow(/중복/);
    expect(() =>
      validateDataset({
        ...examples[3],
        edges: [{ source: "a", target: "missing", weight: 1 }],
      }),
    ).toThrow(/존재하지/);
    expect(() =>
      validateDataset({
        kind: "timeseries",
        series: [{ id: "a", times: [1, 1], values: [1, 2] }],
      }),
    ).toThrow(/시간축/);
    expect(() =>
      validateDataset({ ...examples[7], cannotLink: [[0, 1]] }),
    ).toThrow(/모순/);
    expect(() =>
      importDataset('{"schema":"clusterlab.dataset/v2","data":{}}'),
    ).toThrow(/버전/);
  });
  it("legacy adapter preserves raw features and display coordinates", () => {
    const p = [
      { x: 10, y: -3, label: 1 },
      { x: 20, y: 8, label: 2 },
    ];
    const data = legacyDataset(p);
    expect(data.values).toEqual([
      [10, -3],
      [20, 8],
    ]);
    expect(displayPoints(data)).toBe(p);
    expect(data.labels).toEqual([1, 2]);
  });
});
it("typed execution uses third dimension and is invariant to all display coordinates", async () => {
  const values = Array.from({ length: 8 }, (_, i) => [
    0.2 + (i % 4) * 0.01,
    0.4,
    i < 4 ? 0 : 5,
  ]);
  const p = { ...algorithmDefaults("Spectral Clustering"), k: 2 };
  const a = await runDataset(
    "Spectral Clustering",
    { kind: "numeric", values },
    p,
  );
  const b = await runDataset(
    "Spectral Clustering",
    {
      kind: "numeric",
      values,
      display: values.map(() => ({ x: 999, y: -999 })),
    },
    p,
  );
  expect(a.labels).toEqual(b.labels);
  expect(a.labels[0]).not.toBe(a.labels[4]);
  expect(a.computedRows).toBe(8);
  expect(a.sourceDimensions).toBe(3);
  expect(stateAt(a.trace, a.trace.steps.length).analysis).toEqual(
    stateAt(b.trace, b.trace.steps.length).analysis,
  );
});
it("typed graph execution is invariant to node positions, and unsupported engines/types fail", async () => {
  const graph = {
    kind: "graph" as const,
    directed: false,
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
    edges: [
      { source: "a", target: "b", weight: 1 },
      { source: "c", target: "d", weight: 2 },
    ],
  };
  const p = { ...algorithmDefaults("Spectral Clustering"), k: 2 };
  const a = await runDataset("Spectral Clustering", graph, p),
    b = await runDataset(
      "Spectral Clustering",
      {
        ...graph,
        nodes: graph.nodes.map((n, i) => ({
          ...n,
          position: { x: i * 100, y: -100 * i },
        })),
      },
      p,
    );
  expect(a.labels).toEqual(b.labels);
  expect(a.labels[0]).toBe(a.labels[1]);
  expect(a.labels[0]).not.toBe(a.labels[2]);
  await expect(runDataset("K-Means", examples[0], p)).rejects.toThrow(
    /지원하지/,
  );
  await expect(
    runDataset("Spectral Clustering", { ...graph, directed: true }, p),
  ).rejects.toThrow(/무방향/);
  await expect(
    runDataset("Affinity Propagation", examples[4], p),
  ).rejects.toThrow(/지원하지/);
});
