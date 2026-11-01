import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import { SequentialRun } from "./sequentialCommon";

/** Two-threshold sequential scheme, including actual revisit/no-progress rule. */
export function ttsas(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  const run = new SequentialRun("TTSAS", points, o, r, input);
  let previousChanges = 0;
  while (run.assigned < run.x.length) {
    const previousAssigned = run.assigned;
    let first = run.labels.indexOf(-1);
    if (previousChanges === 0) {
      run.create(first, true);
      first++;
    }
    for (let i = first; i < run.x.length; i++)
      if (run.labels[i] < 0) {
        const nearest = run.nearest(i);
        // Official Python implementation includes equality at the lower boundary.
        if (nearest.distance <= o.threshold)
          run.append(i, nearest.cluster, nearest.distances);
        else if (nearest.distance > o.upperThreshold) run.create(i);
        else run.defer(i, nearest.distances);
      }
    previousChanges = run.assigned - previousAssigned;
    run.endPass();
    if (run.assigned < run.x.length) run.pass++;
  }
  run.finish();
}
