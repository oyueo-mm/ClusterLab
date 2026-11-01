import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { CommunityAnalysis } from "../communityTypes";
import { DEFAULT_TRACE_BYTES, DEFAULT_WORKING_BYTES } from "../resources";
import { communityGraph, type SparseGraph } from "./communityCommon";

/** All k-cliques, increasing vertex order; explicit stack avoids recursion depth caps. */
export function enumerateKCliques(
  graph: SparseGraph,
  k: number,
  onClique?: (clique: number[], count: number) => void,
  budgetBytes = DEFAULT_WORKING_BYTES,
) {
  const n = graph.degrees.length,
    cliques: number[][] = [];
  if (k > n) return cliques;
  const stack: { prefix: number[]; candidates: number[]; cursor: number }[] = [
    {
      prefix: [],
      candidates: Array.from({ length: n }, (_, i) => i),
      cursor: 0,
    },
  ];
  let stackBytes = n * 16 + 96;
  const found = (sorted: number[], value: number, first: number) => {
    let lo = first,
      hi = sorted.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (sorted[mid] < value) lo = mid + 1;
      else hi = mid;
    }
    return sorted[lo] === value;
  };
  while (stack.length) {
    const frame = stack.at(-1)!;
    if (frame.prefix.length + frame.candidates.length - frame.cursor < k) {
      stack.pop();
      stackBytes -= 96 + (frame.prefix.length + frame.candidates.length) * 16;
      continue;
    }
    const vertex = frame.candidates[frame.cursor++];
    const prefix = [...frame.prefix, vertex];
    if (prefix.length === k) {
      // Includes percolation faces/keys, DSU and memberships, not just the clique rows.
      const bytes =
        (cliques.length + 1) * (256 + k * 128 + k * k * 24) +
        n * 256 +
        graph.edges.length * 192 +
        stackBytes;
      if (!Number.isFinite(bytes) || bytes > budgetBytes)
        throw new Error(
          "Clique Percolation의 실제 clique·face·소속 작업 공간 바이트 예산을 초과했습니다. 일부 결과를 전체 열거 성공으로 반환하지 않습니다.",
        );
      cliques.push(prefix);
      onClique?.(prefix, cliques.length);
    } else {
      const adjacent = graph.adjacency[vertex],
        remaining = frame.candidates.length - frame.cursor;
      const next =
        remaining < adjacent.size
          ? frame.candidates.slice(frame.cursor).filter((j) => adjacent.has(j))
          : [...adjacent.keys()]
              .filter((j) => found(frame.candidates, j, frame.cursor))
              .sort((a, b) => a - b);
      if (prefix.length + next.length >= k) {
        stackBytes += 96 + (prefix.length + next.length) * 16;
        if (stackBytes + n * 256 + graph.edges.length * 192 > budgetBytes)
          throw new Error(
            "Clique 열거 frontier의 실제 작업 공간 바이트 예산 초과입니다.",
          );
        stack.push({ prefix, candidates: next, cursor: 0 });
      }
    }
  }
  return cliques;
}

function validateSimpleInput(points: Point[], o: Params, input?: Dataset) {
  if (!Number.isSafeInteger(o.cliqueSize) || o.cliqueSize < 2)
    throw new Error(
      "Clique Percolation의 clique 크기 k는2이상의 정수여야 합니다. 군집 수가 아닙니다.",
    );
  if (input?.kind === "graph") {
    const pairs = new Set<string>();
    for (const e of input.edges) {
      const key = JSON.stringify([e.source, e.target].sort());
      if (e.weight !== 1 || e.source === e.target || pairs.has(key))
        throw new Error(
          "기본 Clique Percolation은 단순·무방향·loop 없는 단위 가중치 그래프만 지원합니다. 원본 가중치·중복을 버리지 않습니다.",
        );
      pairs.add(key);
    }
  }
  return communityGraph(points, o, input);
}

export function cliquepercolation(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  if (!points.length)
    throw new Error(
      "Clique Percolation에 비어 있지 않은 원본 그래프가 필요합니다.",
    );
  const graph = validateSimpleInput(points, o, input),
    n = points.length,
    k = o.cliqueSize;
  const links: { a: number; b: number }[] = [];
  let cliques: number[][] = [],
    cliqueComponents: number[] = [],
    communities: number[][] = [],
    memberships: number[][] = [];
  const labels = points.map(() => -1);
  // A bound controls recording detail ONLY; it never rejects or truncates computation.
  let upper = 0;
  for (let i = 0; i < n; i++) {
    const d = [...graph.adjacency[i].keys()].filter((j) => j > i).length;
    let bound = 1;
    if (d < k - 1) continue;
    for (let j = 1; j < k; j++) bound *= (d - j + 1) / j;
    upper += bound;
  }
  const detailed =
    upper * upper * k * 64 + n * upper * 32 < DEFAULT_TRACE_BYTES / 2;
  const record = (count: number) =>
    detailed || count === 1 || (count & (count - 1)) === 0;
  const meta = (phase: string): CommunityAnalysis => {
    const previous =
      r.state.analysis?.kind === "community" ? r.state.analysis : undefined;
    return {
      kind: "community",
      method: "Clique Percolation",
      phase,
      graphSource: graph.source,
      inputEdges:
        r.state.analysis?.kind === "community"
          ? r.state.analysis.inputEdges
          : graph.edges,
      objective: 0,
      objectiveName: "목적함수 없음",
      levels: [],
      cliqueSize: k,
      cliques:
        previous?.cliques?.length === cliques.length
          ? previous.cliques
          : cliques,
      enumeratedCliques: cliques.length,
      cliqueLinks:
        previous?.cliqueLinks?.length === links.length
          ? previous.cliqueLinks
          : links,
      cliqueComponents,
      communities,
      memberships,
      unassignedCount: labels.filter((x) => x < 0).length,
    };
  };
  r.trace.recording!.policy = detailed
    ? "모든 실제 k-clique 생성·공유face 연결·성분 추출 기록. k−1 face마다 대표와 연결해 동일 정확 연결 성분 계산."
    : "모든 실제 k-clique·face·연결 성분 계산 유지. 기록만 첫 항목·2의 거듭제곱 개수·최종 상태 요약; 개별 생략 이벤트 복원 불가.";
  r.emit(
    "graph",
    `${graph.source}. 실제 완전 k=${k} 부분그래프를 모두 열거합니다. 미소속 label−1은 clique에 속하지 않음이며 통계적 noise 판정이 아닙니다.`,
    {
      labels,
      edges: graph.edges,
      analysis: meta("initialize"),
      metric: [],
      metricName: "k-cliques enumerated (no optimization objective)",
    },
  );
  cliques = enumerateKCliques(graph, k, (clique, count) => {
    // The callback receives the actual newly generated clique, never a fabricated final coloring.
    cliques.push(clique);
    if (record(count))
      r.emit(
        "clique",
        `모든 쌍이 실제 간선으로 연결된 k-clique ${count}개를 열거했습니다.`,
        {
          focus: clique,
          analysis: { ...meta("enumerate-clique"), activeClique: clique },
        },
        { cliques: count, cliqueSize: k },
      );
  });
  const parent = cliques.map((_, i) => i),
    faces = new Map<string, number>();
  const find = (i: number) => {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    while (parent[i] !== i) {
      const next = parent[i];
      parent[i] = root;
      i = next;
    }
    return root;
  };
  let processedLinks = 0;
  cliques.forEach((clique, i) => {
    for (let omitted = 0; omitted < k; omitted++) {
      const face = clique.filter((_, j) => j !== omitted).join(","),
        other = faces.get(face);
      if (other === undefined) {
        faces.set(face, i);
        continue;
      }
      const a = find(i),
        b = find(other);
      if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
      links.push({ a: other, b: i });
      processedLinks++;
      if (record(processedLinks)) {
        cliqueComponents = cliques.map((_, j) => find(j));
        r.emit(
          "percolate",
          `실제 ${k - 1}개 노드를 공유하는 clique ${other + 1}·${i + 1}을 연결했습니다. 같은 face의 대표 연결만 저장해 동일 연결 성분을 얻습니다.`,
          {
            focus: [...new Set([...clique, ...cliques[other]])],
            analysis: meta("shared-face-union"),
          },
          { a: other, b: i, sharedVertices: k - 1 },
        );
      }
    }
  });
  const components = new Map<number, Set<number>>();
  cliques.forEach((clique, i) => {
    const id = find(i),
      component = components.get(id) ?? new Set<number>();
    clique.forEach((v) => component.add(v));
    components.set(id, component);
  });
  const roots = [...components.keys()].sort((a, b) => a - b),
    rootLabels = new Map(roots.map((id, i) => [id, i]));
  communities = roots.map((id) =>
    [...components.get(id)!].sort((a, b) => a - b),
  );
  cliqueComponents = cliques.map((_, i) => rootLabels.get(find(i))!);
  memberships = communities; // Community-indexed lists, like the existing MCL support contract.
  communities.forEach((members, c) =>
    members.forEach((i) => {
      if (labels[i] < 0) labels[i] = c;
    }),
  );
  r.emit(
    "extract",
    "k-clique 연결 성분의 원본 노드 합집합을 추출했습니다. 모든 중첩 소속을 보존하며 화면 label은 첫 소속만 표시합니다.",
    {
      labels,
      focus: [],
      analysis: meta("overlapping-communities"),
      metric: [cliques.length],
    },
    {
      cliques: cliques.length,
      communities: communities.length,
      unassigned: labels.filter((x) => x < 0).length,
    },
  );
  r.emit(
    "finish",
    "모든 clique와 percolation 성분을 계산했습니다. 군집 수 최적화·통계적 noise 검정이 아니며 clique가 없으면 정당한 빈 결과입니다.",
    {
      labels,
      analysis: { ...meta("finish"), converged: true },
    },
  );
}
