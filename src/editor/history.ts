import type { Point } from "../engine/types";
import type { DataOptions } from "../data/presets";

export const MAX_POINTS = 600;
export const HISTORY_LIMIT = 100;
export interface EditorSnapshot {
  points: Point[];
  preset: string;
  options: DataOptions;
}
export interface EditorHistory {
  present: EditorSnapshot;
  past: EditorSnapshot[];
  future: EditorSnapshot[];
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
  if (value.points.length > MAX_POINTS || sameSnapshot(history.present, value))
    return history;
  return {
    present: copy(value),
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    future: [],
  };
}
export function undoHistory(history: EditorHistory): EditorHistory {
  const present = history.past.at(-1);
  return present
    ? {
        present,
        past: history.past.slice(0, -1),
        future: [history.present, ...history.future],
      }
    : history;
}
export function redoHistory(history: EditorHistory): EditorHistory {
  const present = history.future[0];
  return present
    ? {
        present,
        past: [...history.past, history.present].slice(-HISTORY_LIMIT),
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
