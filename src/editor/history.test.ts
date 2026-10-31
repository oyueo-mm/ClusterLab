import { describe, expect, it } from "vitest";
import { dataDefaults } from "../data/presets";
import {
  commitHistory,
  createHistory,
  undoHistory,
  redoHistory,
  historyShortcut,
  HISTORY_LIMIT,
  type EditorSnapshot,
} from "./history";

const initial = (): EditorSnapshot => ({
  points: [
    { x: 0.1, y: 0.2, label: 3, features: ["color=green", "shape=round"] },
  ],
  preset: "categorical",
  options: { ...dataDefaults },
});
describe("bounded editor history", () => {
  it("restores exact ordered records, preset and committed generator options", () => {
    const source = initial();
    const h = commitHistory(createHistory(source), {
      points: [
        { x: 0.8, y: 0.7 },
        { x: 0.3, y: 0.4, label: 9 },
      ],
      preset: "moons",
      options: { ...dataDefaults, seed: 51, count: 10 },
    });
    expect(undoHistory(h).present).toEqual(source);
    expect(redoHistory(undoHistory(h)).present).toEqual(h.present);
    expect(h.present.points).not.toBe(source.points);
  });
  it("copies records/features once at commit boundaries without retaining mutable input", () => {
    const source = initial();
    const history = createHistory(source);
    source.points[0].features!.push("changed");
    source.points[0].x = 999;
    source.options.seed = 99;
    expect(history.present).toEqual(initial());
    const next = initial();
    next.points[0].label = 5;
    const committed = commitHistory(history, next);
    next.points[0].features![0] = "changed";
    expect(committed.present.points[0].features![0]).toBe("color=green");
    expect(undoHistory(committed).present.points[0].label).toBe(3);
  });
  it("commits a 50-point stroke as one operation and restores all 50 in one redo", () => {
    const h = createHistory(initial());
    const points = [...h.present.points];
    for (let i = 0; i < 50; i++) points.push({ x: i / 100, y: 0.5, label: 7 });
    const drawn = commitHistory(h, { ...h.present, points });
    expect(drawn.past).toHaveLength(1);
    expect(undoHistory(drawn).present).toEqual(h.present);
    expect(redoHistory(undoHistory(drawn)).present.points).toEqual(points);
  });
  it("ignores equal values and preserves redo on a no-op", () => {
    const h = createHistory(initial());
    expect(commitHistory(h, initial())).toBe(h);
    expect(undoHistory(h)).toBe(h);
    expect(redoHistory(h)).toBe(h);
    const changed = commitHistory(h, { ...h.present, points: [] });
    const undone = undoHistory(changed);
    expect(commitHistory(undone, initial())).toBe(undone);
    expect(redoHistory(undone).present.points).toEqual([]);
  });
  it("drops the redo branch only for a new actual change", () => {
    const h = createHistory(initial());
    const undone = undoHistory(commitHistory(h, { ...h.present, points: [] }));
    const branched = commitHistory(undone, {
      ...undone.present,
      points: [{ x: 0, y: 1 }],
    });
    expect(branched.future).toHaveLength(0);
    expect(redoHistory(branched)).toBe(branched);
  });
  it("retains at most 100 operations and accepts more than 600 points", () => {
    let h = createHistory({ ...initial(), points: [] });
    for (let i = 0; i < 130; i++)
      h = commitHistory(h, {
        ...h.present,
        points: [...h.present.points, { x: i, y: 0 }],
      });
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    for (let i = 0; i < HISTORY_LIMIT; i++) h = undoHistory(h);
    expect(h.present.points).toHaveLength(30);
    expect(h.past).toHaveLength(0);
    const tooMany = {
      ...h.present,
      points: Array.from({ length: 601 }, () => ({ x: 0, y: 0 })),
    };
    expect(commitHistory(h, tooMany).present.points).toHaveLength(601);
  });
  it("stores imported custom data and can restore the original categorical preset", () => {
    const h = createHistory(initial());
    const imported = commitHistory(h, {
      ...h.present,
      preset: "",
      points: [{ x: -0.5, y: 2, features: ["a=b"] }],
    });
    expect(undoHistory(imported).present).toEqual(initial());
    expect(redoHistory(undoHistory(imported)).present).toEqual(
      imported.present,
    );
  });
});
describe("platform keyboard commands", () => {
  const event = {
    key: "z",
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    altKey: false,
  };
  it("supports Ctrl/Cmd+Z, Ctrl+Y and Ctrl/Cmd+Shift+Z", () => {
    expect(historyShortcut(event)).toBe("undo");
    expect(historyShortcut({ ...event, ctrlKey: false, metaKey: true })).toBe(
      "undo",
    );
    expect(historyShortcut({ ...event, key: "Y" })).toBe("redo");
    expect(historyShortcut({ ...event, shiftKey: true })).toBe("redo");
    expect(
      historyShortcut({
        ...event,
        ctrlKey: false,
        metaKey: true,
        shiftKey: true,
      }),
    ).toBe("redo");
  });
  it("leaves plain keys, Alt combinations and unrelated shortcuts alone", () => {
    expect(historyShortcut({ ...event, ctrlKey: false })).toBeNull();
    expect(historyShortcut({ ...event, altKey: true })).toBeNull();
    expect(historyShortcut({ ...event, key: "a" })).toBeNull();
  });
});
