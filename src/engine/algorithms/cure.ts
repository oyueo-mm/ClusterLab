import type { Params, Point, TreeNode } from "../types";
import type { Recorder } from "../trace";
import { sq } from "../math";

/** All-data CURE: select representatives from every original member after merging. */
export function cureRepresentatives(
  p: Point[],
  ids: number[],
  count: number,
  shrink: number,
) {
  const mean = ids.reduce(
    (s, i) => ({ x: s.x + p[i].x / ids.length, y: s.y + p[i].y / ids.length }),
    { x: 0, y: 0 },
  );
  const selected: number[] = [];
  while (selected.length < Math.min(count, ids.length)) {
    let best = -1,
      maximum = -Infinity;
    for (const id of ids) {
      if (selected.includes(id)) continue;
      let d = sq(p[id], mean);
      if (selected.length) {
        d = Infinity;
        for (const chosen of selected) d = Math.min(d, sq(p[id], p[chosen]));
      }
      if (!Number.isFinite(d))
        throw new Error(
          "수치 불안정: CURE 대표점 거리 제곱이 유한하지 않습니다.",
        );
      if (d > maximum) {
        best = id;
        maximum = d;
      }
    }
    selected.push(best);
  }
  return {
    mean,
    selected,
    representatives: selected.map((i) => ({
      x: (1 - shrink) * p[i].x + shrink * mean.x,
      y: (1 - shrink) * p[i].y + shrink * mean.y,
    })),
  };
}
export function cure(p: Point[], o: Params, r: Recorder) {
  if (
    !Number.isInteger(o.k) ||
    o.k < 1 ||
    !Number.isInteger(o.representatives) ||
    o.representatives < 1 ||
    !Number.isFinite(o.shrink) ||
    o.shrink < 0 ||
    o.shrink > 1
  )
    throw new Error(
      "CURE 파라미터 오류: K/대표점 수는 양의 정수, 축소율은 0~1이어야 합니다.",
    );
  type Group = { id: number; ids: number[]; reps: Point[]; mean: Point };
  const groups: Group[] = p.map((point, id) => ({
    id,
    ids: [id],
    reps: [{ x: point.x, y: point.y }],
    mean: point,
  }));
  const tree: TreeNode[] = p.map((_, id) => ({ id, size: 1, height: 0 }));
  let nextId = p.length;
  const state = (phase: string, selected?: Point[]) => ({
    labels: p.map((_, i) => groups.findIndex((g) => g.ids.includes(i))),
    centers: groups.map((g) => ({ ...g.mean, id: g.id })),
    tree,
    analysis: {
      kind: "cure" as const,
      phase,
      shrink: o.shrink,
      representatives: groups.flatMap((g, label) =>
        g.reps.map((q) => ({ ...q, label })),
      ),
      ...(selected ? { selected } : {}),
    },
  });
  r.emit(
    "initialize",
    "전체 원본 점을 각각 하나의 군집으로 시작합니다. 표본 계산을 사용하지 않습니다.",
    state("initialize"),
  );
  while (groups.length > Math.min(o.k, p.length)) {
    let ai = 0,
      bi = 1,
      best = Infinity;
    for (let a = 0; a < groups.length; a++)
      for (let b = a + 1; b < groups.length; b++) {
        let d = Infinity;
        for (const x of groups[a].reps)
          for (const y of groups[b].reps) d = Math.min(d, sq(x, y));
        if (!Number.isFinite(d))
          throw new Error(
            "수치 불안정: CURE 군집 간 거리 제곱이 유한하지 않습니다.",
          );
        if (d < best) {
          best = d;
          ai = a;
          bi = b;
        }
      }
    const a = groups[ai],
      b = groups[bi],
      ids = [...a.ids, ...b.ids].sort((x, y) => x - y);
    r.emit(
      "distance",
      "두 군집의 축소 대표점 사이 최소 거리가 가장 작은 쌍을 선택합니다.",
      { focus: ids },
      { left: a.id, right: b.id, distance: Math.sqrt(best) },
      250,
    );
    const rep = cureRepresentatives(p, ids, o.representatives, o.shrink);
    const merged: Group = {
      id: nextId++,
      ids,
      reps: rep.representatives,
      mean: rep.mean,
    };
    r.emit(
      "representatives",
      "병합 후보의 원본 멤버에서 평균 최원점과 순차 maximin 점을 선택합니다.",
      {
        analysis: {
          ...state("select").analysis,
          selected: rep.selected.map((i) => p[i]),
        },
      },
      { representatives: rep.selected.join(",") },
      450,
    );
    tree.find((node) => node.id === a.id)!.parent = merged.id;
    tree.find((node) => node.id === b.id)!.parent = merged.id;
    tree.push({ id: merged.id, size: ids.length, height: Math.sqrt(best) });
    groups[ai] = merged;
    groups.splice(bi, 1);
    r.emit(
      "merge",
      "선택한 대표점을 평균 쪽으로 축소하고 두 군집을 병합합니다.",
      {
        ...state(
          "shrink-and-merge",
          rep.selected.map((i) => p[i]),
        ),
        focus: ids,
        metric: [...r.state.metric, Math.sqrt(best)],
        metricName: "CURE merge distance",
      },
      { shrink: o.shrink, merged: merged.id },
    );
  }
  tree.forEach((node) => {
    node.selected = groups.some((g) => g.id === node.id);
  });
  r.emit(
    "finish",
    "목표 군집 수의 전체 데이터 계층 분할입니다. CURE의 표본·분할 확장 모드는 사용하지 않았습니다.",
    { ...state("finish"), focus: [] },
  );
}
