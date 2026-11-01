import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import { runDiscreteMixture } from "./discreteMixtureCommon";
/** Conditionally independent Poisson counts, fixed finite K, no prior/exposure model. */
export function poisson(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  runDiscreteMixture("Poisson Mixture", points, o, r, input);
}
