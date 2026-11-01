import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { CommunityAnalysis } from "../communityTypes";
import {
  communityGraph,
  communityRandom,
  modularity,
  normalizedLabels,
  shuffled,
  validateCommunityParams,
} from "./communityCommon";

/** Weighted asynchronous label propagation, retaining any current maximal label. */
export function labelpropagation(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  validateCommunityParams(o);
  const graph = communityGraph(points, o, input),
    rng = communityRandom(o),
    labels = points.map((_, i) => i);
  let converged = false;
  const votesAt = (i: number) => {
    const votes = new Map<number, number>();
    graph.adjacency[i].forEach((weight, j) => {
      // Self loops influence the current label by their actual graph weight once.
      votes.set(
        labels[j],
        (votes.get(labels[j]) ?? 0) + weight / (i === j ? 2 : 1),
      );
    });
    return votes;
  };
  const meta = (phase: string): CommunityAnalysis => ({
    kind: "community",
    method: "Label Propagation",
    phase,
    graphSource: graph.source,
    inputEdges:
      r.state.analysis?.kind === "community"
        ? r.state.analysis.inputEdges
        : graph.edges,
    levels: [],
    objective: modularity(graph, labels),
    converged,
  });
  r.trace.recording!.policy =
    "실제 가중 이웃 투표·비동기 레이블 갱신. 모듈성을 최적화하는 알고리즘이 아님.";
  r.emit("graph", `${graph.source}. 모든 노드가 고유 레이블로 시작합니다.`, {
    labels,
    edges: graph.edges.filter((e) => e.a !== e.b),
    analysis: meta("graph"),
  });
  for (let pass = 0; pass < o.iterations; pass++) {
    for (const node of shuffled(points.length, rng)) {
      const votes = votesAt(node);
      if (!votes.size) continue;
      const max = [...votes.values()].reduce((a, b) => Math.max(a, b), 0);
      const best = [...votes]
        .filter(([, value]) => value === max)
        .map(([c]) => c)
        .sort((a, b) => a - b);
      const previous = labels[node];
      // The paper's termination condition is satisfied by any maximum label.
      const chosen = best.includes(previous)
        ? previous
        : best[Math.floor(rng() * best.length)];
      r.emit(
        "messages",
        `노드 ${node + 1}의 실제 이웃 가중치 투표를 합산합니다. 현재 레이블이 최댓값이면 유지합니다.`,
        {
          focus: [node],
          analysis: {
            ...meta("votes"),
            activeNode: node,
            votes: [...votes].map(([community, gain]) => ({ community, gain })),
          },
        },
        { pass, previous, chosen, maxVote: max },
        180,
      );
      if (chosen !== previous) {
        labels[node] = chosen;
        r.emit(
          "assign",
          `가중 최다 레이블 ${chosen + 1}로 실제 비동기 갱신합니다.`,
          { labels, analysis: meta("propagation") },
          { node, previous, chosen },
          240,
        );
      }
    }
    converged = labels.every((label, i) => {
      const votes = votesAt(i);
      return (
        !votes.size ||
        (votes.get(label) ?? 0) >=
          [...votes.values()].reduce((a, b) => Math.max(a, b), 0)
      );
    });
    r.emit(
      "extract",
      `전체 노드가 현재 이웃 최다 레이블을 갖는지 검사합니다: ${converged ? "충족" : "계속"}.`,
      { focus: [], analysis: meta("termination") },
      { pass, converged: String(converged) },
    );
    if (converged) break;
  }
  const final = normalizedLabels(labels);
  r.emit(
    "finish",
    converged
      ? "가중 이웃 합의 조건을 만족한 실제 레이블 전파 결과입니다. 중첩·연결성·모듈성 최적은 보장하지 않습니다."
      : "최대 반복에 도달한 실제 레이블입니다. 이웃 합의 수렴은 확인하지 못했습니다.",
    {
      labels: final,
      focus: [],
      analysis: { ...meta("finish"), converged },
      metric: [modularity(graph, final)],
      metricName: "Observed modularity (not optimized)",
    },
    { converged: String(converged) },
  );
}
