import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import { runDiscreteMixture } from "./discreteMixtureCommon";
export function bernoulli(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  runDiscreteMixture("Bernoulli Mixture", points, o, r, input);
}
