import type { Point, Params } from "../types";
import { Recorder } from "../trace";
import { distance } from "../math";
export function dbscan(p: Point[], o: Params, r: Recorder) {
  const labels = Array(p.length).fill(-2),
    visited = new Set<number>(),
    roles = Array(p.length).fill("unvisited");
  let cluster = 0;
  const query = (i: number) => {
    const ns = p
      .map((v, j) => (distance(v, p[i]) <= o.epsilon ? j : -1))
      .filter((j) => j >= 0);
    r.emit(
      "neighbors",
      `점 ${i + 1}: ε=${o.epsilon}, 이웃 ${ns.length}개 (자기 자신 포함)`,
      { focus: [i, ...ns.filter((j) => j !== i)], radius: o.epsilon },
    );
    roles[i] = ns.length >= o.minPts ? "core" : "border";
    r.emit(
      "core",
      `${ns.length} ${ns.length >= o.minPts ? "≥" : "<"} MinPts ${o.minPts}: ${ns.length >= o.minPts ? "핵심점" : "비핵심점"}`,
      { roles: [...roles] },
      { neighbors: ns.length },
    );
    return ns;
  };
  for (let i = 0; i < p.length; i++) {
    if (visited.has(i)) continue;
    visited.add(i);
    const ns = query(i);
    if (ns.length < o.minPts) {
      labels[i] = -1;
      roles[i] = "noise";
      r.emit("assign", "아직 연결된 핵심점이 없어 노이즈 후보로 표시합니다.", {
        labels: [...labels],
        roles: [...roles],
      });
      continue;
    }
    labels[i] = cluster;
    const queue = [...ns],
      queued = new Set(ns);
    for (let q = 0; q < queue.length; q++) {
      const j = queue[q];
      if (!visited.has(j)) {
        visited.add(j);
        const nn = query(j);
        if (nn.length >= o.minPts)
          for (const k of nn)
            if (!queued.has(k)) {
              queue.push(k);
              queued.add(k);
            }
      }
      if (labels[j] < 0) {
        labels[j] = cluster;
        if (roles[j] !== "core") roles[j] = "border";
        r.emit(
          "expand",
          `밀도 도달 가능한 점 ${j + 1}을 군집 ${cluster + 1}에 연결합니다.`,
          { labels: [...labels], roles: [...roles], focus: [j] },
          undefined,
          260,
        );
      }
    }
    cluster++;
  }
  r.emit("finish", `밀도 확장 완료: 군집 ${cluster}개`, {
    focus: [],
    radius: 0,
  });
}
