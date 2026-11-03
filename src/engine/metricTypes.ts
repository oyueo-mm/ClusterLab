import type { PairwiseCandidate } from "./pairwiseTypes";
export interface MetricCandidate extends PairwiseCandidate {
  logDetCost: number;
}
export interface MetricPair {
  value: number;
  pair: [number, number];
  delta: number[];
}
export interface MetricAnalysis {
  kind: "metric-pairwise";
  method: "MPCKMeans2004-diagonal";
  phase: string;
  dimensions: number;
  dimensionBounds: [number, number][];
  centroids: number[][];
  metrics: number[][];
  denominators: number[][];
  previousMetrics: number[][];
  diameters: MetricPair[];
  mustLink: [number, number][];
  cannotLink: [number, number][];
  componentIds: number[];
  componentSizes: number[];
  componentCannotLink: [number, number][];
  closureMustCount: number;
  closureCannotCount: number;
  penalty: number;
  counts: number[];
  iteration: number;
  distanceCost: number;
  logDetCost: number;
  mustLinkCost: number;
  cannotLinkCost: number;
  objective: number;
  objectiveReady: boolean;
  mustViolations: number;
  cannotViolations: number;
  originalMustViolations: number;
  originalCannotViolations: number;
  current?: number;
  candidates?: MetricCandidate[];
  chosen?: number;
  order?: number[];
  search?: {
    cluster: number;
    checked: number;
    total: number;
    complete: boolean;
    maximum: number;
  };
  conditioned: number[];
  objectiveIncreases: number;
  witnessChanges: number;
  movement: number;
  metricMovement: number;
  converged: boolean;
  stopReason?: "stationary-tolerance" | "iteration-limit";
}
