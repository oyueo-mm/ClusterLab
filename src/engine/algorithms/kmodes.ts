import type { Dataset } from "../dataset";
import type { Point, Params } from "../types";
import type { Recorder } from "../trace";
import type { DataAnalysis } from "../dataTypes";
import {
  categoricalRows,
  dataParams,
  mismatch,
  chooseDistinct,
  modes,
  displayCenters,
} from "./dataCommon";

/** Batch simple-matching K-Modes. Display positions do not enter the objective. */
export function kmodes(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  dataParams(o);
  const rows = categoricalRows(points, input);
  let centers = chooseDistinct(rows, o.k, o.seed, JSON.stringify).map((i) => [
    ...rows[i],
  ]);
  let labels = Array(rows.length).fill(-1) as number[],
    objective = Infinity,
    converged = false;
  const analysis = (
    phase: string,
    extra: Partial<DataAnalysis> = {},
  ): DataAnalysis => ({
    kind: "data-clustering",
    method: "K-Modes",
    phase,
    dimensions: rows[0].length,
    categoricalCenters: centers,
    ...extra,
  });
  r.trace.recording!.policy =
    "범주형 원본 전체 simple-matching 할당·빈도·최빈값의 batch 교대 갱신. 표시 좌표는 계산에 사용하지 않음.";
  r.emit(
    "initialize",
    "서로 다른 실제 범주형 행을 시드로 초기 최빈값 벡터로 선택합니다.",
    { analysis: analysis("initialize") },
  );
  for (let iteration = 0; iteration < o.iterations; iteration++) {
    const next = rows.map((row, i) => {
      let best = labels[i] >= 0 ? labels[i] : 0,
        distance = mismatch(row, centers[best]);
      centers.forEach((center, c) => {
        const d = mismatch(row, center);
        if (d < distance) {
          distance = d;
          best = c;
        }
      });
      return best;
    });
    const same = next.every((v, i) => v === labels[i]);
    labels = next;
    r.emit(
      "assign",
      "원본 모든 범주에서 불일치 개수가 가장 작은 최빈값 벡터에 할당합니다.",
      { labels, analysis: analysis("assign") },
    );
    const update = modes(rows, labels, centers);
    centers = update.centers;
    objective = rows.reduce(
      (s, row, i) => s + mismatch(row, centers[labels[i]]),
      0,
    );
    converged = same;
    r.emit(
      "prototype",
      "군집·속성별 실제 빈도를 세어 최빈값을 갱신합니다. 빈 군집은 이전 벡터, 동률은 이전 최빈값을 우선합니다.",
      {
        labels,
        centers: displayCenters(points, labels, centers.length),
        analysis: analysis("mode-update", {
          objective,
          frequencies: update.table,
          converged,
        }),
        metric: [...r.state.metric, objective],
        metricName: "Categorical mismatch cost",
      },
      { objective, iteration: iteration + 1 },
    );
    if (converged) break;
  }
  // A final nearest-center assignment must agree with the returned prototypes.
  labels = rows.map((row, i) => {
    let best = labels[i],
      d = mismatch(row, centers[best]);
    centers.forEach((c, j) => {
      const v = mismatch(row, c);
      if (v < d) {
        best = j;
        d = v;
      }
    });
    return best;
  });
  objective = rows.reduce(
    (s, row, i) => s + mismatch(row, centers[labels[i]]),
    0,
  );
  r.emit(
    "finish",
    converged
      ? "범주형 할당이 안정되어 종료합니다. 최종 불일치 비용을 전체 원본에서 다시 계산했습니다."
      : "반복 한도에서 종료했습니다. 최종 할당은 반환한 최빈값 벡터의 최근접 결과이며 고정점 수렴은 보장하지 않습니다.",
    {
      labels,
      centers: displayCenters(points, labels, centers.length),
      analysis: analysis("finish", {
        objective,
        converged,
        frequencies: modes(rows, labels, centers).table,
      }),
      focus: [],
      metric: [...r.state.metric, objective],
    },
    { objective, converged: String(converged) },
  );
}
