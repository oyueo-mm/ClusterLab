import { useCallback, useEffect, useRef, useState } from "react";
import type { Algorithm, Point, Params, Trace } from "../engine/types";
import { advance } from "../engine/trace";
import type { Dataset } from "../engine/dataset";
export function useExperiment(
  algorithm: Algorithm,
  points: Point[],
  params: Params,
  options: { active?: boolean; uiInterval?: number; dataset?: Dataset } = {},
) {
  const active = options.active ?? true,
    uiInterval = options.uiInterval ?? 0;
  const input = options.dataset;
  const [trace, setTrace] = useState<Trace | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(0),
    [speed, setSpeed] = useState(50),
    [loop, setLoop] = useState(false);
  const [progress, setProgress] = useState("");
  const [attempt, setAttempt] = useState(0);
  const worker = useRef<Worker | null>(null),
    positionRef = useRef(0);
  const serial = useRef(0);
  const completed = useRef<{
    algorithm: Algorithm;
    points: Point[];
    params: Params;
    trace: Trace;
    input?: Dataset;
  } | null>(null);
  const seek = useCallback((value: number) => {
    positionRef.current = value;
    setPosition(value);
  }, []);
  useEffect(() => {
    if (!active) {
      setBusy(false);
      return;
    }
    const cache = completed.current;
    if (
      cache &&
      cache.algorithm === algorithm &&
      cache.points === points &&
      cache.params === params &&
      cache.input === input
    ) {
      setTrace(cache.trace);
      return;
    }
    setTrace(null);
    seek(0);
    setPlaying(false);
    setError("");
    setProgress("입력 검사 대기");
    setBusy(true);
    const w = new Worker(new URL("../engine/worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    let cancelled = false;
    const requestId = ++serial.current;
    w.onmessage = (e) => {
      if (cancelled || e.data.id !== requestId) return;
      if (e.data.progress) {
        setProgress(
          `전체 데이터 계산 중 · 실제 이벤트 ${e.data.progress.events ?? 0}개 기록`,
        );
        return;
      }
      setBusy(false);
      if (e.data.error) setError(e.data.error);
      else {
        completed.current = {
          algorithm,
          points,
          params,
          trace: e.data.trace,
          input,
        };
        setTrace(e.data.trace);
      }
      w.terminate();
    };
    w.onerror = (e) => {
      if (cancelled) return;
      setError(e.message || "Worker 실행 오류");
      setBusy(false);
    };
    const timer = setTimeout(
      () =>
        w.postMessage({
          id: requestId,
          algorithm,
          points,
          params,
          ...(input ? { dataset: input } : {}),
        }),
      140,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
      w.terminate();
    };
  }, [algorithm, points, params, seek, active, attempt, input]);
  useEffect(() => {
    if (!playing || !trace || !active) return;
    let frame = 0,
      last = 0,
      shown = 0;
    const tick = (now: number) => {
      if (last) {
        const dt = document.hidden ? 0 : Math.min(100, now - last),
          next = advance(positionRef.current, dt, speed, trace);
        positionRef.current = next;
        if (
          now - shown >= Math.max(uiInterval, speed >= 120 ? 33 : 0) ||
          next >= trace.steps.length
        ) {
          setPosition(next);
          shown = now;
        }
        if (next >= trace.steps.length) {
          if (loop) seek(0);
          else {
            setPlaying(false);
            return;
          }
        }
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setPosition(positionRef.current);
    };
  }, [playing, trace, speed, loop, seek, active, uiInterval]);
  return {
    trace,
    traceIsCurrent:
      !!trace &&
      completed.current?.trace === trace &&
      completed.current.algorithm === algorithm &&
      completed.current.points === points &&
      completed.current.params === params &&
      completed.current.input === input,
    error,
    busy,
    progress,
    cancel: () => {
      ++serial.current;
      worker.current?.terminate();
      worker.current = null;
      setBusy(false);
      setPlaying(false);
      setError("실행 취소: Worker 계산을 종료했습니다.");
    },
    retry: () => setAttempt((n) => n + 1),
    playing,
    setPlaying,
    position,
    seek,
    speed,
    setSpeed,
    clock: positionRef,
    loop,
    setLoop,
    reset: () => {
      setPlaying(false);
      seek(0);
    },
  };
}
export type Experiment = ReturnType<typeof useExperiment>;
