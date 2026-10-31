import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import { random } from "../math";

export const medoidDistance = (a: Point, b: Point) => {
  const d = Math.hypot(a.x - b.x, a.y - b.y);
  if (!Number.isFinite(d))
    throw new Error("수치 불안정: medoid 거리가 유한하지 않습니다.");
  return d;
};
export function fullMedoidAssignment(p: Point[], medoids: number[]) {
  if (!medoids.length) throw new Error("Medoid 집합은 비어 있을 수 없습니다.");
  let cost = 0;
  const labels = p.map((point) => {
    let best = 0,
      nearest = Infinity;
    medoids.forEach((id, label) => {
      const d = medoidDistance(point, p[id]);
      if (d < nearest) {
        nearest = d;
        best = label;
      }
    });
    cost += nearest;
    if (!Number.isFinite(cost))
      throw new Error("수치 불안정: 전체 medoid 거리합이 유한하지 않습니다.");
    return best;
  });
  return { labels, cost };
}
/** Uniform reservoir over non-required indices; only O(size) retained storage. */
export function medoidSample(
  n: number,
  size: number,
  required: number[],
  rng: () => number,
) {
  const included = new Set(required),
    reservoir: number[] = [];
  const slots = size - required.length;
  let seen = 0;
  for (let i = 0; i < n; i++) {
    if (included.has(i)) continue;
    if (reservoir.length < slots) reservoir.push(i);
    else {
      const j = Math.floor(rng() * (seen + 1));
      if (j < slots) reservoir[j] = i;
    }
    seen++;
  }
  return [...required, ...reservoir].sort((a, b) => a - b);
}
export function clara(p: Point[], o: Params, r: Recorder) {
  const k = Math.min(o.k, p.length),
    size = Math.min(o.sampleSize, p.length);
  if (
    !Number.isInteger(o.k) ||
    o.k < 1 ||
    !Number.isInteger(o.sampleSize) ||
    size < k ||
    !Number.isInteger(o.numLocal) ||
    o.numLocal < 1 ||
    !Number.isInteger(o.iterations) ||
    o.iterations < 1
  )
    throw new Error(
      "CLARA 파라미터 오류: 표본 크기는 K 이상이며 반복·표본 수는 양의 정수여야 합니다.",
    );
  r.trace.recording!.policy =
    "CLARA: 표본 PAM 탐색 + 전체 입력 비용·할당 계산. 전체 PAM/전역 최적해 보장 없음.";
  const rng = random(o.seed);
  let bestMedoids: number[] = [],
    bestCost = Infinity;
  for (let trial = 1; trial <= o.numLocal; trial++) {
    const sample = medoidSample(p.length, size, bestMedoids, rng);
    const ds = sample.map((a) => sample.map((b) => medoidDistance(p[a], p[b])));
    const medoids: number[] = [];
    const meta = (
      phase: string,
      proposals?: number,
      accepted?: boolean,
      fullCost?: number,
    ) => ({
      kind: "medoids" as const,
      phase,
      sample,
      trial,
      proposals,
      accepted,
      fullCost,
    });
    r.emit(
      "initialize",
      `${trial}번째 표본 ${size}개 선택: 이전 최선 medoid를 포함합니다. 탐색 표본과 전체 입력은 다릅니다.`,
      { focus: sample, edges: [], analysis: meta("sample") },
      { sampleSize: size, fullCount: p.length },
    );
    const nearest = Array(size).fill(Infinity);
    for (let j = 0; j < k; j++) {
      let candidate = -1,
        candidateCost = Infinity;
      for (let h = 0; h < size; h++) {
        if (medoids.includes(h)) continue;
        let cost = 0;
        for (let i = 0; i < size; i++) cost += Math.min(nearest[i], ds[i][h]);
        if (!Number.isFinite(cost))
          throw new Error("수치 불안정: 표본 PAM 거리합이 유한하지 않습니다.");
        if (cost < candidateCost) {
          candidate = h;
          candidateCost = cost;
        }
      }
      medoids.push(candidate);
      for (let i = 0; i < size; i++)
        nearest[i] = Math.min(nearest[i], ds[i][candidate]);
      r.emit(
        "initialize",
        "표본 PAM BUILD: 표본 총 거리 비용을 가장 줄이는 관측점을 추가합니다.",
        {
          centers: medoids.map((s) => ({ ...p[sample[s]], id: sample[s] })),
          focus: [sample[candidate]],
          analysis: meta("sample-build"),
        },
        { sampleCost: candidateCost },
      );
    }
    const sampleCost = (ids: number[]) => {
      const cost = ds.reduce(
        (total, row) => total + Math.min(...ids.map((id) => row[id])),
        0,
      );
      if (!Number.isFinite(cost))
        throw new Error("수치 불안정: 표본 PAM 거리합이 유한하지 않습니다.");
      return cost;
    };
    let current = sampleCost(medoids),
      localOptimal = false;
    for (let it = 0; it < o.iterations; it++) {
      let best = current,
        swap: [number, number] | undefined,
        proposals = 0;
      for (let m = 0; m < k; m++)
        for (let h = 0; h < size; h++) {
          if (medoids.includes(h)) continue;
          const candidate = [...medoids];
          candidate[m] = h;
          const cost = sampleCost(candidate);
          proposals++;
          if (cost < best) {
            best = cost;
            swap = [m, h];
          }
        }
      r.emit(
        "swap",
        `표본 PAM ${it + 1}회: 실제 ${proposals}개 교환 후보를 전수 평가했습니다.`,
        {
          focus: swap ? [sample[medoids[swap[0]]], sample[swap[1]]] : sample,
          analysis: meta("sample-swap-scan", proposals, !!swap),
        },
        { sampleCost: current, bestSampleCost: best, proposals },
      );
      if (!swap) {
        localOptimal = true;
        break;
      }
      medoids[swap[0]] = swap[1];
      current = best;
      r.emit(
        "move",
        "표본 비용을 가장 줄이는 실제 medoid 교환을 수용합니다.",
        {
          centers: medoids.map((s) => ({ ...p[sample[s]], id: sample[s] })),
          analysis: meta("sample-swap-accept", proposals, true),
          focus: [],
          edges: [],
        },
        { sampleCost: current },
      );
    }
    const global = medoids.map((s) => sample[s]),
      full = fullMedoidAssignment(p, global);
    const accepted = full.cost < bestCost;
    if (accepted) {
      bestCost = full.cost;
      bestMedoids = [...global];
    }
    r.emit(
      "assign",
      `전체 ${p.length}개 점의 거리 비용으로 이 표본 해를 평가합니다. ${accepted ? "최선 해 갱신" : "기존 최선 해 유지"}.`,
      {
        labels: full.labels,
        centers: global.map((id) => ({ ...p[id], id })),
        focus: [],
        analysis: meta("full-evaluation", undefined, accepted, full.cost),
        metric: [...r.state.metric, bestCost],
        metricName: "Best full-data distance cost",
      },
      {
        fullCost: full.cost,
        bestCost,
        sampleLocalOptimal: String(localOptimal),
      },
    );
  }
  const full = fullMedoidAssignment(p, bestMedoids);
  r.emit(
    "finish",
    "전체 입력에서 비용이 가장 낮았던 표본 해를 반환합니다. 표본 기반 탐색이며 전역 최적성을 보장하지 않습니다.",
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
        fullCost: full.cost,
      },
    },
    { fullCost: full.cost },
  );
}
