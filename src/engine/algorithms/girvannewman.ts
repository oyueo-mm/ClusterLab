import type { Dataset } from "../dataset";
import type { Edge, Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { CommunityAnalysis } from "../communityTypes";
import {
  communityGraph,
  components,
  graphFromEdges,
  modularity,
  validateCommunityParams,
  type SparseGraph,
} from "./communityCommon";

/** Brandes dependency accumulation with exact all-source weighted shortest paths.
 * Naive O(n²) Dijkstra minimum extraction avoids an n² distance matrix.
 */
export function edgeBetweenness(graph: SparseGraph) {
  const n = graph.adjacency.length,
    scores = new Map<string, number>();
  for (let source = 0; source < n; source++) {
    const distance = Array(n).fill(Infinity) as number[],
      sigma = Array(n).fill(0) as number[],
      visited = Array(n).fill(false) as boolean[],
      predecessors = Array.from({ length: n }, () => [] as number[]),
      stack: number[] = [];
    distance[source] = 0;
    sigma[source] = 1;
    for (let q = 0; q < n; q++) {
      let node = -1;
      for (let i = 0; i < n; i++)
        if (!visited[i] && (node < 0 || distance[i] < distance[node])) node = i;
      if (node < 0 || !Number.isFinite(distance[node])) break;
      visited[node] = true;
      stack.push(node);
      graph.adjacency[node].forEach((weight, j) => {
        if (j === node) return;
        const cost = 1 / weight;
        if (!Number.isFinite(cost) || cost <= 0)
          throw new Error(
            "수치 불안정: Girvan–Newman의 역가중 거리 스케일을 조정하세요.",
          );
        const candidate = distance[node] + cost;
        if (!Number.isFinite(candidate))
          throw new Error("수치 불안정: 최단 경로 길이가 유한하지 않습니다.");
        if (candidate < distance[j]) {
          distance[j] = candidate;
          sigma[j] = sigma[node];
          predecessors[j] = [node];
        } else if (candidate === distance[j]) {
          sigma[j] += sigma[node];
          predecessors[j].push(node);
        }
      });
    }
    const dependency = Array(n).fill(0) as number[];
    while (stack.length) {
      const node = stack.pop()!;
      if (!Number.isFinite(sigma[node]))
        throw new Error("수치 불안정: 최단 경로 개수 overflow입니다.");
      for (const previous of predecessors[node]) {
        const value = (sigma[previous] / sigma[node]) * (1 + dependency[node]);
        const a = Math.min(previous, node),
          b = Math.max(previous, node),
          key = `${a},${b}`;
        scores.set(key, (scores.get(key) ?? 0) + value);
        dependency[previous] += value;
      }
    }
  }
  return graph.edges
    .filter((e) => e.a !== e.b)
    .map(({ a, b }) => ({ a, b, value: (scores.get(`${a},${b}`) ?? 0) / 2 }));
}

export function girvannewman(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  validateCommunityParams(o);
  if (!Number.isSafeInteger(o.k) || o.k < 1)
    throw new Error("Girvan–Newman 추출 군집 수는 양의 정수여야 합니다.");
  const original = communityGraph(points, o, input);
  if (original.edges.some((e) => e.a === e.b))
    throw new Error("Girvan–Newman 입력의 self-loop는 현재 지원하지 않습니다.");
  let graph = original,
    labels = components(graph);
  const levels = [labels],
    removed: Edge[] = [],
    target = Math.min(o.k, points.length);
  const meta = (phase: string): CommunityAnalysis => ({
    kind: "community",
    method: "Girvan–Newman",
    phase,
    graphSource: `${original.source}; 가중치=연결 강도, 경로 길이=1/weight`,
    inputEdges:
      r.state.analysis?.kind === "community"
        ? r.state.analysis.inputEdges
        : original.edges,
    levels,
    objective: modularity(original, labels),
    removed,
    components: new Set(labels).size,
  });
  r.trace.recording!.policy =
    "매 간선 제거 후 전체 가중 edge betweenness를 실제 재계산. 목표 K에서 계층 추출.";
  r.emit(
    "graph",
    `${original.source}. 원래 연결 성분을 먼저 계산하고 K=${target}에서 분할을 추출합니다.`,
    { labels, edges: graph.edges, analysis: meta("graph") },
  );
  while (new Set(labels).size < target && graph.edges.length) {
    const betweenness = edgeBetweenness(graph);
    const selected = [...betweenness].sort(
      (a, b) => b.value - a.value || a.a - b.a || a.b - b.b,
    )[0];
    r.emit(
      "distance",
      "현재 남은 그래프의 모든 시작점 최단 경로로 실제 edge betweenness를 재계산했습니다.",
      {
        focus: [selected.a, selected.b],
        analysis: { ...meta("betweenness"), betweenness },
      },
      { maximum: selected.value },
    );
    removed.push(
      graph.edges.find((e) => e.a === selected.a && e.b === selected.b)!,
    );
    graph = graphFromEdges(
      points.length,
      graph.edges.filter((e) => e.a !== selected.a || e.b !== selected.b),
      graph.source,
    );
    const next = components(graph),
      split = new Set(next).size > new Set(labels).size;
    labels = next;
    if (split) levels.push(labels);
    r.emit(
      split ? "split" : "prune",
      `간선 ${selected.a + 1}–${selected.b + 1}을 실제 제거했습니다. 현재 연결 성분 ${new Set(labels).size}개.`,
      {
        labels,
        edges: graph.edges,
        focus: [selected.a, selected.b],
        analysis: meta("edge-removal"),
        metric: [...r.state.metric, modularity(original, labels)],
        metricName: "Original-graph modularity along hierarchy",
      },
      { betweenness: selected.value, components: new Set(labels).size },
    );
  }
  r.emit(
    "finish",
    "남은 그래프의 실제 연결 성분을 반환합니다. 목표 K보다 원래 성분이 많으면 원래 성분을 합치지 않습니다. 최적 모듈성 컷을 자동 선택한 결과가 아닙니다.",
    {
      labels,
      edges: graph.edges,
      focus: [],
      analysis: { ...meta("finish"), converged: true },
    },
    { components: new Set(labels).size, target },
  );
}
