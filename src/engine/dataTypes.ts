export interface DenseUnit {
  dimensions: number[];
  coordinates: number[];
  count: number;
  members: number[];
}
export interface SubspaceCluster {
  id: number;
  dimensions: number[];
  members: number[];
  units: number[];
  regions: { low: number[]; high: number[] }[];
}
export interface DataAnalysis {
  kind: "data-clustering";
  method: string;
  phase: string;
  dimensions: number;
  numericCenters?: number[][];
  categoricalCenters?: string[][];
  frequencies?: {
    cluster: number;
    attribute: number;
    value: string;
    count: number;
  }[];
  objective?: number;
  retainedCost?: number;
  converged?: boolean;
  dimensionsByCluster?: number[][];
  dimensionScores?: number[][];
  localities?: number[][];
  medoids?: number[];
  sample?: number[];
  candidates?: number[];
  accepted?: boolean;
  units?: DenseUnit[];
  subspaces?: SubspaceCluster[];
  bounds?: { min: number[]; max: number[] };
  gridBins?: number;
  densityThreshold?: number;
  exploredDimensions?: number;
  memberships?: number[][];
  influence?: number[];
}
