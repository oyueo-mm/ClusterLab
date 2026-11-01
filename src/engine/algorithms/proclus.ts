import { numericRows, type Dataset } from "../dataset";
import type { Point, Params } from "../types";
import type { Recorder } from "../trace";
import type { DataAnalysis } from "../dataTypes";
import { random } from "../math";
import { DEFAULT_WORKING_BYTES } from "../resources";
import { chooseDistinct, dataParams, squared } from "./dataCommon";

export function segmental(a: number[], b: number[], dimensions: number[]) {
  const value = dimensions.reduce(
    (s, j) => s + Math.abs(a[j] - b[j]) / dimensions.length,
    0,
  );
  if (!Number.isFinite(value))
    throw new Error("수치 불안정: PROCLUS segmental 거리가 유한하지 않습니다.");
  return value;
}
/** Constraint: sum |D_i| = k*l, with at least two dimensions per medoid. */
export function proclusDimensions(
  rows: number[][],
  medoids: number[],
  localities: number[][],
  averageDimensions: number,
) {
  const d = rows[0].length,
    k = medoids.length;
  const scores = medoids.map((id, c) => {
    const members = localities[c].length ? localities[c] : [id];
    const distances = Array.from({ length: d }, (_, j) =>
      members.reduce(
        (s, i) => s + Math.abs(rows[i][j] - rows[id][j]) / members.length,
        0,
      ),
    );
    const mean = distances.reduce((s, v) => s + v / d, 0);
    // Sample SD; population SD scales every cluster's Z by the same constant.
    const sd = Math.sqrt(
      distances.reduce((s, v) => s + (v - mean) ** 2 / (d - 1), 0),
    );
    if (!Number.isFinite(sd) || !Number.isFinite(mean))
      throw new Error("수치 불안정: PROCLUS 차원 점수가 유한하지 않습니다.");
    return distances.map((v) => (sd === 0 ? 0 : (v - mean) / sd));
  });
  const dimensions = scores.map((row) =>
    row
      .map((_, j) => j)
      .sort((a, b) => row[a] - row[b] || a - b)
      .slice(0, 2),
  );
  const remaining = scores
    .flatMap((row, c) =>
      row
        .map((score, j) => ({ score, c, j }))
        .filter((v) => !dimensions[c].includes(v.j)),
    )
    .sort((a, b) => a.score - b.score || a.c - b.c || a.j - b.j);
  remaining
    .slice(0, k * (averageDimensions - 2))
    .forEach((v) => dimensions[v.c].push(v.j));
  dimensions.forEach((row) => row.sort((a, b) => a - b));
  return { dimensions, scores };
}
export function proclusAssignment(
  rows: number[][],
  medoids: number[],
  dimensions: number[][],
) {
  return rows.map((row, i) => {
    const own = medoids.indexOf(i);
    let best = own >= 0 ? own : 0,
      distance = segmental(row, rows[medoids[best]], dimensions[best]);
    medoids.forEach((id, c) => {
      const v = segmental(row, rows[id], dimensions[c]);
      if (v < distance) {
        distance = v;
        best = c;
      }
    });
    return best;
  });
}
export function proclusObjective(
  rows: number[][],
  labels: number[],
  dimensions: number[][],
) {
  const d = rows[0].length,
    k = dimensions.length;
  const groups = Array.from({ length: k }, () => [] as number[]);
  labels.forEach((c, i) => {
    if (c >= 0) groups[c].push(i);
  });
  const means = groups.map((ids) =>
    Array.from({ length: d }, (_, j) =>
      ids.length ? ids.reduce((s, i) => s + rows[i][j] / ids.length, 0) : 0,
    ),
  );
  const value =
    labels.reduce(
      (s, c, i) =>
        s + (c >= 0 ? segmental(rows[i], means[c], dimensions[c]) : 0),
      0,
    ) / rows.length;
  if (!Number.isFinite(value))
    throw new Error("수치 불안정: PROCLUS 전체 품질 비용이 유한하지 않습니다.");
  return { value, groups, means };
}
function sample(ids: number[], count: number, rng: () => number) {
  const values = [...ids];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (values.length - i));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values.slice(0, count);
}

/** Three-phase PROCLUS: sample/greedy medoids, projected search, then actual cluster refinement. */
export function proclus(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  dataParams(o);
  const rows = numericRows(points, input),
    n = rows.length,
    d = rows[0]?.length ?? 0;
  if (
    n !== points.length ||
    n < 2 ||
    d < 2 ||
    rows.some((row) => row.length !== d || row.some((v) => !Number.isFinite(v)))
  )
    throw new Error(
      "PROCLUS에는 두 개 이상의 2차원 이상 유한 원본 벡터가 필요합니다.",
    );
  if (
    !Number.isSafeInteger(o.subspaceDimensions) ||
    o.subspaceDimensions < 2 ||
    o.subspaceDimensions > d ||
    !Number.isSafeInteger(o.samplingFactor) ||
    o.samplingFactor < 1 ||
    !Number.isSafeInteger(o.medoidFactor) ||
    o.medoidFactor < 1
  )
    throw new Error(
      "PROCLUS: 평균 선택 차원 ℓ는 2 이상 원본 차원 이하, 표본/medoid 배수는 양의 정수여야 합니다.",
    );
  const rng = random(o.seed),
    unique = chooseDistinct(rows, rows.length, o.seed, JSON.stringify),
    k = Math.min(o.k, unique.length);
  const estimated = n * k * 24 + n * d * 16 + k * d * 96;
  if (!Number.isFinite(estimated) || estimated > DEFAULT_WORKING_BYTES)
    throw new Error(
      `PROCLUS 메모리 예산 초과: 전체 locality·원본·차원 상태 추정 ${(estimated / 1048576).toFixed(1)} MiB. 원본을 표본으로 대체하지 않았습니다.`,
    );
  const selectedSample = sample(
    unique,
    Math.min(unique.length, o.samplingFactor * k),
    rng,
  );
  const pool = [selectedSample[Math.floor(rng() * selectedSample.length)]];
  const distances = selectedSample.map((id) =>
    squared(rows[id], rows[pool[0]]),
  );
  while (pool.length < Math.min(selectedSample.length, o.medoidFactor * k)) {
    let best = -1;
    selectedSample.forEach((id, i) => {
      if (
        !pool.includes(id) &&
        (best < 0 ||
          distances[i] > distances[best] ||
          (distances[i] === distances[best] && id < selectedSample[best]))
      )
        best = i;
    });
    const next = selectedSample[best];
    pool.push(next);
    selectedSample.forEach((id, i) => {
      distances[i] = Math.min(distances[i], squared(rows[id], rows[next]));
    });
  }
  let medoids = sample(pool, k, rng),
    dimensions: number[][] = [],
    scores: number[][] = [],
    localities: number[][] = [],
    objective = Infinity,
    accepted = true;
  const analysis = (
    phase: string,
    extra: Partial<DataAnalysis> = {},
  ): DataAnalysis => ({
    kind: "data-clustering",
    method: "PROCLUS",
    phase,
    dimensions: d,
    medoids,
    dimensionsByCluster: dimensions,
    dimensionScores: scores,
    localities,
    objective: Number.isFinite(objective) ? objective : undefined,
    sample: selectedSample,
    candidates: pool,
    accepted,
    ...extra,
  });
  r.trace.recording!.policy =
    "실제 표본·greedy 후보에서 PROCLUS medoid 탐색; 각 후보의 locality·할당·품질 평가는 전체 원본, 마지막 재차원 선택·outlier 판정. 전역 최적 보장 없음.";
  r.emit(
    "initialize",
    "실제 관측점 표본 S에서 farthest-first 후보 M을 구성한 뒤 K개 medoid를 시드로 선택합니다. 이후 평가는 전체 입력입니다.",
    {
      centers: medoids.map((id, label) => ({ ...points[id], id, label })),
      analysis: analysis("sample-greedy"),
    },
    { sample: selectedSample.length, candidateMedoids: pool.length },
  );
  let bestMedoids = [...medoids],
    bestLabels: number[] = [],
    bestDimensions: number[][] = [],
    bestScore = Infinity,
    failures = 0,
    proposal = 0;
  while (failures < o.iterations) {
    proposal++;
    localities = medoids.map((id, c) => {
      const radius = medoids.reduce(
        (best, other, j) =>
          j === c ? best : Math.min(best, squared(rows[id], rows[other])),
        Infinity,
      );
      return rows
        .map((row, i) => (squared(row, rows[id]) <= radius ? i : -1))
        .filter((i) => i >= 0);
    });
    const chosen = proclusDimensions(
      rows,
      medoids,
      localities,
      o.subspaceDimensions,
    );
    dimensions = chosen.dimensions;
    scores = chosen.scores;
    r.emit(
      "dimension",
      "각 medoid의 가장 가까운 다른 medoid 거리 안의 전체 원본 locality에서 차원별 평균 편차와 Z 점수를 계산합니다. 각 군집 최소 2축, 전체 Kℓ축을 선택합니다.",
      { analysis: analysis("locality-dimensions") },
      {
        proposal,
        selectedDimensions: dimensions.reduce((s, row) => s + row.length, 0),
      },
    );
    const labels = proclusAssignment(rows, medoids, dimensions),
      quality = proclusObjective(rows, labels, dimensions);
    objective = quality.value;
    accepted = objective < bestScore;
    if (accepted) {
      bestScore = objective;
      bestMedoids = [...medoids];
      bestLabels = [...labels];
      bestDimensions = dimensions.map((row) => [...row]);
      failures = 0;
    } else failures++;
    r.emit(
      "assign",
      "모든 원본을 군집별 선택 축의 Manhattan segmental 거리로 할당하고 실제 군집 centroid에 대한 평균 품질을 평가합니다.",
      {
        labels,
        centers: medoids.map((id, label) => ({ ...points[id], id, label })),
        analysis: analysis("full-assignment", {
          numericCenters: quality.means,
        }),
        metric: [...r.state.metric, objective],
        metricName: "PROCLUS full-data centroid cost",
      },
      {
        proposal,
        objective,
        bestScore,
        accepted: String(accepted),
        consecutiveFailures: failures,
      },
    );
    const groups = proclusObjective(rows, bestLabels, bestDimensions).groups;
    let smallest = 0;
    groups.forEach((g, c) => {
      if (g.length < groups[smallest].length) smallest = c;
    });
    const bad = groups
      .map((g, c) => (c === smallest || g.length < (0.1 * n) / k ? c : -1))
      .filter((c) => c >= 0);
    const fixed = bestMedoids.filter((_, c) => !bad.includes(c));
    const replacements = sample(
      pool.filter((id) => !fixed.includes(id)),
      bad.length,
      rng,
    );
    medoids = [...bestMedoids];
    bad.forEach((c, j) => {
      medoids[c] = replacements[j];
    });
    if (new Set(medoids).size !== k)
      throw new Error("PROCLUS 내부 오류: medoid 교환 후보가 중복되었습니다.");
  }
  medoids = bestMedoids;
  localities = proclusObjective(rows, bestLabels, bestDimensions).groups;
  const refined = proclusDimensions(
    rows,
    medoids,
    localities,
    o.subspaceDimensions,
  );
  dimensions = refined.dimensions;
  scores = refined.scores;
  r.emit(
    "refine",
    "최선 분할의 실제 군집 구성원을 locality 대신 사용해 차원을 다시 선택합니다. 탐색 단계와 다른 원문 정제 단계입니다.",
    { labels: bestLabels, analysis: analysis("cluster-refinement") },
  );
  let labels = proclusAssignment(rows, medoids, dimensions);
  const allAssigned = proclusObjective(rows, labels, dimensions);
  const influence = medoids.map((id, c) =>
    medoids.reduce(
      (best, other, j) =>
        j === c
          ? best
          : Math.min(best, segmental(rows[id], rows[other], dimensions[c])),
      Infinity,
    ),
  );
  labels = labels.map((c, i) =>
    medoids.every(
      (id, j) => segmental(rows[i], rows[id], dimensions[j]) > influence[j],
    )
      ? -1
      : c,
  );
  const final = proclusObjective(rows, labels, dimensions);
  objective = allAssigned.value;
  r.emit(
    "finish",
    "선택 축의 최근접 할당을 다시 계산하고 모든 medoid의 influence 범위를 벗어난 점을 실제 outlier로 표시합니다. 목적함수는 outlier 태그 이전 전체 할당 비용이며, 제외 후 비용은 별도로 반환합니다. 연속 미개선 한도 종료는 전역 최적 판정이 아닙니다.",
    {
      labels,
      centers: medoids.map((id, label) => ({ ...points[id], id, label })),
      analysis: analysis("finish", {
        influence: influence.map((v) =>
          Number.isFinite(v) ? v : Number.MAX_VALUE,
        ),
        numericCenters: allAssigned.means,
        retainedCost: final.value,
        converged: false,
      }),
      focus: [],
      metric: [...r.state.metric, objective],
    },
    {
      objective,
      retainedCost: final.value,
      proposals: proposal,
      noise: labels.filter((v) => v < 0).length,
    },
  );
}
