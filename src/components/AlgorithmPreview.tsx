import { useEffect, useRef, useState } from "react";
import type { Algorithm, Center } from "../engine/types";
import type { Bicluster } from "../engine/matrixTypes";
import { supportsDataset } from "../engine/registry";
import {
  generateRecommended,
  recommendations,
  recommendationParams,
} from "../data/recommendations";
import { displayPoints } from "../engine/dataset";
import { stateAt } from "../engine/trace";
import { DatasetPreview } from "./DatasetPreview";

// At most two thumbnail Workers; retain a small final summary, never full traces.
interface PreviewResult {
  labels: number[];
  centers: Center[];
  biclusters?: Bicluster[];
}
const cache = new Map<Algorithm, PreviewResult>();
let running = 0;
const waiting = new Set<() => void>();
function pump() {
  for (const next of waiting) {
    if (running >= 2) break;
    waiting.delete(next);
    next();
  }
}
export function AlgorithmPreview({ algorithm }: { algorithm: Algorithm }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [labels, setLabels] = useState(() => cache.get(algorithm));
  const [error, setError] = useState("");
  const entry = recommendations[algorithm][0];
  const [data] = useState(() =>
    generateRecommended(entry.datasetId, { count: 48 }),
  );
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) =>
      setVisible(e.isIntersecting),
    );
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || labels || error) return;
    let worker: Worker | undefined,
      released = false;
    const release = () => {
      if (worker && !released) {
        released = true;
        worker.terminate();
        running--;
        pump();
      }
    };
    const start = () => {
      running++;
      worker = new Worker(new URL("../engine/worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (e) => {
        if (released) return;
        if (e.data.progress) return;
        if (e.data.error) setError(e.data.error);
        else {
          const state = stateAt(e.data.trace, e.data.trace.steps.length);
          const result: PreviewResult = {
            labels: state.labels,
            centers: state.centers,
            ...(state.analysis?.kind === "biclustering"
              ? { biclusters: state.analysis.biclusters }
              : {}),
          };
          cache.set(algorithm, result);
          setLabels(result);
        }
        release();
      };
      worker.onerror = () => {
        setError("미리보기 계산을 불러오지 못했습니다.");
        release();
      };
      worker.postMessage({
        id: 1,
        purpose: "thumbnail",
        algorithm,
        params: recommendationParams(algorithm, entry),
        points:
          data.kind === "numeric" && data.display
            ? data.display
            : displayPoints(data),
        ...(supportsDataset(algorithm, data.kind) ? { dataset: data } : {}),
      });
    };
    waiting.add(start);
    pump();
    return () => {
      waiting.delete(start);
      release();
    };
  }, [algorithm, data, entry, visible, labels, error]);
  return (
    <div
      ref={ref}
      className="algorithm-preview"
      data-preview-status={error ? "error" : labels ? "computed" : "pending"}
    >
      <DatasetPreview
        data={data}
        labels={labels?.labels}
        centers={labels?.centers}
        biclusters={labels?.biclusters}
      />
      <span className="preview-status">
        {error
          ? "계산 오류 · 실험실에서 확인"
          : labels
            ? "실제 계산 결과"
            : "입력 데이터 · 계산 대기"}
      </span>
    </div>
  );
}
