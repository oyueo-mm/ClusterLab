export interface ConstraintBlocker {
  kind: "must-link" | "cannot-link";
  /** Already assigned witness row; may be related through ML closure. */
  point: number;
  component: number;
  label: number;
}
export interface ConstraintCandidate {
  cluster: number;
  distanceSquared: number;
  allowed: boolean;
  blockers: ConstraintBlocker[];
}
export interface ConstraintAnalysis {
  kind: "constraints";
  method: string;
  phase: string;
  dimensions: number;
  dimensionBounds: [number, number][];
  iteration: number;
  centroids: number[][];
  componentIds: number[];
  componentSizes: number[];
  componentCannotLink: [number, number][];
  mustLink: [number, number][];
  cannotLink: [number, number][];
  assigned: number;
  activeK: number;
  /** SSE of currently assigned rows, not an unconstrained nearest assignment. */
  objective: number;
  current?: number;
  candidates?: ConstraintCandidate[];
  initialization?: number[];
  emptyClusters: number[];
  converged: boolean;
  stopReason?:
    "labels-stable" | "center-tolerance" | "iteration-limit" | "greedy-failure";
}
