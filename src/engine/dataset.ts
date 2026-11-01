import type { Point } from "./types";

export interface DatasetMetadata {
  provenance?: {
    generator: string;
    seed: number;
    parameters: Record<string, string | number | boolean>;
  };
}
export interface NumericDataset extends DatasetMetadata {
  kind: "numeric";
  values: number[][];
  featureNames?: string[];
  display?: Point[];
  labels?: number[];
}
export interface CategoricalDataset extends DatasetMetadata {
  kind: "categorical";
  values: string[][];
  featureNames?: string[];
  display?: Point[];
}
export interface MixedDataset extends DatasetMetadata {
  kind: "mixed";
  numeric: number[][];
  categorical: string[][];
  display?: Point[];
}
export interface GraphDataset extends DatasetMetadata {
  kind: "graph";
  nodes: { id: string; position?: Point }[];
  edges: { source: string; target: string; weight: number }[];
  directed: boolean;
}
export interface MatrixDataset extends DatasetMetadata {
  kind: "matrix";
  values: number[][];
  rowNames?: string[];
  columnNames?: string[];
}
export interface TimeSeriesDataset extends DatasetMetadata {
  kind: "timeseries";
  series: { id: string; times: number[]; values: number[] }[];
}
export interface StreamDataset extends DatasetMetadata {
  kind: "stream";
  samples: { time: number; values: number[] }[];
}
export interface ConstrainedDataset extends DatasetMetadata {
  kind: "constrained";
  data: NumericDataset;
  mustLink: [number, number][];
  cannotLink: [number, number][];
}
export type Dataset =
  | NumericDataset
  | CategoricalDataset
  | MixedDataset
  | GraphDataset
  | MatrixDataset
  | TimeSeriesDataset
  | StreamDataset
  | ConstrainedDataset;

export function legacyDataset(points: Point[]): NumericDataset {
  return {
    kind: "numeric",
    values: points.map((p) => [p.x, p.y]),
    display: points,
    ...(points.every((p) => p.label !== undefined)
      ? { labels: points.map((p) => p.label!) }
      : {}),
  };
}

/** Full features for computation. Display coordinates never enter this conversion. */
export function numericRows(points: Point[], input?: Dataset): number[][] {
  if (!input) return points.map((p) => [p.x, p.y]);
  if (input.kind !== "numeric")
    throw new Error("이 엔진은 수치형 원본 데이터가 필요합니다.");
  return input.values;
}

export function displayPoints(
  data: Dataset,
  axes: [number, number] = [0, 1],
): Point[] {
  if (data.kind === "mixed")
    return (
      data.display ??
      displayPoints({ kind: "numeric", values: data.numeric }, axes)
    );
  if (data.kind === "categorical") {
    if (data.display) return data.display;
    const dimensions = data.values[0]?.length ?? 1;
    const columns = axes.map((a) =>
      Math.max(0, Math.min(Math.trunc(a), dimensions - 1)),
    );
    const tokens = columns.map((column) =>
      [...new Set(data.values.map((row) => row[column]))].sort(),
    );
    const indexes = tokens.map(
      (values) => new Map(values.map((value, i) => [value, i])),
    );
    return data.values.map((row) => ({
      x:
        0.1 +
        (0.8 * indexes[0].get(row[columns[0]])!) /
          Math.max(1, tokens[0].length - 1),
      y:
        0.1 +
        (0.8 * indexes[1].get(row[columns[1]])!) /
          Math.max(1, tokens[1].length - 1),
      features: row,
    }));
  }
  if (data.kind === "stream")
    return displayPoints(
      { kind: "numeric", values: data.samples.map((s) => s.values) },
      axes,
    );
  if (data.kind === "matrix")
    return displayPoints({ kind: "numeric", values: data.values }, axes);
  if (data.kind === "timeseries")
    return displayPoints(
      {
        kind: "numeric",
        values: data.series.map((s) => {
          const mean = s.values.reduce((a, b) => a + b, 0) / s.values.length;
          return [
            mean,
            Math.sqrt(
              s.values.reduce((a, b) => a + (b - mean) ** 2, 0) /
                s.values.length,
            ),
          ];
        }),
      },
      axes,
    );
  if (data.kind === "constrained") return displayPoints(data.data, axes);
  if (data.kind === "numeric") {
    if (data.display) return data.display;
    const dims = data.values[0]?.length ?? 0;
    const a = Math.max(0, Math.min(Math.trunc(axes[0]), dims - 1)),
      b = Math.max(0, Math.min(Math.trunc(axes[1]), dims - 1));
    const lo = [Infinity, Infinity],
      hi = [-Infinity, -Infinity];
    data.values.forEach((v) =>
      [v[a], v[b]].forEach((x, j) => {
        lo[j] = Math.min(lo[j], x);
        hi[j] = Math.max(hi[j], x);
      }),
    );
    return data.values.map((v) => ({
      x: 0.1 + (0.8 * (v[a] - lo[0])) / (hi[0] - lo[0] || 1),
      y: 0.1 + (0.8 * (v[b] - lo[1])) / (hi[1] - lo[1] || 1),
    }));
  }
  if (data.kind === "graph")
    return data.nodes.map(
      (node, i) =>
        node.position ?? {
          x: 0.5 + 0.35 * Math.cos((2 * Math.PI * i) / data.nodes.length),
          y: 0.5 + 0.35 * Math.sin((2 * Math.PI * i) / data.nodes.length),
        },
    );
  throw new Error("이 데이터 유형의 표시 편집기는 아직 지원하지 않습니다.");
}
