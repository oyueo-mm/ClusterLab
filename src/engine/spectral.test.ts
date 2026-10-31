import { describe, expect, it } from "vitest";
import {
  spectral,
  similarityGraph,
  laplacianMatrix,
  graphAdjacency,
} from "./algorithms/spectral";
import { symmetricEigen } from "./linalg";
import { defaults, type Params, type Point } from "./types";
import type { Dataset, GraphDataset } from "./dataset";
import { displayPoints } from "./dataset";
import { Recorder, applyStep, stateAt } from "./trace";
import reference from "./fixtures/spectral-reference.json";

const partition = (labels: number[]) =>
  labels.map((l) => labels.map((q) => q === l));
function compute(
  data: Dataset,
  options: Partial<Params> = {},
  points = displayPoints(data),
) {
  const r = new Recorder(points.length, "Spectral Clustering");
  spectral(
    points,
    { ...defaults, iterations: 100, k: 2, gamma: 3, neighbors: 2, ...options },
    r,
    data,
  );
  return r.trace;
}
describe("symmetric Jacobi numerical eigensolver", () => {
  it("hand-calculated path spectrum, eigen residuals and orthonormality", () => {
    const matrix = [
      [1, -1, 0],
      [-1, 2, -1],
      [0, -1, 1],
    ];
    const e = symmetricEigen(matrix);
    e.values.forEach((v, i) => expect(v).toBeCloseTo([0, 1, 3][i], 9));
    expect(e.residual).toBeLessThan(1e-10);
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++)
        expect(
          e.vectors.reduce((s, row) => s + row[j] * row[k], 0),
        ).toBeCloseTo(j === k ? 1 : 0, 10);
  });
  it("handles repeated eigenvalues without assuming a unique basis and fails honestly", () => {
    const e = symmetricEigen([
      [2, 0, 0],
      [0, 2, 0],
      [0, 0, 3],
    ]);
    expect(e.values).toEqual([2, 2, 3]);
    expect(
      e.vectors.map((row) => row.slice(0, 2).reduce((s, x) => s + x * x, 0)),
    ).toEqual([1, 1, 0]);
    expect(() =>
      symmetricEigen([
        [1, 2],
        [3, 1],
      ]),
    ).toThrow(/대칭/);
    expect(() => symmetricEigen([[NaN]])).toThrow(/유한/);
    expect(() =>
      symmetricEigen(
        [
          [2, -1, 0.3],
          [-1, 3, 2],
          [0.3, 2, 4],
        ],
        1e-15,
        1,
      ),
    ).toThrow(/수렴 실패/);
  });
  it("preserves eigenvectors of uniformly tiny and huge matrices", () => {
    const matrix = [
      [1, -1, 0],
      [-1, 2, -1],
      [0, -1, 1],
    ];
    for (const scale of [1e-120, 1e150]) {
      const e = symmetricEigen(matrix.map((row) => row.map((x) => x * scale)));
      e.values.forEach((value, i) =>
        expect(value / scale).toBeCloseTo([0, 1, 3][i], 8),
      );
      expect(Math.abs(e.vectors[1][0])).toBeCloseTo(1 / Math.sqrt(3), 8);
    }
    expect(() =>
      symmetricEigen([
        [1e-120, 1e-120],
        [0, 1e-120],
      ]),
    ).toThrow(/대칭/);
  });
});

describe("Spectral versus independent NumPy and sklearn references", () => {
  for (const fixture of reference.cases)
    it(fixture.name, () => {
      const data: Dataset = fixture.values
        ? { kind: "numeric", values: fixture.values }
        : {
            kind: "graph",
            directed: false,
            nodes: Array.from({ length: fixture.nodes! }, (_, i) => ({
              id: String(i),
            })),
            edges: fixture.edges!.map(([a, b, weight]) => ({
              source: String(a),
              target: String(b),
              weight,
            })),
          };
      const trace = compute(data, {
        k: fixture.k,
        affinity: fixture.affinity ?? "rbf",
        gamma: fixture.gamma ?? 3,
        neighbors: fixture.neighbors ?? 2,
        laplacian: fixture.normalized ? "normalized" : "unnormalized",
      });
      const final = stateAt(trace, trace.steps.length),
        state = final.analysis;
      expect(state?.kind).toBe("spectral");
      if (state?.kind !== "spectral") throw new Error("analysis missing");
      state.adjacency!.forEach((row, i) =>
        row.forEach((x, j) =>
          expect(x).toBeCloseTo(fixture.adjacency[i][j], 12),
        ),
      );
      state.laplacian!.forEach((row, i) =>
        row.forEach((x, j) =>
          expect(x).toBeCloseTo(fixture.laplacian[i][j], 11),
        ),
      );
      state.eigenvalues!.forEach((x, i) =>
        expect(x).toBeCloseTo(fixture.eigenvalues[i], 8),
      );
      const u = state.eigenvectors!;
      u.forEach((row, i) =>
        u.forEach((other, j) =>
          expect(row.reduce((s, x, k) => s + x * other[k], 0)).toBeCloseTo(
            fixture.projector[i][j],
            7,
          ),
        ),
      );
      const z = state.embedding!;
      z.forEach((row, i) =>
        z.forEach((other, j) =>
          expect(
            row.reduce((s, x, k) => s + (x - other[k]) ** 2, 0),
          ).toBeCloseTo(fixture.embeddingDistances[i][j], 6),
        ),
      );
      expect(partition(final.labels)).toEqual(partition(fixture.labels));
      if (fixture.sklearnSpectralLabels)
        expect(partition(final.labels)).toEqual(
          partition(fixture.sklearnSpectralLabels),
        );
      expect(state.residual!).toBeLessThan(1e-9);
      expect(trace.steps.map((step) => step.kind)).toEqual(
        expect.arrayContaining([
          "graph",
          "laplacian",
          "eigen",
          "embedding",
          "assign",
          "move",
          "finish",
        ]),
      );
      let s = trace.initial;
      trace.steps.forEach((step, i) => {
        s = applyStep(s, step);
        expect(s).toEqual(stateAt(trace, i + 1));
      });
      [...trace.steps].reverse().forEach((step) => {
        s = applyStep(s, step, true);
      });
      expect(s).toEqual(trace.initial);
    });
});

it("computes all original numeric dimensions and ignores display coordinates", () => {
  const values = [0, 0.1, 0.2, 0.3, 2, 2.1, 2.2, 2.3].map((z) => [0, 0, z]);
  const data: Dataset = { kind: "numeric", values };
  const a = compute(data),
    b = compute(
      data,
      {},
      values.map((_, i) => ({ x: i * 100, y: -i * 7 })),
    );
  const end = stateAt(a, a.steps.length),
    endB = stateAt(b, b.steps.length);
  expect(end.labels).toEqual(endB.labels);
  expect(end.analysis).toEqual(endB.analysis);
  expect(end.labels[0]).toBe(end.labels[3]);
  expect(end.labels[0]).not.toBe(end.labels[4]);
  expect(a.steps).toEqual(compute(data).steps);
});
it("explicit disconnected, isolated, graph input and degenerate coordinate policies", () => {
  const input: GraphDataset = {
    kind: "graph",
    directed: false,
    nodes: ["a", "b", "c"].map((id) => ({ id })),
    edges: [{ source: "a", target: "b", weight: 2 }],
  };
  expect(() => compute(input, { k: 1 })).toThrow(/연결 성분/);
  const t = compute(input),
    end = stateAt(t, t.steps.length);
  expect(end.labels[0]).toBe(end.labels[1]);
  expect(end.labels[0]).not.toBe(end.labels[2]);
  expect(() => graphAdjacency({ ...input, directed: true })).toThrow(/무방향/);
  expect(() =>
    graphAdjacency({
      ...input,
      edges: [{ source: "a", target: "b", weight: -1 }],
    }),
  ).toThrow(/가중치/);
  const points: Point[] = Array.from({ length: 4 }, () => ({ x: 0, y: 0 }));
  const r = new Recorder(4, "Spectral Clustering");
  spectral(points, { ...defaults, k: 2 }, r);
  expect(r.state.labels.every((l) => l >= 0)).toBe(true);
  expect(() => similarityGraph([[0, 0], [1]], "rbf", 1, 1)).toThrow(/차원/);
  const l = laplacianMatrix(
    [
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, 0],
    ],
    true,
  );
  expect(l.laplacian[2]).toEqual([0, 0, 0]);
  const excessive = Array.from({ length: 2000 }, () => ({ x: 0, y: 0 }));
  expect(() =>
    spectral(
      excessive,
      defaults,
      new Recorder(excessive.length, "Spectral Clustering"),
    ),
  ).toThrow(/메모리 예산/);
});
it("records genuine K-dimensional centers and final SSE even at iteration limit", () => {
  const data: Dataset = {
    kind: "numeric",
    values: [0, 0.1, 0.4, 0.6, 0.8, 1, 1.3, 1.7].map((x) => [
      x,
      x * x,
      Math.sin(x),
    ]),
  };
  const t = compute(data, { iterations: 1, gamma: 1, k: 3 });
  const s = stateAt(t, t.steps.length);
  if (s.analysis?.kind !== "spectral") throw new Error("analysis missing");
  const a = s.analysis;
  expect(a.embeddingCenters).toHaveLength(3);
  expect(a.embeddingCenters!.every((row) => row.length === 3)).toBe(true);
  let cost = 0;
  a.embedding!.forEach((row, i) => {
    const ds = a.embeddingCenters!.map((c) =>
      row.reduce((sum, x, j) => sum + (x - c[j]) ** 2, 0),
    );
    expect(ds[s.labels[i]]).toBeCloseTo(Math.min(...ds), 12);
    cost += ds[s.labels[i]];
  });
  expect(s.metric.at(-1)).toBeCloseTo(cost, 12);
  const init = t.steps.find((step) => step.kind === "initialize");
  expect(init).toBeDefined();
});
