import type { Point, Params } from "../types";
import { Recorder } from "../trace";
import type { TreeNode } from "../types";
import { distance, sum } from "../math";
export function diana(p: Point[], o: Params, r: Recorder) {
  const groups = [{ id: 0, ids: p.map((_, i) => i) }],
    tree: TreeNode[] = [
      { id: 0, size: p.length, height: 0, members: groups[0].ids },
    ];
  let id = 1;
  const diameter = (ids: number[]) =>
    Math.max(0, ...ids.flatMap((i) => ids.map((j) => distance(p[i], p[j]))));
  tree[0].height = diameter(groups[0].ids);
  r.emit("initialize", "전체 데이터를 한 군집으로 시작합니다.", {
    labels: Array(p.length).fill(0),
    tree,
  });
  while (groups.length < Math.min(o.k, p.length)) {
    const index = groups.reduce(
      (b, g, i) => (diameter(g.ids) > diameter(groups[b].ids) ? i : b),
      0,
    );
    const group = groups[index];
    if (group.ids.length < 2) break;
    const rest = [...group.ids],
      splinter: number[] = [];
    const first = rest.reduce(
      (b, i) =>
        sum(rest.map((j) => distance(p[i], p[j]))) >
        sum(rest.map((j) => distance(p[b], p[j])))
          ? i
          : b,
      rest[0],
    );
    rest.splice(rest.indexOf(first), 1);
    splinter.push(first);
    r.emit(
      "split",
      "직경이 가장 큰 군집에서 평균 비유사도가 가장 큰 점을 splinter로 선택합니다.",
      { focus: [first] },
    );
    while (rest.length > 1) {
      const deltas = rest.map(
        (i) =>
          sum(rest.filter((j) => j !== i).map((j) => distance(p[i], p[j]))) /
            (rest.length - 1) -
          sum(splinter.map((j) => distance(p[i], p[j]))) / splinter.length,
      );
      const best = deltas.indexOf(Math.max(...deltas));
      if (deltas[best] <= 0) break;
      splinter.push(rest.splice(best, 1)[0]);
      r.emit(
        "split",
        "기존 군집보다 splinter에 더 가까운 점을 이동합니다.",
        { focus: [...splinter] },
        { difference: deltas[best] },
      );
    }
    const a = { id: id++, ids: rest },
      b = { id: id++, ids: splinter };
    tree.push(
      {
        id: a.id,
        parent: group.id,
        size: rest.length,
        height: diameter(rest),
        members: rest,
      },
      {
        id: b.id,
        parent: group.id,
        size: splinter.length,
        height: diameter(splinter),
        members: splinter,
      },
    );
    groups.splice(index, 1, a, b);
    const labels = Array(p.length).fill(-1);
    groups.forEach((g, k) => g.ids.forEach((i) => (labels[i] = k)));
    r.emit("split", `Splinter 분할 완료 → ${groups.length}개 군집`, {
      labels,
      tree,
      focus: [...splinter],
      metric: [...r.state.metric, diameter(group.ids)],
      metricName: "분할 군집 직경",
    });
  }
  r.emit("finish", "DIANA 분할 종료", { focus: [] });
}
