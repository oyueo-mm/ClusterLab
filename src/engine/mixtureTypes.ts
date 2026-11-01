export type DiscreteMixtureMethod =
  "Bernoulli Mixture" | "Poisson Mixture" | "Multinomial Mixture";
/** Product-Bernoulli/Product-Poisson or one count-vector multinomial per row. */
export interface DiscreteMixtureAnalysis {
  kind: "discrete-mixture";
  method: DiscreteMixtureMethod;
  phase: string;
  dimensions: number;
  parameters: number[][];
  weights: number[];
  effectiveCounts: number[];
  weightedSums: number[][];
  totals: number[];
  sourceValues: number[][];
  logLikelihood: number;
  logMassFirstRow: number[];
  converged: boolean;
  iterations: number;
  support: string;
  emptyComponents: number[];
  warnings: string[];
  /** Statistics actually used in this M-step, distinct from the reassessed posterior. */
  maximizationCounts?: number[];
  maximizationSums?: number[][];
}
