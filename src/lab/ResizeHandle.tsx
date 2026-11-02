import { useRef } from "react";
import { readPreference, writePreference } from "./storage";
import { useState } from "react";

export function usePanelWidth(
  key: string,
  initial: number,
  min: number,
  max: number,
) {
  const [width, setWidth] = useState(() =>
    Math.max(min, Math.min(max, readPreference(key, initial))),
  );
  return [
    width,
    (value: number) => {
      const next = Math.round(Math.max(min, Math.min(max, value)));
      setWidth(next);
      writePreference(key, next);
    },
  ] as const;
}

export function ResizeHandle({
  label,
  width,
  onChange,
  initial,
  min,
  max,
  reverse = false,
}: {
  label: string;
  width: number;
  onChange: (width: number) => void;
  initial: number;
  min: number;
  max: number;
  reverse?: boolean;
}) {
  const drag = useRef<{
    x: number;
    width: number;
    next: number;
    frame: number;
  } | null>(null);
  return (
    <div
      className="resize-handle"
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={width}
      onDoubleClick={() => onChange(initial)}
      onKeyDown={(e) => {
        const delta = (e.shiftKey ? 40 : 10) * (reverse ? -1 : 1);
        if (
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "Home" ||
          e.key === "End"
        ) {
          e.preventDefault();
          onChange(
            e.key === "Home"
              ? min
              : e.key === "End"
                ? max
                : width + (e.key === "ArrowLeft" ? -delta : delta),
          );
        }
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, width, next: width, frame: 0 };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        d.next = d.width + (e.clientX - d.x) * (reverse ? -1 : 1);
        if (!d.frame)
          d.frame = requestAnimationFrame(() => {
            d.frame = 0;
            onChange(d.next);
          });
      }}
      onLostPointerCapture={() => {
        const d = drag.current;
        if (d) {
          cancelAnimationFrame(d.frame);
          onChange(d.next);
        }
        drag.current = null;
      }}
      onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
      onPointerCancel={(e) =>
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    />
  );
}
