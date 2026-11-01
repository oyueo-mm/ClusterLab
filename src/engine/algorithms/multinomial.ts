import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import { runDiscreteMixture } from "./discreteMixtureCommon";
/** A full multinomial count vector per row, conditioned on its actual row total. */
export function multinomial(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  runDiscreteMixture("Multinomial Mixture", points, o, r, input);
}
