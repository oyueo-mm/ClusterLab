import type { Algorithm, Params } from "./types";

// Byte budgets are configurable execution policies, never a global point count.
export const DEFAULT_WORKING_BYTES = 256 * 1024 * 1024;
export const DEFAULT_TRACE_BYTES = 64 * 1024 * 1024;
export function estimateResources(algorithm: Algorithm, n: number, o: Params) {
  let workingBytes = n * 192;
  let work = n * Math.min(n, o.k) * o.iterations;
  if (
    [
      "Spectral Clustering",
      "Affinity Propagation",
      "Density Peaks / CFSFDP",
    ].includes(algorithm)
  ) {
    workingBytes +=
      n *
      n *
      (algorithm === "Spectral Clustering"
        ? 160
        : algorithm === "Affinity Propagation"
          ? 112
          : 24);
    work =
      algorithm === "Spectral Clustering"
        ? n ** 3
        : n * n * (algorithm === "Affinity Propagation" ? o.iterations : 1);
  }
  if (algorithm === "CURE") {
    workingBytes += n * Math.min(n, o.representatives) * 128;
    work = n ** 3 * Math.max(1, o.representatives ** 2);
  }
  if (algorithm === "CLARA") {
    const s = Math.min(n, o.sampleSize);
    workingBytes += s * s * 32;
    work = o.numLocal * (s ** 3 * o.iterations + n * o.k);
  }
  if (algorithm === "CLARANS") {
    workingBytes += n * 32;
    work = n * o.k * o.maxNeighbors * o.numLocal;
  }
  if (algorithm === "Mini-Batch K-Means") work = n * o.k * o.epochs;
  if (algorithm === "Neural Gas" || algorithm === "Growing Neural Gas") {
    const neurons = algorithm === "Neural Gas" ? o.k : o.maxNeurons;
    workingBytes += neurons ** 2 * 64;
    work = n * o.epochs * neurons * Math.log2(Math.max(2, neurons));
  }
  if (["HDBSCAN", "ROCK", "OPTICS", "PAM"].includes(algorithm)) {
    // Conservative JS arrays/number slots + concurrent row copies.
    workingBytes += n * n * (algorithm === "HDBSCAN" ? 64 : 40);
    work = n * n * (algorithm === "PAM" ? n * o.iterations : 1);
  }
  if (["AGNES", "DIANA"].includes(algorithm)) {
    workingBytes += n * n * 32;
    work = n ** (algorithm === "AGNES" ? 4 : 3);
  }
  if (["GMM", "Fuzzy C-Means"].includes(algorithm))
    workingBytes += n * Math.min(n, o.k) * 96;
  if (algorithm === "SOM") workingBytes += o.grid ** 2 * 256;
  if (algorithm === "Mean Shift") {
    workingBytes += n * o.iterations * 96;
    work = n * n * o.iterations;
  }
  return {
    workingBytes,
    work,
    traceBudgetBytes: DEFAULT_TRACE_BYTES,
    approximate: false,
  };
}
export function assertResources(
  algorithm: Algorithm,
  n: number,
  o: Params,
  budgetBytes = DEFAULT_WORKING_BYTES,
) {
  const estimate = estimateResources(algorithm, n, o);
  if (
    !Number.isFinite(estimate.workingBytes) ||
    estimate.workingBytes > budgetBytes
  )
    throw new Error(
      `메모리 예산 초과: ${algorithm}의 작업 공간 추정 ${(estimate.workingBytes / 1048576).toFixed(1)} MiB, 예산 ${(budgetBytes / 1048576).toFixed(1)} MiB. 전체 데이터 계산을 시작하지 않았습니다. 저메모리 알고리즘을 선택하세요.`,
    );
  return estimate;
}
/** Conservative retained-value accounting including container overhead. */
export function retainedBytes(value: unknown): number {
  if (value === null || value === undefined) return 8;
  if (typeof value === "string") return 24 + value.length * 2;
  if (typeof value !== "object") return 8;
  if (Array.isArray(value))
    return 32 + value.reduce((s, v) => s + retainedBytes(v), 0);
  return (
    48 +
    Object.entries(value).reduce(
      (s, [k, v]) => s + k.length * 2 + retainedBytes(v),
      0,
    )
  );
}
