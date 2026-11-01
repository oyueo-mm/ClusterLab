import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus, release, totalmem } from "node:os";
import { bsas } from "./algorithms/bsas";
import { mbsas } from "./algorithms/mbsas";
import { ttsas } from "./algorithms/ttsas";
import { Recorder, stateAt, applyStep } from "./trace";
import { algorithmDefaults, type Params } from "./types";
import { displayPoints, type NumericDataset } from "./dataset";
import type { SequentialAnalysis } from "./sequentialTypes";
import oracle from "./fixtures/sequential-reference.json";
import {
  bsas as bsasLesson,
  mbsas as mbsasLesson,
  ttsas as ttsasLesson,
} from "../data/lessons/sequential";

const methods = { BSAS: bsas, MBSAS: mbsas, TTSAS: ttsas };
type Method = keyof typeof methods;
function run(
  method: Method,
  values: number[][],
  change: Partial<Params> = {},
  budget?: number,
) {
  const data: NumericDataset = { kind: "numeric", values },
    r = new Recorder(values.length, method, budget);
  methods[method](
    displayPoints(data),
    { ...algorithmDefaults(method), ...change },
    r,
    data,
  );
  return r;
}
function analysis(r: Recorder): SequentialAnalysis {
  if (r.state.analysis?.kind !== "sequential")
    throw new Error("Missing actual sequential state");
  return r.state.analysis;
}
function assignedSSE(
  values: number[][],
  labels: number[],
  centroids: number[][],
) {
  return values.reduce(
    (sum, row, i) =>
      labels[i] < 0
        ? sum
        : sum +
          row.reduce((s, v, j) => s + (v - centroids[labels[i]][j]) ** 2, 0),
    0,
  );
}
describe("ordered sequential schemes", () => {
  for (const method of Object.keys(methods) as Method[]) {
    it(`${method} matches all 60 official Python outcomes including actual ND means and independent NumPy SSE`, () => {
      for (const c of oracle.cases) {
        const r = run(method, c.values, c),
          a = analysis(r),
          expected = c.expected[method];
        expect(r.state.labels, c.name).toEqual(expected.labels);
        expect(a.counts, c.name).toEqual(expected.counts);
        expect(a.prototypeCounts).toEqual(expected.counts);
        a.centroids.forEach((center, i) =>
          center.forEach((v, j) =>
            expect(v, c.name).toBeCloseTo(expected.centroids[i][j], 12),
          ),
        );
        expect(a.objective, c.name).toBeCloseTo(expected.objective, 10);
        expect(a.processed).toBe(c.values.length);
        expect(a.unassigned).toBe(0);
      }
    });
  }
  it("executes three real guide mini datasets and the distinct hand-checked mean timing", () => {
    for (const [method, lesson, objective, clusters] of [
      ["BSAS", bsasLesson, 19 / 6, 1],
      ["MBSAS", mbsasLesson, 0.5, 2],
      ["TTSAS", ttsasLesson, 7 / 6, 1],
    ] as const) {
      const data = lesson.experimentDataset;
      if (data?.kind !== "numeric") throw new Error("Missing raw mini");
      const a = analysis(run(method, data.values, lesson.experimentParams));
      expect(a.objective).toBeCloseTo(objective, 12);
      expect(a.centroids).toHaveLength(clusters);
    }
  });
  it("TTSAS records actual gray-zone revisits, equality boundaries and no-progress forced creation", () => {
    const r = run("TTSAS", [[0], [1.5]]),
      a = analysis(r),
      states = r.trace.steps.map((step, i) => ({
        step,
        state: stateAt(r.trace, i + 1),
      }));
    expect(a.pass).toBe(3);
    expect(a.centroids).toEqual([[0], [1.5]]);
    expect(states.filter((v) => v.step.kind === "defer")).toHaveLength(2);
    expect(
      states
        .filter((v) => v.step.kind === "prototype")
        .map(
          (v) =>
            v.state.analysis?.kind === "sequential" && v.state.analysis.pass,
        ),
    ).toEqual([1, 3]);
    for (const v of states.filter((v) => v.step.kind === "defer")) {
      const s = v.state.analysis as SequentialAnalysis;
      expect(v.state.labels[s.current!]).toBe(-1);
      expect(s.distances?.[0].distance).toBe(1.5);
      expect(s.counts).toEqual([1]);
    }
    expect(analysis(run("TTSAS", [[0], [1]])).centroids).toHaveLength(1);
    expect(analysis(run("TTSAS", [[0], [2]])).pass).toBe(3);
    expect(analysis(run("TTSAS", [[0], [2.01]])).pass).toBe(1);
  });
  it("every recorded decision retains only actually assigned rows in its means, counts and diagnostic SSE", () => {
    const values = [
      [0, 0, 0],
      [0, 0, 1.5],
      [0, 0, 1],
      [0, 0, 6],
      [0, 0, 6.5],
    ];
    for (const method of Object.keys(methods) as Method[]) {
      const r = run(method, values);
      for (let i = 1; i <= r.trace.steps.length; i++) {
        const s = stateAt(r.trace, i),
          a = s.analysis as SequentialAnalysis;
        expect(a.processed).toBe(s.labels.filter((c) => c >= 0).length);
        expect(a.unassigned).toBe(values.length - a.processed);
        if (r.trace.steps[i - 1].kind === "distance")
          for (const candidate of a.distances ?? []) {
            const point = values[a.current!],
              center = a.centroids[candidate.cluster];
            const expected = Math.sqrt(
              point.reduce((sum, v, axis) => sum + (v - center[axis]) ** 2, 0),
            );
            expect(candidate.distance).toBeCloseTo(expected, 12);
          }
        if (r.trace.steps[i - 1].kind === "assign") {
          const before = stateAt(r.trace, i - 1).analysis as SequentialAnalysis;
          expect(r.trace.steps[i - 2].kind).toBe("distance");
          expect(a.distances).toEqual(before.distances);
        }
        a.centroids.forEach((center, cluster) => {
          const members = values.filter((_, row) => s.labels[row] === cluster);
          expect(a.counts[cluster]).toBe(members.length);
          center.forEach((v, j) =>
            expect(v).toBeCloseTo(
              members.reduce((sum, x) => sum + x[j], 0) / members.length,
              12,
            ),
          );
        });
        expect(a.objective).toBeCloseTo(
          assignedSSE(values, s.labels, a.centroids),
          11,
        );
      }
    }
  });
  it("original order changes BSAS while screen positions and unused seeds do not change actual traces", () => {
    const values = [
        [0, 0, 0],
        [0, 0, 0.6],
        [0, 0, 1.2],
      ],
      data: NumericDataset = { kind: "numeric", values };
    expect(analysis(run("BSAS", values)).centroids).toHaveLength(1);
    expect(
      analysis(run("BSAS", [values[0], values[2], values[1]])).centroids,
    ).toHaveLength(2);
    for (const method of Object.keys(methods) as Method[]) {
      const original = run(method, values),
        changed = new Recorder(3, method);
      methods[method](
        [
          { x: -100, y: 100 },
          { x: 500, y: 600 },
          { x: 1, y: 1 },
        ],
        { ...algorithmDefaults(method), seed: 999 },
        changed,
        data,
      );
      expect(changed.trace).toEqual(original.trace);
    }
  });
  it("keeps singleton/identical rows and q greater than n; TTSAS ignores the unrelated cluster budget", () => {
    for (const method of Object.keys(methods) as Method[]) {
      expect(
        analysis(
          run(method, [[3, 7]], {
            threshold: 0,
            upperThreshold: 1,
            maxClusters: 999,
          }),
        ).counts,
      ).toEqual([1]);
      expect(
        analysis(
          run(
            method,
            Array.from({ length: 6 }, () => [3, 7]),
            { threshold: 0, upperThreshold: 1 },
          ),
        ).counts,
      ).toEqual([6]);
    }
    expect(
      analysis(run("BSAS", [[0], [10], [20]], { maxClusters: 1 })).counts,
    ).toEqual([3]);
    expect(
      analysis(run("TTSAS", [[0], [10], [20]], { maxClusters: 1 })).counts,
    ).toEqual([1, 1, 1]);
  });
  it("reports invalid supports, bounds and nonfinite arithmetic instead of an empty success", () => {
    expect(() => run("BSAS", [[0]], { threshold: -1 })).toThrow(/threshold/);
    expect(() => run("MBSAS", [[0]], { maxClusters: 0 })).toThrow(
      /maxClusters/,
    );
    expect(() =>
      run("TTSAS", [[0]], { threshold: 2, upperThreshold: 2 }),
    ).toThrow(/upperThreshold/);
    expect(() => run("TTSAS", [[0]], { upperThreshold: NaN })).toThrow(
      /upperThreshold/,
    );
    expect(() => run("BSAS", [[0], [1, 2]])).toThrow(/同|차원/);
    expect(() => run("BSAS", [[0], [Infinity]])).toThrow(/유한/);
    expect(() => run("BSAS", [])).toThrow();
    expect(() => run("BSAS", [[0], [1e200]], { maxClusters: 1 })).toThrow(
      /수치/,
    );
    expect(() => run("BSAS", [[0], [1e-200]], { maxClusters: 1 })).toThrow(
      /수치/,
    );
    expect(() => run("BSAS", [[0]], {}, 128)).toThrow(/Trace/);
  });
  it("restores actual checkpoints and arbitrary backward/forward seeks for all three schemes", () => {
    const values = Array.from({ length: 30 }, (_, i) => [
      (i % 3) * 5,
      (i % 5) / 10,
      i % 3,
    ]);
    for (const method of Object.keys(methods) as Method[]) {
      const r = run(method, values);
      expect(r.trace.snapshots.length).toBeGreaterThan(0);
      let s = r.trace.initial;
      r.trace.steps.forEach((step, i) => {
        s = applyStep(s, step);
        expect(s).toEqual(stateAt(r.trace, i + 1));
      });
      expect(s).toEqual(r.state);
      for (const step of [...r.trace.steps].reverse())
        s = applyStep(s, step, true);
      expect(s).toEqual(r.trace.initial);
      for (const i of [48, 0, r.trace.steps.length, 12, 1, 49]) {
        let direct = r.trace.initial;
        for (const step of r.trace.steps.slice(0, i))
          direct = applyStep(direct, step);
        expect(stateAt(r.trace, i)).toEqual(direct);
      }
    }
  });
  it("records immutable original metadata once, keeps more than 600 rows and does not mutate source", () => {
    for (const method of Object.keys(methods) as Method[]) {
      const values = Array.from({ length: 1201 }, (_, i) => [
          0,
          0,
          i === 1200 ? 4 : 0,
        ]),
        original = structuredClone(values),
        r = run(method, values, {
          threshold: 0.5,
          upperThreshold: 1,
          maxClusters: 1202,
        }),
        a = analysis(r);
      expect(r.state.labels).toHaveLength(1201);
      expect(a.counts).toEqual([1200, 1]);
      expect(a.sourceValues).toEqual(original);
      expect(
        r.trace.steps
          .flatMap((s) => s.analysisDelta?.changes ?? [])
          .filter((c) => c.key === "sourceValues"),
      ).toHaveLength(1);
      values[0][2] = -99;
      expect(a.sourceValues).toEqual(original);
      expect(r.trace.recording?.policy).toContain("모든 원본 계산");
    }
  });
  it("uses stable anchor-relative means for large common offsets", () => {
    const values = [[1e15], [1e15 + 0.25], [1e15 + 0.5]];
    const a = analysis(run("BSAS", values, { threshold: 1 }));
    expect(a.centroids).toEqual([[1e15 + 0.25]]);
    expect(a.objective).toBeCloseTo(0.125, 12);
    const separated = analysis(
      run("BSAS", [[0], [1e308]], { threshold: 0, maxClusters: 2 }),
    );
    expect(separated.centroids).toEqual([[0], [1e308]]);
    expect(separated.objective).toBe(0);
  });
  it("measures full original-row engine and Trace costs at suitable scales without claiming peak memory or FPS", () => {
    const observations = [];
    for (const n of [100, 1000, 10000, 100000])
      for (const method of Object.keys(methods) as Method[]) {
        const values = Array.from({ length: n }, (_, i) => [
            (i % 2) * 5 + (i % 7) / 100,
            (i % 11) / 100,
            (i % 2) * 3,
          ]),
          before = process.memoryUsage().heapUsed,
          start = performance.now(),
          r = run(method, values),
          elapsed = performance.now() - start,
          a = analysis(r);
        expect(a.processed).toBe(n);
        expect(a.counts.reduce((s, v) => s + v, 0)).toBe(n);
        expect(a.centroids).toHaveLength(2);
        observations.push({
          method,
          n,
          dimensions: 3,
          elapsedMs: elapsed,
          heapDeltaBytes: process.memoryUsage().heapUsed - before,
          events: r.trace.steps.length,
          traceEstimatedBytes: r.trace.recording?.estimatedBytes,
          passes: a.pass,
          clusters: a.centroids.length,
        });
      }
    const report = {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: cpus()[0].model,
      logicalProcessors: cpus().length,
      totalMemoryBytes: totalmem(),
      osRelease: release(),
      generator: "row i: [i%2*5+(i%7)/100,(i%11)/100,i%2*3]",
      threshold: 1,
      upperThreshold: 2,
      maxClusters: 16,
      observations,
      note: "One Node engine+Trace observation per case, no forced GC. Heap delta is not peak memory or FPS; generation/Worker/Canvas excluded; all original rows processed.",
    };
    mkdirSync(".local", { recursive: true });
    mkdirSync("docs/research", { recursive: true });
    writeFileSync(
      ".local/sequential-performance.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    writeFileSync(
      "docs/research/sequential-performance.json",
      JSON.stringify(report, null, 2) + "\n",
    );
  });
});
