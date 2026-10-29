import type { Center, Point, Params } from "../types";
import { Recorder } from "../trace";
import { distance, argmin } from "../math";

/** Flat kernel, all observations as seeds, cluster_all=true. The iteration
 * counter and intensity/lexicographic suppression match sklearn MeanShift.
 * No K, random initialization, or centroid-assignment updates are used. */
export function meanshift(points: Point[], options: Params, r: Recorder) {
  const h = options.bandwidth;
  if (!Number.isFinite(h) || h <= 0)
    throw new Error("Bandwidth는 0보다 큰 유한한 숫자여야 합니다.");
  if (!Number.isInteger(options.iterations) || options.iterations < 1)
    throw new Error("최대 반복 횟수는 1 이상의 정수여야 합니다.");
  let centers: Center[] = points.map((p, id) => ({
    x: p.x,
    y: p.y,
    id,
    path: [{ x: p.x, y: p.y }],
    weight: 0,
  }));
  r.emit(
    "initialize",
    "각 원본 데이터 좌표에서 고유 ID를 가진 중심 후보를 시작합니다.",
    { centers, metricName: "후보 이동 거리", focus: [], radius: h },
  );
  for (let id = 0; id < points.length; id++) {
    for (let iteration = 0; ; iteration++) {
      const current = centers[id],
        neighbors = points
          .map((p, i) => (distance(p, current) <= h ? i : -1))
          .filter((i) => i >= 0);
      if (!neighbors.length)
        throw new Error("중심 후보의 Bandwidth 안에 데이터가 없습니다.");
      r.emit(
        "neighbors",
        `후보 ${id + 1}: Bandwidth ${h} 안에서 ${neighbors.length}개의 원본 데이터를 찾았습니다.`,
        { activeCenter: id, focus: neighbors, radius: h, meanTarget: null },
        { candidate: id, neighbors: neighbors.length },
        250,
      );
      const target = neighbors.reduce(
        (m, i, j) => ({
          x: m.x + (points[i].x - m.x) / (j + 1),
          y: m.y + (points[i].y - m.y) / (j + 1),
        }),
        { x: 0, y: 0 },
      );
      const shift = distance(current, target);
      r.emit(
        "distance",
        `Flat kernel 평균 (${target.x.toFixed(4)}, ${target.y.toFixed(4)}), 이동 거리 ${shift.toFixed(6)}`,
        { meanTarget: target },
        { candidate: id, displacement: shift },
        220,
      );
      centers = centers.map((c) =>
        c.id === id
          ? {
              ...c,
              ...target,
              weight: neighbors.length,
              path: [...c.path!, target],
            }
          : c,
      );
      r.emit(
        "move",
        `후보 ${id + 1}을 이웃 평균으로 이동합니다. 원과 경로도 함께 이동합니다.`,
        { centers, metric: [...r.state.metric, shift], meanTarget: null },
        { candidate: id, displacement: shift, iteration },
        640,
      );
      if (shift <= h * 1e-3 || iteration === options.iterations) {
        const converged = shift <= h * 1e-3;
        centers = centers.map((c) => (c.id === id ? { ...c, converged } : c));
        r.emit(
          "core",
          `후보 ${id + 1}: ${converged ? "0.001 × Bandwidth 수렴 기준 충족" : "반복 한도 도달 (수렴과 구별)"}`,
          { centers, focus: [] },
          { candidate: id, converged: converged ? 1 : 0 },
          220,
        );
        break;
      }
    }
  }
  // Exactly coincident final coordinates are dictionary-deduplicated first;
  // later seeds overwrite intensity, as in the independent reference.
  const exact = new Map<string, Center>();
  centers.forEach((c) => exact.set(`${c.x},${c.y}`, c));
  const ordered = [...exact.values()].sort(
      (a, b) => b.weight! - a.weight! || b.x - a.x || b.y - a.y,
    ),
    modes: Center[] = [];
  for (const candidate of ordered) {
    if (!modes.some((m) => distance(m, candidate) <= h)) modes.push(candidate);
  }
  const retained = new Set(modes.map((c) => c.id));
  for (const candidate of [...centers])
    if (!retained.has(candidate.id)) {
      const target = modes[argmin(modes.map((m) => distance(candidate, m)))];
      centers = centers.map((c) =>
        c.id === candidate.id
          ? { ...c, x: target.x, y: target.y, mergedInto: target.id }
          : c,
      );
      r.emit(
        "merge",
        `밀도순 모드 정리: 후보 ${candidate.id! + 1}을 유지 모드 ${target.id! + 1}에 통합합니다.`,
        { centers, activeCenter: candidate.id!, focus: [], radius: 0 },
        { candidate: candidate.id!, mode: target.id! },
        500,
      );
    }
  r.emit(
    "extract",
    `밀도와 Bandwidth 거리로 정리한 ${modes.length}개 모드를 유지합니다. K는 사용하지 않습니다.`,
    {
      centers: modes.map((c, label) => ({ ...c, label })),
      activeCenter: -1,
      focus: [],
      radius: 0,
      meanTarget: null,
    },
    { modes: modes.length },
  );
  const labels = Array(points.length).fill(-2);
  points.forEach((p, i) => {
    labels[i] = argmin(modes.map((c) => distance(p, c)));
    r.emit(
      "assign",
      `점 ${i + 1} → 가장 가까운 모드 ${labels[i] + 1} (cluster_all=true)`,
      { labels: [...labels], focus: [i] },
      undefined,
      180,
    );
  });
  r.emit("finish", `Mean Shift 완료: ${modes.length}개 모드`, {
    focus: [],
    activeCenter: -1,
    radius: 0,
  });
}
