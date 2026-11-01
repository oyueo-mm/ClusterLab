import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  walktrap,
  walkTransition,
  advanceWalk,
  walkMergeCandidates,
} from "./algorithms/walktrap";
import {
  cliquepercolation,
  enumerateKCliques,
} from "./algorithms/cliquepercolation";
import {
  communityGraph,
  graphFromEdges,
  normalizedLabels,
} from "./algorithms/communityCommon";
import { Recorder, applyStep, stateAt } from "./trace";
import { defaults, type Algorithm, type Params, type Point } from "./types";
import type { CommunityAnalysis } from "./communityTypes";
import type { Dataset, GraphDataset } from "./dataset";
import oracle from "./fixtures/graph-followup-reference.json";
import { runDataset } from "./datasetExecution";
import {
  walktrap as walkLesson,
  cliquepercolation as cliqueLesson,
} from "../data/lessons/graphFollowup";

const options: Params = {
  ...defaults,
  walkSteps: 4,
  cliqueSize: 3,
  neighbors: 2,
};
const points = (n: number): Point[] =>
  Array.from({ length: n }, (_, i) => ({ x: i / n, y: 0.5 }));
const graph = (n: number, edges: number[][]): GraphDataset => ({
  kind: "graph",
  directed: false,
  nodes: points(n).map((position, i) => ({ id: String(i), position })),
  edges: edges.map(([a, b, w = 1]) => ({
    source: String(a),
    target: String(b),
    weight: w,
  })),
});
const execute = (
  name: Algorithm,
  engine: typeof walktrap,
  data: Dataset,
  p: Params = options,
) => {
  const n =
    data.kind === "graph"
      ? data.nodes.length
      : data.kind === "numeric"
        ? data.values.length
        : 0;
  const r = new Recorder(n, name);
  engine(points(n), p, r, data);
  return r;
};
const analysis = (r: Recorder): CommunityAnalysis => {
  if (r.state.analysis?.kind !== "community")
    throw new Error("missing community analysis");
  return r.state.analysis;
};
const close = (a: number[][], b: number[][]) => {
  expect(a.length).toBe(b.length);
  a.forEach((row, i) => {
    expect(row.length).toBe(b[i].length);
    row.forEach((x, j) => expect(x).toBeCloseTo(b[i][j], 11));
  });
};
const partition = (a: number[], b: number[]) =>
  a.forEach((x, i) => a.forEach((y, j) => expect(x === y).toBe(b[i] === b[j])));
function replay(r: Recorder) {
  let s = r.trace.initial;
  r.trace.steps.forEach((step, i) => {
    s = applyStep(s, step);
    expect(s).toEqual(stateAt(r.trace, i + 1));
  });
  expect(s).toEqual(r.state);
  for (let i = r.trace.steps.length - 1; i >= 0; i--) {
    s = applyStep(s, r.trace.steps[i], true);
    expect(s).toEqual(stateAt(r.trace, i));
  }
  expect(s).toEqual(r.trace.initial);
}

describe("Walktrap actual random-walk Ward hierarchy", () => {
  it("all actual mean-loop transition powers match independent dense NumPy, including isolates and canonical parallel weights", () => {
    for (const fixture of oracle.walks) {
      const data = graph(fixture.n, fixture.rawEdges),
        g = communityGraph(points(fixture.n), options, data);
      const transition = walkTransition(g);
      transition.loops.forEach((x, i) =>
        expect(x).toBeCloseTo(fixture.loopWeights[i], 12),
      );
      transition.degrees.forEach((x, i) =>
        expect(x).toBeCloseTo(fixture.walkDegrees[i], 12),
      );
      let p: number[][] = points(fixture.n).map((_, i) =>
        points(fixture.n).map((__, j) => (i === j ? 1 : 0)),
      );
      fixture.powers.forEach((expected) => {
        p = advanceWalk(p, transition.transition);
        close(p, expected);
        p.forEach((row) =>
          expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12),
        );
      });
      const r = execute("Walktrap", walktrap, data, {
        ...options,
        walkSteps: fixture.steps,
      });
      const states = r.trace.steps.flatMap((step, i) =>
        step.kind === "walk" ? [stateAt(r.trace, i + 1)] : [],
      );
      expect(states.length).toBe(fixture.steps);
      states.forEach((state, i) => {
        if (state.analysis?.kind !== "community")
          throw new Error("missing walk state");
        close(state.analysis.walkProbabilities!, fixture.powers[i]);
      });
    }
  });
  it("every actual candidate matches independent full original-row SSE differences and only minimal adjacent Ward pairs merge", () => {
    for (const fixture of oracle.walks) {
      const r = execute(
        "Walktrap",
        walktrap,
        graph(fixture.n, fixture.rawEdges),
        { ...options, walkSteps: fixture.steps },
      );
      r.trace.steps.forEach((step, i) => {
        const s = stateAt(r.trace, i + 1),
          a = s.analysis;
        if (a?.kind !== "community") throw new Error("missing state");
        const q = (fixture.partitionQ as unknown as Record<string, number>)[
          normalizedLabels(s.labels).join(",")
        ];
        expect(a.objective).toBeCloseTo(q, 11);
        if (step.kind !== "test") return;
        const members = new Map(
          Array.from({ length: fixture.n }, (_, v) => [v, [v]]),
        );
        a.dendrogram?.forEach((m) => members.set(m.id, m.members));
        const mask = (id: number) =>
          members.get(id)!.reduce((m, v) => m + 2 ** v, 0);
        for (const candidate of a.walkMergeCandidates!) {
          const x = mask(candidate.a),
            y = mask(candidate.b),
            key = `${Math.min(x, y)}|${Math.max(x, y)}`;
          const expected = (
            fixture.subsetCandidates as unknown as Record<
              string,
              { distance: number; increase: number }
            >
          )[key];
          expect(expected).toBeDefined();
          expect(candidate.distance).toBeCloseTo(expected.distance, 11);
          expect(candidate.increase).toBeCloseTo(expected.increase, 11);
        }
        expect(a.wardIncrease).toBe(
          Math.min(...a.walkMergeCandidates!.map((c) => c.increase)),
        );
      });
    }
  });
  it("highest original-Q cut agrees with author igraph; complete hierarchy and max-over-visited-Q remain visible", () => {
    for (const fixture of oracle.walks) {
      const r = execute(
          "Walktrap",
          walktrap,
          graph(fixture.n, fixture.rawEdges),
          { ...options, walkSteps: fixture.steps },
        ),
        a = analysis(r);
      partition(r.state.labels, fixture.igraphLabels);
      expect(a.objective).toBeCloseTo(fixture.igraphQ, 10);
      expect(a.dendrogram).toHaveLength(fixture.igraphMerges.length);
      expect(a.levels).toHaveLength(fixture.igraphMerges.length + 1);
      const qs = a.levels.map(
        (labels) =>
          (fixture.partitionQ as unknown as Record<string, number>)[
            labels.join(",")
          ],
      );
      expect(a.objective).toBeCloseTo(Math.max(...qs), 11);
      expect(a.selectedLevel).toBeGreaterThanOrEqual(0);
      partition(a.levels[a.selectedLevel!], r.state.labels);
      a.dendrogram!.forEach((merge, i) => {
        expect(merge.id).toBe(fixture.n + i);
        expect(merge.increase).toBeGreaterThanOrEqual(0);
      });
    }
  });
  it("unit three-node hand example uses mean loops and excludes the nonadjacent candidate", () => {
    const g = graphFromEdges(3, [
        { a: 0, b: 1 },
        { a: 1, b: 2 },
      ]),
      w = walkTransition(g);
    const p = advanceWalk(
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      w.transition,
    );
    close(p, [
      [0.5, 0.5, 0],
      [1 / 3, 1 / 3, 1 / 3],
      [0, 0.5, 0.5],
    ]);
    expect(w.degrees).toEqual([2, 3, 2]);
    const candidates = walkMergeCandidates(
      g,
      [0, 1, 2],
      new Map(p.map((row, i) => [i, row])),
      new Map([
        [0, 1],
        [1, 1],
        [2, 1],
      ]),
      w.degrees,
    );
    expect(candidates.map((c) => [c.a, c.b])).toEqual([
      [0, 1],
      [1, 2],
    ]);
    expect(candidates[0].increase).toBeCloseTo(17 / 1296, 12);
    const r = execute(
      "Walktrap",
      walktrap,
      graph(3, [
        [0, 1, 1],
        [1, 2, 1],
      ]),
      { ...options, walkSteps: 1 },
    );
    expect(analysis(r).objective).toBeCloseTo(0, 12);
    expect(new Set(r.state.labels).size).toBe(1);
  });
  it("disconnected and empty-edge graphs preserve actual isolates without fabricated cross-component merges", () => {
    const data = graph(7, [
        [0, 1, 1],
        [1, 2, 1],
        [0, 2, 1],
        [3, 4, 1],
      ]),
      r = execute("Walktrap", walktrap, data);
    expect(analysis(r).dendrogram).toHaveLength(3);
    expect(r.state.labels[5]).not.toBe(r.state.labels[6]);
    const empty = execute("Walktrap", walktrap, graph(4, []));
    expect(empty.state.labels).toEqual([0, 1, 2, 3]);
    expect(analysis(empty).dendrogram).toEqual([]);
    expect(analysis(empty).objective).toBe(0);
    replay(empty);
  });
  it("matrix bytes are checked before n² allocation and invalid walk contracts are explicit errors", () => {
    expect(() => walkTransition(graphFromEdges(2000, []))).toThrow(/메모리/);
    const data = graph(3, [
      [0, 1, 1],
      [1, 2, 1],
    ]);
    for (const walkSteps of [0, -1, 1.5, NaN, Infinity])
      expect(() =>
        execute("Walktrap", walktrap, data, { ...options, walkSteps }),
      ).toThrow();
    expect(() =>
      execute("Walktrap", walktrap, { ...data, directed: true }),
    ).toThrow(/방향/);
    expect(() =>
      execute(
        "Walktrap",
        walktrap,
        graph(3, [
          [0, 0, 1],
          [0, 1, 1],
        ]),
      ),
    ).toThrow(/loop/);
    expect(() =>
      execute("Walktrap", walktrap, graph(3, [[0, 1, -1]])),
    ).toThrow();
  });
  it("all actual events, nonempty 48-step checkpoints and arbitrary backward jumps restore complete matrices/hierarchy", () => {
    const n = 35,
      data = graph(
        n,
        Array.from({ length: n }, (_, i) => [i, (i + 1) % n, 1]),
      ),
      r = execute("Walktrap", walktrap, data);
    expect(r.trace.steps.length).toBeGreaterThan(48);
    expect(r.trace.snapshots.length).toBeGreaterThan(0);
    replay(r);
    const final = structuredClone(r.state);
    for (const i of [1, 15, r.trace.steps.length, 0, 48, 3])
      stateAt(r.trace, i);
    expect(r.state).toEqual(final);
  });
  it("weighted walk distributions/cut survive common extreme scales, while matrix and Ward fields remain immutable", () => {
    const fixture = oracle.walks[0],
      base = execute("Walktrap", walktrap, graph(fixture.n, fixture.rawEdges));
    for (const scale of [1e-250, 1e250]) {
      const r = execute(
        "Walktrap",
        walktrap,
        graph(
          fixture.n,
          fixture.rawEdges.map(([a, b, w]) => [a, b, w * scale]),
        ),
      );
      close(analysis(r).walkProbabilities!, analysis(base).walkProbabilities!);
      partition(r.state.labels, base.state.labels);
      expect(analysis(r).objective).toBeCloseTo(analysis(base).objective, 11);
    }
    const probabilities = structuredClone(analysis(base).walkProbabilities!);
    const before = structuredClone(probabilities),
      r = new Recorder(fixture.n, "Walktrap");
    r.emit("walk", "실제 행렬 불변 복사 검증", {
      analysis: { ...analysis(base), walkProbabilities: probabilities },
    });
    probabilities[0][0] = 987;
    close(analysis(r).walkProbabilities!, before);
  });
});

describe("Clique Percolation complete clique cover", () => {
  it("all cliques and every overlapping community match NetworkX plus exhaustive subsets for273 inputs", () => {
    for (const fixture of oracle.cliqueCases) {
      const data = graph(fixture.n, fixture.edges),
        r = execute("Clique Percolation", cliquepercolation, data, {
          ...options,
          cliqueSize: fixture.k,
        }),
        a = analysis(r);
      expect(a.cliques).toEqual(fixture.cliques);
      expect(a.communities!.map((c) => c.join(",")).sort()).toEqual(
        fixture.communities.map((c) => c.join(",")).sort(),
      );
      expect(a.memberships).toEqual(a.communities);
      expect(a.enumeratedCliques).toBe(fixture.cliques.length);
      expect(a.objectiveName).toBe("목적함수 없음");
      expect(a.objective).toBe(0);
      fixture.cliques.forEach((clique, i) =>
        clique.forEach((v) =>
          expect(a.communities![a.cliqueComponents![i]]).toContain(v),
        ),
      );
      r.state.labels.forEach((label, v) => {
        const ids = a.communities!.flatMap((members, i) =>
          members.includes(v) ? [i] : [],
        );
        expect(label).toBe(ids[0] ?? -1);
      });
      for (const link of a.cliqueLinks!)
        expect(
          a.cliques![link.a].filter((v) => a.cliques![link.b].includes(v)),
        ).toHaveLength(fixture.k - 1);
    }
  });
  it("one shared node keeps two triangle communities, a shared edge percolates, and missing-clique vertices remain unassigned", () => {
    const r = execute(
        "Clique Percolation",
        cliquepercolation,
        graph(6, [
          [0, 1],
          [1, 2],
          [0, 2],
          [2, 3],
          [3, 4],
          [2, 4],
        ]),
      ),
      a = analysis(r);
    expect(a.communities).toEqual([
      [0, 1, 2],
      [2, 3, 4],
    ]);
    expect(a.unassignedCount).toBe(1);
    expect(r.state.labels[5]).toBe(-1);
    expect(a.communities!.filter((c) => c.includes(2))).toHaveLength(2);
    const joined = execute(
      "Clique Percolation",
      cliquepercolation,
      graph(4, [
        [0, 1],
        [1, 2],
        [0, 2],
        [1, 3],
        [2, 3],
      ]),
    );
    expect(analysis(joined).communities).toEqual([[0, 1, 2, 3]]);
    const no = execute(
      "Clique Percolation",
      cliquepercolation,
      graph(4, [
        [0, 1],
        [1, 2],
        [0, 2],
      ]),
      { ...options, cliqueSize: 4 },
    );
    expect(analysis(no).cliques).toEqual([]);
    expect(analysis(no).communities).toEqual([]);
    expect(no.state.labels).toEqual([-1, -1, -1, -1]);
    replay(no);
  });
  it("k2 exactly recovers components with an edge, k>n is a valid empty cover, and large isolated suffixes are never truncated", () => {
    const data = graph(701, [
        [0, 1],
        [1, 2],
        [0, 2],
      ]),
      r = execute("Clique Percolation", cliquepercolation, data, {
        ...options,
        cliqueSize: 2,
      });
    expect(r.state.labels).toHaveLength(701);
    expect(r.state.labels.slice(3).every((x) => x === -1)).toBe(true);
    expect(analysis(r).unassignedCount).toBe(698);
    const hugeK = execute(
      "Clique Percolation",
      cliquepercolation,
      graph(3, [[0, 1]]),
      { ...options, cliqueSize: 100000 },
    );
    expect(analysis(hugeK).cliques).toEqual([]);
  });
  it("invalid weighted/directed/loop/multiedge inputs cannot silently become binary simple graphs", () => {
    for (const edges of [
      [[0, 1, 2]],
      [[0, 1, 0]],
      [[0, 0, 1]],
      [
        [0, 1, 1],
        [1, 0, 1],
      ],
      [[0, 1, -1]],
    ])
      expect(() =>
        execute("Clique Percolation", cliquepercolation, graph(3, edges)),
      ).toThrow();
    expect(() =>
      execute("Clique Percolation", cliquepercolation, {
        ...graph(3, [[0, 1]]),
        directed: true,
      }),
    ).toThrow();
    for (const cliqueSize of [0, 1, 2.5, NaN, Infinity])
      expect(() =>
        execute("Clique Percolation", cliquepercolation, graph(3, [[0, 1]]), {
          ...options,
          cliqueSize,
        }),
      ).toThrow();
  });
  it("actual clique storage budget throws instead of returning an output prefix; a no-clique sparse graph is not rejected by loose exponential bounds", () => {
    const complete = graphFromEdges(
      6,
      Array.from({ length: 6 }, (_, a) =>
        Array.from({ length: a }, (_, b) => ({ a, b })),
      ).flat(),
    );
    expect(enumerateKCliques(complete, 3)).toHaveLength(20);
    expect(() => enumerateKCliques(complete, 3, undefined, 1000)).toThrow(
      /바이트/,
    );
    const sparse = execute(
      "Clique Percolation",
      cliquepercolation,
      graph(
        100,
        Array.from({ length: 99 }, (_, i) => [i, i + 1]),
      ),
      { ...options, cliqueSize: 20 },
    );
    expect(analysis(sparse).cliques).toEqual([]);
  });
  it("real clique generation and face unions restore every event and 48-event checkpoint", () => {
    const n = 7,
      edges = Array.from({ length: n }, (_, a) =>
        Array.from({ length: a }, (_, b) => [a, b]),
      ).flat(),
      r = execute("Clique Percolation", cliquepercolation, graph(n, edges));
    expect(analysis(r).cliques).toHaveLength(35);
    expect(r.trace.steps.filter((s) => s.kind === "clique")).toHaveLength(35);
    expect(r.trace.snapshots.length).toBeGreaterThan(0);
    replay(r);
  });
  it("large combinatorial recording is explicitly summarized while every clique and membership is retained", () => {
    const n = 18,
      edges = Array.from({ length: n }, (_, a) =>
        Array.from({ length: a }, (_, b) => [a, b]),
      ).flat();
    const r = execute("Clique Percolation", cliquepercolation, graph(n, edges)),
      a = analysis(r);
    expect(r.trace.recording!.policy).toContain("요약");
    expect(a.cliques).toHaveLength((18 * 17 * 16) / 6);
    expect(a.communities).toEqual([Array.from({ length: n }, (_, i) => i)]);
    expect(
      r.trace.steps.filter((s) => s.kind === "clique").length,
    ).toBeLessThan(a.cliques!.length);
    expect(a.unassignedCount).toBe(0);
    replay(r);
  });
});

it("both deterministic graph methods ignore seed/display positions and compute all original numeric dimensions before union-kNN", () => {
  const data: Dataset = {
    kind: "numeric",
    values: [0, 3, 1, 4, 2, 5].map((z) => [0, 0, z]),
    display: points(6).map(() => ({ x: 0.5, y: 0.5 })),
  };
  for (const [name, engine] of [
    ["Walktrap", walktrap],
    ["Clique Percolation", cliquepercolation],
  ] as const) {
    const a = execute(name, engine, data),
      b = execute(
        name,
        engine,
        {
          ...data,
          display: points(6).map((_, i) => ({ x: 1e6 * i, y: -1e6 * i })),
        },
        { ...options, seed: 987 },
      );
    expect(a.trace.steps).toEqual(b.trace.steps);
    expect(a.state).toEqual(b.state);
    expect(analysis(a).graphSource).toContain("3차원");
    const expected = communityGraph(points(6), options, data).edges;
    expect(analysis(a).inputEdges).toEqual(expected);
  }
});

it("typed loaders and real graph mini experiments preserve the full native hierarchy or overlapping cover", async () => {
  for (const [name, lesson] of [
    ["Walktrap", walkLesson],
    ["Clique Percolation", cliqueLesson],
  ] as const) {
    const data = lesson.experimentDataset!,
      p = { ...options, ...lesson.experimentParams };
    const result = await runDataset(name, data, p);
    expect(result.kind).toBe("communities");
    expect(result.inputKind).toBe("graph");
    expect(result.computedRows).toBe(
      data.kind === "graph" ? data.nodes.length : 0,
    );
    if (result.output.kind !== "communities")
      throw new Error("missing native community result");
    if (name === "Walktrap") {
      expect(result.output.dendrogram).toHaveLength(2);
      expect(result.output.selectedLevel).toBe(2);
      expect(result.output.objectiveName).toContain("cut");
      expect(result.output.objective).toBeCloseTo(0, 12);
    } else {
      expect(result.output.communities).toEqual([
        [0, 1, 2],
        [2, 3, 4],
      ]);
      expect(result.output.memberships).toEqual(result.output.communities);
      expect(result.labels[5]).toBe(-1);
      expect(result.output.objectiveName).toBe("목적함수 없음");
    }
    expect(lesson.operations.length).toBeGreaterThanOrEqual(4);
    expect(lesson.numerical.steps.length).toBeGreaterThanOrEqual(3);
  }
});

it("typed singleton graphs retain their actual degenerate result and both engines explicitly reject empty direct input", async () => {
  const single = graph(1, []);
  const walk = await runDataset("Walktrap", single, options),
    clique = await runDataset("Clique Percolation", single, options);
  expect(walk.computedRows).toBe(1);
  expect(walk.labels).toEqual([0]);
  expect(clique.computedRows).toBe(1);
  expect(clique.labels).toEqual([-1]);
  if (
    walk.output.kind !== "communities" ||
    clique.output.kind !== "communities"
  )
    throw new Error("native results missing");
  expect(walk.output.dendrogram).toEqual([]);
  expect(clique.output.communities).toEqual([]);
  for (const [name, engine] of [
    ["Walktrap", walktrap],
    ["Clique Percolation", cliquepercolation],
  ] as const)
    expect(() =>
      engine([], options, new Recorder(0, name), graph(0, [])),
    ).toThrow(/비어/);
});

it("records reproducible engine-only sparse graph observations without FPS or speed assertions", () => {
  const observations = [];
  for (const [name, engine] of [
    ["Walktrap", walktrap],
    ["Clique Percolation", cliquepercolation],
  ] as const)
    for (const n of name === "Walktrap"
      ? [100, 300, 1000]
      : [100, 1000, 10000]) {
      const data = graph(
          n,
          Array.from({ length: n - 1 }, (_, i) => [i, i + 1, 1]),
        ),
        p = points(n),
        before = process.memoryUsage().heapUsed,
        start = performance.now();
      try {
        const r = new Recorder(n, name);
        engine(p, options, r, data);
        const milliseconds = performance.now() - start;
        expect(r.state.labels).toHaveLength(n);
        expect(analysis(r).converged).toBe(true);
        observations.push({
          name,
          n,
          status: "complete",
          m: n - 1,
          walkSteps: options.walkSteps,
          cliqueSize: options.cliqueSize,
          milliseconds: Number(milliseconds.toFixed(2)),
          heapDeltaBytes: process.memoryUsage().heapUsed - before,
          events: r.trace.steps.length,
          traceEstimatedBytes: r.trace.recording!.estimatedBytes,
          cliques: analysis(r).cliques?.length,
        });
      } catch (error) {
        if (n !== 1000 || name !== "Walktrap") throw error;
        const message = error instanceof Error ? error.message : String(error);
        expect(message).toMatch(/메모리/);
        observations.push({
          name,
          n,
          m: n - 1,
          status: "explicit-resource-error",
          milliseconds: Number((performance.now() - start).toFixed(2)),
          error: message,
        });
      }
    }
  const denseN = 18,
    denseEdges = Array.from({ length: denseN }, (_, a) =>
      Array.from({ length: a }, (_, b) => [a, b]),
    ).flat(),
    dense = graph(denseN, denseEdges),
    p = points(denseN),
    before = process.memoryUsage().heapUsed,
    start = performance.now(),
    r = new Recorder(denseN, "Clique Percolation");
  cliquepercolation(p, options, r, dense);
  observations.push({
    name: "Clique Percolation",
    n: denseN,
    m: denseEdges.length,
    status: "complete",
    milliseconds: Number((performance.now() - start).toFixed(2)),
    heapDeltaBytes: process.memoryUsage().heapUsed - before,
    events: r.trace.steps.length,
    traceEstimatedBytes: r.trace.recording!.estimatedBytes,
    cliques: analysis(r).cliques!.length,
  });
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/graph-followup-performance.json",
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        observations,
        note: "Single engine-only observation. Graph generation, Worker transfer, rendering excluded. Heap delta is not peak. Full-scan exact Walktrap, complete CPM.",
      },
      null,
      2,
    ),
  );
});
