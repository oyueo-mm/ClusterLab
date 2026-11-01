import { useEffect, useMemo, useState } from "react";
import { algorithms, type Algorithm, emptyState } from "../engine/types";
import { supportsDataset, supportsLegacyPoints } from "../engine/registry";
import { displayPoints, type Dataset } from "../engine/dataset";
import { useExperiment } from "../animation/useExperiment";
import { restoreParams } from "../lab/parameters";
import { stateAt } from "../engine/trace";
import { generateRecommended, datasetRegistry } from "../data/recommendations";
import { Canvas } from "../components/Canvas";
import { Settings } from "../components/Settings";
import { Playback } from "../components/Playback";
import { Analysis } from "../components/Analysis";
import { DatasetPreview } from "../components/DatasetPreview";
export const comparisonPresets: {
  name: string;
  algorithms: Algorithm[];
  dataset: string;
}[] = [
  {
    name: "중심과 확률·퍼지 소속",
    algorithms: ["K-Means", "GMM", "Fuzzy C-Means"],
    dataset: "overlap",
  },
  {
    name: "밀도와 계층",
    algorithms: ["DBSCAN", "HDBSCAN", "OPTICS"],
    dataset: "density",
  },
  {
    name: "볼록 분할과 스펙트럴",
    algorithms: ["K-Means", "Spectral Clustering"],
    dataset: "circles",
  },
  {
    name: "계층적 병합·분할·대표점",
    algorithms: ["AGNES", "DIANA", "CURE"],
    dataset: "elongated",
  },
  {
    name: "메도이드 탐색",
    algorithms: ["PAM", "CLARA", "CLARANS"],
    dataset: "outliers",
  },
  {
    name: "네트워크 커뮤니티",
    algorithms: ["Louvain", "Leiden", "Label Propagation"],
    dataset: "graph-base",
  },
  {
    name: "경쟁 뉴런 학습",
    algorithms: ["SOM", "Neural Gas", "Growing Neural Gas"],
    dataset: "rings",
  },
  {
    name: "순서·유보·재방문",
    algorithms: ["BSAS", "MBSAS", "TTSAS"],
    dataset: "ordered",
  },
];
export function incompatibility(algorithm: Algorithm, data: Dataset): string {
  if (data.kind === "numeric") {
    if (
      algorithm === "Bernoulli Mixture" &&
      data.values.some((row) => row.some((v) => v !== 0 && v !== 1))
    )
      return "Bernoulli 관측은 실제 0 또는 1이어야 합니다.";
    if (
      ["Poisson Mixture", "Multinomial Mixture"].includes(algorithm) &&
      data.values.some(
        (row) =>
          row.some((v) => !Number.isSafeInteger(v) || v < 0) ||
          !Number.isSafeInteger(row.reduce((a, b) => a + b, 0)),
      )
    )
      return "비음수 안전 정수 카운트가 필요합니다.";
  }
  if (
    data.kind === "matrix" &&
    algorithm === "Bimax" &&
    data.values.some((row) => row.some((v) => v !== 0 && v !== 1))
  )
    return "Bimax는 실제 이진 행렬이 필요합니다.";
  if (data.kind === "graph") {
    if (data.directed) return "현재 엔진은 무방향 그래프가 필요합니다.";
    if (["Fluid Communities", "Clique Percolation"].includes(algorithm)) {
      const seen = new Set<string>();
      if (
        data.edges.some((edge) => {
          const key = JSON.stringify([edge.source, edge.target].sort());
          const invalid =
            edge.weight !== 1 || edge.source === edge.target || seen.has(key);
          seen.add(key);
          return invalid;
        })
      )
        return "중복·self-loop 없는 단위 가중치 그래프가 필요합니다.";
    }
  }
  if (supportsDataset(algorithm, data.kind)) return "";
  if (
    data.kind !== "numeric" ||
    !data.display ||
    !supportsLegacyPoints(algorithm)
  )
    return `${data.kind} 원본 입력을 지원하지 않습니다.`;
  if (algorithm === "ROCK" && data.display.some((p) => !p.features?.length))
    return "범주형 attribute=value 토큰이 필요합니다.";
  if (algorithm === "LVQ" && data.display.some((p) => p.label === undefined))
    return "정답 클래스 라벨이 필요합니다.";
  return "";
}
function ComparePane({
  initial,
  data,
  sync,
}: {
  initial: Algorithm;
  data: Dataset;
  sync: { id: number; playing: boolean };
}) {
  const [algorithm, setAlgorithm] = useState(initial),
    [params, setParams] = useState(() => restoreParams(initial));
  const points = useMemo(
    () =>
      data.kind === "numeric" && data.display
        ? data.display
        : displayPoints(data),
    [data],
  );
  const reason = incompatibility(algorithm, data);
  const lab = useExperiment(algorithm, points, params, {
    active: !reason,
    ...(supportsDataset(algorithm, data.kind) ? { dataset: data } : {}),
  });
  useEffect(() => {
    if (lab.trace) lab.setPlaying(sync.playing);
  }, [sync, lab.trace]);
  const state = lab.trace
    ? stateAt(lab.trace, Math.floor(lab.position))
    : emptyState(points.length);
  return (
    <article className="compare-card">
      <div className="compare-heading">
        <select
          aria-label="원본 비교 알고리즘"
          value={algorithm}
          onChange={(e) => {
            const a = e.target.value as Algorithm;
            setAlgorithm(a);
            setParams(restoreParams(a));
          }}
        >
          {algorithms.map((a) => (
            <option
              key={a}
              disabled={!!incompatibility(a, data)}
              title={incompatibility(a, data)}
            >
              {a}
              {incompatibility(a, data) ? " · 입력 불일치" : ""}
            </option>
          ))}
        </select>
      </div>
      {reason ? (
        <p role="alert">{reason}</p>
      ) : (
        <>
          <DatasetPreview data={data} labels={state.labels} />
          <Canvas
            algorithm={algorithm}
            points={points}
            trace={lab.trace}
            position={lab.position}
            clock={lab.clock}
          />
          <Playback lab={lab} compact />
          {lab.error && <p role="alert">{lab.error}</p>}
        </>
      )}
      <details>
        <summary>독립 파라미터</summary>
        <Settings algorithm={algorithm} value={params} onChange={setParams} />
      </details>
      <details>
        <summary>내부 분석</summary>
        <Analysis algorithm={algorithm} state={state} points={points} />
      </details>
    </article>
  );
}
export default function CompareWorkbench({
  initialAlgorithms,
  initialData,
}: {
  initialAlgorithms?: Algorithm[];
  initialData?: Dataset;
}) {
  const [preset, setPreset] = useState(initialAlgorithms ? -1 : 0),
    [datasetId, setDatasetId] = useState(
      initialData ? "custom" : comparisonPresets[0].dataset,
    ),
    [count, setCount] = useState(initialAlgorithms?.length ?? 3);
  const [sync, setSync] = useState({ id: 0, playing: false });
  const data = useMemo(
    () =>
      datasetId === "custom" && initialData
        ? initialData
        : generateRecommended(datasetId),
    [datasetId, initialData],
  );
  const pair =
    preset === -1 && initialAlgorithms
      ? { algorithms: initialAlgorithms }
      : comparisonPresets[preset];
  return (
    <section aria-label="원본 데이터 비교 실험실">
      <h2>추천 비교 실험</h2>
      <p>
        같은 원본을 공유하고, 각 알고리즘의 파라미터와 Trace를 독립적으로
        비교합니다.
      </p>
      <div className="compare-controls">
        <label>
          추천 조합
          <select
            aria-label="추천 비교 조합"
            value={preset}
            onChange={(e) => {
              const index = +e.target.value;
              setPreset(index);
              setDatasetId(comparisonPresets[index].dataset);
              setCount(comparisonPresets[index].algorithms.length);
            }}
          >
            {initialAlgorithms && (
              <option value={-1} disabled>
                가이드에서 선택한 조합
              </option>
            )}
            {comparisonPresets.map((p, i) => (
              <option key={p.name} value={i}>
                {p.name} · {p.algorithms.join(" / ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          공통 원본
          <select
            aria-label="비교 원본 데이터셋"
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
          >
            {initialData && (
              <option value="custom">
                실험실의 편집 원본 · {initialData.kind}
              </option>
            )}
            {Object.values(datasetRegistry)
              .filter((d) => !d.id.endsWith("alternate"))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {d.kind}
                </option>
              ))}
          </select>
        </label>
        <label>
          비교 개수
          <select
            aria-label="원본 비교 개수"
            value={count}
            onChange={(e) => setCount(+e.target.value)}
          >
            {[2, 3, 4].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() =>
            setSync((s) => ({ id: s.id + 1, playing: !s.playing }))
          }
        >
          {sync.playing ? "동시 일시정지" : "동시 재생"}
        </button>
      </div>
      <div className="compare-grid">
        {Array.from({ length: count }, (_, i) => (
          <ComparePane
            key={`${preset}-${i}`}
            initial={pair.algorithms[i % pair.algorithms.length]}
            data={data}
            sync={sync}
          />
        ))}
      </div>
    </section>
  );
}
