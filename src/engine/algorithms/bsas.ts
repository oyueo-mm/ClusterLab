import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import { SequentialRun } from "./sequentialCommon";

/** Basic Sequential Algorithmic Scheme, arithmetic-mean representatives. */
export function bsas(points: Point[], o: Params, r: Recorder, input?: Dataset) {
  const run = new SequentialRun("BSAS", points, o, r, input);
  run.create(0);
  for (let i = 1; i < run.x.length; i++) {
    const nearest = run.nearest(i);
    if (nearest.distance > o.threshold && run.centroids.length < o.maxClusters)
      run.create(i);
    else run.append(i, nearest.cluster, nearest.distances);
  }
  run.endPass();
  run.finish();
}
