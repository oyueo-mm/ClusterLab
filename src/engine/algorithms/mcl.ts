import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { CommunityAnalysis } from "../communityTypes";
import { DEFAULT_WORKING_BYTES } from "../resources";
import {
  communityGraph,
  modularity,
  validateCommunityParams,
} from "./communityCommon";

export function normalizeColumns(matrix: number[][]) {
  const n = matrix.length,
    result = matrix.map((row) => [...row]);
  for (let j = 0; j < n; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += result[i][j];
    if (!Number.isFinite(sum) || sum <= 0)
      throw new Error(
        "수치 불안정: MCL 확률 열의 합이 유한한 양수가 아닙니다.",
      );
    for (let i = 0; i < n; i++) result[i][j] /= sum;
  }
  return result;
}
export function multiplyMatrices(a: number[][], b: number[][]) {
  const n = a.length,
    result = Array.from({ length: n }, () => Array(n).fill(0) as number[]);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < n; k++)
      if (a[i][k] !== 0)
        for (let j = 0; j < n; j++)
          if (b[k][j] !== 0) result[i][j] += a[i][k] * b[k][j];
  return result;
}
export function expandMatrix(matrix: number[][], expansion: number) {
  let result = matrix;
  for (let power = 1; power < expansion; power++)
    result = multiplyMatrices(result, matrix);
  return result;
}
export function inflateMatrix(matrix: number[][], inflation: number) {
  const n = matrix.length,
    result = matrix.map((r) => [...r]);
  // Scaling a column by its maximum cancels in normalization and avoids all-zero underflow.
  for (let j = 0; j < n; j++) {
    let max = 0;
    for (let i = 0; i < n; i++) max = Math.max(max, matrix[i][j]);
    if (!max) throw new Error("MCL에 확률 0인 열이 생겼습니다.");
    for (let i = 0; i < n; i++)
      result[i][j] = (matrix[i][j] / max) ** inflation;
  }
  return normalizeColumns(result);
}
/** Attractor supports are retained, including overlaps; labels are a declared display projection. */
export function extractAttractors(matrix: number[][], tolerance: number) {
  const clusters: number[][] = [],
    attractors: number[] = [],
    supports = new Set<string>(),
    n = matrix.length;
  for (let i = 0; i < n; i++)
    if (matrix[i][i] > tolerance) {
      const members = matrix[i].flatMap((value, j) =>
          value > tolerance ? [j] : [],
        ),
        key = members.join(",");
      if (members.length && !supports.has(key)) {
        supports.add(key);
        clusters.push(members);
        attractors.push(i);
      }
    }
  const labels = Array(n).fill(-1) as number[];
  for (let j = 0; j < n; j++) {
    let max = -1;
    for (let c = 0; c < attractors.length; c++)
      if (clusters[c].includes(j) && matrix[attractors[c]][j] > max) {
        labels[j] = c;
        max = matrix[attractors[c]][j];
      }
    if (labels[j] < 0)
      throw new Error(
        "MCL의 수치적 attractor 지지가 일부 노드를 덮지 않습니다. 반복/허용오차를 조정하세요.",
      );
  }
  return { memberships: clusters, attractors, labels };
}
/** Dense exact expansion/inflation without pruning. Unit self loops are explicit. */
export function mcl(points: Point[], o: Params, r: Recorder, input?: Dataset) {
  validateCommunityParams(o);
  if (
    !Number.isFinite(o.inflation) ||
    o.inflation <= 1 ||
    !Number.isSafeInteger(o.expansion) ||
    o.expansion < 2 ||
    o.tolerance >= 1
  )
    throw new Error(
      "MCL은 inflation>1, 정수 expansion≥2, 0<tolerance<1이 필요합니다.",
    );
  const n = points.length;
  if (n * n * 160 + n * 256 > DEFAULT_WORKING_BYTES)
    throw new Error(
      "MCL 밀집 전이 행렬의 메모리 예산을 초과합니다. 희소 그래프 알고리즘을 선택하세요.",
    );
  const graph = communityGraph(points, o, input),
    adjacency = Array.from({ length: n }, () => Array(n).fill(0) as number[]);
  graph.adjacency.forEach((row, i) => {
    row.forEach((value, j) => (adjacency[i][j] = value / (i === j ? 2 : 1)));
    adjacency[i][i] += 1;
  });
  let matrix = normalizeColumns(adjacency),
    residual = Infinity,
    converged = false;
  const meta = (phase: string): CommunityAnalysis => ({
    kind: "community",
    method: "Markov Clustering (MCL)",
    phase,
    graphSource: `${graph.source}; 입력 자기 루프에 단위 self-loop를 더한 column-stochastic 전이`,
    inputEdges:
      r.state.analysis?.kind === "community"
        ? r.state.analysis.inputEdges
        : graph.edges,
    levels: [],
    objective: 0,
    transition: matrix,
    residual: Number.isFinite(residual) ? residual : undefined,
    converged,
  });
  r.trace.recording!.policy =
    "전체 전이 행렬의 실제 정수 거듭제곱·원소별 inflation·열 정규화. 수치 pruning 없음.";
  r.emit(
    "initialize",
    "실제 가중 그래프에 단위 자기 루프를 더하고 각 열을 확률 1로 정규화했습니다.",
    {
      labels: points.map((_, i) => i),
      edges: graph.edges.filter((e) => e.a !== e.b),
      analysis: meta("normalize"),
    },
  );
  for (let iteration = 0; iteration < o.iterations; iteration++) {
    const previous = matrix;
    matrix = expandMatrix(matrix, o.expansion);
    r.emit(
      "expand-matrix",
      `전이 행렬을 실제 ${o.expansion}제곱해 다단계 흐름을 계산합니다.`,
      { analysis: meta("expansion") },
      { iteration, expansion: o.expansion },
    );
    matrix = inflateMatrix(matrix, o.inflation);
    residual = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        residual = Math.max(residual, Math.abs(matrix[i][j] - previous[i][j]));
    converged = residual <= o.tolerance;
    r.emit(
      "inflate",
      `원소별 ${o.inflation}승과 열 재정규화를 실제 수행했습니다. 최대 변화 ${residual.toPrecision(5)}.`,
      {
        analysis: meta("inflation"),
        metric: [...r.state.metric, residual],
        metricName: "MCL maximum matrix change",
      },
      { iteration, residual },
    );
    if (converged) break;
  }
  if (!converged)
    throw new Error(
      "MCL 반복 한도에서 전이 행렬 수렴을 확인하지 못했습니다. 완료 결과가 아닙니다.",
    );
  const result = extractAttractors(matrix, o.tolerance),
    objective = modularity(graph, result.labels);
  r.emit(
    "extract",
    "대각 attractor의 수치적 지지 집합을 추출합니다. 겹치는 지지도 보존하고 Canvas 레이블만 최대 흐름으로 투영합니다.",
    {
      labels: result.labels,
      analysis: { ...meta("attractors"), ...result, objective },
    },
    { clusters: result.memberships.length, supportTolerance: o.tolerance },
  );
  r.emit(
    "finish",
    "실제 MCL 전이 행렬과 attractor 지지를 반환합니다. 화면 색은 지배 흐름 분할이며 중첩 지지 전체와 구분합니다.",
    {
      labels: result.labels,
      focus: [],
      analysis: {
        ...meta("finish"),
        memberships: result.memberships,
        attractors: result.attractors,
        objective,
        converged,
      },
    },
    { clusters: result.memberships.length, residual, converged: "true" },
  );
}
