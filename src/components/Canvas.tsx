import { useEffect, useRef, useState } from "react";
import type { Algorithm, Point, Trace } from "../engine/types";
import { emptyState } from "../engine/types";
import { stateAt } from "../engine/trace";
import { draw, unproject, type View } from "../animation/renderer";
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
    drag = useRef<{
      x: number;
      y: number;
      point: number;
      original: Point[];
      pan: View;
    } | null>(null),
    pointers = useRef(new Map<number, { x: number; y: number }>()),
    pinch = useRef(0),
    [fps, setFps] = useState(0);
  latest.current = props;
  useEffect(() => {
    if (props.active === false) return;
    const canvas = ref.current!;
    let w = 1,
      h = 1,
      frame = 0,
      last = 0,
      frames = 0;
    let cache: {
      trace: Trace | null;
      index: number;
      from: ReturnType<typeof emptyState>;
      to: ReturnType<typeof emptyState>;
    } | null = null;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      w = rect.width;
      h = rect.height;
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
    });
    observer.observe(canvas);
    const tick = (now: number) => {
      if (
        w < 1 ||
        h < 1 ||
        document.hidden ||
        latest.current.active === false
      ) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const p = latest.current,
        position = p.clock?.current ?? p.position,
        index = Math.floor(position);
      if (
        !cache ||
        cache.trace !== p.trace ||
        cache.index !== index ||
        cache.from.labels.length !== p.points.length
      ) {
        const from = p.trace
            ? stateAt(p.trace, index)
            : {
                ...emptyState(p.points.length),
                labels: p.points.map((v) => v.label ?? -2),
              },
          to = p.trace ? stateAt(p.trace, index + 1) : from;
        cache = { trace: p.trace, index, from, to };
      }
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      draw(ctx, w, h, p.points, cache.from, cache.to, position - index, {
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
  }, [props.active]);
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
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const q = pointer(e);
          pointers.current.set(e.pointerId, q);
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
            drag.current = null;
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
          if (props.edit && props.tool === "add") {
            props.onChange?.([
              ...props.points,
              {
                ...world,
                ...(props.label !== undefined ? { label: props.label } : {}),
              },
            ]);
            return;
          }
          if (props.edit && props.tool === "delete") {
            props.onChange?.(props.points.filter((_, i) => i !== nearest));
            return;
          }
          drag.current = {
            x: q.x,
            y: q.y,
            point: props.edit && props.tool === "move" ? nearest : -1,
            original: props.points,
            pan: { ...view.current },
          };
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
          if (!d) return;
          if (d.point >= 0) {
            const point = unproject(q.x, q.y, q.w, q.h, view.current);
            props.onChange?.(
              d.original.map((p, i) =>
                i === d.point ? { ...p, ...point } : p,
              ),
            );
          } else if (props.edit && props.tool === "select") {
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
          } else {
            view.current.panX = d.pan.panX + q.x - d.x;
            view.current.panY = d.pan.panY + q.y - d.y;
          }
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          drag.current = null;
          pinch.current = 0;
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          drag.current = null;
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
