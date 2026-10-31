import { useMemo, useState } from "react";
import {
  displayPoints,
  type Dataset,
  type NumericDataset,
  type GraphDataset,
} from "../engine/dataset";
import { exportDataset, importDataset } from "../engine/datasetValidation";
import { algorithmDefaults, type Algorithm, emptyState } from "../engine/types";
import {
  registry,
  structuredAlgorithms,
  supportsDataset,
} from "../engine/registry";
import { estimateResources, DEFAULT_WORKING_BYTES } from "../engine/resources";
import { useExperiment } from "../animation/useExperiment";
import { stateAt } from "../engine/trace";
import { Canvas } from "./Canvas";
import { Playback } from "./Playback";
import { Settings } from "./Settings";
import { Analysis } from "./Analysis";
import "./structured.css";

const numericExample: NumericDataset = {
  kind: "numeric",
  featureNames: ["겹치는 X", "겹치는 Y", "군집을 구분하는 Z"],
  values: Array.from({ length: 12 }, (_, i) => [
    0.2 + (i % 6) * 0.02,
    0.3 + (i % 3) * 0.02,
    i < 6 ? 0 : 5,
  ]),
};
const graphExample: GraphDataset = {
  kind: "graph",
  directed: false,
  nodes: Array.from({ length: 6 }, (_, i) => ({ id: `v${i}` })),
  edges: [
    [0, 1],
    [1, 2],
    [2, 0],
    [3, 4],
    [4, 5],
    [5, 3],
  ].map(([a, b]) => ({ source: `v${a}`, target: `v${b}`, weight: 1 })),
};
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function StructuredLab() {
  const [data, setData] = useState<Dataset>(numericExample),
    [text, setText] = useState(exportDataset(numericExample));
  const [algorithm, setAlgorithm] = useState<Algorithm>("Spectral Clustering");
  const [params, setParams] = useState({
    ...algorithmDefaults("Spectral Clustering"),
    k: 2,
  });
  const [axes, setAxes] = useState<[number, number]>([0, 1]);
  const [error, setError] = useState("");
  // Projection changes only Canvas coordinates; the Worker keeps the same raw dataset.
  const computePoints = useMemo(() => displayPoints(data), [data]);
  const points = useMemo(() => displayPoints(data, axes), [data, axes]);
  const lab = useExperiment(algorithm, computePoints, params, {
    dataset: data,
  });
  const index = Math.floor(lab.position),
    state = useMemo(
      () => (lab.trace ? stateAt(lab.trace, index) : emptyState(points.length)),
      [lab.trace, index, points.length],
    );
  const next = useMemo(
    () => (lab.trace ? stateAt(lab.trace, index + 1) : state),
    [lab.trace, index, state],
  );
  const estimate = estimateResources(algorithm, points.length, params);
  const apply = (value: Dataset) => {
    if (value.kind !== "numeric" && value.kind !== "graph")
      throw new Error(
        "형식 검증은 통과했지만 이 데이터 유형의 실행·편집 화면은 아직 지원하지 않습니다.",
      );
    if (value.kind === "graph" && value.directed)
      throw new Error(
        "현재 실행은 무방향 그래프만 지원합니다. 방향성은 자동으로 제거하지 않습니다.",
      );
    if (!supportsDataset(algorithm, value.kind)) {
      setAlgorithm("Spectral Clustering");
      setParams({ ...algorithmDefaults("Spectral Clustering"), k: 2 });
    }
    setData(value);
    setText(exportDataset(value));
    setAxes([0, 1]);
    setError("");
  };
  const choose = (a: Algorithm) => {
    setAlgorithm(a);
    setParams({ ...algorithmDefaults(a), k: 2 });
  };
  return (
    <div className="structured-page">
      <h1>다중 데이터 실험</h1>
      <p>
        수치형 원본 전체 차원과 그래프 간선으로 계산합니다. 표시 축을 바꿔도
        원본 계산은 바뀌지 않습니다.
      </p>
      <div className="structured-layout">
        <section className="stage">
          <div className="stage-heading">
            <label>
              알고리즘
              <select
                aria-label="다중 데이터 알고리즘"
                value={algorithm}
                onChange={(e) => choose(e.target.value as Algorithm)}
              >
                {structuredAlgorithms.map((a) => (
                  <option key={a} disabled={!supportsDataset(a, data.kind)}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <span className="family-tag">{registry[algorithm].koreanName}</span>
          </div>
          <div className="structured-provenance" role="status">
            전체 {points.length}개{" "}
            {data.kind === "numeric"
              ? `· 원본 ${data.values[0].length}차원`
              : `· 실제 그래프 간선 ${data.kind === "graph" ? data.edges.length : 0}개`}{" "}
            · 표시 좌표와 계산 데이터 분리
          </div>
          {data.kind === "numeric" && (
            <div className="matrix-controls">
              {[0, 1].map((j) => (
                <label key={j}>
                  {j === 0 ? "표시 X 축" : "표시 Y 축"}
                  <input
                    aria-label={j === 0 ? "표시 X 차원" : "표시 Y 차원"}
                    type="number"
                    min={1}
                    max={data.values[0].length}
                    value={axes[j] + 1}
                    onChange={(e) =>
                      setAxes(
                        (old) =>
                          old.map((x, k) =>
                            k === j
                              ? Math.max(
                                  0,
                                  Math.min(
                                    data.values[0].length - 1,
                                    Math.trunc(+e.target.value || 1) - 1,
                                  ),
                                )
                              : x,
                          ) as [number, number],
                      )
                    }
                  />
                </label>
              ))}
            </div>
          )}
          {(error || lab.error) && (
            <p className="error" role="alert">
              {error || lab.error}
            </p>
          )}
          <Canvas
            algorithm={algorithm}
            points={points}
            trace={lab.trace}
            position={lab.position}
            clock={lab.clock}
          />
          <Playback lab={lab} />
          <p className="step-explanation">
            {lab.busy
              ? lab.progress
              : (lab.trace?.steps[Math.max(0, Math.ceil(lab.position) - 1)]
                  ?.description ?? "초기 상태")}
          </p>
          {lab.trace?.recording && (
            <p className="small">
              기록: {lab.trace.recording.policy} · 추정 저장{" "}
              {(lab.trace.recording.estimatedBytes / 1048576).toFixed(2)} MiB
            </p>
          )}
          <Analysis
            algorithm={algorithm}
            state={state}
            next={next}
            points={points}
            progress={lab.position - index}
          />
        </section>
        <aside className="panel structured-controls">
          <h2>원본 데이터</h2>
          <div className="structured-examples">
            <button onClick={() => apply(numericExample)}>
              3차원 수치 예제
            </button>
            <button onClick={() => apply(graphExample)}>
              가중 그래프 예제
            </button>
          </div>
          <p className="small">
            예제의 X·Y는 겹치며 Z로 군집이 분리됩니다. 원본 3차원을 사용해
            계산하고, 표시 Y 차원을 3으로 바꿔 확인하세요.
          </p>
          <label>
            JSON 원본 편집
            <textarea
              aria-label="원본 데이터 JSON"
              rows={14}
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
            />
          </label>
          <button
            className="primary"
            onClick={() => {
              try {
                apply(importDataset(text));
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            데이터 적용
          </button>
          <label className="field">
            데이터 JSON 가져오기
            <input
              aria-label="다중 데이터 파일"
              type="file"
              accept=".json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size * 6 > DEFAULT_WORKING_BYTES)
                    throw new Error(
                      "파일 파싱의 추정 메모리 예산을 초과합니다.",
                    );
                  const value = importDataset(await file.text());
                  apply(value);
                } catch (ex) {
                  setError(ex instanceof Error ? ex.message : String(ex));
                }
                e.target.value = "";
              }}
            />
          </label>
          <button
            onClick={() =>
              download(
                "clusterlab-dataset.json",
                JSON.parse(exportDataset(data)),
              )
            }
          >
            원본 JSON 내보내기
          </button>
          <button
            disabled={!lab.trace}
            onClick={() => {
              if (lab.trace)
                download("clusterlab-result.json", {
                  algorithm,
                  params,
                  inputKind: data.kind,
                  computedRows: points.length,
                  sourceDimensions:
                    data.kind === "numeric" ? data.values[0].length : undefined,
                  state: stateAt(lab.trace, lab.trace.steps.length),
                });
            }}
          >
            전체 계산 결과 내보내기
          </button>
          <h2>파라미터</h2>
          <Settings algorithm={algorithm} value={params} onChange={setParams} />
          <p className="small">
            작업 공간 추정 {(estimate.workingBytes / 1048576).toFixed(1)} MiB ·
            원본 특성 저장 공간과 전송 복사는 별도입니다.
          </p>
          <p className="small">
            범주형·혼합·행렬·시계열·스트림·제약은 데이터 스키마 검증을 지원하며,
            이 화면의 실행 엔진은 아직 연결되지 않았습니다.
          </p>
        </aside>
      </div>
    </div>
  );
}
