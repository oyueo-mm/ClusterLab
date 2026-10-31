import type { Point } from "../engine/types";
import type { DataOptions } from "../data/presets";

export const HISTORY_LIMIT = 100;
export interface EditorSnapshot {
  points: Point[];
  preset: string;
  options: DataOptions;
}
export interface EditorHistory {
  present: EditorSnapshot;
  past: EditorChange[];
  future: EditorChange[];
}

interface EditorChange {
  index: number;
  removed: Point[];
  added: Point[];
  before: Omit<EditorSnapshot, "points">;
  after: Omit<EditorSnapshot, "points">;
}
function equalPoint(p: Point, q: Point) {
  return (
    p.x === q.x &&
    p.y === q.y &&
    p.label === q.label &&
    (p.features === undefined
      ? q.features === undefined
      : q.features !== undefined &&
        p.features.length === q.features.length &&
        p.features.every((v, i) => v === q.features![i]))
  );
}
function restore(
  snapshot: EditorSnapshot,
  change: EditorChange,
  reverse: boolean,
): EditorSnapshot {
  const remove = reverse ? change.added : change.removed;
  const insert = reverse ? change.removed : change.added;
  // Avoid spread argument limits on large imports.
  const points = snapshot.points
    .slice(0, change.index)
    .concat(insert, snapshot.points.slice(change.index + remove.length));
  return { points, ...(reverse ? change.before : change.after) };
}

function copy(value: EditorSnapshot): EditorSnapshot {
  return {
    points: value.points.map((p) => ({
      ...p,
      ...(p.features ? { features: [...p.features] } : {}),
    })),
    preset: value.preset,
    options: { ...value.options },
  };
}
export function sameSnapshot(a: EditorSnapshot, b: EditorSnapshot) {
  return (
    a.preset === b.preset &&
    (Object.keys(a.options) as (keyof DataOptions)[]).every(
      (k) => a.options[k] === b.options[k],
    ) &&
    a.points.length === b.points.length &&
    a.points.every((p, i) => {
      const q = b.points[i];
      return (
        p.x === q.x &&
        p.y === q.y &&
        p.label === q.label &&
        (p.features === undefined
          ? q.features === undefined
          : q.features !== undefined &&
            p.features.length === q.features.length &&
            p.features.every((f, j) => f === q.features![j]))
      );
    })
  );
}
export function createHistory(initial: EditorSnapshot): EditorHistory {
  return { present: copy(initial), past: [], future: [] };
}
export function commitHistory(
  history: EditorHistory,
  value: EditorSnapshot,
): EditorHistory {
  if (sameSnapshot(history.present, value)) return history;
  let prefix = 0;
  const old = history.present.points,
    next = value.points;
  while (
    prefix < old.length &&
    prefix < next.length &&
    equalPoint(old[prefix], next[prefix])
  )
    prefix++;
  let suffix = 0;
  while (
    suffix < old.length - prefix &&
    suffix < next.length - prefix &&
    equalPoint(old[old.length - 1 - suffix], next[next.length - 1 - suffix])
  )
    suffix++;
  const added = copy({
    ...value,
    points: next.slice(prefix, next.length - suffix),
  }).points;
  const change: EditorChange = {
    index: prefix,
    removed: old.slice(prefix, old.length - suffix),
    added,
    before: {
      preset: history.present.preset,
      options: { ...history.present.options },
    },
    after: { preset: value.preset, options: { ...value.options } },
  };
  return {
    present: restore(history.present, change, false),
    past: [...history.past, change].slice(-HISTORY_LIMIT),
    future: [],
  };
}
export function undoHistory(history: EditorHistory): EditorHistory {
  const change = history.past.at(-1);
  return change
    ? {
        present: restore(history.present, change, true),
        past: history.past.slice(0, -1),
        future: [change, ...history.future],
      }
    : history;
}
export function redoHistory(history: EditorHistory): EditorHistory {
  const change = history.future[0];
  return change
    ? {
        present: restore(history.present, change, false),
        past: [...history.past, change].slice(-HISTORY_LIMIT),
        future: history.future.slice(1),
      }
    : history;
}

export function historyShortcut(
  e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">,
) {
  if (e.altKey || (!e.ctrlKey && !e.metaKey)) return null;
  const key = e.key.toLowerCase();
  if (key === "z") return e.shiftKey ? "redo" : "undo";
  if (key === "y" && e.ctrlKey && !e.metaKey && !e.shiftKey) return "redo";
  return null;
}
