import type { Point, Params } from "../types";
import { Recorder } from "../trace";
import type { Center } from "../types";
import { random, sq, argmin, sum } from "../math";
export function som(p: Point[], o: Params, r: Recorder) {
  const rng = random(o.seed),
    g = o.grid;
  let centers: Center[] = Array.from({ length: g * g }, () => ({
    x: 0.15 + rng() * 0.7,
    y: 0.15 + rng() * 0.7,
  }));
  const edges = centers.flatMap((_, i) => [
    ...(i % g < g - 1 ? [{ a: i, b: i + 1 }] : []),
    ...(i < g * (g - 1) ? [{ a: i, b: i + g }] : []),
  ]);
  r.emit(
    "initialize",
    "2D 뉴런 격자를 데이터 공간의 가중치 벡터로 초기화합니다.",
    { centers, edges },
  );
  for (let epoch = 0; epoch < o.epochs; epoch++) {
    const order = p.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let t = 0; t < order.length; t++) {
      const i = order[t],
        progress = (epoch + t / p.length) / o.epochs,
        lr = o.learningRate * Math.exp(-3 * progress),
        radius = Math.max(0.1, o.radius * Math.exp(-3 * progress)),
        bmu = argmin(centers.map((c) => sq(p[i], c)));
      r.emit(
        "distance",
        `BMU 뉴런 ${bmu + 1}, 학습률 ${lr.toFixed(3)}, 격자 이웃 반경 ${radius.toFixed(2)}`,
        { focus: [i], radius: 0, learning: { winner: bmu, radius, rate: lr } },
        { bmu, learningRate: lr, gridRadius: radius },
        150,
      );
      centers = centers.map((c, j) => {
        const gd =
            ((j % g) - (bmu % g)) ** 2 +
            (Math.floor(j / g) - Math.floor(bmu / g)) ** 2,
          h = Math.exp(-gd / (2 * radius * radius));
        return {
          x: c.x + lr * h * (p[i].x - c.x),
          y: c.y + lr * h * (p[i].y - c.y),
        };
      });
      r.emit(
        "prototype",
        "격자 거리의 Gaussian 이웃 함수로 BMU와 주변 뉴런을 갱신합니다.",
        { centers },
        undefined,
        280,
      );
    }
    const qe =
      sum(p.map((v) => Math.sqrt(Math.min(...centers.map((c) => sq(v, c)))))) /
      p.length;
    r.emit(
      "prototype",
      `${epoch + 1} epoch: Quantization Error ${qe.toFixed(5)}`,
      { metric: [...r.state.metric, qe], metricName: "Quantization Error" },
    );
  }
  r.emit(
    "finish",
    "위상 학습 완료. 색상은 가장 가까운 뉴런의 인덱스이며 별도 군집 추출 결과가 아닙니다.",
    { labels: p.map((v) => argmin(centers.map((c) => sq(v, c)))), focus: [] },
  );
}
