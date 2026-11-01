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
  objectiveName?: string;
  walkProbabilities?: number[][];
  walkSteps?: number;
  walkIteration?: number;
  walkDistance?: number;
  wardIncrease?: number;
  walkMergeCandidates?: {
    a: number;
    b: number;
    distance: number;
    increase: number;
  }[];
  dendrogram?: {
    a: number;
    b: number;
    id: number;
    members: number[];
    increase: number;
    modularity: number;
  }[];
  selectedLevel?: number;
  cliques?: number[][];
  activeClique?: number[];
  cliqueLinks?: { a: number; b: number }[];
  cliqueComponents?: number[];
  enumeratedCliques?: number;
  cliqueSize?: number;
  communities?: number[][];
  unassignedCount?: number;
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
