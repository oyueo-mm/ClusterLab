import type { Dataset, TimeSeriesDataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { TimeSeriesAnalysis } from "../timeseriesTypes";
import { symmetricEigen } from "../linalg";
import { random } from "../math";
import { DEFAULT_WORKING_BYTES } from "../resources";

const norm = (x: number[]) => x.reduce((n, v) => Math.hypot(n, v), 0);
/** Population-standard-deviation convention; all-flat sequences become zero. */
export function znShape(x: number[]) {
  if (x.length < 2 || x.some((v) => !Number.isFinite(v)))
    throw new Error("K-Shape 시계열은 유한한 값 2개 이상이어야 합니다.");
  if (x.every((v) => v === x[0])) return x.map(() => 0);
  const largest = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const exponent = Math.max(
    -1022,
    Math.min(1022, Math.floor(Math.log2(largest))),
  );
  const scaled = x.map((v) => v * 2 ** -exponent),
    anchor = scaled[0];
  const mean = anchor + scaled.reduce((s, v) => s + (v - anchor) / x.length, 0);
  const centered = scaled.map((v) => v - mean),
    spread = centered.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  if (!spread)
    throw new Error(
      "K-Shape 수치 불안정: 서로 다른 값의 표준편차가 소실됐습니다.",
    );
  const small = centered.map((v) => v / spread),
    std = Math.sqrt(small.reduce((s, v) => s + (v * v) / x.length, 0));
  return small.map((v) => v / std);
}
export function zeroShift(y: number[], shift: number) {
  return y.map((_, i) =>
    i - shift >= 0 && i - shift < y.length ? y[i - shift] : 0,
  );
}
/** Full-series norm denominator; no overlap renormalization and no circular shift. */
export function shapeDistance(reference: number[], sequence: number[]) {
  const n = reference.length;
  if (
    n < 2 ||
    sequence.length !== n ||
    reference.some((v) => !Number.isFinite(v)) ||
    sequence.some((v) => !Number.isFinite(v))
  )
    throw new Error("SBD는 같은 길이의 유한한 시계열을 요구합니다.");
  const nr = norm(reference),
    ns = norm(sequence),
    correlation: number[] = [];
  if (!Number.isFinite(nr) || !Number.isFinite(ns))
    throw new Error("SBD 수치 불안정: 시계열 norm이 유한하지 않습니다.");
  if (!nr || !ns)
    return {
      distance: !nr && !ns ? 0 : 1,
      shift: 0,
      aligned: sequence.slice(),
      correlation: Array(2 * n - 1).fill(0) as number[],
    };
  let maximum = -Infinity,
    shift = 0;
  for (let lag = 1 - n; lag < n; lag++) {
    let value = 0;
    for (let i = Math.max(0, lag); i < Math.min(n, n + lag); i++)
      value += (reference[i] / nr) * (sequence[i - lag] / ns);
    // Cauchy–Schwarz bounds; tolerate only roundoff around exact ±1.
    if (value > 1 + 1e-10 || value < -1 - 1e-10)
      throw new Error("NCC 수치 불안정: Cauchy–Schwarz 범위를 벗어났습니다.");
    value = Math.max(-1, Math.min(1, value));
    correlation.push(value);
    if (value > maximum) {
      maximum = value;
      shift = lag;
    }
  }
  return {
    distance: 1 - maximum,
    shift,
    aligned: zeroShift(sequence, shift),
    correlation,
  };
}
export function extractShape(rows: number[][], reference: number[]) {
  const m = reference.length;
  if (
    m < 2 ||
    reference.some((v) => !Number.isFinite(v)) ||
    rows.some((row) => row.length !== m || row.some((v) => !Number.isFinite(v)))
  )
    throw new Error("형태 추출은 동일 길이의 유한한 시계열을 요구합니다.");
  if (!rows.length)
    return {
      centroid: reference.slice(),
      aligned: [],
      shifts: [],
      eigenvalues: [],
      residual: 0,
      orientation: 1,
    };
  if (m * m * 128 > DEFAULT_WORKING_BYTES)
    throw new Error(
      "K-Shape 형태 행렬·고유해 메모리 예산 초과. 시계열 길이² 작업 공간이 필요합니다.",
    );
  const shifts: number[] = [];
  const aligned = rows.map((row) => {
    const result =
      norm(reference) > 0
        ? shapeDistance(reference, row)
        : { aligned: row.slice(), shift: 0 };
    shifts.push(result.shift);
    return result.aligned;
  });
  // A=X'Q, so AᵀA = Qᵀ X'ᵀ X' Q. Avoid materializing dense Q.
  const a = aligned.map((row) => {
    const mean = row.reduce((s, v) => s + v / m, 0);
    return row.map((v) => v - mean);
  });
  const matrix = Array.from({ length: m }, () => Array(m).fill(0) as number[]);
  for (const row of a)
    for (let i = 0; i < m; i++)
      for (let j = 0; j <= i; j++) matrix[i][j] += row[i] * row[j];
  for (let i = 0; i < m; i++)
    for (let j = 0; j < i; j++) matrix[j][i] = matrix[i][j];
  if (matrix.every((row) => row.every((v) => v === 0)))
    return {
      centroid: Array(m).fill(0) as number[],
      aligned,
      shifts,
      eigenvalues: Array(m).fill(0) as number[],
      residual: 0,
      orientation: 1,
    };
  const eigen = symmetricEigen(matrix),
    raw = eigen.vectors.map((row) => row[m - 1]),
    positive = znShape(raw),
    negative = positive.map((v) => -v);
  // Eigenvectors have two orientations. Choose the one with smaller actual
  // within-cluster squared SBD, rather than inventing a canonical waveform.
  const score = (center: number[]) =>
    rows.reduce((s, row) => s + shapeDistance(center, row).distance ** 2, 0);
  const orientation = score(negative) < score(positive) ? -1 : 1;
  return {
    centroid: orientation === 1 ? positive : negative,
    aligned,
    shifts,
    eigenvalues: eigen.values,
    residual: eigen.residual,
    orientation,
  };
}
export function checkedTimeSeries(
  p: Point[],
  input?: Dataset,
): TimeSeriesDataset {
  if (!input || input.kind !== "timeseries")
    throw new Error(
      "K-Shape는 실제 timeseries 원본 입력이 필요합니다. 2D 좌표를 시계열로 대신하지 않습니다.",
    );
  const data = input,
    n = data.series.length,
    m = data.series[0]?.values.length;
  if (n < 2 || p.length !== n || !m || m < 2)
    throw new Error("K-Shape 원본 시계열 수와 표시 수를 확인하세요.");
  const times = data.series[0].times,
    step = times[1] - times[0],
    epsilon = 1e-9 * Math.abs(step);
  if (!Number.isFinite(step) || step <= 0)
    throw new Error("K-Shape 공통 시간축은 양의 균일 간격이어야 합니다.");
  data.series.forEach((series) => {
    if (series.values.length !== m || series.times.length !== m)
      throw new Error(
        "K-Shape는 동일 길이 시계열을 요구합니다. 자동 resampling하지 않습니다.",
      );
    series.times.forEach((t, j) => {
      if (
        !Number.isFinite(t) ||
        Math.abs(t - times[j]) > epsilon ||
        (j > 0 && Math.abs(t - series.times[j - 1] - step) > epsilon)
      )
        throw new Error("K-Shape는 동일한 균일 시간축을 요구합니다.");
    });
    if (series.values.some((v) => !Number.isFinite(v)))
      throw new Error("K-Shape 값은 유한해야 합니다.");
  });
  return data;
}
export function kshape(p: Point[], o: Params, r: Recorder, input?: Dataset) {
  const data = checkedTimeSeries(p, input),
    n = data.series.length,
    m = data.series[0].values.length;
  if (
    !Number.isSafeInteger(o.k) ||
    o.k < 1 ||
    o.k > n ||
    !Number.isSafeInteger(o.iterations) ||
    o.iterations < 1 ||
    !Number.isFinite(o.tolerance) ||
    o.tolerance < 0 ||
    !Number.isSafeInteger(o.seed)
  )
    throw new Error("K-Shape K·반복·허용오차·시드를 확인하세요.");
  const estimate = m * m * 128 + n * m * 32 + o.k * m * 32;
  if (estimate > DEFAULT_WORKING_BYTES)
    throw new Error(
      `K-Shape 작업 공간 메모리 예산 초과: 추정 ${(estimate / 1048576).toFixed(1)} MiB. 원본을 자르지 않았습니다.`,
    );
  const series = data.series.map((s) => znShape(s.values)),
    rng = random(o.seed),
    order = Array.from({ length: n }, (_, i) => i);
  for (let j = n - 1; j > 0; j--) {
    const i = Math.floor(rng() * (j + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  let labels = Array(n).fill(0) as number[],
    centroids = Array.from({ length: o.k }, () => Array(m).fill(0) as number[]),
    converged = false,
    objective = 0;
  order.forEach(
    (id, j) => (labels[id] = j < o.k ? j : Math.floor(rng() * o.k)),
  );
  const assignedObjective = () =>
    series.reduce(
      (sum, row, i) =>
        sum + shapeDistance(centroids[labels[i]], row).distance ** 2,
      0,
    );
  objective = assignedObjective();
  const detailed =
    n * o.k * o.iterations * (o.k * m * 16 + m * 32 + 256) < 16 * 1024 * 1024;
  r.trace.recording!.policy = detailed
    ? "실제 전체 NCC 지연·zero-padding 정렬·고유벡터 형태 추출·할당"
    : "전체 시계열 계산, 실제 정렬/고유해/할당 단계 요약 · 표본 계산 없음";
  const meta = (
    phase: string,
    extra: Partial<TimeSeriesAnalysis> = {},
  ): TimeSeriesAnalysis => {
    const previous = r.state.analysis;
    return {
      kind: "timeseries-clustering",
      method: "K-Shape",
      phase,
      series:
        previous?.kind === "timeseries-clustering" ? previous.series : series,
      times: data.series[0].times,
      centroids,
      objective,
      converged,
      ...extra,
    };
  };
  r.emit(
    "initialize",
    "원본 시계열을 실제 z-normalize하고 시드로 비어 있지 않은 초기 군집에 배정합니다.",
    {
      labels,
      centers: [],
      analysis: meta("initialize"),
      metricName: "Sum squared SBD",
    },
    { series: n, length: m },
  );
  for (let iteration = 0; iteration < o.iterations; iteration++) {
    const previous = labels.slice();
    for (let cluster = 0; cluster < o.k; cluster++) {
      const members = labels.flatMap((label, i) =>
        label === cluster ? [i] : [],
      );
      if (!members.length) {
        r.emit(
          "extract",
          `군집 ${cluster + 1}은 비어 있어 이전 형태 중심을 유지합니다.`,
          {
            analysis: meta("empty-cluster", {
              activeCluster: cluster,
              emptyClusters: [cluster],
            }),
          },
        );
        continue;
      }
      const result = extractShape(
        members.map((i) => series[i]),
        centroids[cluster],
      );
      r.emit(
        "align",
        `군집 ${cluster + 1}: 실제 zero-padding 정렬과 QᵀXᵀXQ 고유해를 계산했습니다.`,
        {
          focus: members,
          analysis: meta("alignment", {
            aligned: result.aligned,
            shifts: result.shifts,
            clusterMembers: members,
            activeCluster: cluster,
            eigenvalues: result.eigenvalues,
            eigenResidual: result.residual,
            orientation: result.orientation,
          }),
        },
      );
      centroids = centroids.map((center, j) =>
        j === cluster ? result.centroid : center,
      );
      objective = assignedObjective();
      r.emit(
        "prototype",
        `군집 ${cluster + 1}: 최대 고유벡터에서 실제 형태 중심을 추출했습니다.`,
        {
          analysis: meta("shape", {
            activeCluster: cluster,
            aligned: result.aligned,
            shifts: result.shifts,
            clusterMembers: members,
            eigenvalues: result.eigenvalues,
            eigenResidual: result.residual,
            orientation: result.orientation,
          }),
        },
      );
    }
    const next: number[] = [],
      distances: number[] = [];
    for (let i = 0; i < n; i++) {
      let best = 0,
        distance = Infinity;
      for (let cluster = 0; cluster < o.k; cluster++) {
        const result = shapeDistance(centroids[cluster], series[i]);
        if (result.distance < distance) {
          best = cluster;
          distance = result.distance;
        }
        if (detailed)
          r.emit(
            "distance",
            `시계열 ${i + 1} ↔ 형태 ${cluster + 1}: 실제 SBD=${result.distance.toFixed(6)}, shift=${result.shift}`,
            {
              focus: [i],
              analysis: meta("correlation", {
                activeSeries: i,
                activeCluster: cluster,
                correlation: result.correlation,
                shifts: [result.shift],
                aligned: [result.aligned],
              }),
            },
            { distance: result.distance, shift: result.shift },
          );
      }
      next.push(best);
      distances.push(distance);
    }
    labels = next;
    objective = distances.reduce((s, d) => s + d * d, 0);
    converged = labels.every((v, i) => v === previous[i]);
    const emptyClusters = Array.from({ length: o.k }, (_, j) => j).filter(
      (j) => !labels.includes(j),
    );
    r.emit(
      "assign",
      "실제 최소 SBD 형태로 전체 시계열을 할당하고 ΣSBD²를 평가합니다.",
      {
        labels,
        focus: [],
        analysis: meta("assignment", { distances, emptyClusters }),
        metric: [...r.state.metric, objective],
      },
      { objective, iteration: iteration + 1, clusters: new Set(labels).size },
    );
    if (converged) break;
  }
  r.emit(
    "finish",
    converged
      ? "시계열 소속 변화가 없어 종료했습니다. 전역 최적이나 목적함수의 보편적 단조 감소를 보장하지 않습니다."
      : "반복 한도에서 실제 마지막 형태·최근접 SBD 할당을 반환합니다. 수렴 결과가 아닙니다.",
    {
      labels,
      focus: [],
      analysis: meta("finish", {
        emptyClusters: Array.from({ length: o.k }, (_, j) => j).filter(
          (j) => !labels.includes(j),
        ),
      }),
    },
    { objective, converged: String(converged), clusters: new Set(labels).size },
  );
}
