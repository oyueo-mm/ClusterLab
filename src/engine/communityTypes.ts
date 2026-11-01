import type { Edge } from "./types";

/** Real graph states; display coordinates have no role in community calculations. */
export interface CommunityAnalysis {
  kind: "community";
  method: string;
  phase: string;
  graphSource: string;
  inputEdges: Edge[];
  levels: number[][];
  objective: number;
  activeNode?: number;
  candidates?: { community: number; gain: number }[];
  aggregateEdges?: Edge[];
  aggregateLabels?: number[];
  aggregateMembers?: number[][];
  refinedLabels?: number[];
  transition?: number[][];
  betweenness?: { a: number; b: number; value: number }[];
  removed?: Edge[];
  converged?: boolean;
  components?: number;
  resolution?: number;
  residual?: number;
  votes?: { community: number; gain: number }[];
  memberships?: number[][];
  attractors?: number[];
  counts?: number[];
  densities?: number[];
  seeds?: number[];
  assignedCount?: number;
  totalNodes?: number;
  mergeCandidates?: { a: number; b: number; gain: number }[];
}
