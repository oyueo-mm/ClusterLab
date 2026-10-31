export const legacyAlgorithms = [
  "K-Means",
  "DBSCAN",
  "HDBSCAN",
  "AGNES",
  "DIANA",
  "SOM",
  "LVQ",
  "OPTICS",
  "PAM",
  "ROCK",
  "GMM",
  "BIRCH",
  "Mean Shift",
] as const;
export const algorithms = [
  ...legacyAlgorithms,
  "Fuzzy C-Means",
  "Bisecting K-Means",
  "Spectral Clustering",
  "Affinity Propagation",
  "Density Peaks / CFSFDP",
  "CURE",
  "Neural Gas",
  "Growing Neural Gas",
  "K-Medians",
  "Mini-Batch K-Means",
  "CLARA",
  "CLARANS",
] as const;
export type Algorithm = (typeof algorithms)[number];
export interface Point {
  x: number;
  y: number;
  label?: number;
  features?: string[];
}
export interface Center {
  x: number;
  y: number;
  label?: number;
  id?: number;
  cov?: [number, number, number];
  weight?: number;
  path?: Point[];
  converged?: boolean;
  mergedInto?: number;
}
export interface Edge {
  a: number;
  b: number;
  weight?: number;
}
export interface TreeNode {
  id: number;
  parent?: number;
  size: number;
  height: number;
  members?: number[];
  n?: number;
  ls?: [number, number];
  ss?: number;
  stability?: number;
  selected?: boolean;
}
export interface State {
  analysis?: AlgorithmAnalysis;
  labels: number[];
  centers: Center[];
  edges: Edge[];
  focus: number[];
  radius: number;
  activeCenter: number;
  meanTarget: Point | null;
  metric: number[];
  metricName: string;
  order: number[];
  reach: number[];
  core: number[];
  tree: TreeNode[];
  responsibilities: number[][];
  roles: string[];
  learning: { winner: number; radius: number; rate: number; match?: boolean };
}
/** Algorithm state is separate from display points and restored by Recorder patches. */
export type AlgorithmAnalysis =
  | {
      kind: "centroid-variant";
      phase: string;
      batch?: number[];
      counts?: number[];
      objective?: number;
      metric: "manhattan" | "squared-euclidean";
    }
  | {
      kind: "medoids";
      phase: string;
      sample: number[];
      trial: number;
      proposals?: number;
      accepted?: boolean;
      fullCost?: number;
    }
  | {
      kind: "spectral";
      phase: string;
      adjacency?: number[][];
      degrees?: number[];
      laplacian?: number[][];
      eigenvalues?: number[];
      eigenvectors?: number[][];
      embedding?: number[][];
      embeddingCenters?: number[][];
      residual?: number;
      components?: number;
      normalized?: boolean;
    }
  | {
      kind: "affinity";
      phase: string;
      similarities?: number[][];
      responsibility?: number[][];
      availability?: number[][];
      exemplars: number[];
      converged?: boolean;
    }
  | {
      kind: "density-peaks";
      phase: string;
      rho: number[];
      delta: number[];
      parent: number[];
      gamma: number[];
      selected: number[];
      cutoff: number;
      halo?: boolean[];
    }
  | {
      kind: "cure";
      phase: string;
      representatives: (Point & { label: number })[];
      selected?: Point[];
      shrink: number;
    }
  | {
      kind: "neural-gas";
      phase: string;
      ranks: number[];
      errors?: number[];
      edgeAges?: { a: number; b: number; age: number }[];
    };
export type EventKind =
  | "graph"
  | "laplacian"
  | "eigen"
  | "embedding"
  | "messages"
  | "density"
  | "representatives"
  | "rank"
  | "connect"
  | "initialize"
  | "distance"
  | "assign"
  | "move"
  | "neighbors"
  | "core"
  | "expand"
  | "merge"
  | "split"
  | "prototype"
  | "expectation"
  | "maximization"
  | "insert"
  | "tree-split"
  | "mst"
  | "condense"
  | "stability"
  | "extract"
  | "visit"
  | "swap"
  | "finish";
export interface Step {
  analysisDelta?: {
    beforeExists: boolean;
    afterExists: boolean;
    changes: { key: string; before: unknown; after: unknown }[];
  };
  labelChanges?: { index: number; before: number; after: number }[];
  centerChanges?: { index: number; before: Center; after: Center }[];
  kind: EventKind;
  description: string;
  patch: Partial<State>;
  undo: Partial<State>;
  duration: number;
  result?: Record<string, number | string>;
}
export interface Trace {
  recording?: { policy: string; estimatedBytes: number };
  initial: State;
  steps: Step[];
  snapshots: { index: number; state: State }[];
  elapsed: number;
  algorithm: Algorithm;
}
export interface Params {
  batchSize: number;
  sampleSize: number;
  numLocal: number;
  maxNeighbors: number;
  affinity: string;
  neighbors: number;
  gamma: number;
  laplacian: string;
  damping: number;
  preference: number;
  convergenceWindow: number;
  densityKernel: string;
  representatives: number;
  shrink: number;
  lambda: number;
  maxAge: number;
  insertionInterval: number;
  maxNeurons: number;
  fuzziness: number;
  tolerance: number;
  k: number;
  iterations: number;
  epsilon: number;
  minPts: number;
  minSize: number;
  linkage: string;
  metric: string;
  learningRate: number;
  grid: number;
  radius: number;
  epochs: number;
  threshold: number;
  branching: number;
  seed: number;
  initialization: string;
  selection: string;
  covariance: string;
  xi: number;
  extraction?: string;
  finalClustering: boolean;
  bandwidth: number;
}
export const defaults: Params = {
  batchSize: 32,
  sampleSize: 40,
  numLocal: 3,
  maxNeighbors: 20,
  affinity: "rbf",
  neighbors: 8,
  gamma: 50,
  laplacian: "normalized",
  damping: 0.7,
  preference: -0.1,
  convergenceWindow: 10,
  densityKernel: "gaussian",
  representatives: 5,
  shrink: 0.3,
  lambda: 3,
  maxAge: 30,
  insertionInterval: 30,
  maxNeurons: 20,
  fuzziness: 2,
  tolerance: 0.00001,
  k: 3,
  iterations: 20,
  epsilon: 0.11,
  minPts: 5,
  minSize: 8,
  linkage: "average",
  metric: "euclidean",
  learningRate: 0.2,
  grid: 5,
  radius: 2,
  epochs: 8,
  threshold: 0.055,
  branching: 4,
  seed: 42,
  initialization: "kmeans++",
  selection: "eom",
  covariance: "full",
  xi: 0.05,
  extraction: "epsilon",
  finalClustering: false,
  bandwidth: 0.16,
};
export function algorithmDefaults(algorithm: Algorithm): Params {
  return {
    ...defaults,
    ...(algorithm === "Affinity Propagation" ? { iterations: 200 } : {}),
    ...(algorithm === "PAM" ? { initialization: "build" } : {}),
    ...(algorithm === "ROCK" ? { threshold: 0.5 } : {}),
  };
}
export const isPrototypeAlgorithm = (algorithm: Algorithm) =>
  ["SOM", "Neural Gas", "Growing Neural Gas"].includes(algorithm);
export function emptyState(n: number): State {
  return {
    labels: Array(n).fill(-2),
    centers: [],
    edges: [],
    focus: [],
    radius: 0,
    activeCenter: -1,
    meanTarget: null,
    metric: [],
    metricName: "",
    order: [],
    reach: [],
    core: [],
    tree: [],
    responsibilities: [],
    roles: Array(n).fill("unvisited"),
    learning: { winner: -1, radius: 0, rate: 0 },
  };
}
