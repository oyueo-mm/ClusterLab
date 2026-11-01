import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { CommunityAnalysis } from "../communityTypes";
import { DEFAULT_TRACE_BYTES } from "../resources";
import {
  communityGraph,
  modularity,
  normalizedLabels,
  validateCommunityParams,
  type SparseGraph,
} from "./communityCommon";

export interface MergeCandidate {
  a: number;
  b: number;
  gain: number;
}
/** Same greedy modularity objective/merge choice, using sparse full scans instead of CNM's heap. */
export function greedyMergeCandidates(
  graph: SparseGraph,
  labels: number[],
  resolution: number,
): MergeCandidate[] {
  if (!graph.total) return [];
  const totals = new Map<number, number>(),
    links = new Map<string, { a: number; b: number; weight: number }>();
  labels.forEach((c, i) =>
    totals.set(c, (totals.get(c) ?? 0) + graph.degrees[i]),
  );
  for (const { a, b, weight = 1 } of graph.edges)
    if (labels[a] !== labels[b]) {
      const x = Math.min(labels[a], labels[b]),
        y = Math.max(labels[a], labels[b]),
        key = `${x},${y}`;
      const pair = links.get(key) ?? { a: x, b: y, weight: 0 };
      pair.weight += weight;
      links.set(key, pair);
    }
  return [...links.values()]
    .map(({ a, b, weight }) => {
      const gain =
        2 *
        (weight / graph.total -
          resolution *
            ((totals.get(a) ?? 0) / graph.total) *
            ((totals.get(b) ?? 0) / graph.total));
      if (!Number.isFinite(gain))
        throw new Error("수치 불안정: CNM 모듈성 변화가 유한하지 않습니다.");
      return { a, b, gain };
    })
    .sort((a, b) => b.gain - a.gain || a.a - b.a || a.b - b.b);
}

export function cnm(points: Point[], o: Params, r: Recorder, input?: Dataset) {
  validateCommunityParams(o);
  const graph = communityGraph(points, o, input),
    labels = points.map((_, i) => i),
    n = labels.length;
  const detailed = n * n * 160 < DEFAULT_TRACE_BYTES / 2;
  let merges = 0;
  const levels: number[][] = [];
  const meta = (phase: string): CommunityAnalysis => ({
    kind: "community",
    method: "Greedy Modularity (CNM)",
    phase,
    graphSource: graph.source,
    inputEdges:
      r.state.analysis?.kind === "community"
        ? r.state.analysis.inputEdges
        : graph.edges,
    levels,
    objective: modularity(graph, labels, o.resolution),
    resolution: o.resolution,
  });
  r.trace.recording!.policy = detailed
    ? "모든 실제 greedy 모듈성 후보·최대 양의 병합 기록. CNM 목적함수, 희소 전체 스캔 구현."
    : "전체 greedy 탐색 유지. 예상 기록 바이트가 커서 첫 병합과2의 거듭제곱 병합 수·최종 상태만 요약 기록.";
  r.emit(
    "graph",
    `${graph.source}. 모든 노드를 singleton으로 시작하며 실제 최대 ΔQ 군집 쌍을 병합합니다.`,
    {
      labels,
      edges: graph.edges.filter((e) => e.a !== e.b),
      analysis: meta("graph"),
    },
  );
  while (true) {
    const candidates = greedyMergeCandidates(graph, labels, o.resolution),
      best = candidates[0];
    if (!best || best.gain <= 1e-14) {
      r.emit(
        "extract",
        "양의 모듈성 개선 병합이 없습니다. 0gain 동률은 더 세분된 분할을 유지합니다.",
        {
          labels,
          focus: [],
          analysis: { ...meta("stop"), mergeCandidates: candidates },
        },
        { maximumGain: best?.gain ?? 0, merges },
      );
      break;
    }
    const record = detailed || merges === 0 || ((merges + 1) & merges) === 0;
    const before = record ? modularity(graph, labels, o.resolution) : 0;
    if (record)
      r.emit(
        "test",
        "현재 커뮤니티 사이 실제 가중치·차수합으로 모든 연결 쌍의 ΔQ를 평가했습니다.",
        {
          focus: labels.flatMap((c, i) =>
            c === best.a || c === best.b ? [i] : [],
          ),
          analysis: {
            ...meta("merge-candidates"),
            mergeCandidates: candidates,
          },
        },
        { bestGain: best.gain, a: best.a, b: best.b },
      );
    for (let i = 0; i < n; i++) if (labels[i] === best.b) labels[i] = best.a;
    merges++;
    if (record) {
      levels.push(normalizedLabels(labels));
      r.emit(
        "merge",
        `실제 최대 개선 쌍 ${best.a + 1}·${best.b + 1}을 병합했습니다. ΔQ=${best.gain.toPrecision(6)}.`,
        {
          labels,
          focus: [],
          analysis: meta("greedy-merge"),
          metric: [...r.state.metric, modularity(graph, labels, o.resolution)],
          metricName: "Greedy merge modularity Q",
        },
        {
          gain: best.gain,
          before,
          after: modularity(graph, labels, o.resolution),
          merges,
        },
      );
    }
  }
  const final = normalizedLabels(labels);
  r.emit(
    "finish",
    "양의 greedy 병합이 끝난 실제 분할입니다. 전역 최적이 아니며 원문의 heap 가속 복잡도를 주장하지 않습니다.",
    {
      labels: final,
      focus: [],
      analysis: { ...meta("finish"), converged: true },
      metric: [...r.state.metric, modularity(graph, labels, o.resolution)],
      metricName: "Greedy merge modularity Q",
    },
    { merges, converged: "true" },
  );
}
