export interface PairwiseCandidate {
  cluster: number;
  distanceSquared: number;
  mustLinkCost: number;
  cannotLinkCost: number;
  total: number;
}
export interface PairwiseAnalysis {
  kind: "pairwise";
  method: "PCKMeans";
  phase: string;
  dimensions: number;
  dimensionBounds: [number, number][];
  iteration: number;
  centroids: number[][];
  componentIds: number[];
  componentSizes: number[];
  componentCannotLink: [number, number][];
  /** Canonical original pairs; closure pairs are represented by components. */
  mustLink: [number, number][];
  cannotLink: [number, number][];
  closureMustCount: number;
  closureCannotCount: number;
  penalty: number;
  counts: number[];
  distanceCost: number;
  mustLinkCost: number;
  cannotLinkCost: number;
  objective: number;
  mustViolations: number;
  cannotViolations: number;
  originalMustViolations: number;
  originalCannotViolations: number;
  current?: number;
  candidates?: PairwiseCandidate[];
  chosen?: number;
  order?: number[];
  converged: boolean;
  stopReason?: "labels-stable" | "objective-tolerance" | "iteration-limit";
}
