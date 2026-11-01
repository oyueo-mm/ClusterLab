import type { Dataset } from "../engine/dataset";
import { HISTORY_LIMIT } from "./history";
type Path = (string | number)[];
type Change = {
  path: Path;
  before?: unknown;
  after?: unknown;
  splice?: { index: number; removed: unknown[]; added: unknown[] };
};
export interface DatasetHistory {
  present: Dataset;
  past: Change[][];
  future: Change[][];
}
function differences(
  before: unknown,
  after: unknown,
  path: Path = [],
  changes: Change[] = [],
): Change[] {
  if (Object.is(before, after)) return changes;
  if (
    Array.isArray(before) &&
    Array.isArray(after) &&
    before.length !== after.length
  ) {
    let prefix = 0,
      suffix = 0;
    while (
      prefix < before.length &&
      prefix < after.length &&
      Object.is(before[prefix], after[prefix])
    )
      prefix++;
    while (
      suffix < before.length - prefix &&
      suffix < after.length - prefix &&
      Object.is(
        before[before.length - 1 - suffix],
        after[after.length - 1 - suffix],
      )
    )
      suffix++;
    changes.push({
      path,
      splice: {
        index: prefix,
        removed: structuredClone(before.slice(prefix, before.length - suffix)),
        added: structuredClone(after.slice(prefix, after.length - suffix)),
      },
    });
    return changes;
  }
  if (
    Array.isArray(before) &&
    Array.isArray(after) &&
    before.length === after.length
  ) {
    let changed = 0;
    for (let i = 0; i < before.length; i++)
      if (!Object.is(before[i], after[i]) && ++changed * 8 >= before.length)
        break;
    // A genuinely dense replacement retains whole changed arrays. Sparse cell
    // edits descend only through changed paths, sharing all unaffected records.
    if (changed * 8 < before.length || before.length < 16) {
      for (let i = 0; i < before.length; i++)
        differences(before[i], after[i], [...path, i], changes);
      return changes;
    }
  } else if (
    before &&
    after &&
    typeof before === "object" &&
    typeof after === "object" &&
    !Array.isArray(before) &&
    !Array.isArray(after)
  ) {
    const a = before as Record<string, unknown>,
      b = after as Record<string, unknown>;
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)]))
      differences(a[key], b[key], [...path, key], changes);
    return changes;
  }
  changes.push({
    path,
    before: structuredClone(before),
    after: structuredClone(after),
  });
  return changes;
}
function replace(value: unknown, path: Path, incoming: unknown): unknown {
  if (!path.length) return incoming;
  const [head, ...tail] = path;
  const object = value as Record<string | number, unknown>;
  const result = Array.isArray(value) ? [...value] : { ...object };
  if (tail.length === 0 && incoming === undefined && !Array.isArray(value))
    delete (result as Record<string | number, unknown>)[head];
  else
    (result as Record<string | number, unknown>)[head] = replace(
      object[head],
      tail,
      incoming,
    );
  return result;
}
function apply(data: Dataset, changes: Change[], reverse: boolean) {
  return changes.reduce((value, c) => {
    if (!c.splice)
      return replace(value, c.path, reverse ? c.before : c.after) as Dataset;
    let array: unknown = value;
    for (const key of c.path)
      array = (array as Record<string | number, unknown>)[key];
    const old = array as unknown[],
      remove = reverse ? c.splice.added : c.splice.removed,
      insert = reverse ? c.splice.removed : c.splice.added;
    return replace(
      value,
      c.path,
      old
        .slice(0, c.splice.index)
        .concat(insert, old.slice(c.splice.index + remove.length)),
    ) as Dataset;
  }, data);
}
export function createDatasetHistory(data: Dataset): DatasetHistory {
  return { present: structuredClone(data), past: [], future: [] };
}
export function commitDatasetHistory(
  history: DatasetHistory,
  data: Dataset,
): DatasetHistory {
  const changes = differences(history.present, data);
  if (!changes.length) return history;
  return {
    present: apply(history.present, changes, false),
    past: [...history.past, changes].slice(-HISTORY_LIMIT),
    future: [],
  };
}
export function undoDatasetHistory(history: DatasetHistory): DatasetHistory {
  const changes = history.past.at(-1);
  return changes
    ? {
        present: apply(history.present, changes, true),
        past: history.past.slice(0, -1),
        future: [changes, ...history.future],
      }
    : history;
}
export function redoDatasetHistory(history: DatasetHistory): DatasetHistory {
  const changes = history.future[0];
  return changes
    ? {
        present: apply(history.present, changes, false),
        past: [...history.past, changes].slice(-HISTORY_LIMIT),
        future: history.future.slice(1),
      }
    : history;
}
