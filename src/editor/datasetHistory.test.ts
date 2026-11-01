import { expect, it } from "vitest";
import {
  createDatasetHistory,
  commitDatasetHistory,
  undoDatasetHistory,
  redoDatasetHistory,
} from "./datasetHistory";
it("large sparse structured edit retains only changed values and preserves unrelated rows through undo/redo", () => {
  const initial = {
    kind: "numeric" as const,
    values: Array.from({ length: 10000 }, (_, i) => [i, 0, 1]),
  };
  const before = createDatasetHistory(initial);
  if (before.present.kind !== "numeric") throw new Error("wrong kind");
  const values = [...before.present.values];
  values[3456] = [3456, 2, 1];
  const changed = commitDatasetHistory(before, { ...before.present, values });
  expect(changed.past[0]).toHaveLength(1);
  expect(changed.past[0][0].path).toEqual(["values", 3456, 1]);
  expect(JSON.stringify(changed.past).length).toBeLessThan(200);
  if (changed.present.kind !== "numeric") throw new Error("wrong kind");
  expect(changed.present.values[0]).toBe(before.present.values[0]);
  const back = undoDatasetHistory(changed);
  expect(back.present).toEqual(before.present);
  expect(redoDatasetHistory(back).present).toEqual(changed.present);
});
it("history bounds100 actions, branches, no-op redo, dense replacement and type switches", () => {
  let h = createDatasetHistory({ kind: "categorical", values: [["a"], ["b"]] });
  const old = h.present;
  for (let i = 0; i < 110; i++)
    h = commitDatasetHistory(h, {
      kind: "categorical",
      values: [[String(i)], ["b"]],
    });
  expect(h.past).toHaveLength(100);
  h = undoDatasetHistory(h);
  const length = h.future.length;
  expect(commitDatasetHistory(h, h.present).future).toHaveLength(length);
  h = commitDatasetHistory(h, {
    kind: "graph",
    nodes: [{ id: "a" }, { id: "b" }],
    edges: [],
    directed: false,
  });
  expect(h.future).toHaveLength(0);
  expect(undoDatasetHistory(h).present.kind).toBe("categorical");
  expect(old).toEqual({ kind: "categorical", values: [["a"], ["b"]] });
});
it("one new stream observation is one splice delta, not a copied historical stream", () => {
  const h = createDatasetHistory({
    kind: "stream",
    samples: Array.from({ length: 10000 }, (_, time) => ({
      time,
      values: [time, 0],
    })),
  });
  if (h.present.kind !== "stream") throw new Error("wrong kind");
  const next = commitDatasetHistory(h, {
    ...h.present,
    samples: [...h.present.samples, { time: 10000, values: [1, 2] }],
  });
  expect(next.past[0]).toHaveLength(1);
  expect(next.past[0][0].splice?.added).toHaveLength(1);
  expect(JSON.stringify(next.past).length).toBeLessThan(300);
  expect(undoDatasetHistory(next).present).toEqual(h.present);
  expect(redoDatasetHistory(undoDatasetHistory(next)).present).toEqual(
    next.present,
  );
});
