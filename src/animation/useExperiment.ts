import { useCallback, useEffect, useRef, useState } from "react";
import type { Algorithm, Point, Params, Trace } from "../engine/types";
import { advance } from "../engine/trace";
export function useExperiment(
  algorithm: Algorithm,
  points: Point[],
  params: Params,
) {
  const [trace, setTrace] = useState<Trace | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(0),
    [speed, setSpeed] = useState(50),
    [fast, setFast] = useState(false),
    [loop, setLoop] = useState(false);
  const worker = useRef<Worker | null>(null),
    positionRef = useRef(0);
  const seek = useCallback((value: number) => {
    positionRef.current = value;
    setPosition(value);
  }, []);
  useEffect(() => {
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
      else setTrace(e.data.trace);
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
  }, [algorithm, points, params, seek]);
  useEffect(() => {
    if (!playing || !trace) return;
    let frame = 0,
      last = 0;
    const tick = (now: number) => {
      if (last) {
        const dt = document.hidden ? 0 : Math.min(100, now - last),
          next = advance(positionRef.current, dt, speed, trace, fast);
        seek(next);
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
    return () => cancelAnimationFrame(frame);
  }, [playing, trace, speed, fast, loop, seek]);
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
    fast,
    setFast,
    loop,
    setLoop,
    reset: () => {
      setPlaying(false);
      seek(0);
    },
  };
}
export type Experiment = ReturnType<typeof useExperiment>;
