import type { Point, Params } from "../types";
import { Recorder } from "../trace";
import type { Center } from "../types";
import { random, sq, argmin } from "../math";
export function lvq(p: Point[], o: Params, r: Recorder) {
  if (p.some((v) => v.label === undefined))
    throw new Error(
      "LVQ는 모든 점의 정답 클래스 label이 필요합니다. 라벨 데이터 프리셋을 선택하세요.",
    );
  const classes = [...new Set(p.map((v) => v.label!))],
    rng = random(o.seed);
  let centers: Center[] = classes.flatMap((label) => {
    const pool = p.filter((v) => v.label === label);
    return Array.from({ length: o.k }, () => ({
      ...pool[Math.floor(rng() * pool.length)],
    }));
  });
  r.emit("initialize", "LVQ1: 각 정답 클래스에서 프로토타입을 초기화합니다.", {
    centers,
    labels: p.map((v) => v.label!),
  });
  for (let e = 0; e < o.epochs; e++) {
    const order = p.map((_, i) => i).sort(() => 0);
    for (let j = order.length - 1; j > 0; j--) {
      const v = Math.floor(rng() * (j + 1));
      [order[j], order[v]] = [order[v], order[j]];
    }
    for (const i of order) {
      const winner = argmin(centers.map((c) => sq(p[i], c))),
        match = centers[winner].label === p[i].label,
        lr = o.learningRate * (1 - e / o.epochs);
      r.emit(
        "distance",
        `입력 클래스 ${p[i].label}, 승자 클래스 ${centers[winner].label}: ${match ? "일치 → 끌어당김" : "불일치 → 밀어냄"}`,
        { focus: [i], learning: { winner, radius: 0, rate: lr, match } },
        { winner, match: match ? 1 : 0 },
        200,
      );
      centers = centers.map((c, j) =>
        j === winner
          ? {
              ...c,
              x: c.x + (match ? 1 : -1) * lr * (p[i].x - c.x),
              y: c.y + (match ? 1 : -1) * lr * (p[i].y - c.y),
            }
          : c,
      );
      r.emit(
        "prototype",
        "LVQ1 프로토타입 가중치를 갱신합니다.",
        { centers },
        undefined,
        420,
      );
    }
    const accuracy =
      p.filter(
        (v) => centers[argmin(centers.map((c) => sq(v, c)))].label === v.label,
      ).length / p.length;
    r.emit(
      "prototype",
      `${e + 1} epoch: 훈련 정확도 ${(accuracy * 100).toFixed(1)}%`,
      { metric: [...r.state.metric, accuracy], metricName: "훈련 정확도" },
    );
  }
  r.emit("finish", "LVQ1 지도학습 완료. 데이터 색상은 정답 클래스입니다.", {
    focus: [],
  });
}
