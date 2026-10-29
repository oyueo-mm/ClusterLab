import type { Point, Params } from "../types";
import { Recorder } from "../trace";
import type { TreeNode } from "../types";
import { distance, mean, sq, sum } from "../math";
export function agnes(p: Point[], o: Params, r: Recorder) {
  const groups = p.map((_, i) => ({ id: i, ids: [i] }));
  const tree: TreeNode[] = p.map((_, i) => ({
    id: i,
    size: 1,
    height: 0,
    members: [i],
  }));
  let next = p.length;
  const d = (a: number[], b: number[]) => {
    if (o.linkage === "ward")
      return Math.sqrt(
        ((2 * a.length * b.length) / (a.length + b.length)) *
          sq(mean(p, a), mean(p, b)),
      );
    const ds = a.flatMap((i) =>
      b.map((j) =>
        o.metric === "manhattan"
          ? Math.abs(p[i].x - p[j].x) + Math.abs(p[i].y - p[j].y)
          : distance(p[i], p[j]),
      ),
    );
    return o.linkage === "single"
      ? Math.min(...ds)
      : o.linkage === "complete"
        ? Math.max(...ds)
        : sum(ds) / ds.length;
  };
  r.emit("initialize", "각 점을 단일 군집으로 시작합니다.", {
    labels: p.map((_, i) => i),
    tree,
  });
  let saved: number[] | null = null;
  while (groups.length > 1) {
    let ai = 0,
      bi = 1,
      best = Infinity;
    for (let a = 0; a < groups.length; a++)
      for (let b = a + 1; b < groups.length; b++) {
        const value = d(groups[a].ids, groups[b].ids);
        if (value < best) {
          best = value;
          ai = a;
          bi = b;
        }
      }
    const a = groups[ai],
      b = groups[bi];
    r.emit(
      "distance",
      `${o.linkage} linkage 최소 거리 ${best.toFixed(4)}: 군집 ${a.id}, ${b.id}`,
      {
        focus: [...a.ids, ...b.ids],
        edges: [{ a: a.ids[0], b: b.ids[0], weight: best }],
      },
    );
    const id = next++;
    for (const node of tree)
      if (node.id === a.id || node.id === b.id) node.parent = id;
    tree.push({
      id,
      size: a.ids.length + b.ids.length,
      height: best,
      members: [...a.ids, ...b.ids],
    });
    groups.splice(bi, 1);
    groups.splice(ai, 1, { id, ids: [...a.ids, ...b.ids] });
    const labels = Array(p.length).fill(-1);
    groups.forEach((g, k) => g.ids.forEach((i) => (labels[i] = k)));
    if (groups.length === o.k) saved = [...labels];
    r.emit(
      "merge",
      `군집 병합 → ${groups.length}개. 덴드로그램에 높이를 기록합니다.`,
      {
        labels,
        tree,
        metric: [...r.state.metric, best],
        metricName: "병합 높이",
      },
    );
  }
  r.emit("extract", `완전한 계층에서 ${o.k}개 군집으로 자릅니다.`, {
    labels: saved ?? (o.k >= p.length ? p.map((_, i) => i) : r.state.labels),
    focus: [],
    edges: [],
  });
}
