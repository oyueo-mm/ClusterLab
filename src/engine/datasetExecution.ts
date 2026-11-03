import { displayPoints, type Dataset } from "./dataset";
import { validateDataset } from "./datasetValidation";
import { loaders, supportsDataset } from "./registry";
import { validateRun, validateParameters } from "./validation";
import { assertResources, DEFAULT_WORKING_BYTES } from "./resources";
import { Recorder } from "./trace";
import type { Algorithm, Params, Trace, State } from "./types";
export function nativeResult(state: State) {
  const a = state.analysis;
  if (a?.kind === "fuzzy-possibilistic")
    return {
      kind: "memberships-typicalities-centers" as const,
      centroids: a.centroids,
      memberships: a.memberships,
      typicalities: a.typicalities,
      effectiveWeights: a.effectiveWeights,
      objective: a.objective,
      fuzzyCost: a.fuzzyCost,
      typicalityCost: a.typicalityCost,
      converged: a.converged,
      stopReason: a.stopReason,
      fixedPointResidual: a.fixedPointResidual,
      coincidentCenters: a.coincidentCenters,
    };
  if (a?.kind === "possibilistic")
    return {
      kind: "typicalities-and-centers" as const,
      centroids: a.centroids,
      typicalities: a.typicalities,
      logTypicalities: a.logTypicalities,
      scales: a.scales,
      effectiveWeights: a.effectiveWeights,
      logEffectiveWeights: a.logEffectiveWeights,
      displayLabels: state.labels,
      displayCounts: a.counts,
      objective: a.objective,
      distanceCost: a.distanceCost,
      penaltyCost: a.penaltyCost,
      converged: a.converged,
      stopReason: a.stopReason,
      fixedPointResidual: a.fixedPointResidual,
      coincidentCenters: a.coincidentCenters,
      distinctAtLeastK: a.distinctAtLeastK,
    };
  if (a?.kind === "pairwise")
    return {
      kind: "pairwise-partition" as const,
      labels: state.labels,
      centroids: a.centroids,
      counts: a.counts,
      distanceCost: a.distanceCost,
      mustLinkCost: a.mustLinkCost,
      cannotLinkCost: a.cannotLinkCost,
      objective: a.objective,
      mustViolations: a.mustViolations,
      cannotViolations: a.cannotViolations,
      converged: a.converged,
      stopReason: a.stopReason,
    };
  if (a?.kind === "sequential")
    return {
      kind: "sequential-partition" as const,
      method: a.method,
      labels: state.labels,
      centroids: a.centroids,
      counts: a.counts,
      prototypeCounts: a.prototypeCounts,
      passes: a.pass,
      unassigned: a.unassigned,
      converged: a.converged,
      assignedSSE: a.objective,
    };
  if (a?.kind === "constraints")
    return {
      kind: "constrained-partition" as const,
      labels: state.labels,
      centroids: a.centroids,
      componentIds: a.componentIds,
      componentCannotLink: a.componentCannotLink,
      objective: a.objective,
      converged: a.converged,
      activeK: a.activeK,
    };
  if (a?.kind === "discrete-mixture")
    return {
      kind: "mixture" as const,
      method: a.method,
      labels: state.labels,
      weights: a.weights,
      parameters: a.parameters,
      responsibilities: state.responsibilities,
      logLikelihood: a.logLikelihood,
      converged: a.converged,
      support: a.support,
    };
  if (a?.kind === "biclustering")
    return {
      kind: "biclustering" as const,
      biclusters: a.biclusters,
      rowMemberships: a.rowMemberships,
      columnMemberships: a.columnMemberships,
    };
  if (a?.kind === "data-clustering" && a.method === "CLIQUE")
    return {
      kind: "subspaces" as const,
      subspaces: a.subspaces,
      memberships: a.memberships,
    };
  if (a?.kind === "data-clustering" && a.method === "PROCLUS")
    return {
      kind: "projected-partition" as const,
      labels: state.labels,
      medoids: a.medoids,
      dimensionsByCluster: a.dimensionsByCluster,
      influence: a.influence,
      unboundedInfluence: a.medoids?.map(() => a.medoids?.length === 1),
      objective: a.objective,
      converged: a.converged,
    };
  if (a?.kind === "community")
    return {
      kind: "communities" as const,
      levels: a.levels,
      memberships: a.memberships,
      objective: a.objective,
      converged: a.converged,
      ...(a.objectiveName ? { objectiveName: a.objectiveName } : {}),
      ...(a.communities ? { communities: a.communities } : {}),
      ...(a.dendrogram
        ? { dendrogram: a.dendrogram, selectedLevel: a.selectedLevel }
        : {}),
    };
  if (a?.kind === "stream")
    return {
      kind: "stream-summary" as const,
      time: a.time,
      processed: a.processed,
      microClusters: a.microClusters,
    };
  if (a?.kind === "timeseries-clustering")
    return {
      kind: "timeseries-partition" as const,
      centroids: a.centroids,
      shifts: a.shifts,
      objective: a.objective,
      converged: a.converged,
    };
  return { kind: "partition" as const, labels: state.labels };
}

export type DatasetResult = {
  kind: ReturnType<typeof nativeResult>["kind"];
  labels: number[];
  inputKind: Dataset["kind"];
  computedRows: number;
  sourceDimensions?: number;
  computedColumns?: number;
  timeSeriesSteps?: number;
  trace: Trace;
  output: ReturnType<typeof nativeResult>;
};
export function prepareDataset(
  algorithm: Algorithm,
  data: Dataset,
  params: Params,
) {
  validateDataset(data);
  validateParameters(algorithm, params);
  if (!supportsDataset(algorithm, data.kind))
    throw new Error(
      `${algorithm}: ${data.kind} 원본 입력 실행을 아직 지원하지 않습니다.`,
    );
  if (data.kind === "graph" && data.directed)
    throw new Error(
      "현재 연결된 그래프 엔진은 무방향 그래프만 지원합니다. 방향을 자동으로 버리지 않습니다.",
    );
  const count =
    data.kind === "numeric" ||
    data.kind === "categorical" ||
    data.kind === "matrix"
      ? data.values.length
      : data.kind === "mixed"
        ? data.numeric.length
        : data.kind === "graph"
          ? data.nodes.length
          : data.kind === "stream"
            ? data.samples.length
            : data.kind === "timeseries"
              ? data.series.length
              : data.data.values.length;
  const estimate = assertResources(
    algorithm,
    count,
    params,
    DEFAULT_WORKING_BYTES,
    data.kind === "graph" ? data.edges.length : undefined,
  );
  if (algorithm === "G-Means" && data.kind === "numeric")
    estimate.workingBytes += data.values[0].length ** 2 * 128;
  if (algorithm === "K-Shape" && data.kind === "timeseries")
    estimate.workingBytes += data.series[0].values.length ** 2 * 128;
  const rawBytes =
    data.kind === "numeric"
      ? data.values.length * data.values[0].length * 32
      : data.kind === "graph"
        ? data.edges.length * 96
        : data.kind === "categorical"
          ? data.values.reduce(
              (sum, row) =>
                sum + row.reduce((n, v) => n + 48 + v.length * 2, 32),
              0,
            )
          : data.kind === "mixed"
            ? data.numeric.length * data.numeric[0].length * 32 +
              data.categorical.reduce(
                (sum, row) =>
                  sum + row.reduce((n, v) => n + 48 + v.length * 2, 32),
                0,
              )
            : data.kind === "stream"
              ? data.samples.length * (48 + data.samples[0].values.length * 32)
              : data.kind === "matrix"
                ? data.values.length * data.values[0].length * 32
                : data.kind === "timeseries"
                  ? data.series.reduce(
                      (sum, s) => sum + s.values.length * 64,
                      0,
                    )
                  : data.kind === "constrained"
                    ? data.data.values.length *
                        data.data.values[0].length *
                        32 +
                      (data.mustLink.length + data.cannotLink.length) * 176
                    : 0;
  if (estimate.workingBytes + rawBytes > DEFAULT_WORKING_BYTES)
    throw new Error(
      `메모리 예산 초과: 원본 데이터 포함 작업 공간 추정 ${((estimate.workingBytes + rawBytes) / 1048576).toFixed(1)} MiB.`,
    );
  const points = displayPoints(data);
  validateRun(algorithm, points, params);
  return { points, estimate };
}
/** Async typed execution uses original feature/edge values, never the display projection. */
export async function runDataset(
  algorithm: Algorithm,
  data: Dataset,
  params: Params,
): Promise<DatasetResult> {
  const { points } = prepareDataset(algorithm, data, params);
  const engine = await loaders[algorithm]();
  const recorder = new Recorder(points.length, algorithm);
  const start = performance.now();
  engine(points, params, recorder, data);
  recorder.trace.elapsed = performance.now() - start;
  return {
    kind: nativeResult(recorder.state).kind,
    labels: recorder.state.labels,
    inputKind: data.kind,
    computedRows: points.length,
    ...([
      "numeric",
      "categorical",
      "mixed",
      "stream",
      "matrix",
      "timeseries",
      "constrained",
    ].includes(data.kind)
      ? {
          sourceDimensions:
            data.kind === "numeric" ||
            data.kind === "categorical" ||
            data.kind === "matrix"
              ? data.values[0].length
              : data.kind === "mixed"
                ? data.numeric[0].length + data.categorical[0].length
                : data.kind === "stream"
                  ? data.samples[0].values.length
                  : data.kind === "timeseries"
                    ? data.series[0].values.length
                    : data.kind === "constrained"
                      ? data.data.values[0].length
                      : undefined,
        }
      : {}),
    ...(data.kind === "matrix"
      ? { computedColumns: data.values[0].length }
      : {}),
    ...(data.kind === "timeseries"
      ? { timeSeriesSteps: data.series[0].values.length }
      : {}),
    trace: recorder.trace,
    output: nativeResult(recorder.state),
  };
}
