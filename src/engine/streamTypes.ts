export interface MicroClusterState {
  id: number;
  center: number[];
  radius: number;
  weight: number;
  created: number;
  potential: boolean;
  label: number;
  anchor: number[];
  linearSum: number[];
  squaredSum: number[];
}
export interface StreamAnalysis {
  kind: "stream";
  phase: string;
  method: string;
  time: number;
  processed: number;
  dimensions: number;
  microClusters: MicroClusterState[];
  current?: number[];
  promoted?: number;
  removed?: number[];
  removedCount?: number;
  promotedCount?: number;
  detailedRoles?: boolean;
  decayRate: number;
  pruneInterval: number;
  converged?: boolean;
}
