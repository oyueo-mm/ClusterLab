import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { CommunityAnalysis } from "../communityTypes";
import { DEFAULT_TRACE_BYTES, DEFAULT_WORKING_BYTES } from "../resources";
import {
  communityGraph,
  modularity,
  normalizedLabels,
  type SparseGraph,
} from "./communityCommon";

export interface WalkMergeCandidate {
  a: number;
  b: number;
  distance: number;
  increase: number;
}

/** Canonical parallel edges first; positive self-loops require a separate model. */
export function walkTransition(graph: SparseGraph) {
  const n = graph.degrees.length;
  if (n * n * 192 + n * 512 + graph.edges.length * 192 > DEFAULT_WORKING_BYTES)
    throw new Error(
      "Walktrap 전이·확률·계층 작업 공간의 메모리 예산 초과입니다. 밀집 n² 자료를 할당하지 않았습니다.",
    );
  if (graph.edges.some((e) => e.a === e.b))
    throw new Error(
      "Walktrap은 원본 양의 self-loop를 지원하지 않습니다. 내부 인공 loop와 원본 loop를 혼동하지 않습니다.",
    );
  const degrees: number[] = [],
    loops: number[] = [];
  const transition = graph.adjacency.map((row, i) => {
    const loop = row.size ? graph.degrees[i] / row.size : 1;
    const degree = graph.degrees[i] + loop;
    if (!Number.isFinite(degree) || degree <= 0)
      throw new Error(
        "Walktrap 수치 불안정: 인공 loop를 포함한 전이 차수가 양의 유한 수가 아닙니다.",
      );
    degrees.push(degree);
    loops.push(loop);
    return new Map([...row, [i, loop]] as [number, number][]);
  });
  transition.forEach((row, i) =>
    row.forEach((weight, j) => row.set(j, weight / degrees[i])),
  );
  return { transition, degrees, loops };
}

/** Row=start, column=end. Exact deterministic multiplication, not sampled walkers. */
export function advanceWalk(
  probabilities: number[][],
  transition: Map<number, number>[],
) {
  return probabilities.map((row) => {
    const next = row.map(() => 0);
    row.forEach((mass, j) => {
      if (mass)
        transition[j].forEach((probability, k) => {
          next[k] += mass * probability;
        });
    });
    const sum = next.reduce((a, b) => a + b, 0);
    if (!Number.isFinite(sum) || Math.abs(sum - 1) > 1e-9)
      throw new Error(
        "Walktrap 수치 불안정: 실제 전이 확률의 행 합이1이 아닙니다.",
      );
    return next;
  });
}

export function walkMergeCandidates(
  graph: SparseGraph,
  labels: number[],
  means: Map<number, number[]>,
  sizes: Map<number, number>,
  degrees: number[],
) {
  const links = new Map<string, [number, number]>();
  for (const { a, b } of graph.edges)
    if (labels[a] !== labels[b]) {
      const x = Math.min(labels[a], labels[b]),
        y = Math.max(labels[a], labels[b]);
      links.set(`${x},${y}`, [x, y]);
    }
  return [...links.values()]
    .map(([a, b]): WalkMergeCandidate => {
      const x = means.get(a)!,
        y = means.get(b)!;
      let squared = 0;
      for (let j = 0; j < degrees.length; j++)
        squared += (x[j] - y[j]) ** 2 / degrees[j];
      const increase =
        (sizes.get(a)! / labels.length) *
        (sizes.get(b)! / (sizes.get(a)! + sizes.get(b)!)) *
        squared;
      if (!Number.isFinite(squared) || !Number.isFinite(increase))
        throw new Error(
          "Walktrap 수치 불안정: 거리 또는 Ward 변화가 유한하지 않습니다.",
        );
      return { a, b, distance: Math.sqrt(squared), increase };
    })
    .sort((x, y) => x.increase - y.increase || x.a - y.a || x.b - y.b);
}

export function walktrap(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  if (!points.length)
    throw new Error("Walktrap에 비어 있지 않은 원본 그래프가 필요합니다.");
  if (!Number.isSafeInteger(o.walkSteps) || o.walkSteps < 1)
    throw new Error("Walktrap 보행 길이는1이상의 정수여야 합니다.");
  const graph = communityGraph(points, o, input),
    n = points.length;
  const { transition, degrees } = walkTransition(graph);
  let probabilities: number[][] = points.map((_, i) =>
    points.map((__, j) => (i === j ? 1 : 0)),
  );
  const labels = points.map((_, i) => i),
    levels = [labels.slice()];
  const dendrogram: NonNullable<CommunityAnalysis["dendrogram"]> = [];
  let best = labels.slice(),
    bestQ = modularity(graph, labels),
    selectedLevel = 0,
    walkIteration = 0;
  const detailed =
    n ** 3 * 96 + o.walkSteps * n * n * 64 < DEFAULT_TRACE_BYTES / 2;
  const record = (i: number) => detailed || i === 0 || ((i + 1) & i) === 0;
  const meta = (phase: string): CommunityAnalysis => {
    const previous =
      r.state.analysis?.kind === "community" ? r.state.analysis : undefined;
    return {
      kind: "community",
      method: "Walktrap",
      phase,
      graphSource: graph.source,
      inputEdges:
        r.state.analysis?.kind === "community"
          ? r.state.analysis.inputEdges
          : graph.edges,
      levels:
        previous?.levels.length === levels.length ? previous.levels : levels,
      objective: modularity(graph, labels),
      objectiveName: "원본 그래프 모듈성 Q (cut 선택)",
      walkSteps: o.walkSteps,
      walkIteration,
      walkProbabilities: probabilities,
      dendrogram:
        previous?.dendrogram?.length === dendrogram.length
          ? previous.dendrogram
          : dendrogram,
      selectedLevel,
    };
  };
  r.trace.recording!.policy = detailed
    ? "실제 모든 t-step 확률·인접 Ward 후보·병합·최고Q cut 기록. 인공 평균 loop는 전이 전용, Q는 원본 그래프."
    : "전체 보행·Ward 탐색·덴드로그램 계산. 기록은 실제 첫 단계·2의 거듭제곱 단계·최종 요약이며 개별 생략 이벤트 복원 불가.";
  r.emit(
    "graph",
    `${graph.source}. 원본 parallel은 합산합니다. 가중 incident 평균 인공 loop(고립점1)는 보행 전용이며 원본 Q에 넣지 않습니다.`,
    {
      labels,
      edges: graph.edges,
      analysis: meta("initialize"),
      metric: [bestQ],
      metricName: "Original graph modularity Q (cut selection)",
    },
  );
  for (let step = 1; step <= o.walkSteps; step++) {
    probabilities = advanceWalk(probabilities, transition);
    walkIteration = step;
    if (record(step - 1) || step === o.walkSteps)
      r.emit(
        "walk",
        `실제 전체 시작점의 P^${step}를 계산했습니다. 행은 시작 노드, 열은 도착 노드입니다.`,
        {
          analysis: meta("walk"),
          focus: [],
        },
        { walkStep: step, walkSteps: o.walkSteps },
      );
  }
  const means = new Map(probabilities.map((row, i) => [i, row])),
    sizes = new Map(points.map((_, i) => [i, 1]));
  const members = new Map(points.map((_, i) => [i, [i]]));
  while (true) {
    const candidates = walkMergeCandidates(
        graph,
        labels,
        means,
        sizes,
        degrees,
      ),
      candidate = candidates[0];
    if (!candidate) break;
    const { a, b, increase, distance } = candidate,
      id = n + dendrogram.length;
    const keep = record(dendrogram.length),
      as = sizes.get(a)!,
      bs = sizes.get(b)!;
    if (keep)
      r.emit(
        "test",
        "실제 간선으로 인접한 모든 군집 쌍의 t-step 분포 거리와 Ward 평균 제곱거리 증가를 계산했습니다. 최소 증가 쌍을 병합합니다.",
        {
          analysis: {
            ...meta("ward-candidates"),
            walkMergeCandidates: candidates,
            walkDistance: distance,
            wardIncrease: increase,
          },
          focus: [...members.get(a)!, ...members.get(b)!],
        },
        { a, b, distance, wardIncrease: increase },
      );
    const center = means
      .get(a)!
      .map(
        (value, j) =>
          value * (as / (as + bs)) + means.get(b)![j] * (bs / (as + bs)),
      );
    const joined = [...members.get(a)!, ...members.get(b)!].sort(
      (x, y) => x - y,
    );
    means.delete(a);
    means.delete(b);
    sizes.delete(a);
    sizes.delete(b);
    members.delete(a);
    members.delete(b);
    means.set(id, center);
    sizes.set(id, as + bs);
    members.set(id, joined);
    joined.forEach((i) => {
      labels[i] = id;
    });
    const q = modularity(graph, labels);
    levels.push(normalizedLabels(labels));
    dendrogram.push({ a, b, id, members: joined, increase, modularity: q });
    // Machine rounding tie: preserve the finer partition at equal Q.
    if (
      q - bestQ >
      64 * Number.EPSILON * Math.max(1, Math.abs(q), Math.abs(bestQ))
    ) {
      bestQ = q;
      best = normalizedLabels(labels);
      selectedLevel = levels.length - 1;
    }
    if (keep)
      r.emit(
        "merge",
        `실제 Ward 최소 증가 군집을 병합했습니다. Δσ=${increase.toPrecision(6)}. 이 병합은 Q를 최대화하는 CNM 병합이 아닙니다.`,
        {
          labels: normalizedLabels(labels),
          focus: [],
          analysis: {
            ...meta("ward-merge"),
            walkDistance: distance,
            wardIncrease: increase,
          },
          metric: [...r.state.metric, q],
        },
        { a, b, id, wardIncrease: increase, modularity: q },
      );
  }
  r.emit(
    "extract",
    `전체 실제 덴드로그램의 최고 원본 Q 수준 ${selectedLevel}을 선택했습니다. 비연결 성분은 합치지 않고 Q 동률은 더 세분된 수준을 유지합니다.`,
    {
      labels: best,
      focus: [],
      analysis: {
        ...meta("best-modularity-cut"),
        objective: bestQ,
        selectedLevel,
      },
    },
    { selectedLevel, modularity: bestQ, merges: dendrogram.length },
  );
  r.emit(
    "finish",
    "전체 원본 보행·인접 Ward 계층과 최고Q cut이 완료됐습니다. 모든 분할의 전역 최대Q를 보장하지 않습니다.",
    {
      labels: best,
      analysis: { ...meta("finish"), objective: bestQ, converged: true },
      metric: [...r.state.metric, bestQ],
    },
  );
}
