import { useCallback, useEffect, useRef, useState } from "react";
import type { Algorithm, Point, Params, Trace } from "../engine/types";
import { advance } from "../engine/trace";
export function useExperiment(
  algorithm: Algorithm,
  points: Point[],
  params: Params,
  options: { active?: boolean; uiInterval?: number } = {},
) {
  const active = options.active ?? true,
    uiInterval = options.uiInterval ?? 0;
  const [trace, setTrace] = useState<Trace | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(0),
    [speed, setSpeed] = useState(50),
    [loop, setLoop] = useState(false);
  const worker = useRef<Worker | null>(null),
    positionRef = useRef(0);
  const completed = useRef<{
    algorithm: Algorithm;
    points: Point[];
    params: Params;
    trace: Trace;
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
      cache.params === params
    ) {
      setTrace(cache.trace);
      return;
    }
    setTrace(null);
    seek(0);
    setPlaying(false);
    setError("");
    setBusy(true);
    const w = new Worker(new URL("../engine/worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    w.onmessage = (e) => {
      setBusy(false);
      if (e.data.error) setError(e.data.error);
      else {
        completed.current = { algorithm, points, params, trace: e.data.trace };
        setTrace(e.data.trace);
      }
    };
    w.onerror = (e) => {
      setError(e.message || "Worker 실행 오류");
      setBusy(false);
    };
    const timer = setTimeout(
      () => w.postMessage({ id: 1, algorithm, points, params }),
      140,
    );
    return () => {
      clearTimeout(timer);
      w.terminate();
    };
  }, [algorithm, points, params, seek, active]);
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
    error,
    busy,
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
