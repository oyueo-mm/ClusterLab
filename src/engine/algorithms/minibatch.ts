import type { Center, Params, Point } from "../types";
import type { Recorder } from "../trace";
import { random, sq } from "../math";
import { DEFAULT_TRACE_BYTES } from "../resources";
import { observedInitialization } from "./kmedians";

export function nearestBatchLabels(p: Point[], centers: Center[]) {
  return p.map((v) => {
    let winner = 0,
      best = sq(v, centers[0]);
    if (!Number.isFinite(best))
      throw new Error("수치 불안정: Mini-Batch 거리 제곱이 유한하지 않습니다.");
    for (let j = 1; j < centers.length; j++) {
      const value = sq(v, centers[j]);
      if (!Number.isFinite(value))
        throw new Error(
          "수치 불안정: Mini-Batch 거리 제곱이 유한하지 않습니다.",
        );
      if (value < best) {
        best = value;
        winner = j;
      }
    }
    if (!Number.isFinite(best))
      throw new Error("수치 불안정: Mini-Batch 거리 제곱이 유한하지 않습니다.");
    return winner;
  });
}

/** Assign the complete batch first, then update cumulative counts and means. */
export function miniBatchStep(
  batch: Point[],
  centers: Center[],
  counts: number[],
) {
  const assignments = nearestBatchLabels(batch, centers);
  const next = centers.map((c) => ({ ...c })),
    visits = [...counts];
  batch.forEach((p, i) => {
    const j = assignments[i],
      rate = 1 / ++visits[j];
    next[j].x += rate * (p.x - next[j].x);
    next[j].y += rate * (p.y - next[j].y);
    if (!Number.isFinite(next[j].x) || !Number.isFinite(next[j].y))
      throw new Error("수치 불안정: Mini-Batch 중심이 유한하지 않습니다.");
  });
  return { centers: next, counts: visits, assignments };
}

export function minibatch(p: Point[], o: Params, r: Recorder) {
  if (
    !Number.isSafeInteger(o.batchSize) ||
    o.batchSize < 1 ||
    !Number.isSafeInteger(o.epochs) ||
    o.epochs < 1
  )
    throw new Error(
      "Mini-Batch 파라미터 오류: batchSize와 epochs는 양의 정수여야 합니다.",
    );
  let centers = observedInitialization(p, o.k, o.seed),
    counts = centers.map(() => 0);
  const rng = random(o.seed ^ 0x9e3779b9),
    labels = Array(p.length).fill(-2) as number[];
  const batches = Math.ceil(p.length / o.batchSize);
  const detailed =
    o.epochs *
      batches *
      (p.length * 8 +
        centers.length * 160 +
        Math.min(o.batchSize, p.length) * 40 +
        1000) <
    DEFAULT_TRACE_BYTES / 2;
  r.trace.recording!.policy = detailed
    ? "실제 미니배치별 고정 할당·누적 방문수·중심 갱신 (모든 점은 epoch마다 방문)"
    : "실제 첫 미니배치와 epoch별 전체 평가 요약 · 전체 점을 epoch마다 학습";
  r.emit(
    "initialize",
    "관측 초기 중심과 방문수 0으로 시작합니다. 각 epoch는 시드 섞기 후 비복원 미니배치로 모든 점을 방문합니다.",
    {
      centers,
      analysis: {
        kind: "centroid-variant",
        phase: "initialization",
        metric: "squared-euclidean",
        counts,
      },
    },
  );
  for (let epoch = 0; epoch < o.epochs; epoch++) {
    const order = p.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let offset = 0; offset < order.length; offset += o.batchSize) {
      const batch = order.slice(offset, offset + o.batchSize);
      const update = miniBatchStep(
        batch.map((i) => p[i]),
        centers,
        counts,
      );
      batch.forEach((id, i) => {
        labels[id] = update.assignments[i];
      });
      const record = detailed || (epoch === 0 && offset === 0);
      if (record)
        r.emit(
          "assign",
          `${epoch + 1} epoch, ${Math.floor(offset / o.batchSize) + 1} 배치: 갱신 전 중심으로 배치 ${batch.length}개 점의 할당을 고정합니다.`,
          {
            labels,
            focus: batch,
            analysis: {
              kind: "centroid-variant",
              phase: "batch-assignment",
              metric: "squared-euclidean",
              batch,
              counts,
            },
          },
        );
      centers = update.centers;
      counts = update.counts;
      if (record)
        r.emit(
          "move",
          "고정된 배치 할당에 따라 방문수를 누적하고 η=1/v로 중심을 갱신합니다.",
          {
            centers,
            focus: batch,
            analysis: {
              kind: "centroid-variant",
              phase: "batch-update",
              metric: "squared-euclidean",
              batch,
              counts,
            },
          },
          { visits: counts.reduce((a, b) => a + b, 0) },
        );
    }
    const current = nearestBatchLabels(p, centers);
    const objective = p.reduce(
      (sum, v, i) => sum + sq(v, centers[current[i]]),
      0,
    );
    if (!Number.isFinite(objective))
      throw new Error("수치 불안정: 전체 SSE가 유한하지 않습니다.");
    for (let i = 0; i < labels.length; i++) labels[i] = current[i];
    r.emit(
      "assign",
      `${epoch + 1} epoch 완료: 전체 ${p.length}개 점을 현재 중심으로 평가합니다. 전체 SSE는 단조 감소하지 않을 수 있습니다.`,
      {
        labels,
        centers,
        focus: [],
        metric: [...r.state.metric, objective],
        metricName: "Full-input SSE after epoch",
        analysis: {
          kind: "centroid-variant",
          phase: "epoch-evaluation",
          metric: "squared-euclidean",
          counts,
          objective,
        },
      },
      {
        epoch: epoch + 1,
        objective,
        visits: counts.reduce((a, b) => a + b, 0),
      },
    );
  }
  r.emit(
    "finish",
    "지정 epoch를 마쳤습니다. 전체 최종 할당을 반환하며 Lloyd 수렴 또는 전역 최적을 주장하지 않습니다.",
    {
      focus: [],
      analysis: {
        kind: "centroid-variant",
        phase: "finish",
        metric: "squared-euclidean",
        counts,
        objective: r.state.metric.at(-1),
      },
    },
    {
      epochs: o.epochs,
      visits: counts.reduce((a, b) => a + b, 0),
      clusters: centers.length,
    },
  );
}
