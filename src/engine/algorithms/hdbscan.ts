import type { Point, Params, TreeNode, Edge } from "../types";
import { Recorder } from "../trace";
import { distance, sum } from "../math";
interface Cluster {
  id: number;
  birth: number;
  members: number[];
  stability: number;
  children: Cluster[];
}
export function hdbscan(p: Point[], o: Params, r: Recorder) {
  const n = p.length,
    ds = p.map((a) => p.map((b) => distance(a, b))),
    core = ds.map(
      (row) => [...row].sort((a, b) => a - b)[Math.min(n - 1, o.minPts - 1)],
    );
  for (let i = 0; i < n; i++)
    r.emit(
      "core",
      `점 ${i + 1}의 core distance ${core[i].toFixed(4)} (자기 자신 포함)`,
      { core, focus: [i], radius: core[i] },
      undefined,
      160,
    );
  const mrd = ds.map((row, i) =>
    row.map((d, j) => Math.max(core[i], core[j], d)),
  );
  r.emit("distance", "Mutual reachability = max(core(a), core(b), d(a,b))", {
    radius: 0,
  });
  const visited = new Set([0]),
    best = mrd[0].slice(),
    parent = Array(n).fill(0),
    mst: Edge[] = [];
  while (visited.size < n) {
    let j = -1;
    for (let i = 0; i < n; i++)
      if (!visited.has(i) && (j < 0 || best[i] < best[j])) j = i;
    visited.add(j);
    mst.push({ a: parent[j], b: j, weight: best[j] });
    r.emit(
      "mst",
      `Prim MST: 가중치 ${best[j].toFixed(4)} 연결 추가`,
      { edges: [...mst], focus: [parent[j], j] },
      { weight: best[j] },
      260,
    );
    for (let i = 0; i < n; i++)
      if (!visited.has(i) && mrd[j][i] < best[i]) {
        best[i] = mrd[j][i];
        parent[i] = j;
      }
  }
  let id = 0;
  const root: Cluster = {
    id: id++,
    birth: 0,
    members: p.map((_, i) => i),
    stability: 0,
    children: [],
  };
  const nodes: TreeNode[] = [];
  // Remove all edges at the same level together to avoid tie-dependent binary splits.
  const condense = (members: number[], edges: Edge[], cluster: Cluster) => {
    if (!edges.length) {
      const death = 1e12;
      cluster.stability += members.length * (death - cluster.birth);
      return;
    }
    const height = Math.max(...edges.map((e) => e.weight!)),
      lambda = height > 0 ? 1 / height : 1e12,
      remaining = edges.filter((e) => e.weight! < height),
      sets: number[][] = [];
    const left = new Set(members);
    while (left.size) {
      const first = left.values().next().value!;
      left.delete(first);
      const group = [first];
      for (let q = 0; q < group.length; q++)
        for (const e of remaining) {
          const next = e.a === group[q] ? e.b : e.b === group[q] ? e.a : -1;
          if (left.has(next)) {
            left.delete(next);
            group.push(next);
          }
        }
      sets.push(group);
    }
    const big = sets.filter((g) => g.length >= o.minSize),
      small = sets.filter((g) => g.length < o.minSize);
    cluster.stability +=
      sum(small.map((g) => g.length)) * (lambda - cluster.birth);
    if (big.length >= 2) {
      cluster.stability +=
        sum(big.map((g) => g.length)) * (lambda - cluster.birth);
      for (const group of big) {
        const child: Cluster = {
          id: id++,
          birth: lambda,
          members: group,
          stability: 0,
          children: [],
        };
        cluster.children.push(child);
        nodes.push({
          id: child.id,
          parent: cluster.id,
          size: group.length,
          height: lambda,
          members: group,
        });
        r.emit(
          "condense",
          `λ=${lambda.toFixed(3)}: min_cluster_size를 만족하는 가지 ${group.length}개 점`,
          {
            tree: [
              { id: root.id, size: n, height: 0, members: root.members },
              ...nodes,
            ],
            focus: group,
          },
        );
        condense(
          group,
          remaining.filter((e) => group.includes(e.a) && group.includes(e.b)),
          child,
        );
      }
    } else if (big.length === 1) {
      const group = big[0];
      condense(
        group,
        remaining.filter((e) => group.includes(e.a) && group.includes(e.b)),
        cluster,
      );
    }
  };
  condense(root.members, mst, root);
  const all: Cluster[] = [];
  const collect = (c: Cluster) => {
    all.push(c);
    c.children.forEach(collect);
  };
  collect(root);
  let selected: Cluster[] = [];
  const choose = (c: Cluster): { score: number; selected: Cluster[] } => {
    if (!c.children.length) return { score: c.stability, selected: [c] };
    const children = c.children.map(choose),
      score = sum(children.map((v) => v.score));
    if (o.selection === "leaf" || score > c.stability)
      return { score, selected: children.flatMap((v) => v.selected) };
    return { score: c.stability, selected: [c] };
  };
  selected = root.children.flatMap((c) => choose(c).selected);
  const tree = all.map((c) => ({
    id: c.id,
    parent: all.find((a) => a.children.includes(c))?.id,
    size: c.members.length,
    height: c.birth,
    stability: c.stability,
    members: c.members,
    selected: selected.includes(c),
  }));
  r.emit(
    "stability",
    "안정도 Σ(λ_exit − λ_birth)를 계산하고 부모와 자식의 EOM을 비교합니다. 루트 단일 군집은 선택하지 않습니다.",
    { tree, focus: [] },
    { selected: selected.length },
  );
  const labels = Array(n).fill(-1);
  selected.forEach((c, k) => c.members.forEach((i) => (labels[i] = k)));
  r.emit(
    "extract",
    `안정도 기반 ${o.selection.toUpperCase()} 선택: ${selected.length}개 군집`,
    { labels, tree, focus: [], radius: 0 },
  );
}
