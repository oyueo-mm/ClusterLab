export interface TimeSeriesAnalysis {
  kind: "timeseries-clustering";
  method: string;
  phase: string;
  series: number[][];
  centroids: number[][];
  aligned?: number[][];
  shifts?: number[];
  distances?: number[];
  correlation?: number[];
  activeSeries?: number;
  activeCluster?: number;
  eigenvalues?: number[];
  objective: number;
  converged: boolean;
  times: number[];
  clusterMembers?: number[];
  emptyClusters?: number[];
  eigenResidual?: number;
  orientation?: number;
}
