import { describe, expect, it } from "vitest";
import { runDataset, prepareDataset, nativeResult } from "./datasetExecution";
import { algorithmDefaults, type Algorithm, type Trace } from "./types";
import type {
  ConstrainedDataset,
  GraphDataset,
  NumericDataset,
} from "./dataset";
import { applyStep, stateAt } from "./trace";
import { registry, structuredAlgorithms } from "./registry";
import graphReference from "./fixtures/graph-followup-reference.json";

const options = (method: Algorithm, change = {}) => ({
  ...algorithmDefaults(method),
  iterations: 40,
  tolerance: 1e-10,
  seed: 42,
  ...change,
});
const display = (n: number, shifted = false) =>
  Array.from({ length: n }, (_, i) => ({
    x: shifted ? i * 13 - 100 : 0.4,
    y: shifted ? 70 - i * 19 : 0.4,
  }));
const numeric = (values: number[][], shifted = false): NumericDataset => ({
  kind: "numeric",
  values,
  display: display(values.length, shifted),
});
const graph = (
  n: number,
  edges: number[][],
  shifted = false,
): GraphDataset => ({
  kind: "graph",
  directed: false,
  nodes: display(n, shifted).map((position, i) => ({ id: `v${i}`, position })),
  edges: edges.map(([a, b, weight = 1]) => ({
    source: `v${a}`,
    target: `v${b}`,
    weight,
  })),
});
const canonicalTrace = (trace: Trace) => ({ ...trace, elapsed: 0 });
function assertReplay(trace: Trace) {
  let state = trace.initial;
  trace.steps.forEach((step, i) => {
    state = applyStep(state, step);
    expect(state).toEqual(stateAt(trace, i + 1));
  });
  expect(nativeResult(state)).toEqual(
    nativeResult(stateAt(trace, trace.steps.length)),
  );
  for (let i = trace.steps.length - 1; i >= 0; i--) {
    state = applyStep(state, trace.steps[i], true);
    expect(state).toEqual(stateAt(trace, i));
  }
  expect(state).toEqual(trace.initial);
  for (const checkpoint of trace.snapshots)
    expect(stateAt(trace, checkpoint.index)).toEqual(checkpoint.state);
}
const logFactorial = (x: number) => {
  let result = 0;
  for (let i = 2; i <= x; i++) result += Math.log(i);
  return result;
};
// Deliberately small-data independent PMFs: direct factorial sums, no engine helper.
function logMass(method: string, row: number[], parameter: number[]) {
  if (method === "Bernoulli Mixture")
    return row.reduce(
      (s, x, j) =>
        s + (x === 1 ? Math.log(parameter[j]) : Math.log1p(-parameter[j])),
      0,
    );
  if (method === "Poisson Mixture")
    return row.reduce(
      (s, x, j) =>
        s +
        (x === 0
          ? -parameter[j]
          : x * Math.log(parameter[j]) - parameter[j] - logFactorial(x)),
      0,
    );
  const m = row.reduce((s, x) => s + x, 0);
  return (
    logFactorial(m) +
    row.reduce(
      (s, x, j) =>
        s - logFactorial(x) + (x === 0 ? 0 : x * Math.log(parameter[j])),
      0,
    )
  );
}
function modularity(data: GraphDataset, labels: number[]) {
  const ids = new Map(data.nodes.map((node, i) => [node.id, i])),
    degrees = Array(data.nodes.length).fill(0) as number[];
  let mass = 0,
    internal = 0;
  for (const edge of data.edges) {
    const a = ids.get(edge.source)!,
      b = ids.get(edge.target)!;
    mass += edge.weight;
    degrees[a] += edge.weight;
    degrees[b] += edge.weight;
    if (labels[a] === labels[b]) internal += edge.weight;
  }
  const totals = new Map<number, number>();
  labels.forEach((c, i) => totals.set(c, (totals.get(c) ?? 0) + degrees[i]));
  return (
    internal / mass -
    [...totals.values()].reduce(
      (s, degree) => s + (degree / (2 * mass)) ** 2,
      0,
    )
  );
}

describe("dynamic typed-input execution and native mathematical results", () => {
  it("COP preserves hard closure, actual third-axis means/SSE, display independence and singleton input through the public API", async () => {
    expect(new Set(structuredAlgorithms).size).toBe(
      structuredAlgorithms.length,
    );
    const values = [
        [0, 0, 0],
        [0, 0, 0.2],
        [0, 0, 8],
        [0, 0, 8.2],
      ],
      data: ConstrainedDataset = {
        kind: "constrained",
        data: numeric(values),
        mustLink: [
          [0, 1],
          [2, 3],
        ],
        cannotLink: [[1, 2]],
      },
      p = options("COP-KMeans", { k: 2 });
    const prepared = prepareDataset("COP-KMeans", data, p);
    expect(prepared.points).toHaveLength(4);
    expect(prepared.estimate.inputTruncation).toBe(false);
    const result = await runDataset("COP-KMeans", data, p);
    expect(result.inputKind).toBe("constrained");
    expect(result.computedRows).toBe(4);
    expect(result.sourceDimensions).toBe(3);
    if (result.output.kind !== "constrained-partition")
      throw new Error("Missing native constrained partition");
    const a = result.output;
    expect(result.kind).toBe(a.kind);
    expect(a.labels[0]).toBe(a.labels[1]);
    expect(a.labels[2]).toBe(a.labels[3]);
    expect(a.labels[1]).not.toBe(a.labels[2]);
    expect(a.componentIds[0]).toBe(a.componentIds[1]);
    expect(a.componentIds[2]).toBe(a.componentIds[3]);
    expect(a.componentCannotLink).toHaveLength(1);
    expect(a.centroids.map((row) => row[2]).sort((x, y) => x - y)).toEqual([
      expect.closeTo(0.1, 13),
      expect.closeTo(8.1, 13),
    ]);
    expect(
      a.centroids.every(
        (row) => row.length === 3 && row[0] === 0 && row[1] === 0,
      ),
    ).toBe(true);
    const sse = values.reduce(
      (sum, row, i) =>
        sum +
        row.reduce((s, v, j) => s + (v - a.centroids[a.labels[i]][j]) ** 2, 0),
      0,
    );
    expect(a.objective).toBeCloseTo(0.04, 12);
    expect(a.objective).toBeCloseTo(sse, 12);
    const projected = await runDataset(
      "COP-KMeans",
      { ...data, data: numeric(values, true) },
      p,
    );
    expect(projected.output).toEqual(a);
    expect(canonicalTrace(projected.trace)).toEqual(
      canonicalTrace(result.trace),
    );
    assertReplay(result.trace);
    const single = await runDataset(
      "COP-KMeans",
      {
        kind: "constrained",
        data: numeric([[4, -3, 12]]),
        mustLink: [],
        cannotLink: [],
      },
      options("COP-KMeans", { k: 1 }),
    );
    expect(single.computedRows).toBe(1);
    if (single.output.kind !== "constrained-partition")
      throw new Error("Missing singleton constrained result");
    expect(single.output.centroids).toEqual([[4, -3, 12]]);
    expect(single.output.objective).toBe(0);
    expect(single.output.activeK).toBe(1);
  });

  it("adding a real Cannot-Link changes a nearby assignment instead of merely decorating the same labels", async () => {
    const data: ConstrainedDataset = {
        kind: "constrained",
        data: numeric([
          [0, 0, 0],
          [0, 0, 0.1],
          [0, 0, 6],
          [0, 0, 6.1],
        ]),
        mustLink: [],
        cannotLink: [],
      },
      p = options("COP-KMeans", { k: 2 });
    const before = await runDataset("COP-KMeans", data, p),
      after = await runDataset(
        "COP-KMeans",
        { ...data, cannotLink: [[0, 1]] },
        p,
      );
    expect(before.labels[0]).toBe(before.labels[1]);
    expect(after.labels[0]).not.toBe(after.labels[1]);
    if (
      before.output.kind !== "constrained-partition" ||
      after.output.kind !== "constrained-partition"
    )
      throw new Error("Missing native constrained result");
    expect(after.output.objective).toBeGreaterThan(before.output.objective);
    expect(
      after.trace.steps.some(
        (step) =>
          step.kind === "test" &&
          stateAt(after.trace, after.trace.steps.indexOf(step) + 1).analysis
            ?.kind === "constraints",
      ),
    ).toBe(true);
    assertReplay(after.trace);
  });

  it("native Bernoulli boundary MLE and Poisson K1 means use every original feature with exact PMF normalization", async () => {
    const bits = await runDataset(
      "Bernoulli Mixture",
      numeric([
        [1, 0, 1, 0],
        [1, 0, 1, 0],
        [1, 0, 1, 0],
      ]),
      options("Bernoulli Mixture", { k: 2 }),
    );
    expect(bits.kind).toBe("mixture");
    expect(bits.sourceDimensions).toBe(4);
    if (bits.output.kind !== "mixture")
      throw new Error("Missing actual mixture output");
    expect(bits.output.parameters).toEqual([
      [1, 0, 1, 0],
      [1, 0, 1, 0],
    ]);
    expect(bits.output.logLikelihood).toBeCloseTo(0, 12);
    expect(bits.output.responsibilities).toHaveLength(3);
    bits.output.responsibilities.forEach((row) => {
      expect(row).toHaveLength(2);
      expect(row.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 13);
    });
    const values = [
        [0, 1, 2, 4, 0],
        [2, 3, 4, 0, 0],
        [4, 5, 0, 2, 0],
      ],
      p = options("Poisson Mixture", { k: 1 });
    const result = await runDataset("Poisson Mixture", numeric(values), p);
    if (result.output.kind !== "mixture")
      throw new Error("Missing native rate output");
    expect(result.computedRows).toBe(3);
    expect(result.sourceDimensions).toBe(5);
    expect(result.output.parameters).toEqual([[2, 3, 2, 2, 0]]);
    expect(result.output.weights).toEqual([1]);
    expect(result.output.responsibilities).toEqual([[1], [1], [1]]);
    const ll = values.reduce(
      (s, row) => s + logMass("Poisson Mixture", row, [2, 3, 2, 2, 0]),
      0,
    );
    expect(result.output.logLikelihood).toBeCloseTo(ll, 11);
    const changed = values.map((row, i) =>
      i === 0 ? row.map((v, j) => (j === 3 ? 16 : v)) : [...row],
    );
    const edited = await runDataset("Poisson Mixture", numeric(changed), p);
    if (edited.output.kind !== "mixture")
      throw new Error("Missing edited native rate output");
    expect(edited.output.parameters).toEqual([[2, 3, 2, 6, 0]]);
    expect(edited.output.logLikelihood).not.toBe(result.output.logLikelihood);
    assertReplay(result.trace);
  });

  it("Multinomial native profiles use weighted raw trials and factorial coefficients, including a zero-trial row", async () => {
    const values = [
        [2, 1, 0],
        [0, 3, 1],
        [1, 0, 2],
        [0, 0, 0],
      ],
      result = await runDataset(
        "Multinomial Mixture",
        numeric(values),
        options("Multinomial Mixture", { k: 1 }),
      );
    if (result.output.kind !== "mixture")
      throw new Error("Missing native count-profile output");
    expect(result.kind).toBe("mixture");
    expect(result.sourceDimensions).toBe(3);
    expect(result.output.parameters[0]).toEqual([
      expect.closeTo(0.3, 13),
      expect.closeTo(0.4, 13),
      expect.closeTo(0.3, 13),
    ]);
    expect(result.output.responsibilities).toEqual([[1], [1], [1], [1]]);
    const expected = values.reduce(
      (s, row) => s + logMass("Multinomial Mixture", row, [0.3, 0.4, 0.3]),
      0,
    );
    const withoutCoefficient = values.reduce(
      (s, row) =>
        s +
        row.reduce(
          (sum, x, j) => sum + (x ? x * Math.log([0.3, 0.4, 0.3][j]) : 0),
          0,
        ),
      0,
    );
    expect(result.output.logLikelihood).toBeCloseTo(expected, 11);
    expect(result.output.logLikelihood).not.toBeCloseTo(withoutCoefficient, 5);
    expect(result.output.parameters[0][0]).not.toBeCloseTo(0.25, 5); // mean normalized rows is a different estimator
    const single = await runDataset(
      "Multinomial Mixture",
      numeric([[3, 2, 1]]),
      options("Multinomial Mixture", { k: 1 }),
    );
    expect(single.computedRows).toBe(1);
    assertReplay(result.trace);
  });

  it("all three dynamic native mixture APIs preserve n×K Bayes posteriors, seed, replay and arbitrary display invariance on new raw variants", async () => {
    const cases = [
      [
        "Bernoulli Mixture",
        [
          [1, 1, 0, 0],
          [1, 1, 1, 0],
          [1, 0, 0, 0],
          [0, 0, 1, 1],
          [0, 1, 1, 1],
          [0, 0, 1, 0],
        ],
      ],
      [
        "Poisson Mixture",
        [
          [0, 2, 1],
          [2, 1, 0],
          [4, 7, 8],
          [8, 6, 9],
          [3, 3, 5],
        ],
      ],
      [
        "Multinomial Mixture",
        [
          [5, 1, 0, 2],
          [0, 4, 3, 1],
          [2, 0, 1, 4],
          [0, 0, 0, 0],
          [1, 1, 2, 1],
        ],
      ],
    ] as const;
    for (const [method, raw] of cases) {
      const values = raw.map((row) => [...row]),
        p = options(method, { k: 2, iterations: 1, tolerance: 0 });
      const result = await runDataset(method, numeric(values), p),
        projected = await runDataset(method, numeric(values, true), p);
      if (result.output.kind !== "mixture")
        throw new Error("Missing native posterior");
      expect(result.computedRows).toBe(values.length);
      expect(result.output.responsibilities).toHaveLength(values.length);
      expect(result.output.converged).toBe(false);
      let ll = 0;
      for (let i = 0; i < values.length; i++) {
        const masses = result.output.parameters.map((parameter, c) =>
            result.output.kind === "mixture"
              ? result.output.weights[c] *
                Math.exp(logMass(method, values[i], parameter))
              : NaN,
          ),
          total = masses.reduce((s, v) => s + v, 0);
        ll += Math.log(total);
        expect(result.output.responsibilities[i]).toEqual(
          masses.map((m) => expect.closeTo(m / total, 11)),
        );
        expect(
          result.output.responsibilities[i].every((v) => v > 0 && v < 1),
        ).toBe(true);
      }
      expect(result.output.logLikelihood).toBeCloseTo(ll, 10);
      expect(projected.output).toEqual(result.output);
      expect(canonicalTrace(projected.trace)).toEqual(
        canonicalTrace(result.trace),
      );
      expect(
        nativeResult(stateAt(result.trace, result.trace.steps.length)),
      ).toEqual(result.output);
      assertReplay(result.trace);
    }
    const slow = Array.from({ length: 80 }, (_, i) =>
      Array.from({ length: 6 }, (_, j) =>
        (i * (j + 5) + j * j) % 11 < 5 ? 1 : 0,
      ),
    );
    const checkpointed = await runDataset(
      "Bernoulli Mixture",
      numeric(slow),
      options("Bernoulli Mixture", { k: 3, iterations: 90, tolerance: 0 }),
    );
    expect(checkpointed.trace.snapshots.length).toBeGreaterThan(0);
    assertReplay(checkpointed.trace);
  });

  it("weighted Walktrap dynamic API preserves independent original-graph Q, Ward hierarchy and n×n walk powers", async () => {
    const fixture = graphReference.walks[0],
      data = graph(fixture.n, fixture.rawEdges),
      p = options("Walktrap", { walkSteps: fixture.steps });
    const result = await runDataset("Walktrap", data, p),
      projected = await runDataset(
        "Walktrap",
        graph(fixture.n, fixture.rawEdges, true),
        p,
      );
    if (result.output.kind !== "communities")
      throw new Error("Missing native hierarchy");
    expect(result.output).toHaveProperty("dendrogram");
    expect(result.output).toHaveProperty("selectedLevel");
    expect(result.output).not.toHaveProperty("communities");
    expect(result.computedRows).toBe(fixture.n);
    expect(result.output.objective).toBeCloseTo(fixture.igraphQ, 11);
    expect(result.output.objective).toBeCloseTo(
      modularity(data, result.labels),
      11,
    );
    result.labels.forEach((c, i) =>
      result.labels.forEach((other, j) =>
        expect(c === other).toBe(
          fixture.igraphLabels[i] === fixture.igraphLabels[j],
        ),
      ),
    );
    const final = stateAt(result.trace, result.trace.steps.length).analysis;
    if (final?.kind !== "community")
      throw new Error("Missing actual Walktrap analysis");
    expect(final.walkProbabilities).toEqual(
      fixture.powers
        .at(-1)!
        .map((row) => row.map((v) => expect.closeTo(v, 11))),
    );
    const qs = result.output.levels.map((labels) => modularity(data, labels));
    expect(result.output.objective).toBeCloseTo(Math.max(...qs), 11);
    expect(qs[result.output.selectedLevel!]).toBeCloseTo(
      result.output.objective,
      11,
    );
    const firstTest = result.trace.steps.findIndex(
        (step) => step.kind === "test",
      ),
      testState = stateAt(result.trace, firstTest + 1).analysis;
    if (testState?.kind !== "community")
      throw new Error("Missing actual Ward candidate decision");
    for (const candidate of testState.walkMergeCandidates!) {
      const a = 2 ** candidate.a,
        b = 2 ** candidate.b,
        expected = (
          fixture.subsetCandidates as unknown as Record<
            string,
            { distance: number; increase: number }
          >
        )[`${Math.min(a, b)}|${Math.max(a, b)}`];
      expect(candidate.increase).toBeCloseTo(expected.increase, 11);
      expect(candidate.distance).toBeCloseTo(expected.distance, 11);
    }
    expect(projected.output).toEqual(result.output);
    expect(canonicalTrace(projected.trace)).toEqual(
      canonicalTrace(result.trace),
    );
    assertReplay(result.trace);
    const edited = structuredClone(data);
    edited.edges.find((e) => e.source === "v2" && e.target === "v3")!.weight =
      9;
    const changed = await runDataset("Walktrap", edited, p),
      changedState = stateAt(
        changed.trace,
        changed.trace.steps.length,
      ).analysis;
    if (
      changedState?.kind !== "community" ||
      changed.output.kind !== "communities"
    )
      throw new Error("Missing edited Walktrap result");
    expect(changedState.walkProbabilities).not.toEqual(final.walkProbabilities);
    expect(changed.output.objective).toBeCloseTo(
      modularity(edited, changed.labels),
      11,
    );
  });

  it("native CPM preserves overlapping communities and isolated-node nonmembership, without inventing a noise objective", async () => {
    const edges = [
        [0, 1],
        [1, 2],
        [0, 2],
        [2, 3],
        [3, 4],
        [2, 4],
      ],
      data = graph(6, edges),
      p = options("Clique Percolation", { cliqueSize: 3 });
    const result = await runDataset("Clique Percolation", data, p),
      projected = await runDataset(
        "Clique Percolation",
        graph(6, edges, true),
        p,
      );
    if (result.output.kind !== "communities")
      throw new Error("Missing native overlap");
    expect(result.output.communities).toEqual([
      [0, 1, 2],
      [2, 3, 4],
    ]);
    expect(result.output.memberships).toEqual(result.output.communities);
    expect(
      result.output.memberships!.filter((members) => members.includes(2)),
    ).toHaveLength(2);
    expect(
      result.output.memberships!.some((members) => members.includes(5)),
    ).toBe(false);
    expect(result.labels).toHaveLength(6);
    expect(result.labels[5]).toBe(-1);
    expect(result.output.objectiveName).toBe("목적함수 없음");
    expect(result.output).not.toHaveProperty("dendrogram");
    expect(result.output).not.toHaveProperty("selectedLevel");
    expect(registry["Clique Percolation"].capabilities.noiseLabels).toBe(false);
    expect(projected.output).toEqual(result.output);
    expect(canonicalTrace(projected.trace)).toEqual(
      canonicalTrace(result.trace),
    );
    assertReplay(result.trace);
    const largerClique = await runDataset("Clique Percolation", data, {
      ...p,
      cliqueSize: 4,
    });
    if (largerClique.output.kind !== "communities")
      throw new Error("Missing legitimate empty clique result");
    expect(largerClique.output.communities).toEqual([]);
    expect(largerClique.labels).toEqual(Array(6).fill(-1));
  });

  it("public preflight rejects actual Walktrap dense bytes while the same 2048-node empty sparse graph is fully processed by CPM", async () => {
    const data = graph(2048, []);
    expect(() => prepareDataset("Walktrap", data, options("Walktrap"))).toThrow(
      /메모리/,
    );
    const prepared = prepareDataset(
      "Clique Percolation",
      data,
      options("Clique Percolation", { cliqueSize: 3 }),
    );
    expect(prepared.points).toHaveLength(2048);
    expect(prepared.estimate.inputTruncation).toBe(false);
    const result = await runDataset(
      "Clique Percolation",
      data,
      options("Clique Percolation", { cliqueSize: 3 }),
    );
    expect(result.computedRows).toBe(2048);
    expect(result.labels).toEqual(Array(2048).fill(-1));
    expect(result.trace.steps.at(-1)?.kind).toBe("finish");
    if (result.output.kind !== "communities")
      throw new Error("Missing full sparse graph result");
    expect(result.output.communities).toEqual([]);
    const a = stateAt(result.trace, result.trace.steps.length).analysis;
    if (a?.kind !== "community") throw new Error("Missing full CPM state");
    expect(a.enumeratedCliques).toBe(0);
    expect(a.unassignedCount).toBe(2048);
  });

  it("typed APIs explicitly reject incompatible inputs, contradictory constraints and unsupported graph/distribution domains", async () => {
    const category = { kind: "categorical", values: [["a"], ["b"]] } as const;
    for (const method of [
      "Bernoulli Mixture",
      "Poisson Mixture",
      "Multinomial Mixture",
      "Walktrap",
      "Clique Percolation",
    ] as const)
      await expect(
        runDataset(
          method,
          {
            kind: category.kind,
            values: category.values.map((row) => [...row]),
          },
          options(method),
        ),
      ).rejects.toThrow(/지원/);
    await expect(
      runDataset("COP-KMeans", numeric([[0], [1]]), options("COP-KMeans")),
    ).rejects.toThrow(/지원/);
    for (const [method, values] of [
      ["Bernoulli Mixture", [[0, 0.5]]],
      ["Poisson Mixture", [[1, -2]]],
      ["Multinomial Mixture", [[2, 0.25]]],
    ] as const)
      await expect(
        runDataset(
          method,
          numeric(values.map((row) => [...row])),
          options(method, { k: 1 }),
        ),
      ).rejects.toThrow(/이진|정수|0\/1/);
    const constrained: ConstrainedDataset = {
      kind: "constrained",
      data: numeric([[0], [1], [2]]),
      mustLink: [
        [0, 1],
        [1, 2],
      ],
      cannotLink: [[0, 2]],
    };
    await expect(
      runDataset("COP-KMeans", constrained, options("COP-KMeans", { k: 2 })),
    ).rejects.toThrow(/모순/);
    const simple = graph(3, [
      [0, 1],
      [1, 2],
      [0, 2],
    ]);
    await expect(
      runDataset(
        "Walktrap",
        { ...simple, directed: true },
        options("Walktrap"),
      ),
    ).rejects.toThrow(/무방향|방향/);
    await expect(
      runDataset("Walktrap", graph(2, [[0, 0, 1]]), options("Walktrap")),
    ).rejects.toThrow(/loop/);
    await expect(
      runDataset(
        "Clique Percolation",
        graph(3, [
          [0, 1, 0.5],
          [1, 2],
          [0, 2],
        ]),
        options("Clique Percolation"),
      ),
    ).rejects.toThrow(/단위|가중치/);
  });
});
