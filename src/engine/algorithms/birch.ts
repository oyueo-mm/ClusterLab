import type { Point, Params, TreeNode } from "../types";
import { Recorder } from "../trace";
import { sq, argmin } from "../math";
interface CF {
  id: number;
  n: number;
  ls: [number, number];
  ss: number;
  ids: number[];
  child?: Node;
}
interface Node {
  id: number;
  leaf: boolean;
  entries: CF[];
}
export function birch(p: Point[], o: Params, r: Recorder) {
  let seq = 0;
  let root: Node = { id: seq++, leaf: true, entries: [] };
  const center = (e: CF) => ({ x: e.ls[0] / e.n, y: e.ls[1] / e.n });
  const summarize = (entries: CF[], id: number, child?: Node): CF => ({
    id,
    n: entries.reduce((s, e) => s + e.n, 0),
    ls: [
      entries.reduce((s, e) => s + e.ls[0], 0),
      entries.reduce((s, e) => s + e.ls[1], 0),
    ],
    ss: entries.reduce((s, e) => s + e.ss, 0),
    ids: entries.flatMap((e) => e.ids),
    child,
  });
  const nodes = (): TreeNode[] => {
    const result: TreeNode[] = [];
    const walk = (node: Node, parent?: number, depth = 0) => {
      result.push({
        id: node.id,
        parent,
        size: node.entries.reduce((s, e) => s + e.n, 0),
        height: depth,
        n: node.entries.reduce((s, e) => s + e.n, 0),
      });
      for (const e of node.entries) {
        result.push({
          id: e.id,
          parent: node.id,
          size: e.n,
          n: e.n,
          ls: e.ls,
          ss: e.ss,
          height: depth + 1,
          members: e.ids,
        });
        if (e.child) walk(e.child, e.id, depth + 2);
      }
    };
    walk(root);
    return result;
  };
  const leaves = () => {
    const out: CF[] = [];
    const walk = (node: Node) =>
      node.leaf
        ? out.push(...node.entries)
        : node.entries.forEach((e) => walk(e.child!));
    walk(root);
    return out;
  };
  const split = (node: Node): [Node, Node] => {
    let a = 0,
      b = 1,
      max = -1;
    for (let i = 0; i < node.entries.length; i++)
      for (let j = i + 1; j < node.entries.length; j++) {
        const d = sq(center(node.entries[i]), center(node.entries[j]));
        if (d > max) {
          max = d;
          a = i;
          b = j;
        }
      }
    const left: Node = { id: seq++, leaf: node.leaf, entries: [] },
      right: Node = { id: seq++, leaf: node.leaf, entries: [] };
    node.entries.forEach((e, i) => {
      (i === a
        ? left
        : i === b
          ? right
          : sq(center(e), center(node.entries[a])) <=
              sq(center(e), center(node.entries[b]))
            ? left
            : right
      ).entries.push(e);
    });
    r.emit(
      "tree-split",
      `노드 ${node.id}: branching factor ${o.branching} 초과. 가장 먼 CF를 씨앗으로 두 노드로 분할합니다.`,
      { focus: node.entries.flatMap((e) => e.ids) },
      undefined,
      700,
    );
    return [left, right];
  };
  const insert = (node: Node, point: CF): [Node, Node] | null => {
    if (!node.entries.length) node.entries.push(point);
    else {
      const index = argmin(
          node.entries.map((e) => sq(center(e), center(point))),
        ),
        entry = node.entries[index];
      r.emit(
        "distance",
        `CF ${entry.id}의 중심이 가장 가깝습니다. N=${entry.n}`,
        { focus: [point.ids[0], entry.ids[0]] },
        undefined,
        180,
      );
      if (node.leaf) {
        const combined = summarize([entry, point], entry.id),
          c = center(combined),
          radius = Math.sqrt(
            Math.max(0, combined.ss / combined.n - c.x * c.x - c.y * c.y),
          );
        if (radius <= o.threshold) node.entries[index] = combined;
        else node.entries.push(point);
        r.emit(
          "insert",
          `R=${radius.toFixed(4)} ${radius <= o.threshold ? "≤" : ">"} T=${o.threshold}: ${radius <= o.threshold ? "N, LS, SS를 갱신" : "새 CF 항목 생성"}`,
          { focus: point.ids },
          { radius, n: combined.n },
        );
      } else {
        const parts = insert(entry.child!, point);
        if (parts)
          node.entries.splice(
            index,
            1,
            ...parts.map((child) => summarize(child.entries, seq++, child)),
          );
        else
          node.entries[index] = summarize(
            entry.child!.entries,
            entry.id,
            entry.child,
          );
      }
    }
    return node.entries.length > o.branching ? split(node) : null;
  };
  r.emit("initialize", "BIRCH CF-Tree를 초기화합니다. 각 CF = (N, LS, SS)", {
    tree: nodes(),
  });
  for (let i = 0; i < p.length; i++) {
    const point: CF = {
      id: seq++,
      n: 1,
      ls: [p[i].x, p[i].y],
      ss: p[i].x ** 2 + p[i].y ** 2,
      ids: [i],
    };
    const parts = insert(root, point);
    if (parts)
      root = {
        id: seq++,
        leaf: false,
        entries: parts.map((child) => summarize(child.entries, seq++, child)),
      };
    const entries = leaves(),
      labels = Array(p.length).fill(-2);
    entries.forEach((e, k) => e.ids.forEach((j) => (labels[j] = k)));
    r.emit("insert", `점 ${i + 1}/${p.length}: CF-Tree 요약을 반영합니다.`, {
      tree: nodes(),
      centers: entries.map(center),
      labels,
      metric: [...r.state.metric, entries.length],
      metricName: "CF leaf 항목 수",
    });
  }
  if (o.finalClustering) {
    const groups = leaves().map((e) => ({ ids: e.ids, n: e.n, c: center(e) }));
    while (groups.length > o.k) {
      let ai = 0,
        bi = 1,
        best = Infinity;
      for (let a = 0; a < groups.length; a++)
        for (let b = a + 1; b < groups.length; b++) {
          const cost =
            ((groups[a].n * groups[b].n) / (groups[a].n + groups[b].n)) *
            sq(groups[a].c, groups[b].c);
          if (cost < best) {
            best = cost;
            ai = a;
            bi = b;
          }
        }
      const a = groups[ai],
        b = groups[bi],
        n = a.n + b.n;
      groups[ai] = {
        ids: [...a.ids, ...b.ids],
        n,
        c: {
          x: (a.c.x * a.n + b.c.x * b.n) / n,
          y: (a.c.y * a.n + b.c.y * b.n) / n,
        },
      };
      groups.splice(bi, 1);
      const labels = Array(p.length).fill(-1);
      groups.forEach((g, k) => g.ids.forEach((i) => (labels[i] = k)));
      r.emit("merge", "선택적 최종 단계: CF 요약의 크기로 가중한 Ward 병합", {
        labels,
      });
    }
  }
  r.emit(
    "finish",
    "CF-Tree 삽입 완료. 트리는 계층형 군집 덴드로그램과 별도 구조입니다.",
    { focus: [] },
  );
}
