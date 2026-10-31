import type { AlgorithmAnalysis, Params, Point } from "../types";
import type { Recorder } from "../trace";
import { numericRows, type Dataset } from "../dataset";

/** Exact all-feature squared distances; display coordinates are not consulted. */
export function pairwiseSquared(points: Point[], input?: Dataset): number[][] {
  const rows = numericRows(points, input),
    d = rows[0]?.length ?? 0;
  if (
    rows.length !== points.length ||
    rows.length < 2 ||
    !d ||
    rows.some((v) => v.length !== d || v.some((x) => !Number.isFinite(x)))
  )
    throw new Error(
      "수치형 입력은 두 개 이상의 동일 차원 유한 벡터여야 합니다.",
    );
  const ds = rows.map(() => Array(rows.length).fill(0) as number[]);
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) {
      let value = 0;
      for (let a = 0; a < d; a++) value += (rows[i][a] - rows[j][a]) ** 2;
      if (!Number.isFinite(value))
        throw new Error(
          "수치 불안정: 원본 특성의 거리 제곱이 유한하지 않습니다. 스케일을 조정하세요.",
        );
      ds[i][j] = ds[j][i] = value;
    }
  return ds;
}

/** Frey–Dueck responsibility update; row maximum/runner-up gives O(n²). */
export function updateResponsibilities(
  s: number[][],
  a: number[][],
  old: number[][],
  damping: number,
) {
  return s.map((row, i) => {
    let max = -Infinity,
      second = -Infinity,
      winner = -1;
    row.forEach((value, k) => {
      const v = a[i][k] + value;
      if (v > max) {
        second = max;
        max = v;
        winner = k;
      } else if (v > second) second = v;
    });
    return row.map(
      (value, k) =>
        damping * old[i][k] +
        (1 - damping) * (value - (k === winner ? second : max)),
    );
  });
}

/** Diagonal self-availability differs from off-diagonal availability. */
export function updateAvailabilities(
  r: number[][],
  old: number[][],
  damping: number,
) {
  const n = r.length,
    positive = Array(n).fill(0) as number[];
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      if (i !== k) positive[k] += Math.max(0, r[i][k]);
  return r.map((row, i) =>
    row.map((_, k) => {
      const value =
        i === k
          ? positive[k]
          : Math.min(0, r[k][k] + positive[k] - Math.max(0, r[i][k]));
      return damping * old[i][k] + (1 - damping) * value;
    }),
  );
}

export function affinity(p: Point[], o: Params, r: Recorder, input?: Dataset) {
  if (
    !Number.isFinite(o.damping) ||
    o.damping < 0.5 ||
    o.damping >= 1 ||
    !Number.isFinite(o.preference) ||
    !Number.isSafeInteger(o.iterations) ||
    o.iterations < 1 ||
    !Number.isSafeInteger(o.convergenceWindow) ||
    o.convergenceWindow < 1
  )
    throw new Error(
      "Affinity Propagation 파라미터 오류: 0.5≤damping<1, 유한 preference, 양의 반복/수렴 창이 필요합니다.",
    );
  const ds = pairwiseSquared(p, input),
    n = p.length;
  const s = ds.map((row, i) =>
    row.map((v, k) => (i === k ? o.preference : -v)),
  );
  let responsibility = ds.map(() => Array(n).fill(0) as number[]),
    availability = ds.map(() => Array(n).fill(0) as number[]);
  let exemplars: number[] = [],
    stable = 0,
    previous = "",
    converged = false;
  const analysis = (
    phase: string,
  ): Extract<AlgorithmAnalysis, { kind: "affinity" }> => ({
    kind: "affinity",
    phase,
    similarities: s,
    responsibility,
    availability,
    exemplars,
    converged,
  });
  r.emit(
    "initialize",
    "전체 원본 특성의 음의 제곱거리 유사도와 대각 preference를 구성합니다.",
    { analysis: analysis("similarity") },
  );

  // Identical similarities have a closed-form optimum. This is explicit exact
  // degeneracy handling, not fabricated message convergence or sampled input.
  const off = s[0][1];
  if (s.every((row, i) => row.every((v, k) => i === k || v === off))) {
    exemplars = o.preference >= off ? p.map((_, i) => i) : [0];
    converged = true;
    const labels = p.map((_, i) => (exemplars.length === n ? i : 0));
    r.emit(
      "extract",
      "모든 비대각 유사도가 같아 preference와 비교한 정확한 퇴화 해를 사용합니다. 동률은 인덱스 순서입니다.",
      {
        analysis: analysis("equal-similarity-optimum"),
        labels,
        centers: exemplars.map((i) => ({ ...p[i], id: i })),
      },
    );
    r.emit(
      "finish",
      "동일 유사도의 해석적 최적 분할입니다. 메시지 수렴을 주장하지 않습니다.",
      { analysis: analysis("finish") },
      { converged: "analytic", clusters: exemplars.length },
    );
    return;
  }
  for (let it = 0; it < o.iterations; it++) {
    responsibility = updateResponsibilities(
      s,
      availability,
      responsibility,
      o.damping,
    );
    if (responsibility.some((row) => row.some((v) => !Number.isFinite(v))))
      throw new Error(
        "수치 불안정: responsibility가 유한하지 않습니다. 입력 스케일·preference를 조정하세요.",
      );
    r.emit(
      "messages",
      `${it + 1}회: 대체 exemplar의 최대 점수를 빼고 responsibility를 damping 갱신합니다.`,
      { analysis: analysis("responsibility") },
      { iteration: it + 1 },
    );
    availability = updateAvailabilities(
      responsibility,
      availability,
      o.damping,
    );
    if (availability.some((row) => row.some((v) => !Number.isFinite(v))))
      throw new Error(
        "수치 불안정: availability가 유한하지 않습니다. 입력 스케일·preference를 조정하세요.",
      );
    exemplars = p.flatMap((_, k) =>
      responsibility[k][k] + availability[k][k] > 0 ? [k] : [],
    );
    const signature = exemplars.join(",");
    stable =
      exemplars.length && signature === previous
        ? stable + 1
        : exemplars.length
          ? 1
          : 0;
    previous = signature;
    converged = stable >= o.convergenceWindow;
    r.emit(
      "messages",
      `${it + 1}회: availability 갱신 후 양의 자기 증거에서 exemplar ${exemplars.length}개를 판정합니다.`,
      {
        analysis: analysis("availability"),
        centers: exemplars.map((i) => ({ ...p[i], id: i })),
      },
      { iteration: it + 1, stable, converged: String(converged) },
    );
    if (converged) break;
  }
  if (!exemplars.length)
    throw new Error(
      "수렴 실패: 반복 한도에서 양의 exemplar 증거가 없습니다. 반복 수·preference·damping을 조정하세요.",
    );
  // Refine each observed exemplar within its provisional cluster by net similarity,
  // matching the standard AP extraction rather than returning arbitrary medoids.
  const assign = () =>
    p.map((_, i) => {
      let best = 0;
      for (let k = 1; k < exemplars.length; k++)
        if (s[i][exemplars[k]] > s[i][exemplars[best]]) best = k;
      return best;
    });
  let labels = assign();
  exemplars.forEach((id, k) => {
    labels[id] = k;
  });
  exemplars = exemplars.map((_, k) => {
    const members = p.flatMap((__, i) => (labels[i] === k ? [i] : []));
    let best = members[0],
      score = -Infinity;
    for (const candidate of members) {
      const value = members.reduce((sum, i) => sum + s[i][candidate], 0);
      if (value > score) {
        best = candidate;
        score = value;
      }
    }
    return best;
  });
  labels = assign();
  exemplars.forEach((id, k) => {
    labels[id] = k;
  });
  const netSimilarity = labels.reduce(
    (sum, k, i) => sum + s[i][exemplars[k]],
    0,
  );
  r.emit(
    "extract",
    "선택된 exemplar의 소속을 확인하고 각 군집의 실제 관측 대표점을 유사도 합으로 정제합니다.",
    {
      labels,
      centers: exemplars.map((i) => ({ ...p[i], id: i })),
      focus: [],
      analysis: analysis("extraction"),
      metric: [netSimilarity],
      metricName: "Net similarity (maximize)",
    },
    { netSimilarity },
  );
  r.emit(
    "finish",
    converged
      ? "Exemplar 상태가 수렴 창 동안 유지되었습니다."
      : "반복 한도 종료: 현재 exemplar 분할이며 메시지 수렴은 미확인입니다.",
    { analysis: analysis("finish") },
    { converged: String(converged), clusters: exemplars.length },
  );
}
