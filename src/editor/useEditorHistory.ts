import { useCallback, useEffect, useRef, useState } from "react";
import { readDatasetState, writeDatasetState } from "../lab/storage";
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
  const [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState("");
  useEffect(() => {
    let active = true;
    readDatasetState<EditorSnapshot>("points-v1")
      .then((saved) => {
        if (!active || !saved) return;
        if (
          !Array.isArray(saved.points) ||
          saved.points.some(
            (p) => !Number.isFinite(p.x) || !Number.isFinite(p.y),
          )
        )
          throw new Error("저장된 데이터 형식이 올바르지 않습니다.");
        const next = createHistory(saved);
        current.current = next;
        setHistory(next);
      })
      .catch(() => {
        if (active)
          setStorageError(
            "데이터 복원에 실패했습니다. 현재 데이터로 계속할 수 있습니다.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      void writeDatasetState("points-v1", history.present).catch(() =>
        setStorageError(
          "데이터 자동 저장에 실패했습니다. JSON으로 내보내 주세요.",
        ),
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [ready, history.present]);
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
    ready,
    storageError,
  };
}
