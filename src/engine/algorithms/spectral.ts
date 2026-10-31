import type { Point, Params, AlgorithmAnalysis } from "../types";
import type { Dataset, GraphDataset } from "../dataset";
import { numericRows } from "../dataset";
import type { Recorder } from "../trace";
import { random } from "../math";
import { symmetricEigen } from "../linalg";
import { DEFAULT_WORKING_BYTES } from "../resources";

const squaredDistance = (a: number[], b: number[]) => {
  let s = 0;
  for (let j = 0; j < a.length; j++) s += (a[j] - b[j]) ** 2;
  if (!Number.isFinite(s))
    throw new Error("수치 불안정: 원본 특성의 거리 제곱이 유한하지 않습니다.");
  return s;
};

export function graphAdjacency(input: GraphDataset): number[][] {
  if (input.directed)
    throw new Error("Spectral은 현재 무방향 그래프만 지원합니다.");
  const ids = new Map(input.nodes.map((node, i) => [node.id, i]));
  if (ids.size !== input.nodes.length)
    throw new Error("그래프 노드 ID는 고유해야 합니다.");
  const w = input.nodes.map(() => Array(input.nodes.length).fill(0));
  for (const edge of input.edges) {
    const i = ids.get(edge.source),
      j = ids.get(edge.target);
    if (i === undefined || j === undefined)
      throw new Error("간선이 존재하지 않는 노드를 참조합니다.");
    if (i === j)
      throw new Error("현재 Spectral 입력은 자기 루프를 지원하지 않습니다.");
    if (!Number.isFinite(edge.weight) || edge.weight < 0)
      throw new Error("간선 가중치는 0 이상의 유한한 수여야 합니다.");
    w[i][j] += edge.weight;
    w[j][i] += edge.weight;
    if (!Number.isFinite(w[i][j]))
      throw new Error("수치 불안정: 간선 가중치 합이 유한하지 않습니다.");
  }
  return w;
}

export function similarityGraph(
  rows: number[][],
  affinity: string,
  gamma: number,
  neighbors: number,
): number[][] {
  const n = rows.length,
    d = rows[0]?.length ?? 0;
  if (
    !d ||
    rows.some((row) => row.length !== d || row.some((x) => !Number.isFinite(x)))
  )
    throw new Error("수치형 원본 특성의 차원과 유한성을 확인하세요.");
  if (!Number.isFinite(gamma) || gamma <= 0)
    throw new Error("RBF gamma는 0보다 커야 합니다.");
  if (affinity !== "rbf" && affinity !== "knn")
    throw new Error("유사도는 rbf 또는 knn이어야 합니다.");
  if (!Number.isSafeInteger(neighbors) || neighbors < 1)
    throw new Error("kNN 이웃 수는 양의 정수여야 합니다.");
  const w = rows.map(() => Array(n).fill(0));
  if (affinity === "rbf") {
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        w[i][j] = w[j][i] = Math.exp(
          -gamma * squaredDistance(rows[i], rows[j]),
        );
  } else {
    const count = Math.min(neighbors, n - 1);
    for (let i = 0; i < n; i++) {
      const ranked = rows
        .map((row, j) => ({
          j,
          d: i === j ? Infinity : squaredDistance(rows[i], row),
        }))
        .sort((a, b) => a.d - b.d || a.j - b.j);
      for (let q = 0; q < count; q++) {
        const j = ranked[q].j;
        w[i][j] = w[j][i] = 1;
      }
    }
  }
  return w;
}

export function laplacianMatrix(w: number[][], normalized: boolean) {
  const degrees = w.map((row) => row.reduce((s, x) => s + x, 0));
  if (degrees.some((v) => !Number.isFinite(v)))
    throw new Error("수치 불안정: 그래프 차수가 유한하지 않습니다.");
  const laplacian = w.map((row, i) =>
    row.map((x, j) =>
      normalized
        ? i === j
          ? degrees[i] > 0
            ? 1
            : 0
          : degrees[i] > 0 && degrees[j] > 0
            ? -x / Math.sqrt(degrees[i]) / Math.sqrt(degrees[j])
            : 0
        : i === j
          ? degrees[i]
          : -x,
    ),
  );
  return { degrees, laplacian };
}

export function connectedComponents(w: number[][]) {
  const labels = Array(w.length).fill(-1);
  let count = 0;
  for (let i = 0; i < w.length; i++)
    if (labels[i] < 0) {
      const stack = [i];
      labels[i] = count;
      while (stack.length) {
        const q = stack.pop()!;
        w[q].forEach((weight, j) => {
          if (weight > 0 && labels[j] < 0) {
            labels[j] = count;
            stack.push(j);
          }
        });
      }
      count++;
    }
  return { labels, count };
}

/** True K-dimensional Lloyd partition; display projection is never used. */
function partitionEmbedding(
  rows: number[][],
  k: number,
  o: Params,
  r: Recorder,
) {
  const rng = random(o.seed),
    chosen = [Math.floor(rng() * rows.length)];
  const weights = Array(rows.length).fill(Infinity);
  while (chosen.length < k) {
    const last = chosen.at(-1)!;
    for (let i = 0; i < rows.length; i++)
      weights[i] = Math.min(weights[i], squaredDistance(rows[i], rows[last]));
    let target = rng() * weights.reduce((a, b) => a + b, 0),
      next = -1;
    for (let i = 0; i < rows.length; i++)
      if ((target -= weights[i]) < 0) {
        next = i;
        break;
      }
    if (next < 0 || chosen.includes(next))
      next = rows.findIndex((_, i) => !chosen.includes(i));
    chosen.push(next);
  }
  let centers = chosen.map((i) => [...rows[i]]),
    labels = Array(rows.length).fill(-1),
    converged = false;
  const centerState = () => {
    const analysis = r.state.analysis;
    if (analysis?.kind !== "spectral")
      throw new Error("Spectral 임베딩 상태가 없습니다.");
    return { ...analysis, phase: "partition", embeddingCenters: centers };
  };
  r.emit("initialize", "전체 K차원 임베딩에서 시드 K-Means++ 중심 선택", {
    analysis: centerState(),
  });
  for (let iteration = 0; iteration < o.iterations; iteration++) {
    const next = rows.map((row) => {
      let best = 0,
        distance = squaredDistance(row, centers[0]);
      for (let j = 1; j < k; j++) {
        const value = squaredDistance(row, centers[j]);
        if (value < distance) {
          best = j;
          distance = value;
        }
      }
      return best;
    });
    converged = next.every((v, i) => v === labels[i]);
    labels = next;
    r.emit(
      "assign",
      `임베딩의 전체 ${rows[0].length}차원으로 ${iteration + 1}회 최근접 중심 할당`,
      { labels, centers: [], focus: [] },
    );
    const sums = Array.from({ length: k }, () => Array(rows[0].length).fill(0)),
      counts = Array(k).fill(0);
    rows.forEach((row, i) => {
      counts[labels[i]]++;
      row.forEach((x, j) => {
        sums[labels[i]][j] += x;
      });
    });
    centers = centers.map((c, j) =>
      counts[j] ? sums[j].map((x) => x / counts[j]) : c,
    );
    const inertia = rows.reduce(
      (s, row, i) => s + squaredDistance(row, centers[labels[i]]),
      0,
    );
    r.emit(
      "move",
      `임베딩 중심의 실제 ${rows[0].length}차원 평균 갱신 · SSE ${inertia.toFixed(6)}`,
      {
        analysis: centerState(),
        metric: [...r.state.metric, inertia],
        metricName: "Embedding K-Means SSE",
      },
      { inertia },
    );
    if (converged) break;
  }
  // Lloyd's last mean update can change Voronoi cells when the iteration limit
  // is reached. Return a genuine nearest-centroid partition of final centers.
  labels = rows.map((row) => {
    let best = 0;
    for (let j = 1; j < centers.length; j++)
      if (
        squaredDistance(row, centers[j]) < squaredDistance(row, centers[best])
      )
        best = j;
    return best;
  });
  const inertia = rows.reduce(
    (s, row, i) => s + squaredDistance(row, centers[labels[i]]),
    0,
  );
  r.emit(
    "assign",
    "최종 임베딩 중심으로 전체 점의 최근접 할당·SSE 확인",
    {
      labels,
      metric: [...r.state.metric, inertia],
    },
    { inertia },
  );
  return converged;
}

export function spectral(p: Point[], o: Params, r: Recorder, input?: Dataset) {
  const n =
    input?.kind === "graph"
      ? input.nodes.length
      : input?.kind === "numeric"
        ? input.values.length
        : p.length;
  if (n < 2 || p.length !== n)
    throw new Error(
      "Spectral 입력과 표시 좌표의 점 수가 일치해야 하며 2개 이상이어야 합니다.",
    );
  if (
    !Number.isInteger(o.k) ||
    o.k < 1 ||
    o.k > n ||
    !Number.isInteger(o.iterations) ||
    o.iterations < 1
  )
    throw new Error("Spectral 군집 수와 반복 횟수를 확인하세요.");
  // Defensive direct-engine check in addition to dispatcher preflight. This is
  // a dense allocation estimate, not an arbitrary dataset cardinality limit.
  if (n * n * 160 > DEFAULT_WORKING_BYTES)
    throw new Error(
      `Spectral 밀집 행렬 메모리 예산 초과: 추정 ${((n * n * 160) / 1048576).toFixed(1)} MiB`,
    );
  if (o.laplacian !== "normalized" && o.laplacian !== "unnormalized")
    throw new Error("Laplacian 종류를 확인하세요.");
  const w =
    input?.kind === "graph"
      ? graphAdjacency(input)
      : similarityGraph(
          numericRows(p, input),
          o.affinity,
          o.gamma,
          o.neighbors,
        );
  const components = connectedComponents(w);
  if (o.k < components.count)
    throw new Error(
      `그래프 연결 성분 ${components.count}개보다 K=${o.k}가 작습니다. 현재 정책은 K ≥ 연결 성분 수를 요구합니다. 그래프 생성 또는 K를 조정하세요.`,
    );
  let analysis: Extract<AlgorithmAnalysis, { kind: "spectral" }> = {
    kind: "spectral",
    phase: "graph",
    adjacency: w,
    components: components.count,
    normalized: o.laplacian === "normalized",
  };
  const edges = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (w[i][j] > 0) edges.push({ a: i, b: j, weight: w[i][j] });
  r.emit(
    "graph",
    input?.kind === "graph"
      ? "입력 그래프의 실제 가중 간선으로 W 구성 (표시 좌표 미사용)"
      : `${o.affinity === "rbf" ? "전체 RBF" : "대칭 union kNN"} 유사도 그래프: 원본 특성 전체 사용`,
    { edges, centers: [], analysis },
    { components: components.count, edges: edges.length },
  );
  const { degrees, laplacian } = laplacianMatrix(
    w,
    o.laplacian === "normalized",
  );
  analysis = { ...analysis, phase: "laplacian", degrees, laplacian };
  r.emit(
    "laplacian",
    o.laplacian === "normalized"
      ? "L_sym = I − D^(−1/2) W D^(−1/2), 고립 노드 대각은 0"
      : "L = D − W 구성",
    { analysis },
  );
  analysis = { ...analysis, phase: "eigen" };
  r.emit("eigen", "대칭 행렬의 실제 Jacobi 회전을 시작합니다.", {
    analysis,
    metric: [],
    metricName: "Jacobi maximum off-diagonal",
  });
  const eigen = symmetricEigen(laplacian, 1e-10, 80, (sweep, maximum) =>
    r.emit(
      "eigen",
      `${sweep}회 Jacobi sweep 후 최대 비대각 원소 ${maximum.toExponential(3)}`,
      { metric: [...r.state.metric, maximum] },
      { sweep, maximum },
      350,
    ),
  );
  const vectors = eigen.vectors.map((row) => row.slice(0, o.k));
  const embedding = vectors.map((row) => {
    if (o.laplacian !== "normalized") return [...row];
    const norm = Math.hypot(...row);
    if (!(norm > 1e-12))
      throw new Error(
        "수치 불안정: 정규화할 임베딩 행이 0입니다. 그래프 연결성과 K를 확인하세요.",
      );
    return row.map((v) => v / norm);
  });
  analysis = {
    ...analysis,
    phase: "embedding",
    eigenvalues: eigen.values,
    eigenvectors: vectors,
    embedding,
    residual: eigen.residual,
  };
  r.emit(
    "embedding",
    `작은 고유값 ${o.k}개의 고유벡터${o.laplacian === "normalized" ? "를 행 정규화한" : "로 구성한"} 실제 ${o.k}차원 임베딩`,
    { analysis, metric: [], metricName: "Embedding K-Means SSE" },
    { residual: eigen.residual, sweeps: eigen.sweeps },
  );
  const converged = partitionEmbedding(embedding, o.k, o, r);
  const current = r.state.analysis;
  if (current?.kind !== "spectral")
    throw new Error("Spectral 최종 상태가 없습니다.");
  analysis = { ...current, phase: "finish" };
  r.emit(
    "finish",
    converged
      ? "고유해 잔차 확인 및 임베딩 K-Means 할당 수렴으로 종료했습니다."
      : "고유해 잔차 확인 후 임베딩 K-Means 반복 한도로 종료했습니다.",
    { analysis, focus: [] },
    { converged: String(converged), residual: eigen.residual },
  );
}
