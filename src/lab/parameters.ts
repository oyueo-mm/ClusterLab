import { type Algorithm, type Params } from "../engine/types";
import { recommendations, recommendationParams } from "../data/recommendations";
import { validateParameters } from "../engine/validation";
import { readPreference } from "./storage";
export function restoreParams(algorithm: Algorithm): Params {
  const defaults = recommendationParams(algorithm, recommendations[algorithm][0]);
  try {
    const saved = readPreference(`params:${algorithm}`, defaults);
    validateParameters(algorithm, saved);
    return saved;
  } catch {
    return defaults;
  }
}
