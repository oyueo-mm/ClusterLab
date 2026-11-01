import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { cnm, greedyMergeCandidates } from "./algorithms/cnm";
import { fluid } from "./algorithms/fluid";
import { Recorder, stateAt, applyStep } from "./trace";
import { defaults, type Algorithm, type Point } from "./types";
import type { GraphDataset } from "./dataset";
import { communityGraph, modularity } from "./algorithms/communityCommon";
import fixture from "./fixtures/graph-extra-reference.json";

const params = {
  ...defaults,
  k: 2,
  neighbors: 2,
  iterations: 100,
  resolution: 1,
};
function dataset(f = fixture.cases[0]): GraphDataset {
  return {
    kind: "graph",
    directed: false,
    nodes: Array.from({ length: f.n }, (_, i) => ({ id: String(i) })),
    edges: f.edges.map(([a, b, weight]) => ({
      source: String(a),
      target: String(b),
      weight,
    })),
  };
}
function execute(
  name: Algorithm,
  engine: typeof cnm,
  data = dataset(),
  options = params,
) {
  const points: Point[] = data.nodes.map((_, i) => ({
      x: i / data.nodes.length,
      y: 0.5,
    })),
    r = new Recorder(points.length, name);
  engine(points, options, r, data);
  return r;
}
function partition(a: number[], b: number[]) {
  a.forEach((c, i) => a.forEach((d, j) => expect(c === d).toBe(b[i] === b[j])));
}

describe("Greedy Modularity (CNM)", () => {
  it("matches independent NetworkX final partition/Q and every full-scan greedy merge", () => {
    for (const f of fixture.cases) {
      const r = execute("Greedy Modularity (CNM)", cnm, dataset(f)),
        merges = r.trace.steps.filter((s) => s.kind === "merge");
      partition(r.state.labels, f.greedyLabels);
      partition(r.state.labels, f.networkxGreedyLabels);
      if (r.state.analysis?.kind !== "community") throw new Error("analysis");
      expect(r.state.analysis.objective).toBeCloseTo(f.networkxGreedyQ, 11);
      expect(merges).toHaveLength(f.greedyPath.length);
      merges.forEach((step, i) => {
        expect(Number(step.result?.gain)).toBeCloseTo(f.greedyPath[i].gain, 11);
        expect(Number(step.result?.before)).toBeCloseTo(
          f.greedyPath[i].before,
          11,
        );
        expect(Number(step.result?.after)).toBeCloseTo(
          f.greedyPath[i].after,
          11,
        );
      });
    }
  });
  it("uses actual merge formula and all full raw points;0gain tie retains finer partition", () => {
    const p = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      data: GraphDataset = {
        kind: "graph",
        directed: false,
        nodes: [{ id: "0" }, { id: "1" }],
        edges: [{ source: "0", target: "1", weight: 1 }],
      };
    const graph = communityGraph(p, params, data),
      [candidate] = greedyMergeCandidates(graph, [0, 1], 1);
    expect(candidate.gain).toBeCloseTo(0.5, 12);
    expect(candidate.gain).toBeCloseTo(
      modularity(graph, [0, 0]) - modularity(graph, [0, 1]),
      12,
    );
    expect(
      execute("Greedy Modularity (CNM)", cnm, data, {
        ...params,
        resolution: 2,
      }).state.labels,
    ).toEqual([0, 1]);
    const empty = dataset();
    empty.edges = [];
    expect(execute("Greedy Modularity (CNM)", cnm, empty).state.labels).toEqual(
      [0, 1, 2, 3, 4, 5],
    );
  });
});

describe("Fluid Communities", () => {
  it("every actual ego density and asynchronous move matches independent NumPy recount/dot oracle", () => {
    for (const f of fixture.cases.filter((f) => f.fluid))
      for (const oracle of f.fluid!) {
        const r = execute("Fluid Communities", fluid, dataset(f), {
          ...params,
          k: oracle.k,
          seed: oracle.seed,
        });
        expect(r.state.labels).toEqual(oracle.labels);
        if (oracle.k === 1 || oracle.k === f.n)
          partition(r.state.labels, oracle.networkxLabels);
        const messages = r.trace.steps.flatMap((step, index) =>
          step.kind === "messages" ? [{ step, index }] : [],
        );
        expect(messages).toHaveLength(oracle.decisions.length);
        messages.forEach(({ step, index }, j) => {
          const expected = oracle.decisions[j],
            state = stateAt(r.trace, index + 1),
            a = state.analysis;
          expect(step.result?.node).toBe(expected.node);
          expect(step.result?.previous).toBe(expected.previous);
          expect(step.result?.chosen).toBe(expected.chosen);
          expect(state.labels).toEqual(expected.beforeLabels);
          if (a?.kind !== "community") throw new Error("analysis");
          expect(a.counts).toEqual(expected.beforeCounts);
          a.densities!.forEach((d, c) =>
            expect(d).toBeCloseTo(expected.beforeDensity[c], 13),
          );
          a.votes!.forEach((v) =>
            expect(v.gain).toBeCloseTo(expected.scores[v.community], 13),
          );
        });
      }
  });
  it("every state preserves exactlyKnonempty fluids,unit totaldensity and immediate counts", () => {
    const r = execute("Fluid Communities", fluid),
      k = params.k;
    for (let i = 1; i <= r.trace.steps.length; i++) {
      const state = stateAt(r.trace, i),
        a = state.analysis;
      if (a?.kind !== "community") throw new Error("analysis");
      expect(a.counts).toHaveLength(k);
      expect(a.counts!.every((count) => count > 0)).toBe(true);
      expect(new Set(state.labels.filter((c) => c >= 0)).size).toBe(k);
      a.counts!.forEach((count, c) => {
        expect(state.labels.filter((label) => label === c)).toHaveLength(count);
        expect(count * a.densities![c]).toBeCloseTo(1, 13);
      });
    }
  });
  it("enforces connected simple unitweight input,validK,andexplicit unsupported domain errors", () => {
    const disconnected = dataset();
    disconnected.edges = disconnected.edges.filter(
      (e) => !(e.source === "2" && e.target === "3"),
    );
    expect(() => execute("Fluid Communities", fluid, disconnected)).toThrow(
      /연결 그래프/,
    );
    const weighted = dataset();
    weighted.edges[0].weight = 2;
    expect(() => execute("Fluid Communities", fluid, weighted)).toThrow(
      /가중치|단위 간선/,
    );
    const loops = dataset();
    loops.edges.push({ source: "0", target: "0", weight: 1 });
    expect(() => execute("Fluid Communities", fluid, loops)).toThrow(
      /단순 그래프/,
    );
    const duplicate = dataset();
    duplicate.edges.push({ ...duplicate.edges[0] });
    expect(() => execute("Fluid Communities", fluid, duplicate)).toThrow(
      /단순 그래프/,
    );
    const directed = dataset();
    directed.directed = true;
    expect(() => execute("Fluid Communities", fluid, directed)).toThrow(
      /무방향/,
    );
    expect(() =>
      execute("Fluid Communities", fluid, dataset(), { ...params, k: 7 }),
    ).toThrow(/정수 K/);
  });
  it("does not report partially assigned fluid updates as complete", () => {
    const n = 100,
      data: GraphDataset = {
        kind: "graph",
        directed: false,
        nodes: Array.from({ length: n }, (_, i) => ({ id: String(i) })),
        edges: Array.from({ length: n - 1 }, (_, i) => ({
          source: String(i),
          target: String(i + 1),
          weight: 1,
        })),
      };
    expect(() =>
      execute("Fluid Communities", fluid, data, { ...params, iterations: 1 }),
    ).toThrow(/미할당/);
  });
});

for (const [name, engine] of [
  ["Greedy Modularity (CNM)", cnm],
  ["Fluid Communities", fluid],
] as const) {
  it(`${name}: seed reproducibility/display independence and full forward/back restore`, () => {
    const r = execute(name, engine),
      again = execute(name, engine),
      data = dataset();
    data.nodes = data.nodes.map((v, i) => ({
      ...v,
      position: { x: 9000 * i, y: -9000 * i },
    }));
    expect(execute(name, engine, data).trace.steps).toEqual(r.trace.steps);
    expect(r.trace.steps).toEqual(again.trace.steps);
    let state = r.trace.initial;
    r.trace.steps.forEach((step, i) => {
      state = applyStep(state, step);
      expect(state).toEqual(stateAt(r.trace, i + 1));
    });
    expect(state).toEqual(r.state);
    for (const step of [...r.trace.steps].reverse())
      state = applyStep(state, step, true);
    expect(state).toEqual(r.trace.initial);
  });
}

it("records sparse100/1000 observations and real resource errors honestly", () => {
  const observations = [];
  for (const [name, engine] of [
    ["Greedy Modularity (CNM)", cnm],
    ["Fluid Communities", fluid],
  ] as const)
    for (const n of [100, 1000]) {
      const graph: GraphDataset = {
        kind: "graph",
        directed: false,
        nodes: Array.from({ length: n }, (_, i) => ({ id: String(i) })),
        edges: Array.from({ length: n }, (_, i) => ({
          source: String(i),
          target: String((i + 1) % n),
          weight: 1,
        })),
      };
      const iterations =
        name === "Fluid Communities" && n === 1000 ? 1000 : params.iterations;
      const start = performance.now(),
        before = process.memoryUsage().heapUsed;
      try {
        const r = execute(name, engine, graph, { ...params, iterations });
        observations.push({
          name,
          n,
          status: "complete",
          iterations,
          milliseconds: +(performance.now() - start).toFixed(2),
          heapDeltaBytes: process.memoryUsage().heapUsed - before,
          events: r.trace.steps.length,
          traceEstimatedBytes: r.trace.recording?.estimatedBytes,
        });
      } catch (error) {
        observations.push({
          name,
          n,
          status: "explicit-error",
          message: String(error),
        });
      }
    }
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/graph-extra-performance.json",
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        observations,
        note: "Single Node; no inputgeneration/Worker/rendering. Heapdelta isnotpeak.",
      },
      null,
      2,
    ),
  );
}, 60000);
