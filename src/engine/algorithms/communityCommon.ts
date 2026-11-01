import type { Dataset } from "../dataset";
import type { Edge, Params, Point } from "../types";
import { random } from "../math";
import { DEFAULT_WORKING_BYTES } from "../resources";

export interface SparseGraph {
  adjacency: Map<number, number>[];
  degrees: number[];
  total: number;
  edges: Edge[];
  members: number[][];
  source: string;
}
export function normalizedLabels(labels: number[]) {
  const ids = new Map<number, number>();
  return labels.map((c) => {
    if (!ids.has(c)) ids.set(c, ids.size);
    return ids.get(c)!;
  });
}
export function shuffled(n: number, rng: () => number) {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
export function graphFromEdges(
  n: number,
  edges: Edge[],
  source = "실제 입력 그래프",
  members?: number[][],
): SparseGraph {
  if (n * 240 + edges.length * 192 > DEFAULT_WORKING_BYTES)
    throw new Error("그래프 작업 공간의 메모리 예산을 초과합니다.");
  const adjacency = Array.from({ length: n }, () => new Map<number, number>());
  for (const { a, b, weight = 1 } of edges) {
    if (
      !Number.isInteger(a) ||
      !Number.isInteger(b) ||
      a < 0 ||
      b < 0 ||
      a >= n ||
      b >= n
    )
      throw new Error("그래프 간선 끝점이 유효하지 않습니다.");
    if (!Number.isFinite(weight) || weight < 0)
      throw new Error("커뮤니티 간선 가중치는 음이 아닌 유한한 수여야 합니다.");
    if (weight === 0) continue;
    adjacency[a].set(
      b,
      (adjacency[a].get(b) ?? 0) + weight * (a === b ? 2 : 1),
    );
    if (a !== b) adjacency[b].set(a, (adjacency[b].get(a) ?? 0) + weight);
  }
  const degrees = adjacency.map((row) =>
    [...row.values()].reduce((a, b) => a + b, 0),
  );
  const total = degrees.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(total))
    throw new Error("수치 불안정: 그래프 총 가중치가 유한하지 않습니다.");
  const canonical: Edge[] = [];
  adjacency.forEach((row, a) =>
    row.forEach((value, b) => {
      if (a <= b) canonical.push({ a, b, weight: value / (a === b ? 2 : 1) });
    }),
  );
  return {
    adjacency,
    degrees,
    total,
    edges: canonical,
    members: members ?? Array.from({ length: n }, (_, i) => [i]),
    source,
  };
}
export function communityGraph(
  points: Point[],
  o: Params,
  input?: Dataset,
): SparseGraph {
  if (input?.kind === "graph") {
    if (input.directed)
      throw new Error(
        "현재 커뮤니티 엔진은 무방향 그래프만 지원합니다. 방향을 버리지 않습니다.",
      );
    const ids = new Map(input.nodes.map((p, i) => [p.id, i]));
    if (ids.size !== input.nodes.length || points.length !== input.nodes.length)
      throw new Error("그래프 노드 ID/표시 개수가 유효하지 않습니다.");
    const edges = input.edges.map((e) => {
      const a = ids.get(e.source),
        b = ids.get(e.target);
      if (a === undefined || b === undefined)
        throw new Error("그래프 간선이 존재하지 않는 노드를 가리킵니다.");
      return { a, b, weight: e.weight };
    });
    return graphFromEdges(points.length, edges);
  }
  if (input && input.kind !== "numeric")
    throw new Error("원본 그래프 또는 수치형 kNN 입력이 필요합니다.");
  if (!Number.isSafeInteger(o.neighbors) || o.neighbors < 1)
    throw new Error("kNN 이웃 수는 양의 정수여야 합니다.");
  const rows =
    input?.kind === "numeric" ? input.values : points.map((p) => [p.x, p.y]);
  const d = rows[0]?.length ?? 0;
  if (
    !d ||
    rows.length !== points.length ||
    rows.some((r) => r.length !== d || r.some((x) => !Number.isFinite(x)))
  )
    throw new Error("동일 차원의 유한한 원본 벡터가 필요합니다.");
  const edgeMap = new Map<string, Edge>(),
    n = points.length;
  if (n * Math.min(n, o.neighbors) * 240 > DEFAULT_WORKING_BYTES)
    throw new Error("kNN 그래프 예상 메모리 예산을 초과합니다.");
  for (let i = 0; i < n; i++) {
    const distances: { index: number; distance: number }[] = [];
    for (let j = 0; j < n; j++)
      if (i !== j) {
        let distance = 0;
        for (let a = 0; a < d; a++) distance += (rows[i][a] - rows[j][a]) ** 2;
        if (!Number.isFinite(distance))
          throw new Error("수치 불안정: kNN 원본 거리가 유한하지 않습니다.");
        distances.push({ index: j, distance });
      }
    distances.sort((a, b) => a.distance - b.distance || a.index - b.index);
    for (const { index: j } of distances.slice(
      0,
      Math.min(o.neighbors, n - 1),
    )) {
      const a = Math.min(i, j),
        b = Math.max(i, j);
      edgeMap.set(`${a},${b}`, { a, b, weight: 1 });
    }
  }
  return graphFromEdges(
    n,
    [...edgeMap.values()],
    `전체 원본 ${d}차원의 이진 union-kNN 그래프 (k=${Math.min(o.neighbors, n - 1)})`,
  );
}
export function modularity(g: SparseGraph, labels: number[], resolution = 1) {
  if (!g.total) return 0;
  const totals = new Map<number, number>();
  let internal = 0;
  g.adjacency.forEach((row, i) => {
    totals.set(labels[i], (totals.get(labels[i]) ?? 0) + g.degrees[i]);
    row.forEach((weight, j) => {
      if (labels[i] === labels[j]) internal += weight;
    });
  });
  const value =
    internal / g.total -
    resolution *
      [...totals.values()].reduce((s, x) => s + (x / g.total) ** 2, 0);
  if (!Number.isFinite(value))
    throw new Error(
      "수치 불안정: 모듈성이 유한하지 않습니다. 가중치/resolution 스케일을 조정하세요.",
    );
  return value;
}
export function originalLabels(g: SparseGraph, labels: number[], n: number) {
  const result = Array(n).fill(-1) as number[];
  g.members.forEach((members, i) =>
    members.forEach((j) => (result[j] = labels[i])),
  );
  return normalizedLabels(result);
}
export function aggregateGraph(g: SparseGraph, partition: number[]) {
  const labels = normalizedLabels(partition),
    count = labels.reduce((max, value) => Math.max(max, value), -1) + 1;
  const members = Array.from({ length: count }, () => [] as number[]);
  g.members.forEach((v, i) => {
    for (const member of v) members[labels[i]].push(member);
  });
  const edges = new Map<string, Edge>();
  g.edges.forEach(({ a, b, weight = 1 }) => {
    const x = Math.min(labels[a], labels[b]),
      y = Math.max(labels[a], labels[b]),
      key = `${x},${y}`;
    const edge = edges.get(key) ?? { a: x, b: y, weight: 0 };
    edge.weight! += weight;
    edges.set(key, edge);
  });
  return graphFromEdges(count, [...edges.values()], g.source, members);
}
export function components(g: SparseGraph) {
  const labels = Array(g.adjacency.length).fill(-1) as number[];
  let c = 0;
  for (let i = 0; i < labels.length; i++)
    if (labels[i] < 0) {
      const queue = [i];
      labels[i] = c;
      for (let q = 0; q < queue.length; q++)
        g.adjacency[queue[q]].forEach((weight, j) => {
          if (weight > 0 && labels[j] < 0) {
            labels[j] = c;
            queue.push(j);
          }
        });
      c++;
    }
  return labels;
}
export function validateCommunityParams(o: Params) {
  if (
    !Number.isFinite(o.resolution) ||
    o.resolution <= 0 ||
    !Number.isSafeInteger(o.iterations) ||
    o.iterations < 1 ||
    !Number.isFinite(o.tolerance) ||
    o.tolerance <= 0 ||
    !Number.isSafeInteger(o.seed)
  )
    throw new Error(
      "커뮤니티 파라미터 오류: 양의 resolution/반복/허용오차와 정수 seed가 필요합니다.",
    );
}
export function communityRandom(o: Params) {
  return random(o.seed);
}

export interface MoveEvent {
  node: number;
  from: number;
  to: number;
  gain: number;
  candidates: { community: number; gain: number }[];
}
export function moveNodes(
  g: SparseGraph,
  labels: number[],
  resolution: number,
  rng: () => number,
  maxPasses: number,
  fast: boolean,
  emit: (event: MoveEvent) => void,
) {
  if (!g.total) return true;
  const totals = new Map<number, number>(),
    sizes = new Map<number, number>();
  labels.forEach((c, i) => {
    totals.set(c, (totals.get(c) ?? 0) + g.degrees[i]);
    sizes.set(c, (sizes.get(c) ?? 0) + 1);
  });
  let nextLabel = labels.reduce((max, value) => Math.max(max, value), -1) + 1;
  const choose = (node: number) => {
    const from = labels[node],
      degree = g.degrees[node];
    const links = new Map<number, number>();
    g.adjacency[node].forEach((w, j) => {
      if (j !== node) links.set(labels[j], (links.get(labels[j]) ?? 0) + w);
    });
    const choices = new Set([from, ...links.keys()]);
    if ((sizes.get(from) ?? 0) > 1) choices.add(nextLabel);
    let best = from,
      bestGain = 0;
    const candidates: MoveEvent["candidates"] = [];
    for (const to of choices) {
      const gain =
        to === from
          ? 0
          : 2 *
              ((links.get(to) ?? 0) / g.total -
                (links.get(from) ?? 0) / g.total) -
            resolution *
              (2 *
                (degree / g.total) *
                (((totals.get(to) ?? 0) - ((totals.get(from) ?? 0) - degree)) /
                  g.total));
      if (!Number.isFinite(gain))
        throw new Error("수치 불안정: 모듈성 이동 변화가 유한하지 않습니다.");
      candidates.push({ community: to, gain });
      if (gain > bestGain + 1e-14) {
        best = to;
        bestGain = gain;
      }
    }
    if (best === from) return false;
    labels[node] = best;
    totals.set(from, (totals.get(from) ?? 0) - degree);
    totals.set(best, (totals.get(best) ?? 0) + degree);
    sizes.set(from, (sizes.get(from) ?? 0) - 1);
    sizes.set(best, (sizes.get(best) ?? 0) + 1);
    if (best === nextLabel) nextLabel++;
    emit({ node, from, to: best, gain: bestGain, candidates });
    return true;
  };
  if (fast) {
    const queue = shuffled(labels.length, rng),
      queued = new Set(queue);
    let head = 0;
    // An explicit computational iteration budget, not a point-count cap.
    const evaluations = maxPasses * Math.max(1, labels.length);
    while (head < queue.length && head < evaluations) {
      const node = queue[head++];
      queued.delete(node);
      if (choose(node))
        g.adjacency[node].forEach((_, j) => {
          if (labels[j] !== labels[node] && !queued.has(j)) {
            queued.add(j);
            queue.push(j);
          }
        });
    }
    return head === queue.length;
  }
  for (let pass = 0; pass < maxPasses; pass++) {
    let moved = false;
    for (const node of shuffled(labels.length, rng))
      moved = choose(node) || moved;
    if (!moved) return true;
  }
  return false;
}
