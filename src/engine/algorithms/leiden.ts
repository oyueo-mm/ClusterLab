import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { CommunityAnalysis } from "../communityTypes";
import { DEFAULT_TRACE_BYTES } from "../resources";
import {
  aggregateGraph,
  communityGraph,
  communityRandom,
  modularity,
  moveNodes,
  normalizedLabels,
  originalLabels,
  shuffled,
  validateCommunityParams,
  type SparseGraph,
} from "./communityCommon";

/** Appendix A.2 refinement with degree node masses and gamma/(2m) for modularity. */
export function refinePartition(
  graph: SparseGraph,
  partition: number[],
  resolution: number,
  theta: number,
  rng: () => number,
  emit: (
    labels: number[],
    node: number,
    choices: { community: number; gain: number }[],
  ) => void,
) {
  const refined = partition.map((_, i) => i),
    groups = new Map<number, number[]>();
  partition.forEach((c, i) => {
    const group = groups.get(c) ?? [];
    group.push(i);
    groups.set(c, group);
  });
  if (!graph.total) return refined;
  const cross = (members: number[], subset: Set<number>) => {
    const own = new Set(members);
    let weight = 0;
    for (const i of members)
      graph.adjacency[i].forEach((w, j) => {
        if (subset.has(j) && !own.has(j)) weight += w;
      });
    return weight;
  };
  for (const members of groups.values()) {
    const subset = new Set(members),
      mass = members.reduce((s, i) => s + graph.degrees[i], 0);
    const eligible = members.filter(
      (i) =>
        cross([i], subset) >=
        resolution *
          (graph.degrees[i] / graph.total) *
          (mass - graph.degrees[i]),
    );
    for (const q of shuffled(eligible.length, rng)) {
      const node = eligible[q],
        current = refined[node];
      // A merged source is never split during refinement.
      if (members.some((j) => j !== node && refined[j] === current)) continue;
      const refinedGroups = new Map<number, number[]>();
      for (const j of members) {
        const group = refinedGroups.get(refined[j]) ?? [];
        group.push(j);
        refinedGroups.set(refined[j], group);
      }
      const choices: { community: number; gain: number }[] = [];
      for (const [community, group] of refinedGroups) {
        const targetMass = group.reduce((s, i) => s + graph.degrees[i], 0);
        if (
          cross(group, subset) <
          resolution * (targetMass / graph.total) * (mass - targetMass)
        )
          continue;
        let weight = 0;
        if (community !== current)
          for (const j of group) weight += graph.adjacency[node].get(j) ?? 0;
        const gain =
          community === current
            ? 0
            : weight -
              resolution * (graph.degrees[node] / graph.total) * targetMass;
        if (!Number.isFinite(gain))
          throw new Error(
            "수치 불안정: Leiden refinement 변화가 유한하지 않습니다.",
          );
        // Zero-gain non-edges cannot establish connectivity, so retain singleton.
        if (community === current || (weight > 0 && gain >= 0))
          choices.push({ community, gain });
      }
      if (!choices.length) continue;
      const largest = choices.reduce((v, c) => Math.max(v, c.gain), 0);
      const weights = choices.map((c) => Math.exp((c.gain - largest) / theta)),
        total = weights.reduce((s, v) => s + v, 0);
      let draw = rng() * total,
        chosen = choices.at(-1)!.community;
      for (let i = 0; i < choices.length; i++) {
        draw -= weights[i];
        if (draw <= 0) {
          chosen = choices[i].community;
          break;
        }
      }
      refined[node] = chosen;
      emit(refined, node, choices);
    }
  }
  return normalizedLabels(refined);
}

/** Genuine Leiden fast moves, constrained random refinement and refined aggregation. */
export function leiden(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  validateCommunityParams(o);
  if (!Number.isFinite(o.refinementRandomness) || o.refinementRandomness <= 0)
    throw new Error("Leiden refinement randomness는 양수여야 합니다.");
  const original = communityGraph(points, o, input),
    rng = communityRandom(o),
    n = points.length;
  const detailed = n * n * 128 < DEFAULT_TRACE_BYTES / 2;
  let graph = original,
    labels = points.map((_, i) => i),
    converged = false;
  const levels: number[][] = [];
  const meta = (phase: string): CommunityAnalysis => ({
    kind: "community",
    method: "Leiden",
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
  r.trace.recording!.policy = detailed
    ? "실제 fast local move → 확률적 제약 refinement → refined 집약. 단순 연결 성분 후처리가 아님."
    : "전체 노드·간선 계산 유지. 예상 기록 바이트가 커서 각 수준의 실제 첫 이동/첫 refinement와 완료 단계 요약을 기록합니다.";
  r.emit(
    "graph",
    `${original.source}. 원본 degree를 메타 노드 질량으로 보존하는 modularity Leiden입니다.`,
    {
      labels,
      edges: original.edges.filter((e) => e.a !== e.b),
      analysis: meta("graph"),
    },
  );
  for (let level = 0; level < o.iterations; level++) {
    let moves = 0;
    const stable = moveNodes(
      graph,
      labels,
      o.resolution,
      rng,
      o.iterations,
      true,
      (event) => {
        moves++;
        if (!detailed && moves > 1) return;
        const full = originalLabels(graph, labels, n);
        r.emit(
          "move",
          `실제 fast local move ${event.node + 1}: ΔQ=${event.gain.toPrecision(6)}. 바뀐 이웃을 큐에 다시 넣습니다.`,
          {
            labels: full,
            focus: graph.members[event.node],
            analysis: {
              ...meta("fast-local-move"),
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
    if (!stable)
      throw new Error(
        "Leiden local move 반복 예산에 도달했습니다. 수렴된 완료 결과가 아닙니다.",
      );
    const full = originalLabels(graph, labels, n);
    if (!detailed)
      r.emit(
        "move",
        `수준 ${level + 1}: 전체 노드에서 실제 수용한 ${moves}회 이동의 완료 상태입니다. 중간 개별 기록만 요약했습니다.`,
        {
          labels: full,
          focus: [],
          analysis: meta("fast-local-summary"),
          metric: [...r.state.metric, modularity(original, full, o.resolution)],
          metricName: "Weighted modularity Q",
        },
        { moves, level },
      );
    levels.push(full);
    r.emit("extract", `수준 ${level + 1}: 실제 원본 분할을 기록합니다.`, {
      labels: full,
      focus: [],
      analysis: meta("level"),
    });
    if (new Set(labels).size === labels.length) {
      converged = true;
      break;
    }
    let refinements = 0;
    const refined = refinePartition(
      graph,
      labels,
      o.resolution,
      o.refinementRandomness,
      rng,
      (state, node, choices) => {
        refinements++;
        if (!detailed && refinements > 1) return;
        r.emit(
          "refine",
          `메타 노드 ${node + 1}: 원래 커뮤니티 내부에서 연결 조건과 비음수 개선을 만족하는 refinement 후보를 확률 선택합니다.`,
          {
            focus: graph.members[node],
            analysis: {
              ...meta("refinement"),
              activeNode: node,
              refinedLabels: state,
              candidates: choices,
            },
          },
          { candidates: choices.length },
        );
      },
    );
    if (!detailed)
      r.emit(
        "refine",
        `수준 ${level + 1}: 전체 원본의 ${refinements}회 실제 refinement 판단을 완료했습니다.`,
        {
          focus: [],
          analysis: { ...meta("refinement-summary"), refinedLabels: refined },
        },
        { refinements, level },
      );
    const parent = normalizedLabels(labels),
      refinedIds = normalizedLabels(refined),
      before = modularity(graph, labels, o.resolution);
    const nextLabels = Array(new Set(refinedIds).size).fill(-1) as number[];
    refinedIds.forEach((c, i) => (nextLabels[c] = parent[i]));
    graph = aggregateGraph(graph, refinedIds);
    labels = nextLabels;
    const after = modularity(graph, labels, o.resolution);
    if (Math.abs(before - after) > 1e-10)
      throw new Error("내부 오류: Leiden 집약이 모듈성을 보존하지 않았습니다.");
    r.emit(
      "aggregate",
      "refined 군집으로 집약하고 refinement 전 커뮤니티 관계를 다음 수준의 초기 분할로 유지했습니다.",
      { labels: full, focus: [], analysis: meta("refined-aggregate") },
      { before, after, nodes: graph.members.length },
    );
  }
  if (!converged)
    throw new Error(
      "Leiden 집약 반복 예산에 도달했습니다. 완료 결과가 아닙니다.",
    );
  const final = originalLabels(graph, labels, n),
    objective = modularity(original, final, o.resolution);
  const visited = new Set<number>(),
    sizes = new Map<number, number>();
  final.forEach((community) =>
    sizes.set(community, (sizes.get(community) ?? 0) + 1),
  );
  for (let i = 0; i < n; i++)
    if (!visited.has(i)) {
      const community = final[i],
        queue = [i];
      visited.add(i);
      for (let q = 0; q < queue.length; q++)
        original.adjacency[queue[q]].forEach((weight, j) => {
          if (weight > 0 && final[j] === community && !visited.has(j)) {
            visited.add(j);
            queue.push(j);
          }
        });
      if (queue.length !== sizes.get(community))
        throw new Error(
          "Leiden 최종 연결성 검사를 통과하지 못했습니다. 완료 결과가 아닙니다.",
        );
    }
  r.emit(
    "finish",
    "Leiden의 실제 한 번의 계층 iteration을 완료했습니다. 비음수 가중 무방향 modularity 조건의 연결성만 다루며 전역 최적/점근 안정은 주장하지 않습니다.",
    {
      labels: final,
      focus: [],
      edges: original.edges.filter((e) => e.a !== e.b),
      analysis: { ...meta("finish"), objective, converged },
      metric: [...r.state.metric, objective],
      metricName: "Weighted modularity Q",
    },
    { modularity: objective, converged: "true" },
  );
}
