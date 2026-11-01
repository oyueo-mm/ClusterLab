import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import { SequentialRun } from "./sequentialCommon";

/** MBSAS separates creation of seed representatives from remaining assignments. */
export function mbsas(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  const run = new SequentialRun("MBSAS", points, o, r, input);
  run.create(0);
  for (let i = 1; i < run.x.length; i++) {
    const nearest = run.nearest(i);
    if (nearest.distance > o.threshold && run.centroids.length < o.maxClusters)
      run.create(i);
    else run.defer(i, nearest.distances);
  }
  run.endPass();
  run.pass = 2;
  // Do not present seeds twice: their population and mean already include them.
  for (let i = 0; i < run.x.length; i++)
    if (run.labels[i] < 0) {
      const nearest = run.nearest(i);
      run.append(i, nearest.cluster, nearest.distances);
    }
  run.endPass();
  run.finish();
}
