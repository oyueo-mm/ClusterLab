import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useExperiment } from "../animation/useExperiment";
import { defaults, type Algorithm, type Point } from "../engine/types";
import { dataset, dataDefaults } from "../data/presets";
import { Canvas } from "./Canvas";

export const homeAlgorithms: Algorithm[] = [
  "K-Means",
  "DBSCAN",
  "GMM",
  "Mean Shift",
];
function Demo({
  algorithm,
  points,
  onChoose,
}: {
  algorithm: Algorithm;
  points: Point[];
  onChoose: (algorithm: Algorithm, points: Point[]) => void;
}) {
  const ref = useRef<HTMLElement>(null),
    [visible, setVisible] = useState(false),
    [documentVisible, setDocumentVisible] = useState(!document.hidden);
  const params = useMemo(() => ({ ...defaults, k: 3, iterations: 20 }), []),
    active = visible && documentVisible;
  const lab = useExperiment(algorithm, points, params, {
    active,
    uiInterval: 80,
  });
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    observer.observe(ref.current!);
    const change = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", change);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", change);
    };
  }, []);
  useEffect(() => {
    if (lab.trace) {
      lab.setLoop(true);
      lab.setSpeed(105);
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
        lab.setPlaying(true);
    }
  }, [lab.trace]);
  return (
    <article
      ref={ref}
      className="home-demo"
      data-algorithm={algorithm}
      data-active={active}
      data-position={lab.position}
      data-events={lab.trace?.steps.length ?? 0}
    >
      <div className="demo-header">
        <span>{algorithm}</span>
        <button
          aria-label={`${algorithm} 데모 ${lab.playing ? "일시정지" : "재생"}`}
          aria-pressed={lab.playing}
          disabled={!lab.trace}
          onClick={() => lab.setPlaying(!lab.playing)}
        >
          {lab.playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
      </div>
      <button
        className="demo-open"
        aria-label={`${algorithm} 실험실 열기`}
        onClick={() => onChoose(algorithm, points)}
      >
        <Canvas
          algorithm={algorithm}
          points={points}
          trace={lab.trace}
          position={lab.position}
          clock={lab.clock}
          minimal
          active={active}
        />
      </button>
      <div className="demo-progress">
        <span>
          {lab.error ||
            `${Math.floor(lab.position)} / ${lab.trace?.steps.length ?? 0}`}
        </span>
        <progress
          aria-label={`${algorithm} 데모 진행률`}
          max={lab.trace?.steps.length || 1}
          value={lab.position}
        />
      </div>
    </article>
  );
}
export function HomeDemos({
  onChoose,
}: {
  onChoose: (a: Algorithm, p: Point[]) => void;
}) {
  // One source object, passed unchanged to all four engines. No per-card RNG.
  const points = useMemo(
    () => dataset("blobs", { ...dataDefaults, count: 60 }),
    [],
  );
  return (
    <div
      className="home-demo-grid"
      aria-label="동일 데이터의 네 알고리즘 시뮬레이션"
    >
      {homeAlgorithms.map((a) => (
        <Demo key={a} algorithm={a} points={points} onChoose={onChoose} />
      ))}
    </div>
  );
}
