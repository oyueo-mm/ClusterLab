import { expect, it } from "vitest";
import { Recorder, applyStep, stateAt } from "./trace";

it("records matrix field changes once, preserves caller mutations and reverses across checkpoints", () => {
  const r = new Recorder(2, "Spectral Clustering"),
    matrix = [
      [0, 1],
      [1, 0],
    ];
  r.emit("graph", "W", {
    analysis: { kind: "spectral", phase: "graph", adjacency: matrix },
  });
  const first = r.state.analysis;
  r.emit("laplacian", "reuse W", {
    analysis: {
      kind: "spectral",
      phase: "laplacian",
      adjacency: matrix,
      laplacian: [
        [1, -1],
        [-1, 1],
      ],
    },
  });
  expect(
    r.trace.steps[1].analysisDelta?.changes.map((c) => c.key),
  ).not.toContain("adjacency");
  if (first?.kind !== "spectral" || r.state.analysis?.kind !== "spectral")
    throw new Error("wrong analysis kind");
  expect(r.state.analysis.adjacency).toBe(first.adjacency);
  matrix[0][1] = matrix[1][0] = 2;
  r.emit("graph", "changed W", {
    analysis: { kind: "spectral", phase: "graph", adjacency: matrix },
  });
  expect(first.adjacency).toEqual([
    [0, 1],
    [1, 0],
  ]);
  expect(
    stateAt(r.trace, 3).analysis?.kind === "spectral" &&
      (stateAt(r.trace, 3).analysis as typeof first).adjacency,
  ).toEqual([
    [0, 2],
    [2, 0],
  ]);
  for (let i = 0; i < 50; i++)
    r.emit("visit", "phase", {
      analysis: { kind: "spectral", phase: String(i), adjacency: matrix },
    });
  let state = r.trace.initial;
  r.trace.steps.forEach((step, i) => {
    state = applyStep(state, step);
    expect(state).toEqual(stateAt(r.trace, i + 1));
  });
  expect(state).toEqual(r.state);
  [...r.trace.steps].reverse().forEach((step) => {
    state = applyStep(state, step, true);
  });
  expect(state).toEqual(r.trace.initial);
  expect(state).not.toHaveProperty("analysis");
});
it("analysis kind switches remove obsolete matrices and restore them on reverse", () => {
  const r = new Recorder(2, "Spectral Clustering");
  r.emit("graph", "spectral", {
    analysis: {
      kind: "spectral",
      phase: "graph",
      adjacency: [
        [0, 1],
        [1, 0],
      ],
    },
  });
  const previous = r.state;
  r.emit("rank", "neural", {
    analysis: { kind: "neural-gas", phase: "rank", ranks: [0, 1] },
  });
  expect(r.state.analysis).not.toHaveProperty("adjacency");
  expect(applyStep(r.state, r.trace.steps[1], true)).toEqual(previous);
});
