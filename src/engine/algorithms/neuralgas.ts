import type { Params, Point, Center } from "../types";
import type { Recorder } from "../trace";
import { random, sq } from "../math";

export function neuralGasStep(
  centers: Center[],
  point: Point,
  rate: number,
  lambda: number,
) {
  const order = centers
    .map((c, i) => ({ i, d: sq(c, point) }))
    .sort((a, b) => a.d - b.d || a.i - b.i);
  if (order.some((x) => !Number.isFinite(x.d)))
    throw new Error("수치 불안정: Neural Gas 거리 제곱이 유한하지 않습니다.");
  const ranks = Array(centers.length).fill(0);
  order.forEach((item, rank) => {
    ranks[item.i] = rank;
  });
  return {
    ranks,
    winner: order[0].i,
    centers: centers.map((c, i) => {
      const h = rate * Math.exp(-ranks[i] / lambda);
      return {
        ...c,
        x: (1 - h) * c.x + h * point.x,
        y: (1 - h) * c.y + h * point.y,
      };
    }),
  };
}
export function shuffledOrder(n: number, rng: () => number) {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
export function prototypeError(p: Point[], centers: Point[]) {
  let cost = 0;
  for (const point of p) {
    let best = Infinity;
    for (const c of centers) best = Math.min(best, sq(point, c));
    cost += best / p.length;
  }
  return cost;
}
export function prototypeLabels(p: Point[], centers: Point[]) {
  return p.map((point) => {
    let best = 0;
    for (let i = 1; i < centers.length; i++)
      if (sq(point, centers[i]) < sq(point, centers[best])) best = i;
    return best;
  });
}
export function neuralgas(p: Point[], o: Params, r: Recorder) {
  if (
    !Number.isInteger(o.k) ||
    o.k < 1 ||
    !Number.isInteger(o.epochs) ||
    o.epochs < 1 ||
    !(o.learningRate > 0 && o.learningRate <= 1) ||
    !(o.lambda > 0) ||
    !Number.isFinite(o.lambda)
  )
    throw new Error(
      "Neural Gas 파라미터 오류: 양의 K/epoch/λ와 0<학습률≤1이 필요합니다.",
    );
  const rng = random(o.seed),
    initial = shuffledOrder(p.length, rng).slice(0, Math.min(o.k, p.length));
  let centers: Center[] = initial.map((i, id) => ({
    x: p[i].x,
    y: p[i].y,
    id,
  }));
  const total = p.length * o.epochs;
  let count = 0;
  r.emit(
    "initialize",
    "시드로 원본 관측점에서 서로 다른 뉴런을 초기화합니다. 고정 격자는 없습니다.",
    {
      centers,
      edges: [],
      analysis: { kind: "neural-gas", phase: "initialize", ranks: [] },
    },
  );
  for (let epoch = 0; epoch < o.epochs; epoch++) {
    const order = shuffledOrder(p.length, rng);
    for (const i of order) {
      const fraction = count / Math.max(1, total - 1),
        rate = o.learningRate * Math.pow(0.01, fraction),
        lambda = o.lambda * Math.pow(0.01 / o.lambda, fraction);
      const update = neuralGasStep(centers, p[i], rate, lambda);
      r.emit(
        "rank",
        "입력과 모든 뉴런 사이 거리를 정렬해 순위 kᵢ=0,1,…를 계산합니다.",
        {
          focus: [i],
          learning: { winner: update.winner, rate, radius: lambda },
          analysis: { kind: "neural-gas", phase: "rank", ranks: update.ranks },
        },
        { step: count + 1, lambda, rate },
        160,
      );
      centers = update.centers;
      r.emit(
        "prototype",
        "거리 순위의 exp(−kᵢ/λ) 이웃 함수로 모든 뉴런의 가중치를 갱신합니다.",
        {
          centers,
          analysis: { kind: "neural-gas", phase: "adapt", ranks: update.ranks },
        },
        undefined,
        260,
      );
      count++;
    }
    const error = prototypeError(p, centers);
    r.emit(
      "prototype",
      `${epoch + 1} epoch: 전체 데이터의 평균 제곱 양자화 오차`,
      {
        metric: [...r.state.metric, error],
        metricName: "Mean squared quantization error",
      },
      { error },
    );
  }
  r.emit(
    "finish",
    "학습 종료. 색은 최근접 뉴런의 BMU이며 별도 군집 추출이 아닙니다.",
    {
      labels: prototypeLabels(p, centers),
      focus: [],
      analysis: { kind: "neural-gas", phase: "finish", ranks: [] },
    },
  );
}
