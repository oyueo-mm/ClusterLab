import { expect, it } from "vitest";
import {
  generateForRecommendation,
  recommendationParams,
  recommendations,
} from "./recommendations";
import { registry, supportsDataset } from "../engine/registry";
import { displayPoints } from "../engine/dataset";
import { Recorder, stateAt } from "../engine/trace";
import type { Algorithm, Params } from "../engine/types";
async function observe(
  id: Algorithm,
  datasetId: string,
  overrides: Partial<Params> = {},
) {
  const data = generateForRecommendation(
      id,
      recommendations[id].find((entry) => entry.datasetId === datasetId)!,
    ),
    points =
      data.kind === "numeric" && data.display
        ? data.display
        : displayPoints(data);
  const recorder = new Recorder(points.length, id),
    engine = await registry[id].load();
  engine(
    points,
    { ...recommendationParams(id, recommendations[id][0]), ...overrides },
    recorder,
    supportsDataset(id, data.kind) ? data : undefined,
  );
  return {
    data,
    points,
    trace: recorder.trace,
    state: stateAt(recorder.trace, recorder.trace.steps.length),
  };
}
it("the concentric-ring limit actually mixes both radii in K-Means cells", async () => {
  const { points, state } = await observe("K-Means", "circles", { k: 2 });
  for (const label of new Set(state.labels)) {
    const radii = points
      .filter((_, i) => state.labels[i] === label)
      .map((p) => Math.hypot(p.x - 0.5, p.y - 0.5));
    expect(radii.some((r) => r < 0.19)).toBe(true);
    expect(radii.some((r) => r > 0.19)).toBe(true);
  }
});
it("larger DBSCAN neighborhoods reduce noise on the recommended moons", async () => {
  const small = await observe("DBSCAN", "moons", { epsilon: 0.025 }),
    large = await observe("DBSCAN", "moons", { epsilon: 0.1 });
  expect(large.state.labels.filter((l) => l === -1).length).toBeLessThan(
    small.state.labels.filter((l) => l === -1).length,
  );
});
it("the sequential recommendation exhibits actual defer and revisit events", async () => {
  const { trace, state } = await observe("TTSAS", "ordered");
  expect(trace.steps.some((s) => s.kind === "defer")).toBe(true);
  expect(state.analysis?.kind).toBe("sequential");
  if (state.analysis?.kind === "sequential")
    expect(state.analysis.pass).toBeGreaterThan(1);
});
it("mixed conflicting attributes change real co-membership when gamma changes", async () => {
  const numeric = await observe("K-Prototypes", "mixed-ambiguous", {
      k: 2,
      gamma: 0,
    }),
    categorical = await observe("K-Prototypes", "mixed-ambiguous", {
      k: 2,
      gamma: 100,
    });
  const pairs = (labels: number[]) =>
    labels.flatMap((a, i) => labels.slice(i + 1).map((b) => a === b));
  expect(pairs(numeric.state.labels)).not.toEqual(
    pairs(categorical.state.labels),
  );
});
