import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { Dataset } from "../dataset";
import { average, checkedRows, squared } from "./autoCommon";

/** Kulis–Jordan Algorithm 1: sequential creation, then mean updates. */
export function dpmeans(p: Point[], o: Params, r: Recorder, input?: Dataset) {
  const x = checkedRows(p, o, input);
  if (!Number.isFinite(o.lambda) || o.lambda <= 0)
    throw new Error("DP-Means λ는 유한한 양의 제곱거리 벌점이어야 합니다.");
  let centers = [average(x)],
    labels = Array(x.length).fill(0) as number[],
    converged = false,
    limited = false;
  const detailed = x.length * o.iterations * 384 < 16 * 1024 * 1024;
  r.trace.recording!.policy = detailed
    ? "실제 순차 거리·중심 생성·전체 평균/벌점 기록"
    : "전체 원본의 실제 중심 생성과 반복별 요약 · 표본 계산 없음";
  const meta = () => {
    const sse = x.reduce(
      (s, row, i) => s + squared(row, centers[labels[i]]),
      0,
    );
    const objective = sse + o.lambda * centers.length;
    if (!Number.isFinite(objective))
      throw new Error("수치 불안정: DP-Means 목적함수가 유한하지 않습니다.");
    return {
      kind: "model-selection" as const,
      method: "DP-Means",
      phase: "initialize",
      dimensions: x[0].length,
      centroids: centers,
      sse,
      penalty: o.lambda,
      objective,
      converged,
    };
  };
  r.emit(
    "initialize",
    "전체 평균 한 중심에서 시작합니다. λ는 거리 반경이 아닌 제곱거리 벌점입니다.",
    { labels, centers: [], analysis: meta(), metricName: "SSE + λK" },
  );
  for (let iteration = 0; iteration < o.iterations; iteration++) {
    const previous = labels.slice();
    let created = false;
    limited = false;
    for (let i = 0; i < x.length; i++) {
      let winner = 0,
        cost = squared(x[i], centers[0]);
      centers.forEach((c, j) => {
        const v = squared(x[i], c);
        if (v < cost) {
          cost = v;
          winner = j;
        }
      });
      if (
        cost > o.lambda &&
        centers.length < Math.min(o.maxClusters, x.length)
      ) {
        centers.push(x[i].slice());
        winner = centers.length - 1;
        created = true;
        labels[i] = winner;
        r.emit(
          "insert",
          `점 ${i + 1}: 최근접 제곱거리 ${cost.toPrecision(5)}>λ, 실제 새 중심 생성`,
          { labels, focus: [i], analysis: { ...meta(), phase: "create" } },
          {
            distanceSquared: cost,
            penalty: o.lambda,
            clusters: centers.length,
          },
        );
      } else {
        if (cost > o.lambda) limited = true;
        labels[i] = winner;
        if (detailed)
          r.emit(
            "assign",
            `점 ${i + 1}: 현재 중심 ${winner + 1}에 순차 할당`,
            { labels, focus: [i] },
            { distanceSquared: cost },
          );
      }
    }
    const used = centers.map((_, j) => j).filter((j) => labels.includes(j));
    const index = new Map(used.map((j, i) => [j, i]));
    labels = labels.map((j) => index.get(j)!);
    centers = used.map((_, j) => average(x.filter((_, i) => labels[i] === j)));
    converged =
      !created && !limited && labels.every((v, i) => v === previous[i]);
    const analysis = { ...meta(), phase: "mean" };
    r.emit(
      "move",
      "한 번의 순차 방문 후 실제 군집 평균·SSE+λK를 갱신합니다.",
      {
        labels,
        focus: [],
        analysis,
        metric: [...r.state.metric, analysis.objective!],
      },
      {
        objective: analysis.objective!,
        clusters: centers.length,
        iteration: iteration + 1,
      },
    );
    if (converged) break;
  }
  r.emit(
    "finish",
    converged
      ? "새 중심과 할당 변화가 없어 지역 수렴했습니다."
      : limited
        ? "사용자가 설정한 최대 군집 수에 도달했습니다. λ 조건의 무제한 DP-Means 수렴 결과가 아닙니다."
        : "반복 한도에 도달했습니다. 마지막 실제 할당·평균 상태이며 수렴 보장은 없습니다.",
    { labels, focus: [], analysis: { ...meta(), phase: "finish" } },
    {
      clusters: centers.length,
      converged: String(converged),
      limitReached: String(limited),
    },
  );
}
