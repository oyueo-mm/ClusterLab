import { useCallback, useEffect, useRef, useState } from "react";
import type { Algorithm, Point, Trace } from "../engine/types";
import { emptyState } from "../engine/types";
import { stateAt } from "../engine/trace";
import { draw, unproject, type View } from "../animation/renderer";
import { MAX_POINTS } from "../editor/history";
import { PointStroke } from "../editor/stroke";
interface Gesture {
  mode:
    | "moving-point"
    | "drawing-points"
    | "deleting-point"
    | "selecting"
    | "panning";
  pointerId: number;
  buttons: number;
  x: number;
  y: number;
  point: number;
  original: Point[];
  pan: View;
  data?: Point[];
  stroke?: PointStroke;
  label?: number;
}
interface Props {
  algorithm: Algorithm;
  points: Point[];
  trace: Trace | null;
  position: number;
  clock?: { current: number };
  minimal?: boolean;
  active?: boolean;
  edit?: boolean;
  tool?: string;
  selected?: number[];
  onSelect?: (ids: number[]) => void;
  onChange?: (p: Point[]) => void;
  label?: number;
}
export function Canvas(props: Props) {
  const ref = useRef<HTMLCanvasElement>(null),
    latest = useRef(props),
    view = useRef<View>({ zoom: 1, panX: 0, panY: 0 }),
    drag = useRef<Gesture | null>(null),
    preview = useRef<Point[] | null>(null),
    pointers = useRef(new Map<number, { x: number; y: number }>()),
    pinch = useRef(0),
    [fps, setFps] = useState(0);
  latest.current = props;
  const finish = useCallback((commit: boolean, release = true) => {
    const gesture = drag.current;
    drag.current = null;
    preview.current = null;
    const canvas = ref.current;
    if (canvas) {
      canvas.dataset.gesture = "idle";
      canvas.style.cursor = "";
      if (gesture && release && canvas.hasPointerCapture(gesture.pointerId))
        canvas.releasePointerCapture(gesture.pointerId);
    }
    if (gesture?.data && commit) latest.current.onChange?.(gesture.data);
  }, []);
  const cancelInput = useCallback(() => {
    finish(false);
    const canvas = ref.current;
    for (const id of pointers.current.keys()) {
      if (canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }
    pointers.current.clear();
    pinch.current = 0;
  }, [finish]);
  useEffect(() => {
    cancelInput();
    const visibility = () => {
      if (document.hidden) cancelInput();
    };
    window.addEventListener("resize", cancelInput);
    window.addEventListener("blur", cancelInput);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("resize", cancelInput);
      window.removeEventListener("blur", cancelInput);
      document.removeEventListener("visibilitychange", visibility);
      cancelInput();
    };
  }, [props.points, props.tool, props.edit, props.active, cancelInput]);
  useEffect(() => {
    if (props.active === false) return;
    const canvas = ref.current!;
    // A precomputed home trace can arrive before ResizeObserver's first callback.
    // Never render its Gaussian with a placeholder 1x1 viewport (negative radii).
    let w = 0,
      h = 0,
      frame = 0,
      last = 0,
      frames = 0;
    let cache: {
      trace: Trace | null;
      points: Point[];
      index: number;
      from: ReturnType<typeof emptyState>;
      to: ReturnType<typeof emptyState>;
    } | null = null;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      if (w && (w !== rect.width || h !== rect.height)) cancelInput();
      w = rect.width;
      h = rect.height;
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
    });
    observer.observe(canvas);
    const tick = (now: number) => {
      if (
        w <= 70 ||
        h <= 60 ||
        document.hidden ||
        latest.current.active === false
      ) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const p = latest.current,
        points = preview.current ?? p.points,
        position = p.clock?.current ?? p.position,
        index = Math.floor(position);
      if (
        !cache ||
        cache.trace !== p.trace ||
        (!p.trace && cache.points !== points) ||
        cache.index !== index ||
        cache.from.labels.length !== points.length
      ) {
        const from = p.trace
            ? stateAt(p.trace, index)
            : {
                ...emptyState(points.length),
                labels: points.map((v) => v.label ?? -2),
              },
          to = p.trace ? stateAt(p.trace, index + 1) : from;
        cache = { trace: p.trace, points, index, from, to };
      }
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      draw(ctx, w, h, points, cache.from, cache.to, position - index, {
        algorithm: p.algorithm,
        view: view.current,
        selected: p.selected ?? [],
        time: now,
        decision: true,
        minimal: p.minimal,
      });
      frames++;
      if (now - last > 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelInput();
      view.current.zoom = Math.max(
        0.5,
        Math.min(6, view.current.zoom * Math.exp(-e.deltaY * 0.001)),
      );
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("wheel", wheel);
    };
  }, [props.active, cancelInput]);
  const pointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      w: rect.width,
      h: rect.height,
    };
  };
  return (
    <div className="canvas-wrap">
      <canvas
        ref={ref}
        aria-label={`${props.algorithm} 데이터 및 실제 연산 시각화`}
        role="img"
        data-gesture="idle"
        onContextMenu={(e) => {
          if (props.edit) e.preventDefault();
        }}
        onPointerDown={(e) => {
          const right =
            props.edit &&
            e.pointerType === "mouse" &&
            e.button === 2 &&
            e.buttons === 2;
          if (
            !right &&
            (e.button !== 0 || (e.pointerType === "mouse" && e.buttons !== 1))
          )
            return;
          const q = pointer(e);
          if (q.w <= 70 || q.h <= 60) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          pointers.current.set(e.pointerId, q);
          if (pointers.current.size > 1) {
            finish(false, false);
            const [a, b] = [...pointers.current.values()];
            pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
            return;
          }
          const world = unproject(q.x, q.y, q.w, q.h, view.current),
            scale = Math.min(q.w - 70, q.h - 60) * view.current.zoom;
          let nearest = -1,
            best = 12 / scale;
          props.points.forEach((p, i) => {
            const d = Math.hypot(p.x - world.x, p.y - world.y);
            if (d < best) {
              nearest = i;
              best = d;
            }
          });
          const mode =
            right ||
            !props.edit ||
            props.tool === "pan" ||
            (props.tool === "move" && nearest < 0)
              ? "panning"
              : props.tool === "add"
                ? "drawing-points"
                : props.tool === "delete"
                  ? "deleting-point"
                  : props.tool === "select"
                    ? "selecting"
                    : "moving-point";
          const gesture: Gesture = {
            mode,
            pointerId: e.pointerId,
            buttons: right ? 2 : 1,
            x: q.x,
            y: q.y,
            point: props.edit && props.tool === "move" ? nearest : -1,
            original: props.points,
            pan: { ...view.current },
          };
          if (mode === "drawing-points") {
            gesture.stroke = new PointStroke(q);
            gesture.label = props.label;
            if (props.points.length < MAX_POINTS) {
              gesture.data = [
                ...props.points,
                {
                  ...world,
                  ...(props.label !== undefined ? { label: props.label } : {}),
                },
              ];
            }
          } else if (mode === "deleting-point" && nearest >= 0) {
            gesture.data = props.points.filter((_, i) => i !== nearest);
          }
          drag.current = gesture;
          preview.current = gesture.data ?? null;
          e.currentTarget.dataset.gesture = mode;
          if (mode === "panning") e.currentTarget.style.cursor = "grabbing";
        }}
        onPointerMove={(e) => {
          const q = pointer(e);
          if (pointers.current.has(e.pointerId))
            pointers.current.set(e.pointerId, q);
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()],
              d = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinch.current)
              view.current.zoom = Math.max(
                0.5,
                Math.min(6, (view.current.zoom * d) / pinch.current),
              );
            pinch.current = d;
            return;
          }
          const d = drag.current;
          if (!d || d.pointerId !== e.pointerId) return;
          if (e.pointerType === "mouse" && e.buttons !== d.buttons) {
            // Chorded/released mouse buttons cancel an unfinished edit.
            cancelInput();
            return;
          }
          if (d.mode === "drawing-points") {
            const data = d.data ?? d.original;
            const samples = d.stroke!.advance(q, MAX_POINTS - data.length);
            if (samples.length) {
              d.data ??= [...d.original];
              for (const sample of samples)
                d.data.push({
                  ...unproject(sample.x, sample.y, q.w, q.h, view.current),
                  ...(d.label !== undefined ? { label: d.label } : {}),
                });
              preview.current = d.data;
            }
          } else if (d.mode === "moving-point" && d.point >= 0) {
            if (q.x === d.x && q.y === d.y) {
              d.data = undefined;
              preview.current = null;
              return;
            }
            const scale = Math.min(q.w - 70, q.h - 60) * d.pan.zoom;
            const original = d.original[d.point];
            const point = {
              x: original.x + (q.x - d.x) / scale,
              y: original.y - (q.y - d.y) / scale,
            };
            d.data ??= [...d.original];
            d.data[d.point] = { ...original, ...point };
            preview.current = d.data;
          } else if (d.mode === "selecting") {
            const a = unproject(d.x, d.y, q.w, q.h, view.current),
              b = unproject(q.x, q.y, q.w, q.h, view.current);
            props.onSelect?.(
              props.points
                .map((p, i) =>
                  p.x >= Math.min(a.x, b.x) &&
                  p.x <= Math.max(a.x, b.x) &&
                  p.y >= Math.min(a.y, b.y) &&
                  p.y <= Math.max(a.y, b.y)
                    ? i
                    : -1,
                )
                .filter((i) => i >= 0),
            );
          } else if (d.mode === "panning") {
            view.current.panX = d.pan.panX + q.x - d.x;
            view.current.panY = d.pan.panY + q.y - d.y;
          }
        }}
        onPointerUp={(e) => {
          if (drag.current?.pointerId === e.pointerId) finish(true);
          pointers.current.delete(e.pointerId);
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          pinch.current = 0;
        }}
        onPointerCancel={cancelInput}
        onLostPointerCapture={(e) => {
          if (drag.current?.pointerId === e.pointerId) finish(false, false);
          pointers.current.delete(e.pointerId);
          pinch.current = 0;
        }}
      />
      {!props.minimal && (
        <div className="canvas-corner">
          <span className="live-dot" /> CANVAS 2D <span>{fps} FPS</span>
        </div>
      )}
      {!props.minimal && (
        <button
          className="view-reset"
          onClick={() => {
            cancelInput();
            view.current = { zoom: 1, panX: 0, panY: 0 };
          }}
          title="확대·이동 초기화"
        >
          좌표 초기화 ↺
        </button>
      )}
    </div>
  );
}
