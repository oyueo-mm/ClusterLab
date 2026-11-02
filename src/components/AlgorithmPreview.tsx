import { useEffect, useMemo, useRef, useState } from "react";
import { emptyState } from "../engine/types";
import { previewFrame } from "../engine/preview";
import { displayPoints } from "../engine/dataset";
import type { Algorithm } from "../engine/types";
import type { PreviewClip } from "../engine/preview";
import {
  previewCache,
  previewInput,
  requestPreview,
  playPreview,
} from "../animation/previewRuntime";
import { previewPainter } from "../animation/previewPainter";

export function AlgorithmPreview({ algorithm }: { algorithm: Algorithm }) {
  const ref = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    status = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [clip, setClip] = useState<PreviewClip | undefined>(() =>
    previewCache.get(algorithm),
  );
  const [error, setError] = useState("");
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const data = useMemo(() => previewInput(algorithm), [algorithm]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(ref.current!);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", change);
    };
  }, []);
  useEffect(() => {
    if (!visible || clip || error) return;
    return requestPreview(algorithm, (result, message) => {
      setClip(result);
      setError(message ?? "");
    });
  }, [algorithm, visible, clip, error]);
  useEffect(() => {
    if (!visible) return;
    const draw = previewPainter(canvas.current!, data);
    const frames = clip?.frames;
    if (!frames) {
      const initial = previewFrame(
        emptyState(displayPoints(data).length),
        0,
        "initial",
        "초기 입력",
      );
      draw(initial, initial, 1);
      return;
    }
    const last = frames.at(-1)!;
    draw(last, last, 1);
    status.current!.textContent = `실제 Trace · ${last.description}`;
    ref.current!.dataset.previewFrame = String(last.index);
    ref.current!.dataset.previewMotion = reduced ? "reduced" : "paused";
    if (reduced) return;
    let elapsed = 0,
      previous = -1;
    const stop = playPreview((dt) => {
      elapsed = (elapsed + dt) % 5600;
      // 500 ms initial hold, 4000 ms actual sampled events, 1100 ms final hold.
      const position = Math.min(
        frames.length - 1,
        Math.max(0, (elapsed - 500) / 4000) * (frames.length - 1),
      );
      const index = Math.floor(position),
        next = elapsed <= 500 ? 0 : Math.min(frames.length - 1, index + 1);
      draw(frames[index], frames[next], position - index);
      ref.current!.dataset.previewMotion = "playing";
      ref.current!.dataset.previewFrame = String(frames[next].index);
      if (previous !== next) {
        status.current!.textContent = `실제 Trace · ${frames[next].description}`;
        previous = next;
      }
    });
    return () => {
      stop();
      if (ref.current) ref.current.dataset.previewMotion = "paused";
    };
  }, [visible, reduced, clip, data]);
  return (
    <div
      ref={ref}
      className="algorithm-preview"
      data-preview-status={error ? "error" : clip ? "computed" : "pending"}
    >
      <figure className="dataset-preview">
        <canvas
          ref={canvas}
          role="img"
          aria-label={`${algorithm} 실제 Trace 주요 단계 미리보기`}
          style={{ width: "100%", aspectRatio: "2 / 1", display: "block" }}
        />
        <figcaption>
          실제 연산 주요 상태 ·{" "}
          {data.kind === "matrix"
            ? "행렬 영역"
            : data.kind === "timeseries"
              ? "파형·정렬"
              : data.kind === "categorical"
                ? "원본 범주 행·속성"
                : "원본 입력의 2D 표시"}
        </figcaption>
      </figure>
      <span ref={status} className="preview-status" title={error || undefined}>
        {error
          ? "계산 오류 · 실험실에서 확인"
          : clip
            ? "실제 계산 결과"
            : "입력 데이터 · 계산 대기"}
      </span>
    </div>
  );
}
