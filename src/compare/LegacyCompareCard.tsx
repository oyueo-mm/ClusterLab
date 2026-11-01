import { useEffect, useMemo, useState } from "react";
import { Settings2 } from "lucide-react";
import {
  algorithms,
  defaults,
  algorithmDefaults,
  isPrototypeAlgorithm,
  supportsEuclideanSilhouette,
  clusterCount,
  emptyState,
  type Algorithm,
  type Params,
  type Point,
} from "../engine/types";
import { registry, supportsLegacyPoints } from "../engine/registry";
import { useExperiment } from "../animation/useExperiment";
import { stateAt } from "../engine/trace";
import { silhouette } from "../engine/math";
import { Canvas } from "../components/Canvas";
import { Playback } from "../components/Playback";
import { Settings } from "../components/Settings";
export function CompareCard({
  points,
  initial,
  start,
}: {
  points: Point[];
  initial: Algorithm;
  start: number;
}) {
  const [algorithm, setAlgorithm] = useState(initial),
    [params, setParams] = useState<Params>({
      ...algorithmDefaults(initial),
      threshold: initial === "ROCK" ? 0.5 : defaults.threshold,
    }),
    [settings, setSettings] = useState(false),
    lab = useExperiment(algorithm, points, params);
  useEffect(() => {
    if (start > 0 && lab.trace) {
      lab.seek(0);
      lab.setPlaying(true);
    }
  }, [start, lab.trace]);
  const state = lab.trace
      ? stateAt(lab.trace, Math.floor(lab.position))
      : emptyState(points.length),
    score = useMemo(
      () =>
        points.length ** 2 > 2_000_000 ||
        !supportsEuclideanSilhouette(algorithm)
          ? null
          : silhouette(points, state.labels),
      [points, state.labels, algorithm],
    );
  return (
    <article className="compare-card">
      <div className="compare-heading">
        <select
          aria-label="비교 알고리즘"
          value={algorithm}
          onChange={(e) => {
            const a = e.target.value as Algorithm;
            setAlgorithm(a);
            setParams(algorithmDefaults(a));
          }}
        >
          {algorithms.map((a) => (
            <option key={a} disabled={!supportsLegacyPoints(a)}>
              {a}
            </option>
          ))}
        </select>
        <button
          title="개별 설정"
          aria-label="개별 설정"
          aria-expanded={settings}
          onClick={() => setSettings(!settings)}
        >
          <Settings2 size={16} />
        </button>
      </div>
      {settings && (
        <div className="compare-settings">
          <Settings algorithm={algorithm} value={params} onChange={setParams} />
        </div>
      )}
      {lab.error ? (
        <p role="alert" className="error">
          {lab.error}
        </p>
      ) : (
        <Canvas
          algorithm={algorithm}
          points={points}
          trace={lab.trace}
          position={lab.position}
          clock={lab.clock}
        />
      )}
      <Playback lab={lab} compact />
      <div className="compare-stats">
        <span>
          {clusterCount(state)}{" "}
          {isPrototypeAlgorithm(algorithm) ? "BMU" : "군집"}
        </span>
        <span>
          {registry[algorithm].unassignedLabel}{" "}
          {(
            (state.labels.filter((x) => x === -1).length / points.length) *
            100
          ).toFixed(1)}
          %
        </span>
        <span>
          Silhouette{" "}
          {score?.toFixed(3) ??
            (points.length ** 2 > 2_000_000 ? "연산량으로 생략" : "해당 없음")}
        </span>
      </div>
    </article>
  );
}
