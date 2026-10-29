import { useCallback, useRef, useState } from "react";
import {
  createHistory,
  commitHistory,
  undoHistory,
  redoHistory,
  type EditorSnapshot,
  type EditorHistory,
} from "./history";

export function useEditorHistory(initial: () => EditorSnapshot) {
  const [history, setHistory] = useState(() => createHistory(initial()));
  const current = useRef(history);
  const update = useCallback((reduce: (h: EditorHistory) => EditorHistory) => {
    const next = reduce(current.current);
    current.current = next;
    setHistory(next);
    return next.present;
  }, []);
  const commit = useCallback(
    (snapshot: EditorSnapshot) => update((h) => commitHistory(h, snapshot)),
    [update],
  );
  const undo = useCallback(() => update(undoHistory), [update]);
  const redo = useCallback(() => update(redoHistory), [update]);
  return {
    value: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    commit,
    undo,
    redo,
  };
}
