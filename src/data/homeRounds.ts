import {
  dataset,
  dataDefaults,
  type PresetId,
  type DataOptions,
  presets,
} from "./presets";
import {
  defaults,
  algorithms,
  type Algorithm,
  type Params,
  type Point,
  type Trace,
} from "../engine/types";
export interface HomeRound {
  preset: PresetId;
  algorithms: readonly [Algorithm, Algorithm, Algorithm, Algorithm];
  seed: number;
}
export const homeRounds: readonly HomeRound[] = [
  {
    preset: "blobs",
    algorithms: ["K-Means", "DBSCAN", "GMM", "Mean Shift"],
    seed: 42,
  },
  {
    preset: "moons",
    algorithms: ["DBSCAN", "HDBSCAN", "OPTICS", "AGNES"],
    seed: 43,
  },
  { preset: "density", algorithms: ["BIRCH", "PAM", "DIANA", "SOM"], seed: 44 },
  { preset: "labeled", algorithms: ["LVQ", "K-Means", "GMM", "SOM"], seed: 45 },
  {
    preset: "categorical",
    algorithms: ["ROCK", "PAM", "AGNES", "BIRCH"],
    seed: 46,
  },
  {
    preset: "anisotropic",
    algorithms: ["GMM", "Mean Shift", "K-Means", "DIANA"],
    seed: 47,
  },
  {
    preset: "circles",
    algorithms: ["HDBSCAN", "DBSCAN", "OPTICS", "SOM"],
    seed: 48,
  },
  {
    preset: "outliers",
    algorithms: ["PAM", "BIRCH", "AGNES", "Mean Shift"],
    seed: 49,
  },
  {
    preset: "spiral",
    algorithms: ["DBSCAN", "OPTICS", "SOM", "HDBSCAN"],
    seed: 50,
  },
  {
    preset: "unequal",
    algorithms: ["K-Means", "PAM", "GMM", "DIANA"],
    seed: 51,
  },
  {
    preset: "overlap",
    algorithms: ["GMM", "Mean Shift", "K-Means", "BIRCH"],
    seed: 52,
  },
];
export const HOME_POINT_COUNT = 36;
export const roundName = (round: HomeRound) =>
  presets.find((p) => p[0] === round.preset)![1];
export const roundOptions = (round: HomeRound): DataOptions => ({
  ...dataDefaults,
  count: HOME_POINT_COUNT,
  seed: round.seed,
});
export const roundData = (round: HomeRound) =>
  dataset(round.preset, roundOptions(round));
export function compatible(algorithm: Algorithm, points: Point[]) {
  return points.every(
    (p) =>
      Number.isFinite(p.x) &&
      Number.isFinite(p.y) &&
      (algorithm !== "LVQ" || p.label !== undefined) &&
      (algorithm !== "ROCK" || !!p.features?.length),
  );
}
export function roundParams(algorithm: Algorithm): Params {
  return {
    ...defaults,
    k: algorithm === "LVQ" ? 2 : 3,
    iterations: 15,
    epochs: 3,
    grid: 4,
    minPts: 3,
    minSize: 4,
    epsilon: algorithm === "OPTICS" ? 0.8 : 0.14,
    threshold:
      algorithm === "ROCK" ? 0.5 : algorithm === "OPTICS" ? 0.12 : 0.055,
    bandwidth: 0.18,
    initialization: algorithm === "PAM" ? "build" : "kmeans++",
  };
}
/** Only playback time changes. Completion still requires every recorded event. */
export function homeSpeed(trace: Trace) {
  // GMM records one whole E/M step per event, unlike per-point algorithms.
  // Preserve at least 450ms for each EM transition in the small home cards.
  if (trace.algorithm === "GMM") {
    const shortest = Math.min(...trace.steps.map((s) => s.duration));
    const multiplier = Math.min(2, shortest / 450);
    return Math.max(1, 50 + 18 * Math.log2(multiplier));
  }
  const total = trace.steps.reduce((s, e) => s + e.duration, 0),
    target = 7500 + (algorithms.indexOf(trace.algorithm) % 4) * 900;
  const multiplier = Math.max(3, Math.min(250, total / target));
  return Math.min(200, 50 + 18 * Math.log2(multiplier));
}
