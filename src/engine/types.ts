export const algorithms = [
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
  labels: number[];
  centers: Center[];
  edges: Edge[];
  focus: number[];
  radius: number;
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
export type EventKind =
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
  kind: EventKind;
  description: string;
  patch: Partial<State>;
  undo: Partial<State>;
  duration: number;
  result?: Record<string, number | string>;
}
export interface Trace {
  initial: State;
  steps: Step[];
  snapshots: { index: number; state: State }[];
  elapsed: number;
  algorithm: Algorithm;
}
export interface Params {
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
}
export const defaults: Params = {
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
};
export function emptyState(n: number): State {
  return {
    labels: Array(n).fill(-2),
    centers: [],
    edges: [],
    focus: [],
    radius: 0,
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
