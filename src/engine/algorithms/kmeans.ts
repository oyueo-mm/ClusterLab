import type { Point, Params } from "../types";
import { Recorder } from "../trace";
import { random, sq, argmin, sum, mean } from "../math";
import { DEFAULT_TRACE_BYTES } from "../resources";
export function initialize(
  p: Point[],
  k: number,
  seed: number,
  method: string,
  r?: Recorder,
) {
  const rng = random(seed);
  const chosen = [Math.floor(rng() * p.length)];
  r?.emit("initialize", "첫 중심점을 시드 난수로 선택합니다.", {
    centers: chosen.map((i) => ({ ...p[i], id: i })),
    focus: [chosen[0]],
  });
  while (chosen.length < k) {
    const weights = p.map((v, i) =>
      chosen.includes(i) ? 0 : Math.min(...chosen.map((j) => sq(v, p[j]))),
    );
    let next = -1;
    if (method === "random") {
      const candidates = p.map((_, i) => i).filter((i) => !chosen.includes(i));
      next = candidates[Math.floor(rng() * candidates.length)];
    } else {
      let value = rng() * sum(weights);
      next = weights.findIndex((w) => (value -= w) < 0);
      if (next < 0) next = p.findIndex((_, i) => !chosen.includes(i));
    }
    chosen.push(next);
    r?.emit(
      "initialize",
      method === "random"
        ? "중복 없이 무작위 중심점을 선택합니다."
        : "K-Means++: 가장 가까운 중심까지의 거리 제곱에 비례해 다음 중심점을 선택합니다.",
      { centers: chosen.map((i) => ({ ...p[i], id: i })), focus: [next] },
    );
  }
  return chosen.map((i) => ({ ...p[i], id: i }));
}
export function kmeans(p: Point[], o: Params, r: Recorder) {
  // Choose recording granularity from projected trace storage, never sample input.
  const detailed =
    p.length * p.length * o.iterations * 8 < DEFAULT_TRACE_BYTES / 4;
  r.trace.recording!.policy = detailed
    ? "점별 실제 거리·할당 이벤트"
    : "반복별 전체 할당·평균 갱신 요약 · 모든 점 계산 (표본 계산 없음)";
  let centers = initialize(
    p,
    Math.min(o.k, p.length),
    o.seed,
    o.initialization,
    r,
  );
  const labels = Array(p.length).fill(-2);
  for (let it = 0; it < o.iterations; it++) {
    const prev = [...labels];
    for (let i = 0; i < p.length; i++) {
      const distances = centers.map((c) => sq(p[i], c));
      if (detailed)
        r.emit(
          "distance",
          `점 ${i + 1}의 중심점별 거리 제곱을 계산합니다.`,
          { focus: [i], edges: [] },
          {
            minimum: Math.min(...distances),
            distances: distances.map((v) => v.toFixed(6)).join(", "),
          },
          220,
        );
      labels[i] = argmin(distances);
      if (detailed)
        r.emit(
          "assign",
          `점 ${i + 1} → 군집 ${labels[i] + 1}`,
          { labels: [...labels], focus: [i], edges: [] },
          undefined,
          180,
        );
    }
    if (!detailed)
      r.emit(
        "assign",
        `${it + 1}회: 전체 ${p.length}개 점의 최근접 중심 할당 완료 (반복 요약)`,
        { labels, focus: [], edges: [] },
      );
    const next = centers.map((c, k) => {
      const ids = labels
        .map((l, i) => (l === k ? i : -1))
        .filter((i) => i >= 0);
      return ids.length ? { ...mean(p, ids), id: c.id } : c;
    });
    const inertia = sum(p.map((v, i) => sq(v, next[labels[i]])));
    r.emit(
      "move",
      `${it + 1}회: 군집 평균으로 중심점을 이동합니다. Inertia ${inertia.toFixed(5)}`,
      {
        centers: next,
        focus: [],
        metric: [...r.state.metric, inertia],
        metricName: "Inertia (SSE)",
      },
      { inertia },
    );
    centers = next;
    if (labels.every((l, i) => l === prev[i])) break;
  }
  r.emit("assign", "최종 중심 좌표로 최근접 할당을 다시 확인합니다.", {
    labels: p.map((v) => argmin(centers.map((c) => sq(v, c)))),
    edges: [],
    focus: [],
  });
  r.emit("finish", "수렴 또는 최대 반복 조건으로 종료했습니다.", {
    edges: [],
    focus: [],
  });
}
