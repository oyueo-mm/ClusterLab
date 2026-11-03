import type { Dataset } from "../dataset";
import type { Params, Point, EventKind } from "../types";
import type { Recorder } from "../trace";
import type {
  MetricAnalysis,
  MetricCandidate,
  MetricPair,
} from "../metricTypes";
import { validateDataset } from "../datasetValidation";
import { constraintClosure } from "./copkmeans";
import { random } from "../math";
import { ndMean, ndSquared, ndBounds, projectedCenters } from "../ndMath";
import { DEFAULT_TRACE_BYTES, DEFAULT_WORKING_BYTES } from "../resources";

/** ICML2004 Eq6/8, multiple strictly positive diagonal metrics. No full-SPD claim. */
export function mpckmeans(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  if (input?.kind !== "constrained")
    throw Error("MPCKMeans는 원본 ND constrained 입력이 필요합니다.");
  validateDataset(input);
  if (
    [
      "weights",
      "mustLinkWeights",
      "cannotLinkWeights",
      "constraintWeights",
      "soft",
    ].some((key) => Object.hasOwn(input, key))
  )
    throw Error("MPCKMeans 기본형은 일관 ML/CL·전역 균일 비용만 지원합니다.");
  const x = input.data.values,
    n = x.length,
    d = x[0].length,
    k = o.k,
    w = o.constraintPenalty;
  if (
    points.length !== n ||
    !Number.isSafeInteger(k) ||
    k < 1 ||
    k > n ||
    !Number.isSafeInteger(o.seed) ||
    !Number.isSafeInteger(o.iterations) ||
    o.iterations < 1 ||
    ![w, o.tolerance, o.metricTolerance, o.metricConditioning].every(
      (v) => Number.isFinite(v) && v >= 0,
    )
  )
    throw Error(
      "MPCKMeans: 정수1≤K≤n·시드·양의 반복·유한 비음수 비용/허용오차/조건화가 필요합니다.",
    );
  const estimate =
    n * (d * 24 + k * 16 + 224) +
    (input.mustLink.length + input.cannotLink.length) * 192 +
    k * d * 160;
  if (!Number.isFinite(estimate) || estimate > DEFAULT_WORKING_BYTES)
    throw Error(
      "MPCKMeans 작업 메모리 예산 초과. 전체 입력을 잘라 계산하지 않습니다.",
    );
  const c = constraintClosure(n, input.mustLink, input.cannotLink),
    rng = random(o.seed),
    bounds = ndBounds(x);
  const groups = Array.from(
    { length: c.componentSizes.length },
    () => [] as number[],
  );
  c.componentIds.forEach((g, i) => groups[g].push(i));
  const neighborhoods = groups
    .filter((g) => g.length > 1)
    .sort((a, b) => b.length - a.length || a[0] - b[0]);
  const eachML = (fn: (i: number, j: number) => void) => {
    for (const g of groups)
      for (let a = 0; a < g.length; a++)
        for (let b = a + 1; b < g.length; b++) fn(g[a], g[b]);
  };
  const eachCL = (fn: (i: number, j: number) => void) => {
    for (const [a, b] of c.componentCannotLink)
      for (const i of groups[a]) for (const j of groups[b]) fn(i, j);
  };
  const detailed =
    n <= 96 &&
    n * k * o.iterations * (n * 8 + k * 128 + d * k * 64) <
      DEFAULT_TRACE_BYTES / 4;
  r.trace.recording!.policy = `원본 ${d}D 전체 MPCKMeans2004 · multiple diagonal · 전체 최대쌍 전수 · ${detailed ? "실제 후보 비용" : "전체 계산·sweep 요약"} · 특이 조건화는 명시적 선택`;
  let centroids: number[][] = [],
    metrics = Array.from({ length: k }, () => Array(d).fill(1) as number[]),
    previousMetrics: number[][] = [],
    denominators: number[][] = [];
  let labels = Array(n).fill(-2) as number[],
    diameters: MetricPair[] = [],
    iteration = 0,
    converged = false,
    stopReason: MetricAnalysis["stopReason"];
  let counts = Array(k).fill(0) as number[],
    conditioned: number[] = [],
    objectiveIncreases = 0,
    witnessChanges = 0,
    movement = 0,
    metricMovement = 0;
  let costs = {
    distanceCost: 0,
    logDetCost: 0,
    mustLinkCost: 0,
    cannotLinkCost: 0,
    objective: 0,
    mustViolations: 0,
    cannotViolations: 0,
    originalMustViolations: 0,
    originalCannotViolations: 0,
  };
  let metadata = {
    dimensionBounds: bounds,
    mustLink: c.mustLink,
    cannotLink: c.cannotLink,
    componentIds: c.componentIds,
    componentSizes: c.componentSizes,
    componentCannotLink: c.componentCannotLink,
  };
  const closureMustCount = groups.reduce(
      (s, g) => s + (g.length * (g.length - 1)) / 2,
      0,
    ),
    closureCannotCount = c.componentCannotLink.reduce(
      (s, [a, b]) => s + groups[a].length * groups[b].length,
      0,
    );
  const emit = (
    kind: EventKind,
    phase: string,
    description: string,
    extra: Partial<MetricAnalysis> = {},
    plot = false,
  ) => {
    const analysis: MetricAnalysis = {
      kind: "metric-pairwise",
      method: "MPCKMeans2004-diagonal",
      phase,
      dimensions: d,
      ...metadata,
      centroids,
      metrics,
      previousMetrics,
      denominators,
      diameters,
      counts,
      closureMustCount,
      closureCannotCount,
      penalty: w,
      iteration,
      ...costs,
      objectiveReady: ![
        "closure",
        "neighborhood-initialize",
        "maximum-search",
      ].includes(phase),
      conditioned,
      objectiveIncreases,
      witnessChanges,
      movement,
      metricMovement,
      converged,
      stopReason,
      ...extra,
    };
    r.emit(
      kind,
      description,
      {
        labels,
        centers: projectedCenters(centroids, bounds),
        focus: extra.current === undefined ? [] : [extra.current],
        activeCenter: extra.chosen ?? -1,
        analysis,
        ...(plot
          ? {
              metric: [...r.state.metric, costs.objective],
              metricName: "MPCKMeans 거리 − logdet + ML/CL",
            }
          : {}),
      },
      { iteration, objective: costs.objective },
    );
    if (r.state.analysis?.kind === "metric-pairwise") {
      const a = r.state.analysis;
      metadata = {
        dimensionBounds: a.dimensionBounds,
        mustLink: a.mustLink,
        cannotLink: a.cannotLink,
        componentIds: a.componentIds,
        componentSizes: a.componentSizes,
        componentCannotLink: a.componentCannotLink,
      };
    }
  };
  const squared = (a: number[], b: number[], metric: number[]) => {
    let s = 0;
    for (let q = 0; q < d; q++) s += metric[q] * (a[q] - b[q]) ** 2;
    if (!Number.isFinite(s)) throw Error("MPCKMeans 거리 수치 overflow.");
    return s;
  };
  const logDet = (a: number[]) => a.reduce((s, v) => s + Math.log(v), 0);
  const cache = new Map<string, MetricPair>();
  const maxima = () =>
    metrics.map((a, h) => {
      const key = JSON.stringify(a),
        cached = cache.get(key);
      if (cached) return cached;
      let best = -1,
        pair: [number, number] = [0, 0],
        checked = 0;
      const total = (n * (n - 1)) / 2;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const s = squared(x[i], x[j], a);
          checked++;
          if (s > best) {
            best = s;
            pair = [i, j];
          }
        }
        if ((i + 1) % Math.max(32, Math.ceil(n / 24)) === 0 && i < n - 1)
          emit(
            "distance",
            "maximum-search",
            `군집 ${h + 1}: 전체 원본 최대쌍 탐색 ${checked}/${total}. 부분 최대는 최종 비용에 사용하지 않습니다.`,
            {
              search: {
                cluster: h,
                checked,
                total,
                complete: false,
                maximum: Math.max(0, best),
              },
            },
          );
      }
      const result = {
        value: Math.max(0, best),
        pair,
        delta: x[pair[0]].map((v, q) => (v - x[pair[1]][q]) ** 2),
      };
      if (cache.size >= k * 2) cache.clear();
      cache.set(key, result);
      return result;
    });
  const total = () => {
    let distanceCost = 0,
      logDetCost = 0,
      mustLinkCost = 0,
      cannotLinkCost = 0,
      mustViolations = 0,
      cannotViolations = 0;
    counts = Array(k).fill(0) as number[];
    for (let i = 0; i < n; i++) {
      const h = labels[i];
      counts[h]++;
      distanceCost += squared(x[i], centroids[h], metrics[h]);
      logDetCost -= logDet(metrics[h]);
    }
    eachML((i, j) => {
      if (labels[i] !== labels[j]) {
        mustViolations++;
        mustLinkCost +=
          w *
          0.5 *
          (squared(x[i], x[j], metrics[labels[i]]) +
            squared(x[i], x[j], metrics[labels[j]]));
      }
    });
    eachCL((i, j) => {
      if (labels[i] === labels[j]) {
        cannotViolations++;
        cannotLinkCost +=
          w *
          (diameters[labels[i]].value -
            squared(x[i], x[j], metrics[labels[i]]));
      }
    });
    const objective = distanceCost + logDetCost + mustLinkCost + cannotLinkCost;
    if (!Number.isFinite(objective))
      throw Error("MPCKMeans 목적함수 수치 불안정.");
    return {
      distanceCost,
      logDetCost,
      mustLinkCost,
      cannotLinkCost,
      objective,
      mustViolations,
      cannotViolations,
      originalMustViolations: c.mustLink.filter(
        ([i, j]) => labels[i] !== labels[j],
      ).length,
      originalCannotViolations: c.cannotLink.filter(
        ([i, j]) => labels[i] === labels[j],
      ).length,
    };
  };
  emit(
    "initialize",
    "closure",
    "일관 ML 폐쇄·CL 성분 전파. 위반 비용과 위반 개수는 별개입니다.",
  );
  const selected: number[] = [];
  if (neighborhoods.length) {
    selected.push(0);
    while (selected.length < Math.min(k, neighborhoods.length)) {
      let best = -1,
        score = -1;
      for (let h = 0; h < neighborhoods.length; h++)
        if (!selected.includes(h)) {
          const v = ndMean(x, neighborhoods[h]),
            s =
              neighborhoods[h].length *
              Math.min(
                ...selected.map((j) =>
                  ndSquared(v, ndMean(x, neighborhoods[j])),
                ),
              );
          if (s > score) {
            score = s;
            best = h;
          }
        }
      selected.push(best);
    }
  }
  centroids = selected.map((h) => ndMean(x, neighborhoods[h]));
  const mean = ndMean(
    x,
    Array.from({ length: n }, (_, i) => i),
  );
  while (centroids.length < k)
    centroids.push(
      mean.map(
        (v, q) => v + (2 * rng() - 1) * 0.05 * (bounds[q][1] - bounds[q][0]),
      ),
    );
  labels = x.map((row) => {
    let best = 0;
    for (let h = 1; h < k; h++)
      if (ndSquared(row, centroids[h]) < ndSquared(row, centroids[best]))
        best = h;
    return best;
  });
  emit(
    "initialize",
    "neighborhood-initialize",
    "ML 이웃 평균·weighted farthest-first/시드 perturbation, 초기 identity metric과 최근접 배정.",
  );
  diameters = maxima();
  costs = total();
  emit(
    "assign",
    "initial-labels",
    "전체 원본 최대쌍과 최초 실제 목적함수를 계산했습니다.",
    {},
    true,
  );
  for (iteration = 1; iteration <= o.iterations; iteration++) {
    const order = Array.from({ length: n }, (_, i) => i);
    let changed = 0;
    for (let j = n - 1; j > 0; j--) {
      const h = Math.floor(rng() * (j + 1));
      [order[j], order[h]] = [order[h], order[j]];
    }
    for (const i of order) {
      const old = labels[i],
        component = c.componentIds[i];
      const candidates: MetricCandidate[] = centroids.map((v, h) => {
        const distanceSquared = squared(x[i], v, metrics[h]),
          logDetCost = -logDet(metrics[h]);
        let mustLinkCost = 0,
          cannotLinkCost = 0;
        for (const j of groups[component])
          if (j !== i && h !== labels[j])
            mustLinkCost +=
              w *
              0.5 *
              (squared(x[i], x[j], metrics[h]) +
                squared(x[i], x[j], metrics[labels[j]]));
        for (const g of c.neighbors[component])
          for (const j of groups[g])
            if (h === labels[j])
              cannotLinkCost +=
                w * (diameters[h].value - squared(x[i], x[j], metrics[h]));
        const total =
          distanceSquared + logDetCost + mustLinkCost + cannotLinkCost;
        if (!Number.isFinite(total))
          throw Error("MPCKMeans 후보 비용 수치 불안정.");
        return {
          cluster: h,
          distanceSquared,
          logDetCost,
          mustLinkCost,
          cannotLinkCost,
          total,
        };
      });
      let chosen = old;
      for (let h = 0; h < k; h++)
        if (candidates[h].total < candidates[chosen].total) chosen = h;
      if (detailed)
        emit(
          "test",
          "candidate-costs",
          `${i + 1}행: ND 거리 −logdet·ML/CL 비용 비교. 현재 label 동률 유지.`,
          { current: i, candidates, chosen, order },
        );
      if (chosen !== old) {
        labels[i] = chosen;
        changed++;
      }
      if (detailed) {
        costs = total();
        emit("assign", "point-assign", `${i + 1}행 → ${chosen + 1}군집.`, {
          current: i,
          candidates,
          chosen,
        });
      }
    }
    costs = total();
    emit(
      "assign",
      "sweep-assign",
      "모든 원본 행의 live 비용 배정을 완료했습니다.",
    );
    const prev = centroids;
    centroids = centroids.map((v, h) =>
      counts[h]
        ? ndMean(
            x,
            labels.flatMap((label, i) => (label === h ? [i] : [])),
          )
        : v,
    );
    movement = Math.sqrt(
      centroids.reduce((s, v, h) => Math.max(s, ndSquared(v, prev[h])), 0),
    );
    costs = total();
    emit(
      "move",
      "mean-update",
      "전체 ND 평균 갱신. 빈 군집은 이전 중심을 유지합니다.",
    );
    denominators = Array.from(
      { length: k },
      () => Array(d).fill(0) as number[],
    );
    for (let i = 0; i < n; i++)
      for (let q = 0; q < d; q++)
        denominators[labels[i]][q] += (x[i][q] - centroids[labels[i]][q]) ** 2;
    eachML((i, j) => {
      if (labels[i] !== labels[j])
        for (let q = 0; q < d; q++) {
          const v = w * 0.5 * (x[i][q] - x[j][q]) ** 2;
          denominators[labels[i]][q] += v;
          denominators[labels[j]][q] += v;
        }
    });
    eachCL((i, j) => {
      if (labels[i] === labels[j])
        for (let q = 0; q < d; q++)
          denominators[labels[i]][q] +=
            w * (diameters[labels[i]].delta[q] - (x[i][q] - x[j][q]) ** 2);
    });
    previousMetrics = metrics;
    conditioned = [];
    const next = metrics.map((a, h) => {
      if (!counts[h]) return a;
      let den = denominators[h];
      if (den.some((v) => v < 0 || !Number.isFinite(v)))
        throw Error(
          `MPCKMeans metric 갱신 실패: 군집${h + 1} 음수/비유한 분모. 전역 불가능 판정이 아닙니다.`,
        );
      if (den.some((v) => v === 0)) {
        const trace = den.reduce((s, v) => s + v, 0);
        if (o.metricConditioning <= 0 || trace <= 0 || !Number.isFinite(trace))
          throw Error(
            `MPCKMeans 특이 metric 분모: 군집${h + 1}. 양수 대각/logdet를 만들 수 없습니다. 조건화 설정과 데이터 분산을 확인하세요.`,
          );
        den = den.map((v) => v + o.metricConditioning * trace);
        conditioned.push(h);
      }
      const result = den.map((v) => counts[h] / v);
      if (result.some((v) => !Number.isFinite(v) || v <= 0))
        throw Error("MPCKMeans 양수 metric 표현 범위 초과.");
      return result;
    });
    emit(
      "maximization",
      "metric-proposal",
      "Eq8의 실제 분모와 이전 metric. 특이 축 조건화가 적용되면 원래 목적의 정확 정지점 갱신과 구분합니다.",
    );
    metricMovement = next.reduce(
      (largest, a, h) =>
        a.reduce(
          (s, v, q) =>
            Math.max(s, Math.abs(Math.log(v) - Math.log(metrics[h][q]))),
          largest,
        ),
      0,
    );
    const oldObjective = costs.objective,
      oldPairs = diameters;
    metrics = next;
    diameters = maxima();
    witnessChanges += diameters.filter(
      (v, h) => v.pair.join(":") !== oldPairs[h].pair.join(":"),
    ).length;
    costs = total();
    if (
      costs.objective >
      oldObjective + 1e-10 * Math.max(1, Math.abs(oldObjective))
    )
      objectiveIncreases++;
    if (
      !changed &&
      movement <= o.tolerance &&
      metricMovement <= o.metricTolerance
    ) {
      converged = true;
      stopReason = "stationary-tolerance";
    }
    emit(
      "maximization",
      "metric-update",
      "양수 대각 metric 갱신 후 원본 전체 최대쌍과 목적을 다시 계산했습니다. witness 변경·조건화 시 단조 감소 보장은 없습니다.",
      {},
      true,
    );
    if (converged) break;
  }
  if (!converged) {
    iteration = o.iterations;
    stopReason = "iteration-limit";
  }
  emit(
    "finish",
    "complete",
    `종료 ${stopReason}. Full SPD가 아닌 multiple diagonal 모델. 유한 제약 위반은 계산 오류가 아닙니다.`,
  );
}
