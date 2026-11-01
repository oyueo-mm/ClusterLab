/** State of actual ordered prototype clustering; display coordinates are separate. */
export interface SequentialAnalysis {
  kind: "sequential";
  method: "BSAS" | "MBSAS" | "TTSAS";
  phase: string;
  sourceValues: number[][];
  centroids: number[][];
  /** Current output assignment population, distinct from prototype training counts. */
  counts: number[];
  prototypeCounts: number[];
  processed: number;
  current?: number;
  distances?: { cluster: number; distance: number }[];
  threshold: number;
  upperThreshold?: number;
  maxClusters?: number;
  unassigned: number;
  pass: number;
  created?: number;
  decision?: string;
  converged: boolean;
  /** Descriptive assigned SSE, not a claimed optimized monotonic objective. */
  objective: number;
}
