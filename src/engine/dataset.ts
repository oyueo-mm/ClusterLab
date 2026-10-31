import type { Point } from "./types";

export interface NumericDataset {
  kind: "numeric";
  values: number[][];
  featureNames?: string[];
  display?: Point[];
  labels?: number[];
}
export interface CategoricalDataset {
  kind: "categorical";
  values: string[][];
  featureNames?: string[];
  display?: Point[];
}
export interface MixedDataset {
  kind: "mixed";
  numeric: number[][];
  categorical: string[][];
  display?: Point[];
}
export interface GraphDataset {
  kind: "graph";
  nodes: { id: string; position?: Point }[];
  edges: { source: string; target: string; weight: number }[];
  directed: boolean;
}
export interface MatrixDataset {
  kind: "matrix";
  values: number[][];
  rowNames?: string[];
  columnNames?: string[];
}
export interface TimeSeriesDataset {
  kind: "timeseries";
  series: { id: string; times: number[]; values: number[] }[];
}
export interface StreamDataset {
  kind: "stream";
  samples: { time: number; values: number[] }[];
}
export interface ConstrainedDataset {
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
