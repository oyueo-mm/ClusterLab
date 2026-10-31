import type { Params, Point, TreeNode } from "../types";
import type { Recorder } from "../trace";
import { initialize } from "./kmeans";
import { mean, sq } from "../math";

/** Largest-inertia leaf selection, one seeded 2-means trial per bisection. */
export function bisecting(p: Point[], o: Params, r: Recorder) {
  type Leaf = { id: number; ids: number[]; center: Point; sse: number };
  let nextId = 1;
  const leaf = (ids: number[], id: number): Leaf => {
    const center = mean(p, ids);
    if (!Number.isFinite(center.x) || !Number.isFinite(center.y))
      throw new Error("수치 불안정: 이분할 중심이 유한하지 않습니다.");
    const sse = ids.reduce((s, i) => s + sq(p[i], center), 0);
    if (!Number.isFinite(sse))
      throw new Error(
        "수치 불안정: 이분할 SSE가 유한하지 않습니다. 좌표 스케일을 조정하세요.",
      );
    return {
      id,
      ids,
      center,
      sse,
    };
  };
  const leaves = [
    leaf(
      p.map((_, i) => i),
      0,
    ),
  ];
  const tree: TreeNode[] = [
    { id: 0, size: p.length, height: Math.sqrt(leaves[0].sse / p.length) },
  ];
  const labels = Array(p.length).fill(0);
  r.emit("initialize", "전체 데이터를 하나의 평균 중심과 루트로 시작합니다.", {
    labels,
    centers: [leaves[0].center],
    tree,
  });
  while (leaves.length < Math.min(o.k, p.length)) {
    let index = -1;
    leaves.forEach((g, i) => {
      if (g.sse > 0 && (index < 0 || g.sse > leaves[index].sse)) index = i;
    });
    if (index < 0) break;
    const parent = leaves[index],
      subset = parent.ids.map((i) => p[i]);
    let centers: Point[] = initialize(
      subset,
      2,
      o.seed + parent.id,
      "kmeans++",
    );
    const displayCenters = () => [
      ...leaves.map((g, i) => (i === index ? centers[0] : g.center)),
      centers[1],
    ];
    let assignments: number[] = [];
    let converged = false;
    r.emit(
      "split",
      `SSE ${parent.sse.toFixed(6)}인 잎 ${parent.id}의 2-Means 시작`,
      {
        focus: parent.ids,
        centers: displayCenters(),
      },
      { parent: parent.id, sse: parent.sse },
    );
    for (let it = 0; it < o.iterations; it++) {
      const next = subset.map((v) =>
        sq(v, centers[0]) <= sq(v, centers[1]) ? 0 : 1,
      );
      converged =
        next.length === assignments.length &&
        next.every((v, i) => v === assignments[i]);
      assignments = next;
      const groups = [0, 1].map((j) =>
        parent.ids.filter((_, i) => assignments[i] === j),
      );
      if (groups.some((g) => !g.length))
        throw new Error("수치 불안정: 이분할에서 빈 군집이 발생했습니다.");
      parent.ids.forEach((id, i) => {
        labels[id] = assignments[i] ? leaves.length : index;
      });
      r.emit("assign", `잎 ${parent.id}: 최근접 두 중심에 할당`, {
        labels,
        focus: parent.ids,
      });
      centers = groups.map((g) => mean(p, g));
      r.emit("move", `잎 ${parent.id}: 두 평균 갱신`, {
        centers: displayCenters(),
      });
      if (converged) break;
    }
    const children = [0, 1].map((j) =>
      leaf(
        parent.ids.filter((_, i) => assignments[i] === j),
        nextId++,
      ),
    );
    leaves[index] = children[0];
    leaves.push(children[1]);
    tree.find((n) => n.id === parent.id)!.selected = false;
    children.forEach((g) =>
      tree.push({
        id: g.id,
        parent: parent.id,
        size: g.ids.length,
        height: Math.sqrt(g.sse / g.ids.length),
        selected: true,
      }),
    );
    const sse = leaves.reduce((s, g) => s + g.sse, 0);
    r.emit(
      "split",
      "분할 확정: 전체 잎의 SSE와 분할 트리 기록",
      {
        labels,
        centers: leaves.map((g) => g.center),
        tree,
        focus: [],
        metric: [...r.state.metric, sse],
        metricName: "Leaf SSE",
      },
      { sse, innerConverged: String(converged) },
    );
  }
  r.emit(
    "finish",
    leaves.length === o.k
      ? "목표 잎 수에 도달했습니다."
      : "구분 가능한 좌표를 모두 분할했습니다.",
    { focus: [] },
    { clusters: leaves.length },
  );
}
