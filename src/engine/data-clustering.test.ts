import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { kmodes } from "./algorithms/kmodes";
import { kprototypes } from "./algorithms/kprototypes";
import { clique, cliqueRegions } from "./algorithms/clique";
import {
  proclus,
  proclusDimensions,
  proclusAssignment,
  proclusObjective,
  segmental,
} from "./algorithms/proclus";
import { modes, mismatch } from "./algorithms/dataCommon";
import { Recorder, applyStep, stateAt } from "./trace";
import { defaults, type Params, type Algorithm, type Point } from "./types";
import type { Dataset } from "./dataset";
import oracle from "./fixtures/data-clustering-reference.json";

const options: Params = {
  ...defaults,
  k: 2,
  iterations: 20,
  gamma: 1,
  gridBins: 3,
  densityThreshold: 0.3,
  subspaceDimensions: 2,
  samplingFactor: 10,
  medoidFactor: 5,
};
const display = (n: number): Point[] =>
  Array.from({ length: n }, (_, i) => ({ x: i / n, y: (i % 2) / 2 }));
const analysis = (r: Recorder) => {
  const a = r.state.analysis;
  if (a?.kind !== "data-clustering") throw new Error("data analysis missing");
  return a;
};
const partition = (a: number[], b: number[]) =>
  a.every((x, i) => a.every((y, j) => (x === y) === (b[i] === b[j])));
const unitKey = (u: { dimensions: number[]; coordinates: number[] }) =>
  `${u.dimensions}|${u.coordinates}`;
const cats: Dataset = { kind: "categorical", values: oracle.categorical };
const mixed: Dataset = {
  kind: "mixed",
  numeric: oracle.numeric,
  categorical: oracle.categorical,
};
const numeric: Dataset = { kind: "numeric", values: oracle.clique.rows };
const cases = [
  ["K-Modes", kmodes, cats],
  ["K-Prototypes", kprototypes, mixed],
  ["CLIQUE", clique, numeric],
  ["PROCLUS", proclus, numeric],
] as const;
function execute(
  name: Algorithm,
  engine: typeof kmodes,
  data: Dataset,
  o = options,
  p = display(
    data.kind === "mixed"
      ? data.numeric.length
      : "values" in data
        ? data.values.length
        : 0,
  ),
) {
  const r = new Recorder(p.length, name);
  engine(p, o, r, data);
  return r;
}
describe("real categorical and subspace calculations", () => {
  it("matches independent NumPy modes, mixed means, partition and costs", () => {
    for (const [name, engine, data] of cases.slice(0, 2)) {
      const r = execute(name, engine, data),
        a = analysis(r);
      expect(partition(r.state.labels, oracle.partition)).toBe(true);
      expect(a.objective).toBeCloseTo(
        name === "K-Modes" ? oracle.categoricalCost : oracle.mixedCost,
        12,
      );
      const sorted = [...a.categoricalCenters!].sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
      expect(sorted).toEqual(
        [...oracle.categoricalCenters].sort((a, b) => a[0].localeCompare(b[0])),
      );
      if (name === "K-Prototypes") {
        const centers = [...a.numericCenters!].sort((a, b) => a[0] - b[0]);
        centers.forEach((row, c) =>
          row.forEach((v, j) =>
            expect(v).toBeCloseTo(oracle.numericCenters[c][j], 12),
          ),
        );
      }
      expect(r.state.metric.at(-1)).toBe(a.objective);
      for (let i = 1; i < r.state.metric.length; i++)
        expect(r.state.metric[i]).toBeLessThanOrEqual(
          r.state.metric[i - 1] + 1e-10,
        );
    }
  });
  it("uses all original categories and numeric dimensions, independent of display", () => {
    const values = Array.from({ length: 8 }, (_, i) => [
      "same",
      "same",
      i < 4 ? "left" : "right",
    ]);
    const data: Dataset = { kind: "categorical", values };
    const a = execute("K-Modes", kmodes, data),
      b = execute(
        "K-Modes",
        kmodes,
        data,
        options,
        display(8).map(() => ({ x: 99, y: -99 })),
      );
    expect(a.state.labels[0]).not.toBe(a.state.labels[4]);
    expect(a.state.labels).toEqual(b.state.labels);
    expect(analysis(a)).toEqual(analysis(b));
    const raw: Dataset = {
      kind: "mixed",
      numeric: Array.from({ length: 8 }, (_, i) => [0, 0, i < 4 ? 0 : 10]),
      categorical: values.map(() => ["constant"]),
    };
    const m = execute("K-Prototypes", kprototypes, raw);
    expect(m.state.labels[0]).not.toBe(m.state.labels[4]);
    expect(analysis(m).numericCenters?.[0]).toHaveLength(3);
  });
  it("preserves modes on ties, handles empty clusters and does not encode category order numerically", () => {
    const update = modes([["A"], ["B"]], [0, 0], [["B"], ["unused"]]);
    expect(update.centers).toEqual([["B"], ["unused"]]);
    expect(mismatch(["z", "A"], ["a", "A"])).toBe(1);
    const rows = oracle.categorical.map((row) =>
      row.map((v) => `very different ${v}`),
    );
    const a = execute("K-Modes", kmodes, cats),
      b = execute("K-Modes", kmodes, { kind: "categorical", values: rows });
    expect(partition(a.state.labels, b.state.labels)).toBe(true);
  });
  it("finds exactly independently enumerated CLIQUE dense units and face components in every explored subspace", () => {
    const r = execute("CLIQUE", clique, numeric),
      a = analysis(r);
    const expected = oracle.clique.dense.map(unitKey).sort(),
      actual = a.units!.map(unitKey).sort();
    expect(actual).toEqual(expected);
    a.units!.forEach((u) => {
      const target = oracle.clique.dense.find(
        (v) => unitKey(u) === unitKey(v),
      )!;
      expect(u.members).toEqual(target.members);
      expect(u.count).toBe(target.count);
    });
    const key = (u: { dimensions: number[]; members: number[] }) =>
      `${u.dimensions}|${u.members}`;
    expect(a.subspaces!.map(key).sort()).toEqual(
      oracle.clique.components.map(key).sort(),
    );
    a.subspaces!.forEach((cluster) =>
      cluster.members.forEach((i) =>
        expect(a.memberships![i]).toContain(cluster.id),
      ),
    );
    expect(a.dimensions).toBe(4);
    expect(a.exploredDimensions).toBe(2);
  });
  it("uses strict selectivity threshold, distinguishes diagonal contact and includes observed maxima", () => {
    const data: Dataset = {
      kind: "numeric",
      values: [
        [0, 0],
        [1, 1],
      ],
    };
    const empty = execute("CLIQUE", clique, data, {
      ...options,
      gridBins: 2,
      densityThreshold: 0.5,
    });
    expect(analysis(empty).units).toHaveLength(0);
    expect(empty.state.labels).toEqual([-1, -1]);
    const r = execute("CLIQUE", clique, data, {
      ...options,
      gridBins: 2,
      densityThreshold: 0,
    });
    expect(
      analysis(r).subspaces!.filter((c) => c.dimensions.length === 2),
    ).toHaveLength(2);
    expect(
      analysis(r).units!.some(
        (u) => u.dimensions.length === 2 && u.coordinates.every((c) => c === 1),
      ),
    ).toBe(true);
  });
  it("returns maximal nonredundant DNF rectangle cover, not a bounding box over missing cells", () => {
    const cells = [
        [0, 0],
        [0, 1],
        [1, 0],
      ],
      boxes = cliqueRegions(cells),
      occupied = new Set(cells.map((c) => c.join(",")));
    const enumerate = (low: number[], high: number[]) => {
      const keys: string[] = [];
      for (let x = low[0]; x <= high[0]; x++)
        for (let y = low[1]; y <= high[1]; y++) keys.push(`${x},${y}`);
      return keys;
    };
    boxes.forEach((box, i) => {
      const own = enumerate(box.low, box.high);
      expect(own.every((k) => occupied.has(k))).toBe(true);
      const others = new Set(
        boxes.flatMap((b, j) => (i === j ? [] : enumerate(b.low, b.high))),
      );
      expect(own.some((k) => !others.has(k))).toBe(true);
    });
    expect(new Set(boxes.flatMap((b) => enumerate(b.low, b.high)))).toEqual(
      occupied,
    );
  });
  it("matches independent PROCLUS locality Z scores, constrained dimension allocation, segmental assignments and centroid cost", () => {
    const q = oracle.proclus,
      chosen = proclusDimensions(q.rows, q.medoids, q.localities, 2);
    expect(chosen.dimensions).toEqual(
      q.dimensions.map((d) => [...d].sort((a, b) => a - b)),
    );
    chosen.scores.forEach((row, i) =>
      row.forEach((v, j) => expect(v).toBeCloseTo(q.scores[i][j], 12)),
    );
    const labels = proclusAssignment(q.rows, q.medoids, chosen.dimensions);
    expect(labels).toEqual(q.labels);
    expect(
      proclusObjective(q.rows, labels, chosen.dimensions).value,
    ).toBeCloseTo(q.objective, 12);
    expect(segmental([1, 5, 100], [3, 1, -500], [0, 1])).toBe(3);
    const extended = proclusDimensions(
      q.rows,
      q.medoids,
      q.localities,
      3,
    ).dimensions;
    expect(extended.reduce((s, r) => s + r.length, 0)).toBe(6);
    expect(extended.every((row) => row.length >= 2)).toBe(true);
  });
  it("PROCLUS all-row assignment/outlier decisions agree with its actual returned medoids and selected dimensions", () => {
    const r = execute("PROCLUS", proclus, numeric),
      a = analysis(r),
      medoids = a.medoids!,
      dims = a.dimensionsByCluster!;
    const labels = proclusAssignment(oracle.proclus.rows, medoids, dims);
    oracle.proclus.rows.forEach((row, i) => {
      const outside = medoids.every(
        (id, c) =>
          segmental(row, oracle.proclus.rows[id], dims[c]) > a.influence![c],
      );
      expect(r.state.labels[i]).toBe(outside ? -1 : labels[i]);
    });
    expect(a.objective).toBeCloseTo(
      proclusObjective(oracle.proclus.rows, labels, dims).value,
      12,
    );
    expect(a.dimensionsByCluster!.reduce((s, row) => s + row.length, 0)).toBe(
      medoids.length * 2,
    );
  });
  it("every PROCLUS proposal and its final refinement match independent exhaustive ordered-medoid cases", () => {
    const r = execute("PROCLUS", proclus, numeric);
    for (let i = 0; i < r.trace.steps.length; i++) {
      const state = stateAt(r.trace, i + 1),
        a = state.analysis;
      if (a?.kind !== "data-clustering" || a.method !== "PROCLUS" || !a.medoids)
        continue;
      const key = a.medoids.join(
        ",",
      ) as keyof typeof oracle.proclus.orderedMedoidCases;
      const expected = oracle.proclus.orderedMedoidCases[key];
      if (a.phase === "full-assignment") {
        expect(a.localities).toEqual(expected.localities);
        expect(a.dimensionsByCluster).toEqual(expected.dimensions);
        expect(state.labels).toEqual(expected.labels);
        expect(a.objective).toBeCloseTo(expected.cost, 12);
      }
      if (a.phase === "finish") {
        expect(a.dimensionsByCluster).toEqual(expected.refinedDimensions);
        expect(state.labels).toEqual(expected.finalLabels);
        expect(a.objective).toBeCloseTo(expected.fullCost, 12);
        a.influence!.forEach((v, c) =>
          expect(v).toBeCloseTo(expected.influence[c], 12),
        );
      }
    }
  });
  for (const [name, engine, data] of cases) {
    it(`${name}: deterministic real event sequence, every forward/backward state and checkpoint`, () => {
      const first = execute(name, engine, data),
        again = execute(name, engine, data);
      expect(first.trace.steps).toEqual(again.trace.steps);
      let state = first.trace.initial;
      first.trace.steps.forEach((step, i) => {
        state = applyStep(state, step);
        expect(state).toEqual(stateAt(first.trace, i + 1));
      });
      expect(state).toEqual(first.state);
      for (const step of [...first.trace.steps].reverse())
        state = applyStep(state, step, true);
      expect(state).toEqual(first.trace.initial);
      first.trace.snapshots.forEach((s) =>
        expect(stateAt(first.trace, s.index)).toEqual(s.state),
      );
      expect(first.state.labels).toHaveLength(
        "values" in data ? data.values.length : data.numeric.length,
      );
    });
    it(`${name}: duplicate/all-equal values and one cluster stay finite`, () => {
      const n = 6,
        same: Dataset =
          name === "K-Modes"
            ? {
                kind: "categorical",
                values: Array.from({ length: n }, () => ["A", "A"]),
              }
            : name === "K-Prototypes"
              ? {
                  kind: "mixed",
                  numeric: Array.from({ length: n }, () => [1, 1]),
                  categorical: Array.from({ length: n }, () => ["A"]),
                }
              : {
                  kind: "numeric",
                  values: Array.from({ length: n }, () => [1, 1, 1]),
                };
      const r = execute(name, engine, same, { ...options, k: 1 });
      expect(r.state.labels.every((c) => c >= 0)).toBe(true);
      const a = analysis(r);
      expect(a.numericCenters?.flat().every(Number.isFinite) ?? true).toBe(
        true,
      );
      expect(a.dimensionScores?.flat().every(Number.isFinite) ?? true).toBe(
        true,
      );
    });
  }
  it("rejects unavailable categorical input, malformed rows and invalid parameters without invented data", () => {
    expect(() =>
      kmodes(display(4), options, new Recorder(4, "K-Modes")),
    ).toThrow(/범주형/);
    expect(() =>
      kprototypes(display(4), options, new Recorder(4, "K-Prototypes")),
    ).toThrow(/범주형/);
    expect(() =>
      execute("K-Prototypes", kprototypes, mixed, { ...options, gamma: -1 }),
    ).toThrow(/가중치/);
    expect(() =>
      execute("CLIQUE", clique, numeric, { ...options, densityThreshold: 1 }),
    ).toThrow(/밀도/);
    expect(() =>
      execute("PROCLUS", proclus, numeric, {
        ...options,
        subspaceDimensions: 5,
      }),
    ).toThrow(/차원/);
    expect(() =>
      execute("CLIQUE", clique, { kind: "numeric", values: [[1, 2], [3]] }),
    ).toThrow(/벡터/);
  });
  it("records honest engine-only observations without performance assertions", () => {
    const observations = [];
    for (const [name, engine] of [
      ["K-Modes", kmodes],
      ["K-Prototypes", kprototypes],
      ["CLIQUE", clique],
      ["PROCLUS", proclus],
    ] as const) {
      const n = name === "CLIQUE" ? 1000 : 1000;
      const numeric = Array.from({ length: n }, (_, i) => [
        (i % 2) * 5 + (i % 7) / 100,
        (i % 11) / 100,
        (i % 2) * 7 + (i % 13) / 100,
      ]);
      const categorical = Array.from({ length: n }, (_, i) => [
        i % 2 ? "B" : "A",
        i % 3 ? "X" : "Y",
      ]);
      const data: Dataset =
        name === "K-Modes"
          ? { kind: "categorical", values: categorical }
          : name === "K-Prototypes"
            ? { kind: "mixed", numeric, categorical }
            : { kind: "numeric", values: numeric };
      const begin = performance.now(),
        before = process.memoryUsage().heapUsed,
        r = execute(name, engine, data, { ...options, iterations: 3 });
      observations.push({
        name,
        n,
        dimensions: analysis(r).dimensions,
        milliseconds: +(performance.now() - begin).toFixed(2),
        heapDeltaBytes: process.memoryUsage().heapUsed - before,
        events: r.trace.steps.length,
        traceEstimatedBytes: r.trace.recording?.estimatedBytes,
      });
    }
    mkdirSync(".local", { recursive: true });
    writeFileSync(
      ".local/data-clustering-performance.json",
      JSON.stringify(
        {
          node: process.version,
          platform: process.platform,
          note: "Single engine-only observations, input generation/Worker transfer/rendering excluded; heap delta is not peak.",
          observations,
        },
        null,
        2,
      ),
    );
  });
});
