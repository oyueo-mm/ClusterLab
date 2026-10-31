import { displayPoints, type Dataset } from "./dataset";
import { validateDataset } from "./datasetValidation";
import { loaders, supportsDataset } from "./registry";
import { validateRun } from "./validation";
import { assertResources, DEFAULT_WORKING_BYTES } from "./resources";
import { Recorder } from "./trace";
import type { Algorithm, Params, Trace } from "./types";

export type DatasetResult = {
  kind: "partition";
  labels: number[];
  inputKind: Dataset["kind"];
  computedRows: number;
  sourceDimensions?: number;
  trace: Trace;
};
export function prepareDataset(
  algorithm: Algorithm,
  data: Dataset,
  params: Params,
) {
  validateDataset(data);
  if (!supportsDataset(algorithm, data.kind))
    throw new Error(
      `${algorithm}: ${data.kind} 원본 입력 실행을 아직 지원하지 않습니다.`,
    );
  if (data.kind === "graph" && data.directed)
    throw new Error(
      "현재 Spectral 엔진은 무방향 그래프만 지원합니다. 방향을 자동으로 버리지 않습니다.",
    );
  const points = displayPoints(data);
  validateRun(algorithm, points, params);
  const estimate = assertResources(algorithm, points.length, params);
  const rawBytes =
    data.kind === "numeric"
      ? data.values.length * data.values[0].length * 32
      : data.kind === "graph"
        ? data.edges.length * 96
        : 0;
  if (estimate.workingBytes + rawBytes > DEFAULT_WORKING_BYTES)
    throw new Error(
      `메모리 예산 초과: 원본 데이터 포함 작업 공간 추정 ${((estimate.workingBytes + rawBytes) / 1048576).toFixed(1)} MiB.`,
    );
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
    kind: "partition",
    labels: recorder.state.labels,
    inputKind: data.kind,
    computedRows: points.length,
    ...(data.kind === "numeric"
      ? { sourceDimensions: data.values[0].length }
      : {}),
    trace: recorder.trace,
  };
}
