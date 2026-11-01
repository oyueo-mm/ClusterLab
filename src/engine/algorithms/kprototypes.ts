import type { Dataset } from "../dataset";
import type { Point, Params } from "../types";
import type { Recorder } from "../trace";
import type { DataAnalysis } from "../dataTypes";
import {
  mixedRows,
  dataParams,
  mismatch,
  squared,
  chooseDistinct,
  modes,
  displayCenters,
} from "./dataCommon";

/** Full-feature squared numeric + gamma simple-matching categorical objective. */
export function kprototypes(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  dataParams(o);
  if (!Number.isFinite(o.gamma) || o.gamma < 0)
    throw new Error("혼합 범주 가중치 γ는 유한한 0 이상의 수여야 합니다.");
  const { numeric, categorical } = mixedRows(points, input),
    d = numeric[0].length;
  const ids = chooseDistinct(
    numeric.map((v, i) => [v, categorical[i]]),
    o.k,
    o.seed,
    JSON.stringify,
  );
  let nums = ids.map((i) => [...numeric[i]]),
    cats = ids.map((i) => [...categorical[i]]),
    labels = Array(points.length).fill(-1) as number[],
    objective = Infinity,
    converged = false;
  const distance = (i: number, c: number) =>
    squared(numeric[i], nums[c]) + o.gamma * mismatch(categorical[i], cats[c]);
  const assign = () =>
    numeric.map((_, i) => {
      let best = labels[i] >= 0 ? labels[i] : 0,
        value = distance(i, best);
      nums.forEach((_, c) => {
        const v = distance(i, c);
        if (v < value) {
          value = v;
          best = c;
        }
      });
      return best;
    });
  const cost = () => {
    const v = labels.reduce((s, c, i) => s + distance(i, c), 0);
    if (!Number.isFinite(v))
      throw new Error("수치 불안정: 혼합 목적함수가 유한하지 않습니다.");
    return v;
  };
  const analysis = (
    phase: string,
    extra: Partial<DataAnalysis> = {},
  ): DataAnalysis => ({
    kind: "data-clustering",
    method: "K-Prototypes",
    phase,
    dimensions: d + categorical[0].length,
    numericCenters: nums,
    categoricalCenters: cats,
    ...extra,
  });
  r.trace.recording!.policy =
    "전체 원본 수치 제곱거리 + γ×범주 불일치 비용, 평균·최빈값 batch 교대 갱신. 화면 좌표로 원본을 대체하지 않음.";
  r.emit(
    "initialize",
    "서로 다른 실제 혼합 행을 시드로 초기 프로토타입에 선택합니다.",
    { analysis: analysis("initialize") },
    { gamma: o.gamma },
  );
  for (let iteration = 0; iteration < o.iterations; iteration++) {
    const next = assign(),
      same = next.every((c, i) => c === labels[i]);
    labels = next;
    r.emit(
      "assign",
      "모든 수치 차원 제곱거리와 실제 범주 불일치 가중합을 최소화하는 프로토타입에 할당합니다.",
      { labels, analysis: analysis("assign") },
      { objective: cost() },
    );
    const counts = Array(nums.length).fill(0) as number[],
      sums = nums.map(() => Array(d).fill(0) as number[]);
    numeric.forEach((row, i) => {
      const c = labels[i];
      counts[c]++;
      row.forEach((v, j) => {
        sums[c][j] += v;
      });
    });
    nums = nums.map((old, c) =>
      counts[c] ? sums[c].map((v) => v / counts[c]) : old,
    );
    if (nums.some((row) => row.some((v) => !Number.isFinite(v))))
      throw new Error(
        "수치 불안정: 평균이 유한하지 않습니다. 수치형 특성 스케일을 조정하세요.",
      );
    const update = modes(categorical, labels, cats);
    cats = update.centers;
    objective = cost();
    converged = same;
    r.emit(
      "prototype",
      "수치형 열은 실제 산술평균, 범주형 열은 실제 최빈값으로 갱신합니다. 두 종류의 중심을 분리해 보존합니다.",
      {
        labels,
        centers: displayCenters(points, labels, nums.length),
        analysis: analysis("prototype-update", {
          objective,
          converged,
          frequencies: update.table,
        }),
        metric: [...r.state.metric, objective],
        metricName: "Squared numeric + γ mismatch",
      },
      { objective, iteration: iteration + 1 },
    );
    if (converged) break;
  }
  labels = assign();
  objective = cost();
  r.emit(
    "finish",
    converged
      ? "혼합 할당이 안정되어 종료했습니다. 최종 비용은 원본 전체 수치·범주에서 계산했습니다."
      : "반복 한도 종료: 반환 프로토타입으로 전체 최근접 할당·비용을 다시 계산했습니다. 고정점 수렴은 미확인입니다.",
    {
      labels,
      centers: displayCenters(points, labels, nums.length),
      analysis: analysis("finish", {
        objective,
        converged,
        frequencies: modes(categorical, labels, cats).table,
      }),
      focus: [],
      metric: [...r.state.metric, objective],
    },
    { objective, converged: String(converged) },
  );
}
