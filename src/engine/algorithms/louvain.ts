import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { CommunityAnalysis } from "../communityTypes";
import {
  aggregateGraph,
  communityGraph,
  communityRandom,
  modularity,
  moveNodes,
  normalizedLabels,
  originalLabels,
  validateCommunityParams,
} from "./communityCommon";

/** Weighted undirected Louvain: positive modularity moves then exact graph aggregation. */
export function louvain(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  validateCommunityParams(o);
  const original = communityGraph(points, o, input),
    rng = communityRandom(o),
    n = points.length;
  let graph = original,
    labels = points.map((_, i) => i),
    converged = false;
  const levels: number[][] = [];
  const meta = (phase: string): CommunityAnalysis => ({
    kind: "community",
    method: "Louvain",
    phase,
    graphSource: original.source,
    inputEdges:
      r.state.analysis?.kind === "community"
        ? r.state.analysis.inputEdges
        : original.edges,
    levels,
    objective: modularity(graph, labels, o.resolution),
    resolution: o.resolution,
    aggregateEdges:
      r.state.analysis?.kind === "community" &&
      r.state.analysis.aggregateMembers?.length === graph.members.length
        ? r.state.analysis.aggregateEdges
        : graph.edges,
    aggregateLabels: labels,
    aggregateMembers:
      r.state.analysis?.kind === "community" &&
      r.state.analysis.aggregateMembers?.length === graph.members.length
        ? r.state.analysis.aggregateMembers
        : graph.members,
  });
  r.trace.recording!.policy =
    "가중 무방향 모듈성의 실제 노드 이동·집약. 좌표 입력은 명시적 전체 union-kNN 변환.";
  r.emit(
    "graph",
    `${original.source}. 자기 루프는 차수에 두 배 반영하고 집약에서 보존합니다.`,
    {
      labels,
      edges: original.edges.filter((e) => e.a !== e.b),
      analysis: meta("graph"),
    },
  );
  for (let level = 0; level < o.iterations; level++) {
    const stable = moveNodes(
      graph,
      labels,
      o.resolution,
      rng,
      o.iterations,
      false,
      (event) => {
        const full = originalLabels(graph, labels, n);
        r.emit(
          "move",
          `메타 노드 ${event.node + 1}: 커뮤니티 ${event.from + 1}→${event.to + 1}, 실제 ΔQ=${event.gain.toPrecision(6)}.`,
          {
            labels: full,
            focus: graph.members[event.node],
            analysis: {
              ...meta("local-move"),
              activeNode: event.node,
              candidates: event.candidates,
            },
            metric: [
              ...r.state.metric,
              modularity(original, full, o.resolution),
            ],
            metricName: "Weighted modularity Q",
          },
          { gain: event.gain, level },
        );
      },
    );
    const full = originalLabels(graph, labels, n);
    levels.push(full);
    r.emit(
      "extract",
      `수준 ${level + 1}의 원본 노드 분할과 모듈성을 기록합니다.`,
      { labels: full, focus: [], analysis: meta("level") },
      {
        modularity: modularity(original, full, o.resolution),
        stable: String(stable),
      },
    );
    const canonical = normalizedLabels(labels),
      count = new Set(canonical).size;
    if (!stable) break;
    if (count === labels.length) {
      converged = true;
      break;
    }
    const before = modularity(graph, labels, o.resolution);
    graph = aggregateGraph(graph, labels);
    labels = graph.members.map((_, i) => i);
    const after = modularity(graph, labels, o.resolution);
    if (Math.abs(before - after) > 1e-10)
      throw new Error(
        "내부 오류: Louvain 집약이 모듈성을 보존하지 않았습니다.",
      );
    r.emit(
      "aggregate",
      "커뮤니티를 메타 노드로 집약했습니다. 내부 간선은 실제 self-loop로 보존하며 Q가 같습니다.",
      { labels: full, analysis: meta("aggregate") },
      { before, after, nodes: graph.members.length },
    );
  }
  const final = originalLabels(graph, labels, n),
    objective = modularity(original, final, o.resolution);
  r.emit(
    "finish",
    converged
      ? "양의 이동이나 추가 집약이 없는 Louvain 분할입니다. 전역 최적·연결성은 보장하지 않습니다."
      : "반복 한도에서 얻은 실제 분할입니다. Louvain 수렴을 확인하지 못했습니다.",
    {
      labels: final,
      focus: [],
      edges: original.edges.filter((e) => e.a !== e.b),
      analysis: { ...meta("finish"), objective, converged },
      metric: [...r.state.metric, objective],
      metricName: "Weighted modularity Q",
    },
    { converged: String(converged), modularity: objective },
  );
}
