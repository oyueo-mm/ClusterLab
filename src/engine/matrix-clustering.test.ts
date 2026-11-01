import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { bimax } from "./algorithms/bimax";
import { chengchurch } from "./algorithms/chengchurch";
import { meanSquaredResidue } from "./algorithms/matrixCommon";
import { Recorder, stateAt, applyStep } from "./trace";
import { defaults, type Algorithm, type Params } from "./types";
import type { MatrixAnalysis } from "./matrixTypes";
import oracle from "./fixtures/matrix-reference.json";

const options: Params = {
  ...defaults,
  minSize: 1,
  minPts: 1,
  residueThreshold: 0.01,
  biclusterCount: 1,
  deletionThreshold: 1.2,
  inversion: "allow",
};
const points = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ x: i / n, y: 0 }));
const matrix = (
  name: Algorithm,
  engine: typeof bimax,
  values: number[][],
  o: Params = options,
) => {
  const p = points(values.length),
    r = new Recorder(p.length, name);
  engine(p, o, r, { kind: "matrix", values });
  return r;
};
const analysis = (r: Recorder) => {
  const a = r.state.analysis;
  if (a?.kind !== "biclustering") throw new Error("matrix analysis missing");
  return a;
};
const key = (b: { rows: number[]; columns: number[] }) =>
  `${[...b.rows].sort((a, b) => a - b)}|${[...b.columns].sort((a, b) => a - b)}`;
describe("actual binary and residue biclustering", () => {
  it("Bimax matches exhaustive maximal rectangles for every binary3x3 matrix and40 binary4x4 matrices", () => {
    for (const example of oracle.bimaxCases) {
      const a = analysis(matrix("Bimax", bimax, example.matrix));
      expect(
        a.biclusters.map(key).sort(),
        `matrix=${JSON.stringify(example.matrix)}`,
      ).toEqual(example.expected.map(key).sort());
    }
  });
  it("Bimax minimum shape filtering preserves exactly all qualifying globally maximal biclusters", () => {
    for (const example of oracle.bimaxCases.filter((_, i) => i % 17 === 0)) {
      const a = analysis(
        matrix("Bimax", bimax, example.matrix, {
          ...options,
          minSize: 2,
          minPts: 2,
        }),
      );
      expect(a.biclusters.map(key).sort()).toEqual(
        example.expected
          .filter((b) => b.rows.length >= 2 && b.columns.length >= 2)
          .map(key)
          .sort(),
      );
    }
  });
  it("Bimax preserves overlapping row+column memberships without truncating output to biclusterCount", () => {
    const values = [
        [1, 1, 0],
        [1, 1, 1],
        [0, 1, 1],
      ],
      r = matrix("Bimax", bimax, values, { ...options, biclusterCount: 1 });
    const a = analysis(r);
    expect(a.biclusters.length).toBeGreaterThan(1);
    a.biclusters.forEach((b) => {
      b.rows.forEach((i) => expect(a.rowMemberships[i]).toContain(b.id));
      b.columns.forEach((j) => expect(a.columnMemberships[j]).toContain(b.id));
    });
    expect(a.rowMemberships.some((ids) => ids.length > 1)).toBe(true);
  });
  it("MSR and row/column residues match independent NumPy on every nonempty4x4 submatrix", () => {
    for (const [key, expected] of Object.entries(oracle.cc.subsets)) {
      const [rr, cc] = key.split("|").map((v) => v.split(",").map(Number));
      const actual = meanSquaredResidue(oracle.cc.matrix, rr, cc);
      expect(actual.residue).toBeCloseTo(expected.residue, 12);
      expect(actual.grandMean).toBeCloseTo(expected.grandMean, 12);
      actual.rowResidues.forEach((v, i) =>
        expect(v).toBeCloseTo(expected.rowResidues[i], 12),
      );
      actual.columnResidues.forEach((v, j) =>
        expect(v).toBeCloseTo(expected.columnResidues[j], 12),
      );
    }
  });
  it("Cheng–Church exact single deletion sequence and final original MSR agree with independent NumPy", () => {
    const r = matrix(
        "Cheng–Church Biclustering",
        chengchurch,
        oracle.cc.matrix,
      ),
      a = analysis(r);
    const deletes = r.trace.steps
      .filter((s) => s.kind === "prune")
      .map((s) => ({
        axis: s.result?.axis,
        index: Number(s.result?.index) - 1,
      }));
    expect(deletes).toEqual(oracle.cc.deletions);
    expect(a.biclusters[0].rows).toEqual(oracle.cc.rows);
    expect(a.biclusters[0].columns).toEqual(oracle.cc.columns);
    expect(a.biclusters[0].residue).toBeCloseTo(oracle.cc.result.residue, 12);
  });
  it("inverse-row addition is an actual sign transform and preserves original unsigned residue separately", () => {
    const r = matrix(
        "Cheng–Church Biclustering",
        chengchurch,
        oracle.inverse.matrix,
      ),
      a = analysis(r),
      b = a.biclusters[0];
    expect(b.rows).toEqual([0, 1, 2]);
    expect(b.columns).toEqual([0, 1, 2]);
    expect(b.rowSigns).toEqual(oracle.inverse.signs);
    expect(b.residue).toBeCloseTo(oracle.inverse.signed.residue, 12);
    expect(b.originalResidue).toBeCloseTo(oracle.inverse.unsigned.residue, 12);
    expect(
      r.trace.steps.some((s) => s.kind === "insert" && s.result?.sign === -1),
    ).toBe(true);
    const none = analysis(
      matrix("Cheng–Church Biclustering", chengchurch, oracle.inverse.matrix, {
        ...options,
        inversion: "none",
      }),
    );
    expect(none.biclusters[0].rows.length).toBeLessThan(3);
  });
  it("seeded masking is real, reversible, original-invariant and followed by valid original-data results", () => {
    const values = oracle.cc.matrix.map((row) => [...row]),
      original = structuredClone(values),
      r = matrix("Cheng–Church Biclustering", chengchurch, values, {
        ...options,
        biclusterCount: 3,
      });
    expect(values).toEqual(original);
    const mask = r.trace.steps.findIndex((s) => s.kind === "mask");
    expect(mask).toBeGreaterThan(0);
    const state = stateAt(r.trace, mask + 1),
      a = state.analysis as MatrixAnalysis;
    expect(a.maskedCells!.some((c) => c.before !== c.after)).toBe(true);
    a.maskedCells!.forEach((c) => {
      expect(a.values[c.row][c.column]).toBe(original[c.row][c.column]);
      expect(a.workingValues![c.row][c.column]).toBe(c.after);
    });
    analysis(r).biclusters.forEach((b) => {
      const signs = Array(values.length).fill(1);
      b.rows.forEach((i, j) => (signs[i] = b.rowSigns?.[j] ?? 1));
      expect(
        meanSquaredResidue(values, b.rows, b.columns, signs).residue,
      ).toBeLessThanOrEqual(options.residueThreshold);
    });
    const again = matrix("Cheng–Church Biclustering", chengchurch, values, {
      ...options,
      biclusterCount: 3,
    });
    expect(r.trace.steps).toEqual(again.trace.steps);
  });
  it("matrix computation ignores display coordinates and labels are only a row summary", () => {
    const values = oracle.cc.matrix,
      base = matrix("Cheng–Church Biclustering", chengchurch, values),
      p = points(values.length).map(() => ({ x: -99, y: 500 })),
      r = new Recorder(p.length, "Cheng–Church Biclustering");
    chengchurch(p, options, r, { kind: "matrix", values });
    expect(analysis(r)).toEqual(analysis(base));
    expect(r.state.labels).toHaveLength(values.length);
    expect(analysis(r).columnMemberships).toHaveLength(values[0].length);
  });
  for (const [name, engine, values] of [
    [
      "Bimax",
      bimax,
      Array.from({ length: 15 }, (_, i) =>
        Array.from({ length: 15 }, (_, j) => Number(j <= i)),
      ),
    ],
    ["Cheng–Church Biclustering", chengchurch, oracle.cc.matrix],
  ] as const) {
    it(`${name}: all forward/backward states and checkpoints restore exact matrices and outputs`, () => {
      const v = values.map((row) => [...row]),
        r = matrix(name, engine, v, { ...options, biclusterCount: 12 });
      let state = r.trace.initial;
      expect(r.trace.snapshots.length).toBeGreaterThan(0);
      r.trace.steps.forEach((s, i) => {
        state = applyStep(state, s);
        expect(state).toEqual(stateAt(r.trace, i + 1));
      });
      expect(state).toEqual(r.state);
      for (const step of [...r.trace.steps].reverse())
        state = applyStep(state, step, true);
      expect(state).toEqual(r.trace.initial);
      r.trace.snapshots.forEach((s) =>
        expect(stateAt(r.trace, s.index)).toEqual(s.state),
      );
    });
  }
  it("all-one/all-zero/constant matrices yield mathematically valid explicit results", () => {
    expect(
      analysis(
        matrix("Bimax", bimax, [
          [1, 1],
          [1, 1],
        ]),
      ).biclusters,
    ).toHaveLength(1);
    expect(
      analysis(
        matrix("Bimax", bimax, [
          [0, 0],
          [0, 0],
        ]),
      ).biclusters,
    ).toHaveLength(0);
    const a = analysis(
      matrix(
        "Cheng–Church Biclustering",
        chengchurch,
        [
          [7, 7],
          [7, 7],
        ],
        { ...options, residueThreshold: 0, biclusterCount: 3 },
      ),
    );
    expect(a.biclusters).toHaveLength(1);
    expect(a.biclusters[0].residue).toBe(0);
  });
  it("rejects wrong data kinds, nonbinary cells, ragged/nonfinite values and invalid domain params", () => {
    expect(() => bimax(points(2), options, new Recorder(2, "Bimax"))).toThrow(
      /행렬|Matrix/,
    );
    expect(() =>
      matrix("Bimax", bimax, [
        [1, 0.5],
        [0, 1],
      ]),
    ).toThrow(/이진/);
    expect(() =>
      matrix("Cheng–Church Biclustering", chengchurch, [[1, 2], [3]]),
    ).toThrow(/직사각형/);
    expect(() =>
      matrix("Cheng–Church Biclustering", chengchurch, [
        [1, 2],
        [3, Infinity],
      ]),
    ).toThrow(/유한/);
    expect(() =>
      matrix(
        "Cheng–Church Biclustering",
        chengchurch,
        [
          [1, 2],
          [3, 4],
        ],
        { ...options, deletionThreshold: 1 },
      ),
    ).toThrow(/α/);
  });
  it("records engine-only matrix observations without performance assertions", () => {
    const observations = [];
    for (const [name, engine, values] of [
      [
        "Bimax",
        bimax,
        Array.from({ length: 100 }, (_, i) =>
          Array.from({ length: 20 }, (_, j) =>
            Number(Math.floor(i / 25) === Math.floor(j / 5)),
          ),
        ),
      ],
      [
        "Cheng–Church Biclustering",
        chengchurch,
        Array.from({ length: 100 }, (_, i) =>
          Array.from(
            { length: 20 },
            (_, j) => i * 0.1 + j * 0.2 + (i % 11 === 0 && j % 7 === 0 ? 5 : 0),
          ),
        ),
      ],
    ] as const) {
      const start = performance.now(),
        before = process.memoryUsage().heapUsed,
        r = matrix(name, engine, values, { ...options, biclusterCount: 2 });
      observations.push({
        name,
        rows: values.length,
        columns: values[0].length,
        milliseconds: +(performance.now() - start).toFixed(2),
        heapDeltaBytes: process.memoryUsage().heapUsed - before,
        events: r.trace.steps.length,
        traceEstimatedBytes: r.trace.recording?.estimatedBytes,
        biclusters: analysis(r).biclusters.length,
      });
    }
    mkdirSync(".local", { recursive: true });
    writeFileSync(
      ".local/matrix-performance.json",
      JSON.stringify(
        {
          node: process.version,
          platform: process.platform,
          note: "Single engine-only observation; input generation/Worker/rendering excluded; heap delta is not peak.",
          observations,
        },
        null,
        2,
      ),
    );
  });
});
