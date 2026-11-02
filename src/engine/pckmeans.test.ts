import { describe, expect, it } from "vitest";
import fixture from "../../docs/research/pckmeans-reference.json";
import { pckmeans } from "./algorithms/pckmeans";
import { Recorder, applyStep, stateAt } from "./trace";
import { algorithmDefaults } from "./types";
import { displayPoints, type ConstrainedDataset } from "./dataset";
import { nativeResult, runDataset } from "./datasetExecution";
import { compactPreview } from "./preview";

const options = {
  ...algorithmDefaults("PCKMeans"),
  iterations: 20,
  tolerance: 1e-9,
};
const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 9);
function calculate(
  input: (typeof fixture.cases)[number]["input"],
  budget?: number,
) {
  const data: ConstrainedDataset = {
    kind: "constrained",
    data: { kind: "numeric", values: input.values },
    mustLink: input.mustLink as [number, number][],
    cannotLink: input.cannotLink as [number, number][],
  };
  const r = new Recorder(input.values.length, "PCKMeans", budget);
  pckmeans(
    displayPoints(data),
    {
      ...options,
      k: input.k,
      seed: input.seed,
      constraintPenalty: input.penalty,
    },
    r,
    data,
  );
  return { data, r };
}
describe("PCKMeans independent full-objective oracle", () => {
  for (const { input, result } of fixture.cases)
    it(input.name, () => {
      const { r } = calculate(input),
        end = stateAt(r.trace, r.trace.steps.length);
      expect(end.labels).toEqual(result.labels);
      const a = end.analysis;
      if (a?.kind !== "pairwise")
        throw Error("actual pairwise analysis missing");
      for (const key of [
        "distanceCost",
        "mustLinkCost",
        "cannotLinkCost",
        "objective",
        "mustViolations",
        "cannotViolations",
      ] as const)
        near(a[key], result[key]);
      a.centroids.forEach((row, j) =>
        row.forEach((v, d) => near(v, result.centroids[j][d])),
      );
      expect(a.stopReason).toBe(result.stopReason);
      const initialized = r.trace.steps.findIndex((step) =>
        step.analysisDelta?.changes.some(
          (change) =>
            change.key === "phase" && change.after === "initial-labels",
        ),
      );
      const initializedAnalysis = stateAt(r.trace, initialized + 1).analysis;
      if (initializedAnalysis?.kind !== "pairwise")
        throw Error("initial centers missing");
      initializedAnalysis.centroids.forEach((row, j) =>
        row.forEach((v, d) => near(v, result.initialCenters[j][d])),
      );
      const tests = r.trace.steps.flatMap((step, i) =>
        step.kind === "test" ? [stateAt(r.trace, i + 1)] : [],
      );
      expect(tests).toHaveLength(result.states.length);
      tests.forEach((state, i) => {
        const test = state.analysis,
          reference = result.states[i];
        if (test?.kind !== "pairwise")
          throw Error("candidate analysis missing");
        expect(test.current).toBe(reference.row);
        expect(test.chosen).toBe(reference.chosen);
        expect(state.labels).toEqual(reference.labels);
        test.candidates!.forEach((candidate, h) => {
          for (const key of [
            "distanceSquared",
            "mustLinkCost",
            "cannotLinkCost",
            "total",
          ] as const)
            near(candidate[key], reference.candidates[h][key]);
          const current = reference.labels[reference.row];
          near(test.objective, reference.candidates[current].globalObjective);
          near(
            candidate.total - test.candidates![current].total,
            reference.candidates[h].globalObjective -
              reference.candidates[current].globalObjective,
          );
        });
      });
      for (let j = 1; j < end.metric.length; j++)
        expect(end.metric[j]).toBeLessThanOrEqual(end.metric[j - 1] + 1e-10);
      // Every real event, checkpoint and reverse patch restores the original state.
      let state = r.trace.initial;
      r.trace.steps.forEach((step, i) => {
        state = applyStep(state, step);
        expect(stateAt(r.trace, i + 1)).toEqual(state);
      });
      expect(state).toEqual(end);
      for (const step of [...r.trace.steps].reverse())
        state = applyStep(state, step, true);
      expect(state).toEqual(r.trace.initial);
      expect(nativeResult(end).kind).toBe("pairwise-partition");
      const clip = compactPreview(r.trace);
      expect(clip.frames.at(-1)?.labels).toEqual(end.labels);
      expect(clip.frames.length).toBeLessThanOrEqual(36);
      // Exhaustive assignments verify the exact objective, not greedy global optimality.
      for (const partition of result.exhaustive) {
        const groups = Array.from({ length: input.k }, () => [] as number[][]);
        partition.labels.forEach((label, i) =>
          groups[label].push(input.values[i]),
        );
        const means = groups.map((g) =>
          g.length
            ? g[0].map((_, j) => g.reduce((s, row) => s + row[j], 0) / g.length)
            : [],
        );
        const distance = input.values.reduce(
          (sum, row, i) =>
            sum +
            row.reduce(
              (s, v, j) => s + (v - means[partition.labels[i]][j]) ** 2,
              0,
            ),
          0,
        );
        const ml = result.closureMustLink.filter(
            ([u, v]) => partition.labels[u] !== partition.labels[v],
          ).length,
          cl = result.closureCannotLink.filter(
            ([u, v]) => partition.labels[u] === partition.labels[v],
          ).length;
        near(distance + input.penalty * (ml + cl), partition.objective);
      }
    });
});
it("finite violations are successful results and penalty changes actual labels", () => {
  const low = calculate(fixture.cases[1].input).r.state,
    high = calculate(fixture.cases[2].input).r.state;
  expect(low.labels).not.toEqual(high.labels);
  expect(low.analysis?.kind).toBe("pairwise");
  if (low.analysis?.kind === "pairwise") {
    expect(low.analysis.mustViolations).toBe(1);
    expect(low.analysis.cannotViolations).toBe(1);
    near(low.analysis.objective, 0.03);
  }
});
it("canonical duplicates, ML closure and non-transitive CL preserve exact cost", () => {
  const first = fixture.cases[5].input,
    { r } = calculate(first),
    duplicate = {
      ...first,
      mustLink: [...first.mustLink, [1, 0], [0, 2], [2, 2]],
      cannotLink: [...first.cannotLink, [3, 2]],
    };
  const other = calculate(duplicate).r.state;
  expect(other.labels).toEqual(r.state.labels);
  if (other.analysis?.kind !== "pairwise") throw Error("missing");
  expect(other.analysis.closureMustCount).toBe(3);
  expect(other.analysis.closureCannotCount).toBe(4);
  expect(other.analysis.objective).toBe(
    r.state.analysis?.kind === "pairwise" ? r.state.analysis.objective : NaN,
  );
});
it("all original dimensions are computed; display changes and input metadata are not features", async () => {
  const { data, r } = calculate(fixture.cases[0].input),
    changed = {
      ...data,
      data: {
        ...data.data,
        display: data.data.values.map(() => ({ x: 999, y: -999 })),
        labels: [9, 9, 9, 9],
      },
    };
  const second = new Recorder(4, "PCKMeans");
  pckmeans(
    displayPoints(changed),
    { ...options, k: 2, constraintPenalty: 2 },
    second,
    changed,
  );
  expect(second.state).toEqual(r.state);
  const native = await runDataset("PCKMeans", changed, {
    ...options,
    k: 2,
    constraintPenalty: 2,
  });
  expect(native.output.kind).toBe("pairwise-partition");
  if (native.output.kind !== "pairwise-partition")
    throw Error("native result missing");
  expect(native.output.centroids).toEqual(
    r.state.analysis?.kind === "pairwise" ? r.state.analysis.centroids : [],
  );
  expect(native.computedRows).toBe(4);
  expect(native.sourceDimensions).toBe(3);
});
it("actual 48-event checkpoints and arbitrary seeks restore a multi-sweep Trace", () => {
  const input = {
    values: Array.from({ length: 24 }, (_, i) => [
      i < 12 ? i * 0.01 : 2 + i * 0.01,
      i % 3,
    ]),
    mustLink: [
      [0, 1],
      [12, 13],
    ],
    cannotLink: [[0, 12]],
    k: 2,
    penalty: 0.5,
    seed: 42,
    name: "checkpoint",
  };
  const { r } = calculate(input);
  expect(r.trace.snapshots.length).toBeGreaterThanOrEqual(2);
  for (const snapshot of r.trace.snapshots)
    expect(stateAt(r.trace, snapshot.index)).toEqual(snapshot.state);
  for (const index of [49, 7, 72, 0, r.trace.steps.length]) {
    let state = r.trace.initial;
    for (const step of r.trace.steps.slice(0, index))
      state = applyStep(state, step);
    expect(stateAt(r.trace, index)).toEqual(state);
  }
});
it("seed and original order are reproducible, with real seeded sweep order", () => {
  const input = fixture.cases[6].input,
    first = calculate(input).r.trace,
    second = calculate(input).r.trace;
  expect(first).toEqual(second);
  expect(calculate({ ...input, seed: 137 }).r.trace.steps).not.toEqual(
    first.steps,
  );
  const reversed = { ...input, values: [...input.values].reverse() };
  expect(calculate(reversed).r.trace).toEqual(calculate(reversed).r.trace);
});
it("1000 rows retain all inputs with bounded summary Trace", () => {
  const data: ConstrainedDataset = {
    kind: "constrained",
    data: {
      kind: "numeric",
      values: Array.from({ length: 1000 }, (_, i) => [
        i < 500 ? i * 0.0001 : 2 + i * 0.0001,
        0,
        i % 3,
      ]),
    },
    mustLink: [[0, 1]],
    cannotLink: [[0, 999]],
  };
  const r = new Recorder(1000, "PCKMeans");
  pckmeans(displayPoints(data), { ...options, k: 2, iterations: 5 }, r, data);
  expect(r.state.labels.length).toBe(1000);
  expect(r.state.labels.every((v) => v >= 0)).toBe(true);
  expect(r.trace.recording?.policy).toContain("개별 후보 기록 생략");
  expect(r.trace.recording!.estimatedBytes).toBeLessThan(64 * 1048576);
});
it("rejects inconsistent input, invalid parameters and numerical/Trace failures explicitly", () => {
  const base = fixture.cases[1].input;
  expect(() => calculate({ ...base, cannotLink: [[0, 3]] })).toThrow(/모순/);
  for (const patch of [
    { penalty: -1 },
    { penalty: Infinity },
    { k: 0 },
    { k: 5 },
    { seed: NaN },
  ])
    expect(() => calculate({ ...base, ...patch })).toThrow();
  expect(() =>
    calculate({ ...base, values: [[0], [1e200], [4], [4.1]] }),
  ).toThrow(/수치/);
  expect(() =>
    calculate({ ...base, values: [[0], [1e-200], [4e-200], [4.1e-200]] }),
  ).toThrow(/수치/);
  expect(() => calculate(base, 256)).toThrow(/Trace/);
  const { data } = calculate(base),
    weighted = { ...data, mustLinkWeights: [1] };
  expect(() =>
    pckmeans(
      displayPoints(weighted),
      { ...options, k: 2 },
      new Recorder(4, "PCKMeans"),
      weighted,
    ),
  ).toThrow(/관계별 가중치/);
});
