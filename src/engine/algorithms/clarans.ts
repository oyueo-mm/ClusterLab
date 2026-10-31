import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import { random } from "../math";
import { fullMedoidAssignment, medoidSample } from "./clara";

/** Randomized search in the graph of k-medoid subsets; every score uses all rows. */
export function clarans(p: Point[], o: Params, r: Recorder) {
  if (
    !Number.isInteger(o.k) ||
    o.k < 1 ||
    !Number.isInteger(o.numLocal) ||
    o.numLocal < 1 ||
    !Number.isInteger(o.maxNeighbors) ||
    o.maxNeighbors < 1
  )
    throw new Error(
      "CLARANS 파라미터 오류: K, 재시작 수, 연속 거절 한도는 양의 정수여야 합니다.",
    );
  const k = Math.min(o.k, p.length),
    rng = random(o.seed);
  r.trace.recording!.policy =
    "CLARANS: 전체 입력 목적함수 + 무작위 medoid 교환 탐색. 모든 이웃/전역 최적해 보장 없음.";
  let bestMedoids: number[] = [],
    bestCost = Infinity;
  let proposals = 0;
  for (let trial = 1; trial <= o.numLocal; trial++) {
    const medoids = medoidSample(p.length, k, [], rng),
      set = new Set(medoids);
    const outsiders = p.map((_, i) => i).filter((i) => !set.has(i));
    let current = fullMedoidAssignment(p, medoids),
      rejected = 0;
    const meta = (phase: string, accepted?: boolean) => ({
      kind: "medoids" as const,
      phase,
      sample: [],
      trial,
      proposals,
      accepted,
      fullCost: current.cost,
    });
    r.emit(
      "initialize",
      `${trial}번째 무작위 medoid 집합을 전체 ${p.length}개 점에서 평가합니다.`,
      {
        labels: current.labels,
        centers: medoids.map((id) => ({ ...p[id], id })),
        focus: [],
        edges: [],
        analysis: meta("restart"),
        metric: [...r.state.metric, current.cost],
        metricName: "Full-data search cost (restarts)",
      },
      { fullCost: current.cost },
    );
    while (outsiders.length && rejected < o.maxNeighbors) {
      const m = Math.floor(rng() * k),
        h = Math.floor(rng() * outsiders.length),
        old = medoids[m],
        incoming = outsiders[h];
      const candidate = [...medoids];
      candidate[m] = incoming;
      const next = fullMedoidAssignment(p, candidate),
        delta = next.cost - current.cost;
      const accepted = delta < 0;
      proposals++;
      r.emit(
        "swap",
        `실제 무작위 교환 ${old + 1} ↔ ${incoming + 1}: 전체 거리합 Δ=${delta.toFixed(6)}. ${accepted ? "수용" : "거절"}`,
        {
          focus: [old, incoming],
          edges: [{ a: old, b: incoming }],
          analysis: meta("proposal", accepted),
        },
        {
          delta,
          candidateCost: next.cost,
          proposals,
          accepted: String(accepted),
          rejectedBefore: rejected,
        },
        200,
      );
      if (accepted) {
        medoids[m] = incoming;
        outsiders[h] = old;
        current = next;
        rejected = 0;
        r.emit(
          "move",
          "더 낮은 전체 비용의 이웃으로 이동하고 연속 거절 수를 0으로 초기화합니다.",
          {
            labels: current.labels,
            centers: medoids.map((id) => ({ ...p[id], id })),
            focus: [],
            edges: [],
            analysis: meta("accepted", true),
            metric: [...r.state.metric, current.cost],
          },
          { fullCost: current.cost, consecutiveRejected: rejected },
        );
      } else {
        rejected++;
        r.emit(
          "visit",
          "비용이 낮아지지 않은 교환을 거절하고 현재 medoid를 유지합니다.",
          { focus: [], edges: [], analysis: meta("rejected", false) },
          { fullCost: current.cost, consecutiveRejected: rejected },
          100,
        );
      }
    }
    if (current.cost < bestCost) {
      bestCost = current.cost;
      bestMedoids = [...medoids];
    }
    r.emit(
      "extract",
      "연속 거절 한도 또는 모든 점 medoid 조건으로 현재 탐색을 마칩니다. 전수 이웃 최적성 판정이 아닙니다.",
      { focus: [], edges: [], analysis: meta("local-search-end") },
      { localCost: current.cost, bestCost, consecutiveRejected: rejected },
    );
  }
  const full = fullMedoidAssignment(p, bestMedoids);
  r.emit(
    "finish",
    "여러 무작위 시작 중 전체 비용이 가장 낮은 medoid 분할을 반환합니다. 전역 최적성을 보장하지 않습니다.",
    {
      labels: full.labels,
      centers: bestMedoids.map((id) => ({ ...p[id], id })),
      focus: [],
      edges: [],
      analysis: {
        kind: "medoids",
        phase: "finish",
        sample: [],
        trial: o.numLocal,
        proposals,
        fullCost: full.cost,
      },
      metric: [...r.state.metric, full.cost],
    },
    { fullCost: full.cost, proposals },
  );
}
