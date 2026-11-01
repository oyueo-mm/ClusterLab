import { describe, expect, it } from "vitest";
import { prepareDataset, runDataset } from "./datasetExecution";
import { displayPoints, type Dataset, type GraphDataset } from "./dataset";
import { communityAlgorithms, supportsDataset } from "./registry";
import { algorithmDefaults, type Algorithm, type Params } from "./types";
import { applyStep, stateAt } from "./trace";
import { run } from "./run";
import dataReference from "./fixtures/data-clustering-reference.json";
import matrixReference from "./fixtures/matrix-reference.json";
import timeReference from "./fixtures/timeseries-reference.json";

const options = (
  algorithm: Algorithm,
  changes: Partial<Params> = {},
): Params => ({
  ...algorithmDefaults(algorithm),
  k: 2,
  iterations: 100,
  neighbors: 2,
  tolerance: 1e-8,
  ...changes,
});
const finalState = (result: Awaited<ReturnType<typeof runDataset>>) =>
  stateAt(result.trace, result.trace.steps.length);
const graph = (edges: number[][], n = 6): GraphDataset => ({
  kind: "graph",
  directed: false,
  nodes: Array.from({ length: n }, (_, i) => ({
    id: String(i),
    position: { x: 0.5, y: 0.5 },
  })),
  edges: edges.map(([a, b, weight]) => ({
    source: String(a),
    target: String(b),
    weight,
  })),
});
const barbell = graph([
  [0, 1, 1],
  [1, 2, 1],
  [0, 2, 1],
  [3, 4, 1],
  [4, 5, 1],
  [3, 5, 1],
  [2, 3, 1],
]);
// Independent direct edge-sum Q: loops contribute w to m/internal and 2w to degree.
function originalModularity(
  data: GraphDataset,
  labels: number[],
  resolution: number,
) {
  const degrees = data.nodes.map(() => 0),
    internal = new Map<number, number>();
  let mass = 0;
  for (const e of data.edges) {
    const a = data.nodes.findIndex((n) => n.id === e.source),
      b = data.nodes.findIndex((n) => n.id === e.target);
    mass += e.weight;
    degrees[a] += e.weight;
    degrees[b] += e.weight;
    if (labels[a] === labels[b])
      internal.set(labels[a], (internal.get(labels[a]) ?? 0) + e.weight);
  }
  if (!mass) return 0;
  return [...new Set(labels)].reduce(
    (q, c) =>
      q +
      (internal.get(c) ?? 0) / mass -
      resolution *
        (degrees.reduce((s, d, i) => s + (labels[i] === c ? d : 0), 0) /
          (2 * mass)) **
          2,
    0,
  );
}
const partition = (a: number[], b: number[]) =>
  a.forEach((x, i) => a.forEach((y, j) => expect(x === y).toBe(b[i] === b[j])));

describe("typed execution preserves mathematical input and native outputs", () => {
  for (const algorithm of communityAlgorithms) {
    it(`${algorithm}: raw graph layout never changes edges, partition, Q or replay`, async () => {
      const p = options(algorithm),
        a = await runDataset(algorithm, barbell, p);
      const moved: GraphDataset = {
        ...barbell,
        nodes: barbell.nodes.map((node, i) => ({
          ...node,
          position: { x: i * 1e6, y: -i * i },
        })),
      };
      const b = await runDataset(algorithm, moved, p),
        state = finalState(a);
      expect(a.kind).toBe("communities");
      expect(a.inputKind).toBe("graph");
      expect(a.computedRows).toBe(6);
      expect(a.labels).toEqual(b.labels);
      expect(a.output).toEqual(b.output);
      if (
        state.analysis?.kind !== "community" ||
        a.output.kind !== "communities"
      )
        throw new Error("native community state missing");
      expect(a.output.objective).toBeCloseTo(
        originalModularity(barbell, a.labels, p.resolution),
        12,
      );
      expect(state.analysis.inputEdges).toHaveLength(barbell.edges.length);
      expect(a.trace.steps.length).toBeGreaterThan(1);
      let reverse = state;
      for (let i = a.trace.steps.length - 1; i >= 0; i--)
        reverse = applyStep(reverse, a.trace.steps[i], true);
      expect(reverse).toEqual(a.trace.initial);
      expect(
        stateAt(run(algorithm, [], p, moved), a.trace.steps.length).labels,
      ).toEqual(a.labels);
    });
    it(`${algorithm}: explicit union-kNN uses the raw third dimension, not coincident XY`, async () => {
      const data: Dataset = {
        kind: "numeric",
        values: [0, 3, 1, 4, 2, 5].map((z) => [0, 0, z]),
        display: Array.from({ length: 6 }, () => ({ x: 0.5, y: 0.5 })),
      };
      const a = await runDataset(algorithm, data, options(algorithm)),
        state = finalState(a);
      expect(a.sourceDimensions).toBe(3);
      expect(a.computedRows).toBe(6);
      if (state.analysis?.kind !== "community")
        throw new Error("community state missing");
      // Independent sorted 1D nearest neighbours; directed choices are unioned once.
      const zs = [0, 3, 1, 4, 2, 5],
        expected = new Set<string>();
      zs.forEach((z, i) =>
        zs
          .map((v, j) => ({ j, d: Math.abs(v - z) }))
          .filter((x) => x.j !== i)
          .sort((a, b) => a.d - b.d || a.j - b.j)
          .slice(0, 2)
          .forEach(({ j }) =>
            expected.add(`${Math.min(i, j)},${Math.max(i, j)}`),
          ),
      );
      expect(
        state.analysis.inputEdges.map((e) => `${e.a},${e.b}`).sort(),
      ).toEqual([...expected].sort());
      expect(state.analysis.graphSource).toContain("kNN");
      const projected = {
        ...data,
        display: data.values.map((_, i) => ({ x: i, y: -i })),
      };
      expect(
        (await runDataset(algorithm, projected, options(algorithm))).output,
      ).toEqual(a.output);
    });
  }

  it("weighted parallel edges and self-loops survive all accepting graph engines", async () => {
    const data = graph([
      [0, 0, 2],
      [0, 1, 0.5],
      [1, 0, 0.25],
      [1, 2, 3],
      [2, 2, 0.2],
      [3, 4, 4],
      [4, 5, 2],
      [3, 5, 1],
      [2, 3, 0.01],
    ]);
    for (const algorithm of communityAlgorithms.filter(
      (a) => a !== "Girvan–Newman" && a !== "Fluid Communities",
    )) {
      const p = options(algorithm),
        result = await runDataset(algorithm, data, p);
      if (result.output.kind !== "communities")
        throw new Error("community result missing");
      expect(result.output.objective).toBeCloseTo(
        originalModularity(data, result.labels, p.resolution),
        11,
      );
      const state = finalState(result);
      if (state.analysis?.kind !== "community")
        throw new Error("community state missing");
      expect(
        state.analysis.inputEdges.some(
          (e) => e.a === 0 && e.b === 0 && e.weight === 2,
        ),
      ).toBe(true);
      expect(
        state.analysis.inputEdges.find((e) => e.a === 0 && e.b === 1)?.weight,
      ).toBe(0.75);
    }
  });

  it("native type support rejects silent flattening and graph property loss", async () => {
    const cases: [Algorithm, Dataset][] = [
      [
        "K-Modes",
        {
          kind: "numeric",
          values: [
            [0, 0],
            [1, 1],
          ],
        },
      ],
      ["K-Prototypes", { kind: "categorical", values: [["a"], ["b"]] }],
      [
        "Louvain",
        {
          kind: "matrix",
          values: [
            [1, 0],
            [0, 1],
          ],
        },
      ],
      [
        "Bimax",
        {
          kind: "numeric",
          values: [
            [1, 0],
            [0, 1],
          ],
        },
      ],
      ["K-Shape", { kind: "stream", samples: [{ time: 0, values: [0, 1] }] }],
    ];
    for (const [algorithm, data] of cases) {
      expect(supportsDataset(algorithm, data.kind)).toBe(false);
      await expect(
        runDataset(algorithm, data, options(algorithm)),
      ).rejects.toThrow();
    }
    await expect(
      runDataset("Louvain", { ...barbell, directed: true }, options("Louvain")),
    ).rejects.toThrow();
    await expect(
      runDataset(
        "Fluid Communities",
        {
          ...barbell,
          edges: barbell.edges.map((e, i) => ({ ...e, weight: i ? 1 : 2 })),
        },
        options("Fluid Communities"),
      ),
    ).rejects.toThrow();
    await expect(
      runDataset(
        "Girvan–Newman",
        graph(
          [
            [0, 0, 1],
            [0, 1, 1],
          ],
          2,
        ),
        options("Girvan–Newman"),
      ),
    ).rejects.toThrow();
  });

  it("resource preflight uses actual sparse m and rejects expensive numeric graph construction before running", () => {
    const n = 3000,
      p = options("Louvain", { neighbors: 1000 });
    const raw = graph(
      Array.from({ length: n - 1 }, (_, i) => [i, i + 1, 1]),
      n,
    );
    const sparse = prepareDataset("Louvain", raw, p);
    expect(sparse.points).toHaveLength(n);
    expect(sparse.estimate.workingBytes).toBeLessThan(2 * 1024 * 1024);
    expect(sparse.estimate.inputTruncation).toBe(false);
    expect(sparse.estimate.approximate).toBe(false);
    expect(() =>
      prepareDataset(
        "Louvain",
        {
          kind: "numeric",
          values: Array.from({ length: n }, (_, i) => [i, 0]),
        },
        p,
      ),
    ).toThrow(/메모리/);
  });

  it("K-Modes and K-Prototypes use original categorical/numeric attributes despite identical display", async () => {
    const display = dataReference.categorical.map(() => ({ x: 0, y: 0 }));
    for (const algorithm of ["K-Modes", "K-Prototypes"] as const) {
      const data: Dataset =
        algorithm === "K-Modes"
          ? { kind: "categorical", values: dataReference.categorical, display }
          : {
              kind: "mixed",
              numeric: dataReference.numeric,
              categorical: dataReference.categorical,
              display,
            };
      const r = await runDataset(
        algorithm,
        data,
        options(algorithm, { gamma: 1 }),
      );
      partition(r.labels, dataReference.partition);
      expect(r.computedRows).toBe(5);
      expect(r.sourceDimensions).toBe(algorithm === "K-Modes" ? 3 : 5);
      const a = finalState(r).analysis;
      if (a?.kind !== "data-clustering") throw new Error("data state missing");
      expect(a.objective).toBeCloseTo(
        algorithm === "K-Modes"
          ? dataReference.categoricalCost
          : dataReference.mixedCost,
        10,
      );
    }
  });

  it("CLIQUE native subspaces preserve fourth-axis overlapping memberships from the independent grid oracle", async () => {
    const fixture = dataReference.clique;
    const r = await runDataset(
      "CLIQUE",
      {
        kind: "numeric",
        values: fixture.rows,
        display: fixture.rows.map(() => ({ x: 0, y: 0 })),
      },
      options("CLIQUE", {
        gridBins: fixture.gridBins,
        densityThreshold: fixture.densityThreshold,
        subspaceDimensions: fixture.maxDimensions,
      }),
    );
    expect(r.kind).toBe("subspaces");
    expect(r.sourceDimensions).toBe(4);
    if (
      r.output.kind !== "subspaces" ||
      !r.output.subspaces ||
      !r.output.memberships
    )
      throw new Error("native subspaces missing");
    const key = (s: { dimensions: number[]; members: number[] }) =>
      `${s.dimensions}|${s.members}`;
    expect(r.output.subspaces.map(key).sort()).toEqual(
      fixture.components.map(key).sort(),
    );
    expect(r.output.subspaces.some((s) => s.dimensions.includes(3))).toBe(true);
    r.output.memberships.forEach((membership, i) =>
      expect([...membership].sort((a, b) => a - b)).toEqual(
        r.output.kind === "subspaces"
          ? r.output
              .subspaces!.filter((s) => s.members.includes(i))
              .map((s) => s.id)
              .sort((a, b) => a - b)
          : [],
      ),
    );
  });

  it("PROCLUS native output preserves the independently checked selected subspaces and influence radii", async () => {
    const result = await runDataset(
      "PROCLUS",
      { kind: "numeric", values: dataReference.proclus.rows },
      options("PROCLUS", { iterations: 3, subspaceDimensions: 2 }),
    );
    expect(result.kind).toBe("projected-partition");
    if (result.output.kind !== "projected-partition" || !result.output.medoids)
      throw new Error("Missing projected partition");
    const key = result.output.medoids.join(
      ",",
    ) as keyof typeof dataReference.proclus.orderedMedoidCases;
    const expected = dataReference.proclus.orderedMedoidCases[key];
    expect(result.output.dimensionsByCluster).toEqual(
      expected.refinedDimensions,
    );
    expect(result.output.labels).toEqual(expected.finalLabels);
    expect(result.output.objective).toBeCloseTo(expected.fullCost, 12);
    result.output.influence!.forEach((value, i) =>
      expect(value).toBeCloseTo(expected.influence[i], 12),
    );
  });

  it("PROCLUS single-cluster unbounded influence survives result JSON without becoming null", async () => {
    const result = await runDataset(
      "PROCLUS",
      { kind: "numeric", values: dataReference.proclus.rows },
      options("PROCLUS", { k: 1, iterations: 2, subspaceDimensions: 2 }),
    );
    if (result.output.kind !== "projected-partition")
      throw new Error("Missing projected partition");
    expect(result.labels.every((label) => label === 0)).toBe(true);
    const parsed = JSON.parse(JSON.stringify(result));
    expect(parsed.output.influence).toEqual([Number.MAX_VALUE]);
    expect(parsed.output.unboundedInfluence).toEqual([true]);
    expect(parsed.output.labels).toEqual(result.labels);
  });

  it("Bimax returns all four maximal overlapping rectangles and complete row AND column membership", async () => {
    const values = [
        [1, 1, 0],
        [1, 1, 1],
        [0, 1, 1],
      ],
      r = await runDataset(
        "Bimax",
        { kind: "matrix", values },
        options("Bimax", { minSize: 1, minPts: 1 }),
      );
    expect(r.kind).toBe("biclustering");
    expect(r.computedRows).toBe(3);
    expect(r.computedColumns).toBe(3);
    expect(r.sourceDimensions).toBe(3);
    if (r.output.kind !== "biclustering")
      throw new Error("native biclusters missing");
    expect(
      r.output.biclusters.map((b) => `${b.rows}|${b.columns}`).sort(),
    ).toEqual(["0,1|0,1", "1,2|1,2", "0,1,2|1", "1|0,1,2"].sort());
    const out = r.output;
    for (let i = 0; i < 3; i++) {
      expect([...out.rowMemberships[i]].sort((a, b) => a - b)).toEqual(
        out.biclusters
          .filter((b) => b.rows.includes(i))
          .map((b) => b.id)
          .sort((a, b) => a - b),
      );
      expect([...out.columnMemberships[i]].sort((a, b) => a - b)).toEqual(
        out.biclusters
          .filter((b) => b.columns.includes(i))
          .map((b) => b.id)
          .sort((a, b) => a - b),
      );
    }
  });

  it("Cheng–Church native rectangle has original-matrix residue, not 2D display residue", async () => {
    const fixture = matrixReference.cc;
    const r = await runDataset(
      "Cheng–Church Biclustering",
      { kind: "matrix", values: fixture.matrix },
      options("Cheng–Church Biclustering", {
        minSize: 1,
        minPts: 1,
        residueThreshold: fixture.threshold,
        biclusterCount: 1,
        deletionThreshold: 1.2,
        inversion: "allow",
      }),
    );
    if (r.output.kind !== "biclustering")
      throw new Error("native biclusters missing");
    const b = r.output.biclusters[0];
    expect(b.rows).toEqual(fixture.rows);
    expect(b.columns).toEqual(fixture.columns);
    const v = b.rows.map((i, a) =>
      b.columns.map((j) => fixture.matrix[i][j] * (b.rowSigns?.[a] ?? 1)),
    );
    const means = v.map((row) => row.reduce((s, x) => s + x, 0) / row.length),
      columns = b.columns.map(
        (_, j) => v.reduce((s, row) => s + row[j], 0) / v.length,
      );
    const mean = means.reduce((s, x) => s + x, 0) / means.length;
    const msr =
      v.reduce(
        (s, row, i) =>
          s +
          row.reduce(
            (t, x, j) => t + (x - means[i] - columns[j] + mean) ** 2,
            0,
          ),
        0,
      ) /
      (v.length * v[0].length);
    expect(b.residue).toBeCloseTo(msr, 12);
    expect(msr).toBeLessThanOrEqual(fixture.threshold);
    expect(b.residue).toBeCloseTo(fixture.result.residue, 12);
  });

  it("K-Shape uses full ordered sequences and exposes independent SciPy/NumPy centroids/objective", async () => {
    const fixture = timeReference.clustering[0];
    const data: Dataset = {
      kind: "timeseries",
      series: fixture.values.map((values, i) => ({
        id: String(i),
        times: values.map((_, j) => j * 0.1),
        values,
      })),
    };
    const r = await runDataset(
      "K-Shape",
      data,
      options("K-Shape", { seed: fixture.seed, k: fixture.k, iterations: 20 }),
    );
    expect(r.kind).toBe("timeseries-partition");
    expect(r.sourceDimensions).toBe(10);
    expect(r.timeSeriesSteps).toBe(10);
    expect(r.computedRows).toBe(12);
    expect(r.labels).toEqual(fixture.labels);
    if (r.output.kind !== "timeseries-partition")
      throw new Error("native time series result missing");
    r.output.centroids.forEach((row, i) =>
      row.forEach((x, j) => expect(x).toBeCloseTo(fixture.centroids[i][j], 8)),
    );
    expect(r.output.objective).toBeCloseTo(fixture.objectives.at(-1)!, 10);
  });

  it("identical mean/std display positions cannot replace different temporal shapes", async () => {
    const a = [0, 1, 0, -1, 0, 0],
      b = [0, 1, -1, 0, 0, 0];
    const data: Dataset = {
      kind: "timeseries",
      series: [a, a, b, b].map((values, i) => ({
        id: String(i),
        times: values.map((_, j) => j),
        values,
      })),
    };
    const positions = displayPoints(data);
    expect(
      positions.every((p) => p.x === positions[0].x && p.y === positions[0].y),
    ).toBe(true);
    const r = await runDataset("K-Shape", data, options("K-Shape", { k: 1 }));
    const identical = await runDataset(
      "K-Shape",
      { ...data, series: data.series.map((s) => ({ ...s, values: a })) },
      options("K-Shape", { k: 1 }),
    );
    if (
      r.output.kind !== "timeseries-partition" ||
      identical.output.kind !== "timeseries-partition"
    )
      throw new Error("native time result missing");
    expect(r.output.centroids.every((c) => c.length === a.length)).toBe(true);
    expect(identical.output.objective).toBeCloseTo(0, 10);
    expect(r.output.objective).toBeGreaterThan(1e-3);
    expect(r.output.centroids).not.toEqual(identical.output.centroids);
  });

  it("DenStream processes original timestamp gaps and exposes correctly decayed full CF sums", async () => {
    const p = options("DenStream", {
      streamInitSize: 0,
      decayRate: 0.05,
      epsilon: 0.1,
      beta: 0.6,
      minWeight: 3,
    });
    const execute = (gap: number) =>
      runDataset(
        "DenStream",
        {
          kind: "stream",
          samples: [0, 0, 0, gap].map((time) => ({ time, values: [2, 3, 4] })),
        },
        p,
      );
    const short = await execute(1),
      long = await execute(4);
    for (const [r, gap] of [
      [short, 1],
      [long, 4],
    ] as const) {
      expect(r.kind).toBe("stream-summary");
      expect(r.sourceDimensions).toBe(3);
      expect(r.computedRows).toBe(4);
      if (r.output.kind !== "stream-summary")
        throw new Error("native stream result missing");
      expect(r.output.processed).toBe(4);
      expect(r.output.time).toBe(gap);
      expect(r.output.microClusters).toHaveLength(1);
      const cf = r.output.microClusters[0],
        expected = 3 * 2 ** (-p.decayRate * gap) + 1;
      expect(cf.weight).toBeCloseTo(expected, 12);
      expect(cf.center).toEqual([2, 3, 4]);
      // CF moments use stable (x-anchor) coordinates. Reconstruct raw moments.
      cf.linearSum.forEach((x, j) =>
        expect(x + cf.anchor[j] * cf.weight).toBeCloseTo(
          expected * [2, 3, 4][j],
          11,
        ),
      );
      cf.squaredSum.forEach((x, j) =>
        expect(
          x +
            2 * cf.anchor[j] * cf.linearSum[j] +
            cf.anchor[j] ** 2 * cf.weight,
        ).toBeCloseTo(expected * [4, 9, 16][j], 11),
      );
    }
    if (
      short.output.kind !== "stream-summary" ||
      long.output.kind !== "stream-summary"
    )
      throw new Error("native stream result missing");
    expect(short.output.microClusters[0].weight).toBeGreaterThan(
      long.output.microClusters[0].weight,
    );
  });
});
