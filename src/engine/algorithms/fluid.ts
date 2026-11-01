import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { CommunityAnalysis } from "../communityTypes";
import { DEFAULT_TRACE_BYTES } from "../resources";
import {
  communityGraph,
  communityRandom,
  components,
  modularity,
  shuffled,
  validateCommunityParams,
} from "./communityCommon";

export function fluidScores(
  adjacency: Map<number, number>[],
  labels: number[],
  densities: number[],
  node: number,
) {
  const scores = new Map<number, number>();
  if (labels[node] >= 0) scores.set(labels[node], densities[labels[node]]);
  adjacency[node].forEach((_, neighbor) => {
    const community = labels[neighbor];
    if (community >= 0)
      scores.set(
        community,
        (scores.get(community) ?? 0) + densities[community],
      );
  });
  return [...scores]
    .map(([community, gain]) => ({ community, gain }))
    .sort((a, b) => a.community - b.community);
}

/** Original asynchronous unit-density Fluid Communities, with an explicit simple connected graph domain. */
export function fluid(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  validateCommunityParams(o);
  if (!Number.isSafeInteger(o.k) || o.k < 1 || o.k > points.length)
    throw new Error("Fluid Communities는1≤K≤노드 수인 정수 K가 필요합니다.");
  if (input?.kind === "graph" && input.edges.some((e) => e.weight !== 1))
    throw new Error(
      "Fluid Communities는 비가중 단위 간선만 지원합니다. 가중치를 버리지 않습니다.",
    );
  const graph = communityGraph(points, o, input),
    n = points.length,
    k = o.k;
  if (graph.edges.some((e) => e.a === e.b || e.weight !== 1))
    throw new Error(
      "Fluid Communities는 self-loop/중복 간선 없는 비가중 단순 그래프가 필요합니다.",
    );
  if (new Set(components(graph)).size !== 1)
    throw new Error(
      "Fluid Communities는 연결 그래프가 필요합니다. 성분을 임의로 연결하지 않습니다.",
    );
  const rng = communityRandom(o),
    seeds = shuffled(n, rng).slice(0, k),
    labels = Array(n).fill(-1) as number[],
    counts = Array(k).fill(1) as number[],
    densities = Array(k).fill(1) as number[];
  seeds.forEach((node, c) => (labels[node] = c));
  const detailed = n * n * 160 < DEFAULT_TRACE_BYTES / 2;
  let converged = false;
  const meta = (phase: string): CommunityAnalysis => ({
    kind: "community",
    method: "Fluid Communities",
    phase,
    graphSource: graph.source,
    inputEdges:
      r.state.analysis?.kind === "community"
        ? r.state.analysis.inputEdges
        : graph.edges,
    levels: [],
    objective: labels.every((c) => c >= 0) ? modularity(graph, labels) : 0,
    assignedCount: counts.reduce((sum, count) => sum + count, 0),
    totalNodes: n,
    seeds,
    counts,
    densities,
    converged,
  });
  r.trace.recording!.policy = detailed
    ? "실제 ego-network 밀도 합·비동기 이동·즉시1/|C|갱신. 비가중 연결 단순 그래프."
    : "전체 ego-network 계산 유지. 예상 기록 바이트가 커서 각 패스 첫 판단/이동과 실제 전체 완료 요약을 기록합니다.";
  r.emit(
    "initialize",
    "실제 서로 다른 K개 시드 노드에 밀도1인 유체를 초기화합니다. 나머지 노드는 아직 미할당입니다.",
    { labels, edges: graph.edges, focus: seeds, analysis: meta("seeds") },
    { k },
  );
  for (let pass = 0; pass < o.iterations; pass++) {
    let changes = 0,
      decisions = 0;
    for (const node of shuffled(n, rng)) {
      const scores = fluidScores(graph.adjacency, labels, densities, node);
      if (!scores.length) continue;
      const maximum = scores.reduce((max, s) => Math.max(max, s.gain), 0),
        equalityTolerance =
          Number.EPSILON * 64 * Math.max(1, Math.abs(maximum));
      const candidates = scores
          .filter((s) => Math.abs(maximum - s.gain) <= equalityTolerance)
          .map((s) => s.community),
        previous = labels[node];
      const chosen = candidates.includes(previous)
        ? previous
        : candidates[Math.floor(rng() * candidates.length)];
      decisions++;
      const record = detailed || decisions === 1;
      if (record)
        r.emit(
          "messages",
          `노드 ${node + 1}: 자신과 이웃의 실제1/|C|밀도를 커뮤니티별로 합했습니다. 현재 최댓값 레이블은 유지합니다.`,
          {
            focus: [node],
            analysis: {
              ...meta("density-votes"),
              activeNode: node,
              votes: scores,
            },
          },
          { node, previous, chosen, maximum, pass },
        );
      if (chosen !== previous) {
        if (previous >= 0) {
          counts[previous]--;
          if (counts[previous] <= 0)
            throw new Error(
              "내부 오류: Fluid singleton 방어 조건이 깨졌습니다.",
            );
          densities[previous] = 1 / counts[previous];
        }
        labels[node] = chosen;
        counts[chosen]++;
        densities[chosen] = 1 / counts[chosen];
        changes++;
        if (record)
          r.emit(
            "assign",
            `노드 ${node + 1}을 유체 ${chosen + 1}로 실제 이동하고 영향받은 밀도를 즉시 갱신했습니다.`,
            { labels, analysis: meta("density-update") },
            { node, previous, chosen, pass },
          );
      }
    }
    converged = changes === 0;
    r.emit(
      "extract",
      `패스 ${pass + 1}: 실제 이동 ${changes}회, 전체 미할당 ${labels.filter((c) => c < 0).length}개.`,
      { labels, focus: [], analysis: meta("pass") },
      { changes, pass, converged: String(converged) },
    );
    if (converged) break;
  }
  if (labels.some((c) => c < 0))
    throw new Error(
      "Fluid Communities 반복 한도에서 일부 노드가 아직 미할당입니다. 완료 결과가 아닙니다.",
    );
  if (counts.some((count) => count <= 0))
    throw new Error(
      "내부 오류: Fluid Communities의 K개 유체가 보존되지 않았습니다.",
    );
  r.emit(
    "finish",
    converged
      ? "전체 패스에서 이동이 없는 실제 Fluid 분할입니다. K개 비어 있지 않은 유체와 단위 총밀도를 보존합니다."
      : "반복 한도의 실제 전체 분할입니다. K개 유체는 보존했지만 수렴을 확인하지 못했습니다.",
    {
      labels,
      focus: [],
      analysis: meta("finish"),
      metric: [modularity(graph, labels)],
      metricName: "Observed modularity (Fluid does not optimize Q)",
    },
    { k, converged: String(converged) },
  );
}
