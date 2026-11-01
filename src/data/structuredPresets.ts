import type { Dataset } from "../engine/dataset";
import { random } from "../engine/math";
import { DEFAULT_WORKING_BYTES } from "../engine/resources";
export type StructuredPreset =
  | "numeric"
  | "categorical"
  | "mixed"
  | "graph"
  | "matrix"
  | "timeseries"
  | "stream";
export function makeStructuredPreset(
  kind: StructuredPreset,
  count = 24,
  dimensions = 3,
  seed = 42,
): Dataset {
  if (
    !Number.isSafeInteger(count) ||
    count < 2 ||
    !Number.isSafeInteger(dimensions) ||
    dimensions < 1 ||
    !Number.isSafeInteger(seed)
  )
    throw new Error("생성 개수≥2·차원≥1·시드는 정수여야 합니다.");
  const cols =
    kind === "timeseries"
      ? 32
      : kind === "matrix"
        ? Math.max(4, dimensions)
        : dimensions;
  const estimated = count * (128 + cols * 32);
  if (!Number.isFinite(estimated) || estimated > DEFAULT_WORKING_BYTES)
    throw new Error(
      `데이터 생성 메모리 예산 초과: 추정 ${(estimated / 1048576).toFixed(1)}MiB. 데이터 수를 임의로 자르지 않았습니다.`,
    );
  const rng = random(seed),
    noise = () =>
      Math.sqrt(-2 * Math.log(Math.max(Number.MIN_VALUE, rng()))) *
      Math.cos(2 * Math.PI * rng());
  let data: Dataset;
  if (kind === "numeric")
    data = {
      kind,
      values: Array.from({ length: count }, (_, i) =>
        Array.from(
          { length: dimensions },
          (_, j) => (i < count / 2 ? 0 : 3) + (j < 2 ? 0.15 : 0.3) * noise(),
        ),
      ),
      featureNames: Array.from(
        { length: dimensions },
        (_, j) => `특성 ${j + 1}`,
      ),
    };
  else if (kind === "categorical")
    data = {
      kind,
      values: Array.from({ length: count }, (_, i) =>
        Array.from(
          { length: dimensions },
          (_, j) =>
            `${j % 2 ? "형태" : "색상"}-${rng() < 0.08 ? 1 - (i < count / 2 ? 0 : 1) : i < count / 2 ? 0 : 1}`,
        ),
      ),
      featureNames: Array.from(
        { length: dimensions },
        (_, j) => `범주 ${j + 1}`,
      ),
    };
  else if (kind === "mixed")
    data = {
      kind,
      numeric: Array.from({ length: count }, (_, i) =>
        Array.from(
          { length: dimensions },
          () => 0.1 * noise() + (i < count / 2 ? 0 : 3),
        ),
      ),
      categorical: Array.from({ length: count }, (_, i) => [
        i < count / 2 ? "빨강" : "파랑",
        rng() < 0.1 ? "기타" : i < count / 2 ? "원형" : "네모",
      ]),
    };
  else if (kind === "graph") {
    const edges: { source: string; target: string; weight: number }[] = [],
      seen = new Set<string>();
    const add = (a: number, b: number) => {
      if (a === b) return;
      const key = [Math.min(a, b), Math.max(a, b)].join(":");
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ source: `v${a}`, target: `v${b}`, weight: 1 });
      }
    };
    const split = Math.ceil(count / 2);
    for (const [lo, hi] of [
      [0, split],
      [split, count],
    ])
      for (let i = lo; i < hi; i++) {
        add(i, lo + ((i - lo + 1) % Math.max(1, hi - lo)));
        add(i, lo + ((i - lo + 2) % Math.max(1, hi - lo)));
      }
    add(split - 1, split);
    data = {
      kind,
      nodes: Array.from({ length: count }, (_, i) => ({ id: `v${i}` })),
      edges,
      directed: false,
    };
  } else if (kind === "matrix")
    data = {
      kind,
      values: Array.from({ length: count }, (_, i) =>
        Array.from({ length: cols }, (_, j) =>
          i < count / 2 === j < cols / 2 ? 1 : 0,
        ),
      ),
      rowNames: Array.from({ length: count }, (_, i) => `행${i + 1}`),
      columnNames: Array.from({ length: cols }, (_, j) => `열${j + 1}`),
    };
  else if (kind === "timeseries")
    data = {
      kind,
      series: Array.from({ length: count }, (_, i) => ({
        id: `s${i}`,
        times: Array.from({ length: cols }, (_, j) => j),
        values: Array.from({ length: cols }, (_, j) => {
          const t = (j + (i % 4) - 2) / cols;
          return (
            ((i % 3) + 1) *
              (i < count / 2
                ? Math.sin(2 * Math.PI * t)
                : Math.sin(4 * Math.PI * t)) +
            0.05 * noise() +
            (i % 2)
          );
        }),
      })),
    };
  else
    data = {
      kind: "stream",
      samples: Array.from({ length: count }, (_, i) => ({
        time: i + (i > count * 0.65 ? 80 : 0),
        values: Array.from(
          { length: dimensions },
          (_, j) =>
            (i < count * 0.65 ? (i % 2 ? 2 : 0) : 4) +
            0.03 * noise() +
            j * 0.02,
        ),
      })),
    };
  const details: Record<string, string | number | boolean> =
    kind === "numeric"
      ? { groups: 2, offset: 3, firstTwoSigma: 0.15, otherSigma: 0.3 }
      : kind === "categorical"
        ? { groups: 2, flipProbability: 0.08 }
        : kind === "mixed"
          ? {
              groups: 2,
              offset: 3,
              numericSigma: 0.1,
              categoricalColumns: 2,
              otherCategoryProbability: 0.1,
            }
          : kind === "graph"
            ? {
                groups: 2,
                unitWeight: 1,
                withinBlockOffsets: "1,2",
                bridge: true,
              }
            : kind === "matrix"
              ? { groups: 2, binary: true }
              : kind === "timeseries"
                ? {
                    patterns: "sin(2πt),sin(4πt)",
                    amplitudes: "1,2,3",
                    offsets: "0,1",
                    phaseCount: 4,
                    sigma: 0.05,
                  }
                : {
                    initialCenters: "0,2",
                    driftCenter: 4,
                    driftFraction: 0.65,
                    timeGap: 80,
                    sigma: 0.03,
                    featureOffset: 0.02,
                  };
  return {
    ...data,
    provenance: {
      generator: `clusterlab-${kind}-v1`,
      seed,
      parameters: { count, dimensions: cols, ...details },
    },
  };
}
