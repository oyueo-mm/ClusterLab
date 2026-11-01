export interface AutoDecision {
  cluster: number;
  accepted: boolean;
  statistic: number;
  threshold: number;
  reason: string;
  before?: number;
  after?: number;
  viewers?: number;
  viewerFraction?: number;
}
export interface AutoAnalysis {
  kind: "model-selection";
  method: string;
  phase: string;
  dimensions: number;
  centroids: number[][];
  sse: number;
  objective?: number;
  penalty?: number;
  decisions?: AutoDecision[];
  projections?: number[];
  testValues?: number[];
  proposedCentroids?: number[][];
  candidateLabels?: number[];
  converged?: boolean;
}
