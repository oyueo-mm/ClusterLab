import type { Dataset } from "../dataset";
import { numericRows } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type {
  DiscreteMixtureMethod,
  DiscreteMixtureAnalysis,
} from "../mixtureTypes";
import { random } from "../math";
import { DEFAULT_TRACE_BYTES, DEFAULT_WORKING_BYTES } from "../resources";

const LOG2PI = Math.log(2 * Math.PI);
function stirlingError(x: number) {
  if (x < 16) {
    let factorial = 0;
    for (let i = 2; i <= x; i++) factorial += Math.log(i);
    return factorial - (x + 0.5) * Math.log(x) + x - 0.5 * LOG2PI;
  }
  const q = 1 / (x * x);
  return (
    (1 / 12 - q * (1 / 360 - q * (1 / 1260 - q * (1 / 1680 - q / 1188)))) / x
  );
}
/** x log(x/lambda)+lambda-x, expanded around equality to avoid cancellation. */
function poissonDeviance(x: number, lambda: number) {
  if (Math.abs(x - lambda) < 0.1 * (x + lambda)) {
    const v = (x - lambda) / (x + lambda),
      q = v * v;
    let term = 2 * x * v,
      sum = (x - lambda) * v;
    for (let j = 1; j < 10000; j++) {
      term *= q;
      const next = sum + term / (2 * j + 1);
      if (next === sum) return sum;
      sum = next;
    }
    throw new Error("Poisson deviance 급수의 수치 수렴 실패.");
  }
  return x * (Math.log(x) - Math.log(lambda)) + lambda - x;
}
/** Exact distribution identity, with a stable Stirling remainder evaluation. */
export function poissonLogMass(x: number, lambda: number) {
  if (
    !Number.isSafeInteger(x) ||
    x < 0 ||
    !Number.isFinite(lambda) ||
    lambda < 0
  )
    throw new Error(
      "Poisson 관측은 비음수 안전 정수, rate는 유한한 비음수여야 합니다.",
    );
  if (x === 0) return -lambda;
  if (lambda === 0) return -Infinity;
  return (
    -stirlingError(x) -
    0.5 * (LOG2PI + Math.log(x)) -
    poissonDeviance(x, lambda)
  );
}
export function discreteLogMass(
  method: DiscreteMixtureMethod,
  row: number[],
  parameter: number[],
) {
  if (row.length !== parameter.length)
    throw new Error("관측·모수 차원이 다릅니다.");
  if (method === "Bernoulli Mixture") {
    let result = 0;
    for (let j = 0; j < row.length; j++) {
      const p = parameter[j],
        x = row[j];
      if ((x !== 0 && x !== 1) || !Number.isFinite(p) || p < 0 || p > 1)
        throw new Error("Bernoulli는 실제 0/1 관측과 [0,1] 확률이 필요합니다.");
      result += x === 1 ? Math.log(p) : Math.log1p(-p);
    }
    return result;
  }
  if (method === "Poisson Mixture")
    return row.reduce((s, x, j) => s + poissonLogMass(x, parameter[j]), 0);
  const total = row.reduce((s, x) => s + x, 0),
    sum = parameter.reduce((s, p) => s + p, 0);
  if (
    !Number.isSafeInteger(total) ||
    row.some((x) => !Number.isSafeInteger(x) || x < 0) ||
    parameter.some((p) => !Number.isFinite(p) || p < 0 || p > 1) ||
    Math.abs(sum - 1) > 1e-12 * parameter.length
  )
    throw new Error(
      "Multinomial은 비음수 정수 count·안전한 행합·합이1인 범주 확률이 필요합니다.",
    );
  if (!total) return 0;
  // Conditioning independent Poissons on their total gives the complete multinomial PMF,
  // including m!/prod(x!), without subtracting huge nearly equal log-factorials.
  return (
    row.reduce((s, x, j) => s + poissonLogMass(x, total * parameter[j]), 0) -
    poissonLogMass(total, total)
  );
}

export interface DiscreteModel {
  parameters: number[][];
  weights: number[];
}
export function discreteExpectation(
  method: DiscreteMixtureMethod,
  rows: number[][],
  model: DiscreteModel,
) {
  const k = model.weights.length,
    d = rows[0].length;
  if (
    model.parameters.length !== k ||
    !k ||
    model.weights.some((w) => !Number.isFinite(w) || w < 0) ||
    Math.abs(model.weights.reduce((s, w) => s + w, 0) - 1) > 1e-10
  )
    throw new Error("혼합 가중치는 비음수이며 합이1이어야 합니다.");
  const responsibilities: number[][] = [],
    counts = Array(k).fill(0) as number[],
    sums = Array.from({ length: k }, () => Array(d).fill(0) as number[]);
  let logLikelihood = 0;
  for (let i = 0; i < rows.length; i++) {
    const logs = model.parameters.map(
      (parameter, c) =>
        Math.log(model.weights[c]) +
        discreteLogMass(method, rows[i], parameter),
    );
    let largest = -Infinity;
    for (const value of logs) largest = Math.max(largest, value);
    if (!Number.isFinite(largest))
      throw new Error(
        `관측 ${i + 1}의 모든 성분 확률이0이거나 수치적으로 표현 불가능합니다. 임의 할당하지 않았습니다.`,
      );
    const normalizer = logs.reduce((s, v) => s + Math.exp(v - largest), 0);
    const posterior = logs.map(
      (value) => Math.exp(value - largest) / normalizer,
    );
    logLikelihood += largest + Math.log(normalizer);
    if (!Number.isFinite(logLikelihood))
      throw new Error("전체 관측 로그우도가 수치 범위를 초과했습니다.");
    responsibilities.push(posterior);
    posterior.forEach((r, c) => {
      counts[c] += r;
      for (let j = 0; j < d; j++) sums[c][j] += r * rows[i][j];
    });
  }
  if (sums.some((row) => row.some((v) => !Number.isFinite(v))))
    throw new Error("가중 count 충분통계가 수치 범위를 초과했습니다.");
  return { responsibilities, counts, sums, logLikelihood };
}
export function discreteMaximization(
  method: DiscreteMixtureMethod,
  state: ReturnType<typeof discreteExpectation>,
  previous: DiscreteModel,
): DiscreteModel {
  const n = state.counts.reduce((s, v) => s + v, 0);
  return {
    weights: state.counts.map((count) => count / n),
    parameters: state.sums.map((row, c) => {
      const denominator =
        method === "Multinomial Mixture"
          ? row.reduce((s, v) => s + v, 0)
          : state.counts[c];
      // Zero-weight components and zero-total multinomial profiles are unidentifiable.
      // Keep their previous valid parameters; never add a pseudo-count or reseed.
      return denominator === 0
        ? [...previous.parameters[c]]
        : row.map((value) => value / denominator);
    }),
  };
}

export function runDiscreteMixture(
  method: DiscreteMixtureMethod,
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  const rows = numericRows(points, input),
    n = rows.length,
    d = rows[0]?.length ?? 0;
  if (
    !n ||
    !d ||
    points.length !== n ||
    rows.some((row) => row.length !== d || row.some((v) => !Number.isFinite(v)))
  )
    throw new Error(
      "비어 있지 않은 일관된 차원의 유한 수치형 원본이 필요합니다.",
    );
  if (
    !Number.isSafeInteger(o.k) ||
    o.k < 1 ||
    o.k > n ||
    !Number.isSafeInteger(o.iterations) ||
    o.iterations < 1 ||
    !Number.isSafeInteger(o.seed) ||
    !Number.isFinite(o.tolerance) ||
    o.tolerance < 0
  )
    throw new Error(
      "혼합 K는1≤K≤관측 수, 반복 한도는 양의 정수, 시드는 안전 정수, 허용오차는 비음수여야 합니다.",
    );
  if (
    rows.some((row) =>
      method === "Bernoulli Mixture"
        ? row.some((v) => v !== 0 && v !== 1)
        : row.some((v) => !Number.isSafeInteger(v) || v < 0),
    )
  )
    throw new Error(
      method === "Bernoulli Mixture"
        ? "Bernoulli Mixture는 실제 0/1 이진 원본이 필요합니다. 자동 이진화하지 않습니다."
        : `${method}는 비음수 안전 정수 count 원본이 필요합니다. 반올림하지 않습니다.`,
    );
  const totals = rows.map((row) => row.reduce((s, v) => s + v, 0));
  if (
    method === "Multinomial Mixture" &&
    totals.some((v) => !Number.isSafeInteger(v))
  )
    throw new Error("Multinomial 행 count 합이 안전 정수 범위를 초과했습니다.");
  const working = 64 * n * o.k + 64 * n * d + 128 * o.k * d + 256 * n;
  if (!Number.isFinite(working) || working > DEFAULT_WORKING_BYTES)
    throw new Error(
      `혼합 EM 작업 메모리 예산 초과: 추정 ${(working / 1048576).toFixed(1)}MiB. 입력을 일부로 자르지 않았습니다.`,
    );
  const rng = random(o.seed),
    means = Array.from({ length: d }, (_, j) =>
      rows.reduce((s, row) => s + row[j] / n, 0),
    );
  let model: DiscreteModel = {
    weights: Array(o.k).fill(1 / o.k),
    parameters: Array.from({ length: o.k }, () => {
      const values = Array.from({ length: d }, (_, j) =>
        method === "Bernoulli Mixture"
          ? 0.1 + 0.8 * rng()
          : method === "Poisson Mixture"
            ? (means[j] + 1) * (0.5 + rng())
            : 0.5 + rng(),
      );
      const denominator =
        method === "Multinomial Mixture"
          ? values.reduce((s, v) => s + v, 0)
          : 1;
      return values.map((v) => v / denominator);
    }),
  };
  let evaluation = discreteExpectation(method, rows, model),
    converged = false,
    iteration = 0;
  let sourceValues = rows;
  const warnings: string[] = [];
  if (method === "Bernoulli Mixture" && d === 1 && o.k > 1)
    warnings.push(
      "단일 이진 변수의 혼합은 일반적으로 성분별로 식별되지 않습니다.",
    );
  if (method === "Multinomial Mixture" && totals.some((v) => v === 0))
    warnings.push(
      "총 count0인 행의 likelihood는1이며 범주 분포 정보를 주지 않습니다. 모든 가중 count가0인 성분은 이전 확률을 유지합니다.",
    );
  const support =
    method === "Bernoulli Mixture"
      ? "독립 이진 특성 {0,1}^d"
      : method === "Poisson Mixture"
        ? "독립 비음수 정수 count ℕ₀^d"
        : "행합 m_i를 조건으로 한 count vector";
  const stride = Math.max(
    1,
    Math.ceil(
      ((o.iterations + 2) * (n * o.k * 64 + o.k * d * 192 + n * 24)) /
        (DEFAULT_TRACE_BYTES * 0.45),
    ),
  );
  r.trace.recording!.policy =
    stride === 1
      ? "전체 원본의 실제 ML EM E/M 및 매 M 후 관측우도·사후확률 재평가. prior/smoothing/표본 계산 없음."
      : `전체 원본 ML EM 유지. 바이트 예산에 따라 처음·매 ${stride}회·최종 반복의 실제 E/M을 기록하고 중간 반복 상세만 생략합니다.`;
  const emit = (
    kind: "initialize" | "expectation" | "maximization" | "finish",
    description: string,
    used?: ReturnType<typeof discreteExpectation>,
  ) => {
    const a: DiscreteMixtureAnalysis = {
      kind: "discrete-mixture",
      method,
      phase: kind,
      dimensions: d,
      parameters: model.parameters,
      weights: model.weights,
      effectiveCounts: evaluation.counts,
      weightedSums: evaluation.sums,
      totals,
      sourceValues,
      logLikelihood: evaluation.logLikelihood,
      logMassFirstRow: model.parameters.map((p) =>
        discreteLogMass(method, rows[0], p),
      ),
      converged,
      iterations: iteration,
      support,
      emptyComponents: model.weights.flatMap((w, c) => (w === 0 ? [c] : [])),
      warnings,
      ...(used
        ? { maximizationCounts: used.counts, maximizationSums: used.sums }
        : {}),
    };
    r.emit(
      kind,
      description,
      {
        analysis: a,
        responsibilities: evaluation.responsibilities,
        labels: evaluation.responsibilities.map((row) =>
          row.reduce((best, v, j) => (v > row[best] ? j : best), 0),
        ),
        centers: [],
        focus: [],
        metric:
          kind === "expectation"
            ? r.state.metric
            : [...r.state.metric, evaluation.logLikelihood],
        metricName: "전체 관측 로그우도 합 (정규화 상수 포함)",
      },
      {
        logLikelihood: evaluation.logLikelihood,
        iteration,
        converged: String(converged),
      },
    );
    if (r.state.analysis?.kind === "discrete-mixture")
      sourceValues = r.state.analysis.sourceValues;
  };
  emit(
    "initialize",
    "시드로 support 내부의 유효한 모수와 동일 가중치를 초기화하고 모든 원본의 실제 확률을 평가했습니다. 초기 확률은 prior나 pseudo-count가 아닙니다.",
  );
  for (iteration = 1; iteration <= o.iterations; iteration++) {
    evaluation = discreteExpectation(method, rows, model);
    const recorded = iteration === 1 || iteration % stride === 0;
    if (recorded)
      emit(
        "expectation",
        "전체 원본의 log-PMF를 log-sum-exp로 정규화해 실제 사후소속·유효 성분 크기·가중 count를 계산했습니다.",
      );
    const used = evaluation,
      previous = evaluation.logLikelihood;
    model = discreteMaximization(method, evaluation, model);
    evaluation = discreteExpectation(method, rows, model);
    const improvement = evaluation.logLikelihood - previous,
      roundoff = 1e-10 * Math.max(1, Math.abs(previous));
    if (improvement < -roundoff)
      throw new Error(
        "ML EM 로그우도가 수치 허용오차를 넘게 감소했습니다. 성공으로 대체하지 않습니다.",
      );
    converged =
      Math.abs(improvement) <= o.tolerance * Math.max(1, Math.abs(previous));
    if (recorded || converged || iteration === o.iterations)
      emit(
        "maximization",
        "이전 E의 충분통계로 정확한 무prior MLE를 갱신했습니다. 표시 사후확률·유효 크기·로그우도는 새 모수로 전체 재평가한 값이며, M에 사용한 이전 통계는 별도 보존합니다.",
        used,
      );
    if (converged) break;
  }
  iteration = Math.min(iteration, o.iterations);
  emit(
    "finish",
    converged
      ? "실제 전체 관측 로그우도 개선이 상대 허용오차 이하여서 종료했습니다. 전역 최적·성분 식별성을 보장하지 않습니다."
      : "반복 한도에서 종료했습니다. 반환 모수·실제 사후확률·전체 로그우도는 서로 일치하며 고정점 수렴은 미확인입니다.",
  );
}
