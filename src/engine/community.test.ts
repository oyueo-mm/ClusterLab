import { describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { Recorder, stateAt, applyStep } from "./trace";
import { defaults, type Algorithm, type Point } from "./types";
import type { GraphDataset } from "./dataset";
import { louvain } from "./algorithms/louvain";
import { leiden, refinePartition } from "./algorithms/leiden";
import { labelpropagation } from "./algorithms/labelpropagation";
import { girvannewman, edgeBetweenness } from "./algorithms/girvannewman";
import {
  mcl,
  expandMatrix,
  inflateMatrix,
  extractAttractors,
} from "./algorithms/mcl";
import {
  aggregateGraph,
  communityGraph,
  components,
  graphFromEdges,
  modularity,
  normalizedLabels,
  originalLabels,
} from "./algorithms/communityCommon";
import { random } from "./math";
import oracle from "./fixtures/community-reference.json";

const engines = [
  ["Louvain", louvain],
  ["Leiden", leiden],
  ["Label Propagation", labelpropagation],
  ["Girvan–Newman", girvannewman],
  ["Markov Clustering (MCL)", mcl],
] as const;
const options = {
  ...defaults,
  iterations: 100,
  k: 3,
  neighbors: 2,
  tolerance: 1e-8,
  resolution: 1,
  refinementRandomness: 0.01,
  inflation: 2,
  expansion: 2,
};
const points = (n: number): Point[] =>
  Array.from({ length: n }, (_, i) => ({
    x: (i % 3) / 3,
    y: Math.floor(i / 3) / 3,
  }));
const input = (fixture = oracle.cases[0]): GraphDataset => ({
  kind: "graph",
  directed: false,
  nodes: Array.from({ length: fixture.n }, (_, i) => ({ id: String(i) })),
  edges: fixture.edges.map(([a, b, weight]) => ({
    source: String(a),
    target: String(b),
    weight,
  })),
});
function run(
  name: Algorithm,
  engine: typeof louvain,
  data = input(),
  params = options,
) {
  const p = points(data.nodes.length),
    r = new Recorder(p.length, name);
  engine(p, params, r, data);
  return r;
}
const key = (labels: number[]) => normalizedLabels(labels).join(",");
const samePartition = (a: number[], b: number[]) =>
  a.forEach((_, i) =>
    a.forEach((__, j) => expect(a[i] === a[j]).toBe(b[i] === b[j])),
  );
const matrixClose = (a: number[][], b: number[][]) =>
  a.forEach((row, i) =>
    row.forEach((value, j) => expect(value).toBeCloseTo(b[i][j], 10)),
  );

describe("independent graph references", () => {
  it("Louvain/Leiden match known author/NetworkX partitions and exhaustive tiny modularity", () => {
    for (const fixture of oracle.cases)
      for (const [name, engine] of engines.slice(0, 2)) {
        const r = run(name, engine, input(fixture)),
          state = r.state;
        const expected = name === "Leiden" ? fixture.leiden : fixture.louvain;
        if (fixture.name !== "weighted-diamond")
          samePartition(state.labels, expected);
        const q =
          state.analysis?.kind === "community" ? state.analysis.objective : NaN;
        expect(q).toBeCloseTo(
          name === "Leiden" ? fixture.leidenQ : fixture.louvainQ,
          11,
        );
        if (Object.keys(fixture.allPartitionQ).length)
          expect(q).toBeCloseTo(
            Math.max(...Object.values(fixture.allPartitionQ)),
            11,
          );
      }
  });
  it("every accepted modularity move matches independent exhaustive Q table, with aggregation invariance", () => {
    const costs = oracle.cases[0].allPartitionQ as Record<string, number>;
    for (const [name, engine] of engines.slice(0, 2)) {
      const r = run(name, engine),
        trace = r.trace;
      trace.steps.forEach((step, i) => {
        if (step.kind === "move") {
          const before = stateAt(trace, i),
            after = stateAt(trace, i + 1);
          expect(
            costs[key(after.labels)] - costs[key(before.labels)],
          ).toBeCloseTo(Number(step.result?.gain), 11);
          expect(Number(step.result?.gain)).toBeGreaterThan(0);
        }
        if (step.kind === "aggregate")
          expect(step.result?.after).toBeCloseTo(
            Number(step.result?.before),
            11,
          );
      });
    }
  });
  it("all-source inverse-weight Brandes agrees with NetworkX and each removal is recomputed", () => {
    for (const fixture of oracle.cases.filter((f) => f.betweenness)) {
      const graph = communityGraph(points(fixture.n), options, input(fixture));
      const actual = edgeBetweenness(graph);
      fixture.betweenness!.forEach((e) =>
        expect(
          actual.find((x) => x.a === e.a && x.b === e.b)?.value,
        ).toBeCloseTo(e.value, 11),
      );
      const r = run("Girvan–Newman", girvannewman, input(fixture));
      if (r.state.analysis?.kind !== "community") throw new Error("analysis");
      expect(r.state.analysis.removed?.map((e) => [e.a, e.b])).toEqual(
        fixture.girvanRemoved,
      );
      samePartition(r.state.labels, fixture.girvanLabels!);
      expect(r.trace.steps.filter((s) => s.kind === "distance")).toHaveLength(
        fixture.girvanRemoved!.length,
      );
    }
  });
  it("MCL expansion/inflation/final full matrix agree with independent NumPy", () => {
    for (const fixture of oracle.cases) {
      matrixClose(
        expandMatrix(fixture.mclInitial, 2),
        fixture.mclFirstExpanded,
      );
      matrixClose(
        inflateMatrix(fixture.mclFirstExpanded, 2),
        fixture.mclFirstInflated,
      );
      const r = run("Markov Clustering (MCL)", mcl, input(fixture));
      if (r.state.analysis?.kind !== "community") throw new Error("analysis");
      matrixClose(r.state.analysis.transition!, fixture.mclFinal);
      r.state.analysis.transition![0].forEach((_, j) =>
        expect(
          r.state.analysis!.kind === "community" &&
            r.state.analysis.transition!.reduce((s, row) => s + row[j], 0),
        ).toBeCloseTo(1, 12),
      );
    }
  });
  it("weighted asynchronous label consensus matches the independent known disconnected triangles", () => {
    const data = input();
    data.edges = data.edges.filter(
      (e) => !(e.source === "2" && e.target === "3"),
    );
    const r = run("Label Propagation", labelpropagation, data);
    samePartition(r.state.labels, [0, 0, 0, 1, 1, 1]);
    for (const step of r.trace.steps.filter((s) => s.kind === "messages")) {
      const { previous, chosen, maxVote } = step.result!;
      expect(Number(previous)).toBeGreaterThanOrEqual(0);
      expect(Number(chosen)).toBeGreaterThanOrEqual(0);
      expect(Number(maxVote)).toBeGreaterThan(0);
    }
  });
});

describe("graph contracts and real reversible traces", () => {
  for (const [name, engine] of engines)
    it(`${name}: seeded state, all forwards/backwards, checkpoints and display independence`, () => {
      const r = run(name, engine),
        again = run(name, engine);
      expect(r.trace.steps).toEqual(again.trace.steps);
      const data = input();
      data.nodes = data.nodes.map((v, i) => ({
        ...v,
        position: { x: i * 999, y: -i * 999 },
      }));
      expect(run(name, engine, data).trace.steps).toEqual(r.trace.steps);
      let state = r.trace.initial;
      r.trace.steps.forEach((step, i) => {
        state = applyStep(state, step);
        expect(state).toEqual(stateAt(r.trace, i + 1));
      });
      expect(state).toEqual(r.state);
      for (const step of [...r.trace.steps].reverse())
        state = applyStep(state, step, true);
      expect(state).toEqual(r.trace.initial);
      for (const checkpoint of r.trace.snapshots)
        expect(stateAt(r.trace, checkpoint.index)).toEqual(checkpoint.state);
      expect(r.state.labels.every((c) => c >= 0)).toBe(true);
    });
  it("Leiden performs constrained stochastic refinement, preserves parent membership, returns connected communities", () => {
    const data = input(),
      r = run("Leiden", leiden, data),
      graph = communityGraph(points(6), options, data);
    expect(r.trace.steps.some((s) => s.kind === "refine")).toBe(true);
    expect(r.trace.steps.some((s) => s.kind === "aggregate")).toBe(true);
    const refined = refinePartition(
      graph,
      [0, 0, 0, 1, 1, 1],
      1,
      0.01,
      random(42),
      () => {},
    );
    refined.forEach((c, i) =>
      refined.forEach((d, j) => {
        if (c === d) expect(i < 3).toBe(j < 3);
      }),
    );
    for (const c of new Set(r.state.labels)) {
      const members = r.state.labels.flatMap((v, i) => (v === c ? [i] : [])),
        set = new Set(members);
      const seen = new Set([members[0]]),
        queue = [members[0]];
      for (let q = 0; q < queue.length; q++)
        graph.adjacency[queue[q]].forEach((_, j) => {
          if (set.has(j) && !seen.has(j)) {
            seen.add(j);
            queue.push(j);
          }
        });
      expect(seen.size).toBe(members.length);
    }
  });
  it("graph self-loop/multiedge aggregation preserves hand-computed weighted modularity", () => {
    const g = graphFromEdges(3, [
      { a: 0, b: 0, weight: 2 },
      { a: 0, b: 1, weight: 1 },
      { a: 0, b: 1, weight: 2 },
      { a: 1, b: 2, weight: 1 },
    ]);
    expect(g.degrees).toEqual([7, 4, 1]);
    expect(g.total).toBe(12);
    expect(modularity(g, [0, 0, 1])).toBeCloseTo(
      10 / 12 - (11 / 12) ** 2 - (1 / 12) ** 2,
      12,
    );
    const a = aggregateGraph(g, [0, 0, 1]);
    expect(modularity(a, [0, 1])).toBeCloseTo(modularity(g, [0, 0, 1]), 12);
    expect(originalLabels(a, [0, 1], 3)).toEqual([0, 0, 1]);
  });
  it("ND conversion uses the third raw dimension, not displayed coordinates", () => {
    const p = points(6),
      values = p.map((_, i) => [0, 0, i < 3 ? i * 0.01 : 10 + i * 0.01]);
    const graph = communityGraph(
      p,
      { ...options, neighbors: 2 },
      { kind: "numeric", values },
    );
    expect(components(graph)).toEqual([0, 0, 0, 1, 1, 1]);
    expect(graph.source).toMatch(/3차원/);
  });
  it("isolated/empty and complete graphs retain actual nodes with valid result", () => {
    const data = input();
    data.edges = [];
    for (const [name, engine] of engines)
      expect(run(name, engine, data).state.labels).toEqual([0, 1, 2, 3, 4, 5]);
    const p = points(6);
    for (const [name, engine] of engines) {
      const r = new Recorder(6, name);
      engine(p, { ...options, neighbors: 8, iterations: 5 }, r);
      expect(r.trace.steps.length).toBeGreaterThan(1);
      expect(r.state.labels.every((v) => v >= 0)).toBe(true);
    }
  });
  it("direction, negative edges, invalid parameters and actual nonconvergence fail explicitly", () => {
    for (const [name, engine] of engines) {
      const data = input();
      data.directed = true;
      expect(() => run(name, engine, data)).toThrow(/무방향/);
      data.directed = false;
      data.edges[0].weight = -1;
      expect(() => run(name, engine, data)).toThrow(/가중치/);
    }
    expect(() =>
      run("Markov Clustering (MCL)", mcl, input(), {
        ...options,
        inflation: 1,
      }),
    ).toThrow(/inflation/);
    expect(() =>
      run("Markov Clustering (MCL)", mcl, input(), {
        ...options,
        iterations: 1,
      }),
    ).toThrow(/수렴/);
    expect(() =>
      run("Leiden", leiden, input(), { ...options, refinementRandomness: 0 }),
    ).toThrow(/양수/);
    expect(() =>
      run("Girvan–Newman", girvannewman, input(oracle.cases[1])),
    ).toThrow(/self-loop/);
  });
  it("MCL retains overlapping attractor supports rather than silently dropping memberships", () => {
    const result = extractAttractors(
      [
        [0.8, 0, 0.5],
        [0, 0.8, 0.5],
        [0.2, 0.2, 0],
      ],
      0.01,
    );
    expect(result.memberships).toEqual([
      [0, 2],
      [1, 2],
    ]);
    expect(result.labels[2]).toBe(0);
    expect(result.attractors).toEqual([0, 1]);
  });
  it("Leiden completed partitions stay connected on seeded weighted sparse graphs", () => {
    for (let seed = 0; seed < 16; seed++) {
      const rng = random(seed + 500),
        n = 16,
        edges = [];
      for (let a = 0; a < n; a++)
        for (let b = a + 1; b < n; b++)
          if (rng() < 0.18) edges.push({ a, b, weight: 0.1 + rng() * 3 });
      const graph = graphFromEdges(n, edges),
        data: GraphDataset = {
          kind: "graph",
          directed: false,
          nodes: Array.from({ length: n }, (_, i) => ({ id: String(i) })),
          edges: edges.map(({ a, b, weight }) => ({
            source: String(a),
            target: String(b),
            weight,
          })),
        };
      const r = run("Leiden", leiden, data, { ...options, seed });
      for (const c of new Set(r.state.labels)) {
        const members = r.state.labels.flatMap((v, i) => (v === c ? [i] : [])),
          set = new Set(members),
          visited = new Set([members[0]]),
          queue = [members[0]];
        for (let q = 0; q < queue.length; q++)
          graph.adjacency[queue[q]].forEach((_, j) => {
            if (set.has(j) && !visited.has(j)) {
              visited.add(j);
              queue.push(j);
            }
          });
        expect(visited.size).toBe(members.length);
      }
    }
  });
  it("Leiden summary recording computes every node and preserves small-component math", () => {
    const fixture = oracle.cases[0],
      data = input();
    data.nodes.push(
      ...Array.from({ length: 594 }, (_, i) => ({ id: String(i + 6) })),
    );
    const r = run("Leiden", leiden, data);
    expect(r.state.labels).toHaveLength(600);
    samePartition(r.state.labels.slice(0, 6), fixture.leiden);
    expect(new Set(r.state.labels.slice(6)).size).toBe(594);
    expect(new Set(r.state.labels).size).toBe(596);
    expect(r.trace.recording?.policy).toMatch(/요약/);
    expect(r.trace.steps.length).toBeLessThan(100);
    if (r.state.analysis?.kind !== "community") throw new Error("analysis");
    expect(r.state.analysis.objective).toBeCloseTo(fixture.leidenQ, 11);
    let state = r.state;
    for (const step of [...r.trace.steps].reverse())
      state = applyStep(state, step, true);
    expect(state).toEqual(r.trace.initial);
  });
  it("modularity matches independent NetworkX all-partition values beyond just optimized outputs", () => {
    for (const fixture of oracle.cases.filter(
      (v) => Object.keys(v.allPartitionQ).length,
    )) {
      const g = communityGraph(points(fixture.n), options, input(fixture));
      for (const [encoded, expected] of Object.entries(fixture.allPartitionQ)) {
        const partition = encoded.split(",").map(Number);
        expect(modularity(g, partition)).toBeCloseTo(expected, 11);
        const aggregated = aggregateGraph(g, partition);
        expect(
          modularity(
            aggregated,
            aggregated.members.map((_, i) => i),
          ),
        ).toBeCloseTo(expected, 11);
      }
    }
  });
  it("actual nonempty graph checkpoints restore whole analysis and rewind after more than48events", () => {
    const n = 100,
      data: GraphDataset = {
        kind: "graph",
        directed: false,
        nodes: Array.from({ length: n }, (_, i) => ({ id: String(i) })),
        edges: Array.from({ length: n }, (_, i) => ({
          source: String(i),
          target: String((i + 1) % n),
          weight: 1,
        })),
      };
    const r = run("Leiden", leiden, data);
    expect(r.trace.steps.length).toBeGreaterThan(48);
    expect(r.trace.snapshots.length).toBeGreaterThan(0);
    for (const checkpoint of r.trace.snapshots)
      expect(stateAt(r.trace, checkpoint.index)).toEqual(checkpoint.state);
    let state = r.state;
    for (const step of [...r.trace.steps].reverse())
      state = applyStep(state, step, true);
    expect(state).toEqual(r.trace.initial);
  });
  it("finite extreme graph scales do not create silent invalid modularity deltas", () => {
    for (const scale of [1e-300, 1e300]) {
      const data = input();
      data.edges = data.edges.map((edge) => ({
        ...edge,
        weight: edge.weight * scale,
      }));
      for (const [name, engine] of engines.slice(0, 2)) {
        const r = run(name, engine, data);
        samePartition(r.state.labels, oracle.cases[0].leiden);
        if (r.state.analysis?.kind !== "community") throw new Error("analysis");
        expect(r.state.analysis.objective).toBeCloseTo(
          oracle.cases[0].leidenQ,
          10,
        );
      }
    }
    const data = input();
    data.edges = data.edges.map((edge) => ({
      ...edge,
      weight: edge.weight * 1e250,
    }));
    const r = run("Louvain", louvain, data, { ...options, resolution: 1e100 });
    expect(r.state.metric.every(Number.isFinite)).toBe(true);
  });
});

it("records graph resource observations without timing guarantees", () => {
  const observations = [];
  for (const [name, engine] of engines)
    for (const n of name === "Markov Clustering (MCL)"
      ? [50, 100]
      : name === "Girvan–Newman"
        ? [30]
        : [100, 1000]) {
      const edges = Array.from({ length: n }, (_, i) => ({
        source: String(i),
        target: String((i + 1) % n),
        weight: 1,
      }));
      const data: GraphDataset = {
        kind: "graph",
        directed: false,
        nodes: Array.from({ length: n }, (_, i) => ({ id: String(i) })),
        edges,
      };
      const before = process.memoryUsage().heapUsed,
        start = performance.now();
      try {
        const r = run(name, engine, data);
        observations.push({
          name,
          n,
          status: "complete",
          milliseconds: +(performance.now() - start).toFixed(2),
          heapDeltaBytes: process.memoryUsage().heapUsed - before,
          events: r.trace.steps.length,
          traceEstimatedBytes: r.trace.recording?.estimatedBytes,
        });
      } catch (e) {
        observations.push({
          name,
          n,
          status: "explicit-error",
          message: String(e),
          milliseconds: +(performance.now() - start).toFixed(2),
        });
      }
    }
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/community-performance.json",
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        observations,
        note: "Single Node observation; input generation/Worker/rendering excluded. Heap delta is not peak.",
      },
      null,
      2,
    ),
  );
}, 60000);
