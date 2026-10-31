import type { Center, Params, Point } from "../types";
import type { Recorder } from "../trace";
import { random } from "../math";

/** Seeded observed initialization shared by the two coordinate prototypes. */
export function observedInitialization(
  p: Point[],
  k: number,
  seed: number,
): Center[] {
  if (
    p.length < 2 ||
    p.some((v) => !Number.isFinite(v.x) || !Number.isFinite(v.y)) ||
    !Number.isSafeInteger(k) ||
    k < 1 ||
    !Number.isSafeInteger(seed)
  )
    throw new Error(
      "초기화 입력 오류: 유한 2D 점, 정수 K≥1, 정수 seed가 필요합니다.",
    );
  const rng = random(seed),
    order = p.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const keys = new Set<string>(),
    centers: Center[] = [];
  for (const i of order) {
    const key = `${p[i].x},${p[i].y}`;
    if (keys.has(key)) continue;
    keys.add(key);
    centers.push({ x: p[i].x, y: p[i].y, id: i });
    if (centers.length >= k) break;
  }
  return centers;
}

export function coordinateMedian(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b),
    m = Math.floor(ordered.length / 2);
  if (!ordered.length) throw new Error("빈 집합의 중앙값은 정의하지 않습니다.");
  return ordered.length % 2 ? ordered[m] : ordered[m - 1] / 2 + ordered[m] / 2;
}
export function manhattan(p: Point, c: Point) {
  const value = Math.abs(p.x - c.x) + Math.abs(p.y - c.y);
  if (!Number.isFinite(value))
    throw new Error("수치 불안정: Manhattan 거리가 유한하지 않습니다.");
  return value;
}
export function nearestMedianLabels(p: Point[], centers: Center[]) {
  return p.map((v) => {
    let winner = 0,
      best = manhattan(v, centers[0]);
    for (let j = 1; j < centers.length; j++) {
      const d = manhattan(v, centers[j]);
      if (d < best) {
        best = d;
        winner = j;
      }
    }
    return winner;
  });
}
export function kmedians(p: Point[], o: Params, r: Recorder) {
  if (!Number.isSafeInteger(o.iterations) || o.iterations < 1)
    throw new Error("K-Medians 반복 수는 양의 정수여야 합니다.");
  let centers = observedInitialization(p, o.k, o.seed),
    labels = Array(p.length).fill(-2) as number[];
  let converged = false;
  r.emit(
    "initialize",
    "시드로 서로 다른 관측 위치를 초기 중앙값 후보로 선택합니다. 거리 척도는 Manhattan L1입니다.",
    {
      centers,
      analysis: {
        kind: "centroid-variant",
        phase: "initialization",
        metric: "manhattan",
      },
    },
  );
  for (let it = 0; it < o.iterations; it++) {
    const next = nearestMedianLabels(p, centers);
    converged = next.every((v, i) => v === labels[i]);
    labels = next;
    r.emit(
      "assign",
      `${it + 1}회: 모든 점을 최소 L1 거리의 중심에 할당합니다.`,
      {
        labels,
        analysis: {
          kind: "centroid-variant",
          phase: "assignment",
          metric: "manhattan",
        },
      },
    );
    centers = centers.map((c, j) => {
      const members = p.filter((_, i) => labels[i] === j);
      return members.length
        ? {
            x: coordinateMedian(members.map((v) => v.x)),
            y: coordinateMedian(members.map((v) => v.y)),
            id: c.id,
          }
        : c;
    });
    const objective = p.reduce(
      (sum, v, i) => sum + manhattan(v, centers[labels[i]]),
      0,
    );
    if (!Number.isFinite(objective))
      throw new Error("수치 불안정: L1 목적함수 합이 유한하지 않습니다.");
    r.emit(
      "move",
      `${it + 1}회: 각 좌표의 중앙값으로 갱신합니다. L1 비용 ${objective.toFixed(6)}`,
      {
        centers,
        metric: [...r.state.metric, objective],
        metricName: "L1 objective (sum absolute deviations)",
        analysis: {
          kind: "centroid-variant",
          phase: "median-update",
          metric: "manhattan",
          objective,
        },
      },
      { objective },
    );
    if (converged) break;
  }
  labels = nearestMedianLabels(p, centers);
  const objective = p.reduce(
    (sum, v, i) => sum + manhattan(v, centers[labels[i]]),
    0,
  );
  r.emit(
    "assign",
    "최종 중앙값 중심에서 전체 최근접 L1 할당과 비용을 확인합니다.",
    {
      labels,
      centers,
      focus: [],
      metric: [...r.state.metric, objective],
      analysis: {
        kind: "centroid-variant",
        phase: "final-assignment",
        metric: "manhattan",
        objective,
      },
    },
  );
  r.emit(
    "finish",
    converged
      ? "할당이 변하지 않아 종료했습니다."
      : "반복 한도 종료이며 전역 최적이나 수렴을 보장하지 않습니다.",
    {},
    { converged: String(converged), clusters: centers.length },
  );
}
