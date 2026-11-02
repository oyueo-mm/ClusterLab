import { FullscreenButton } from "../lab/FullscreenButton";
import { LabTabs } from "../lab/LabTabs";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  displayPoints,
  type Dataset,
  type NumericDataset,
  type GraphDataset,
} from "../engine/dataset";
import {
  exportDataset,
  importDataset,
  validateDataset,
} from "../engine/datasetValidation";
import {
  algorithmDefaults,
  type Algorithm,
  type EventKind,
  emptyState,
} from "../engine/types";
import {
  registry,
  structuredAlgorithms,
  supportsDataset,
} from "../engine/registry";
import { estimateResources, DEFAULT_WORKING_BYTES } from "../engine/resources";
import { useExperiment } from "../animation/useExperiment";
import { stateAt } from "../engine/trace";
import { Canvas } from "./Canvas";
import { DatasetPreview } from "./DatasetPreview";
import { Playback } from "./Playback";
import { Settings } from "./Settings";
import { Analysis } from "./Analysis";
import "./structured.css";
import { DatasetEditor } from "./DatasetEditor";
import { ConstraintEditor } from "./ConstraintEditor";
import {
  createDatasetHistory,
  commitDatasetHistory,
  undoDatasetHistory,
  redoDatasetHistory,
} from "../editor/datasetHistory";
import { historyShortcut } from "../editor/history";
import {
  makeStructuredPreset,
  makeExperimentPreset,
  type ExperimentPreset,
} from "../data/structuredPresets";
import { Recommendations } from "./Recommendations";
import { LabDetails } from "./LabDetails";
import { generateForRecommendation } from "../data/recommendations";
import {
  readDatasetState,
  writeDatasetState,
  readPreference,
  writePreference,
} from "../lab/storage";
import { restoreParams } from "../lab/parameters";
import type { DatasetHistory } from "../editor/datasetHistory";
let sessionHistory: DatasetHistory | undefined;
let sessionOwned = false;
import { nativeResult } from "../engine/datasetExecution";

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
export default function StructuredLab({
  initialAlgorithm,
  initialData,
  initialParams,
  initialEvent,
  onAlgorithmChange,
  onCompare,
}: {
  initialAlgorithm?: Algorithm;
  initialData?: Dataset;
  initialParams?: ReturnType<typeof algorithmDefaults>;
  initialEvent?: EventKind;
  onAlgorithmChange?: (algorithm: Algorithm) => void;
  onCompare?: (pair: [Algorithm, Algorithm], data: Dataset) => void;
}) {
  const requestedAlgorithm =
    initialAlgorithm && structuredAlgorithms.some((a) => a === initialAlgorithm)
      ? initialAlgorithm
      : undefined;
  const rawOwned = useRef(
    !!initialData || sessionOwned || readPreference("structured-owned", false),
  );
  const ownRaw = () => {
    rawOwned.current = true;
    sessionOwned = true;
    writePreference("structured-owned", true);
  };
  const [legacyLayout] = useState(() =>
    /^#structured(?:$|\?)/.test(location.hash),
  );
  const initialKind: ExperimentPreset = initialAlgorithm
    ? registry[initialAlgorithm].examplePreset
    : "numeric";
  const [history, setHistory] = useState(() =>
    initialData
      ? createDatasetHistory(initialData)
      : ((rawOwned.current ? sessionHistory : undefined) ??
        createDatasetHistory(
          requestedAlgorithm
            ? generateForRecommendation(requestedAlgorithm)
            : numericExample,
        )),
  );
  const [restored, setRestored] = useState(
      (rawOwned.current && !!sessionHistory) || !!initialData,
    ),
    [storageError, setStorageError] = useState("");
  const [tab, setTab] = useState(() =>
    initialEvent ? "analysis" : readPreference("structured-tab", "settings"),
  );
  const [panelOpen, setPanelOpen] = useState(() =>
    readPreference("structured-panel", true),
  );
  const [sheetOpen, setSheetOpen] = useState(!!initialEvent);
  const [requestedEvent, setRequestedEvent] = useState(initialEvent);
  const dataRequest = useRef(initialData);
  useEffect(() => {
    if ((rawOwned.current && sessionHistory) || initialData) {
      setRestored(true);
      return;
    }
    let active = true;
    readDatasetState<Dataset | { version: 2; data: Dataset; owned: boolean }>(
      "structured-v1",
    )
      .then((saved) => {
        if (active && saved) {
          // Records written before ownership metadata are treated as user data.
          const source = "kind" in saved ? saved : saved.data;
          const owned = "kind" in saved || saved.owned;
          validateDataset(source);
          if (owned) {
            ownRaw();
            setHistory(createDatasetHistory(source));
            setText(exportDataset(source));
          }
        }
      })
      .catch(() => {
        if (active)
          setStorageError(
            "원본 데이터 복원에 실패했습니다. 현재 데이터로 계속할 수 있습니다.",
          );
      })
      .finally(() => {
        if (active) setRestored(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!restored) return;
    sessionHistory = history;
    sessionOwned = rawOwned.current;
    writePreference("structured-owned", rawOwned.current);
    const timer = setTimeout(() => {
      void writeDatasetState("structured-v1", {
        version: 2,
        data: history.present,
        owned: rawOwned.current,
      }).catch(() =>
        setStorageError(
          "원본 데이터 저장에 실패했습니다. JSON으로 내보내 주세요.",
        ),
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [history, restored]);
  useEffect(() => {
    writePreference("structured-tab", tab);
    writePreference("structured-panel", panelOpen);
  }, [tab, panelOpen]);
  const data = history.present;
  const [text, setText] = useState(() => exportDataset(data));
  const [algorithm, setAlgorithm] = useState<Algorithm>(() =>
    requestedAlgorithm
      ? requestedAlgorithm
      : (structuredAlgorithms.find((a) => supportsDataset(a, data.kind)) ??
        "Spectral Clustering"),
  );
  const [params, setParams] = useState(
    () =>
      initialParams ?? {
        ...restoreParams(algorithm),
        ...(algorithm === "Spectral Clustering" ? { k: 2 } : {}),
      },
  );
  const [generator, setGenerator] = useState<{
    kind: ExperimentPreset;
    count: number;
    dimensions: number;
    seed: number;
  }>({ kind: initialKind, count: 24, dimensions: 3, seed: 42 });
  useEffect(() => {
    writePreference(`params:${algorithm}`, params);
  }, [algorithm, params]);
  const [axes, setAxes] = useState<[number, number]>([0, 1]);
  const [error, setError] = useState("");
  const [autoFeed, setAutoFeed] = useState(false);
  // Projection changes only Canvas coordinates; the Worker keeps the same raw dataset.
  const computePoints = useMemo(() => displayPoints(data), [data]);
  const points = useMemo(
    () =>
      axes[0] === 0 && axes[1] === 1
        ? computePoints
        : displayPoints(data, axes),
    [data, axes, computePoints],
  );
  const lab = useExperiment(algorithm, computePoints, params, {
    dataset: data,
    active: restored && supportsDataset(algorithm, data.kind),
  });
  const soughtGuideEvent = useRef(false);
  useEffect(() => {
    if (
      soughtGuideEvent.current ||
      !requestedEvent ||
      !lab.traceIsCurrent ||
      !lab.trace
    )
      return;
    const found = lab.trace.steps.findIndex(
      (step) => step.kind === requestedEvent,
    );
    if (found >= 0) lab.seek(found + 1);
    soughtGuideEvent.current = true;
  }, [requestedEvent, lab.trace, lab.traceIsCurrent, lab.seek]);
  useEffect(() => {
    if (requestedAlgorithm && requestedAlgorithm !== algorithm) {
      initializeRaw(requestedAlgorithm);
      setAlgorithm(requestedAlgorithm);
      setParams(restoreParams(requestedAlgorithm));
    }
    if (initialData && dataRequest.current !== initialData) {
      ownRaw();
      validateDataset(initialData);
      setHistory((h) => commitDatasetHistory(h, initialData));
      setText(exportDataset(initialData));
      dataRequest.current = initialData;
      if (initialParams) setParams(initialParams);
      soughtGuideEvent.current = false;
      setRequestedEvent(initialEvent);
    }
  }, [requestedAlgorithm, initialData, initialParams, initialEvent]);
  const index = Math.floor(lab.position),
    state = useMemo(
      () => (lab.trace ? stateAt(lab.trace, index) : emptyState(points.length)),
      [lab.trace, index, points.length],
    );
  const next = useMemo(
    () => (lab.trace ? stateAt(lab.trace, index + 1) : state),
    [lab.trace, index, state],
  );
  const estimate = estimateResources(
    algorithm,
    points.length,
    params,
    data.kind === "graph" ? data.edges.length : undefined,
  );
  const apply = (value: Dataset) => {
    validateDataset(value);
    const compatible = structuredAlgorithms.filter((a) =>
      supportsDataset(a, value.kind),
    );
    if (!compatible.length)
      throw new Error(
        "형식 검증은 통과했지만 이 데이터 유형의 실행·편집 화면은 아직 지원하지 않습니다.",
      );
    if (value.kind === "graph" && value.directed)
      throw new Error(
        "현재 실행은 무방향 그래프만 지원합니다. 방향성은 자동으로 제거하지 않습니다.",
      );
    ownRaw();
    if (!supportsDataset(algorithm, value.kind)) {
      onAlgorithmChange?.(compatible[0]);
      setAlgorithm(compatible[0]);
      setParams({
        ...algorithmDefaults(compatible[0]),
        ...(compatible[0] === "Spectral Clustering" ? { k: 2 } : {}),
      });
    }
    setHistory((h) => commitDatasetHistory(h, value));
    setText(exportDataset(value));
    if (value.kind !== data.kind) setAxes([0, 1]);
    setError("");
  };
  function initializeRaw(a: Algorithm) {
    if (rawOwned.current || legacyLayout) return;
    const next = generateForRecommendation(a);
    setHistory((h) => commitDatasetHistory(h, next));
    setText(exportDataset(next));
    setAxes([0, 1]);
  }
  const choose = (a: Algorithm) => {
    initializeRaw(a);
    onAlgorithmChange?.(a);
    setAlgorithm(a);
    setParams({
      ...algorithmDefaults(a),
      ...(a === "Spectral Clustering" ? { k: 2 } : {}),
    });
  };
  const restore = (reverse: boolean) => {
    ownRaw();
    const next = reverse
      ? undoDatasetHistory(history)
      : redoDatasetHistory(history);
    setHistory(next);
    setText(exportDataset(next.present));
    setError("");
    if (!supportsDataset(algorithm, next.present.kind)) {
      const a = structuredAlgorithms.find((a) =>
        supportsDataset(a, next.present.kind),
      );
      if (a) {
        onAlgorithmChange?.(a);
        setAlgorithm(a);
        setParams(algorithmDefaults(a));
      }
    }
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable="true"]'))
        return;
      const action = historyShortcut(event);
      if (action) {
        event.preventDefault();
        restore(action === "undo");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [history, algorithm]);
  useEffect(() => {
    if (!autoFeed || data.kind !== "stream" || lab.busy) return;
    const timeout = setTimeout(() => {
      const last = data.samples.at(-1)!;
      const value = {
        ...data,
        samples: [
          ...data.samples,
          {
            time: last.time + 1,
            values: last.values.map((v, j) => v + (j % 2 ? 0.01 : -0.01)),
          },
        ],
      };
      apply(value);
    }, 700);
    return () => clearTimeout(timeout);
  }, [autoFeed, data, lab.busy]);
  return (
    <div
      className={`structured-page ${panelOpen ? "" : "panel-hidden"} ${legacyLayout ? "legacy-structured" : ""}`}
    >
      <header className="lab-header">
        <div>
          <small>{registry[algorithm].family}</small>
          <h1>
            {registry[algorithm].koreanName} <small>{algorithm}</small>
          </h1>
        </div>
        <div className="lab-actions">
          <button onClick={() => setParams(algorithmDefaults(algorithm))}>
            알고리즘 초기화
          </button>
          <FullscreenButton />
          <button
            aria-expanded={panelOpen}
            onClick={() => {
              setPanelOpen(!panelOpen);
              setSheetOpen(!panelOpen);
            }}
          >
            설정 패널 {panelOpen ? "접기" : "펼치기"}
          </button>
          <button
            className="structured-sheet-toggle"
            onClick={() => {
              setSheetOpen(true);
              setPanelOpen(true);
            }}
          >
            설정·데이터·분석 열기
          </button>
        </div>
      </header>
      {storageError && <p role="status">{storageError}</p>}
      {!supportsDataset(algorithm, data.kind) && (
        <p role="alert">
          현재 {data.kind} 원본은 {algorithm}에서 지원하지 않습니다. 편집
          데이터는 보존했습니다. 데이터 탭에서 호환되는 추천을 적용하세요.
        </p>
      )}
      <p>
        전체 원본 특성과 관계로 계산합니다. 표시 축을 바꿔도 원본 계산은 바뀌지
        않습니다.
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
            {data.kind === "constrained"
              ? `· 원본 ${data.data.values[0].length}차원 · ML ${data.mustLink.length}/CL ${data.cannotLink.length}`
              : data.kind === "numeric" || data.kind === "categorical"
                ? `· 원본 ${data.values[0].length}차원`
                : data.kind === "mixed"
                  ? `· 수치 ${data.numeric[0].length} + 범주 ${data.categorical[0].length}차원`
                  : data.kind === "graph"
                    ? `· 실제 그래프 간선 ${data.edges.length}개`
                    : data.kind === "stream"
                      ? `· 실제 시각 ${data.samples[0].time}–${data.samples.at(-1)!.time} · 원본 ${data.samples[0].values.length}차원`
                      : data.kind === "matrix"
                        ? `· 원본 ${data.values.length}행×${data.values[0].length}열`
                        : "· 실제 시간축"}{" "}
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
          {!legacyLayout &&
          ["matrix", "timeseries", "categorical"].includes(data.kind) ? (
            <div className="native-stage">
              <DatasetPreview
                data={data}
                labels={state.labels}
                biclusters={
                  state.analysis?.kind === "biclustering"
                    ? state.analysis.biclusters
                    : undefined
                }
              />
              <p className="small">
                전체 {points.length}개 원본으로 계산합니다. 화면 표시 예산과
                계산 데이터는 별개입니다.
              </p>
            </div>
          ) : (
            <Canvas
              algorithm={algorithm}
              points={points}
              trace={lab.traceIsCurrent ? lab.trace : null}
              position={lab.position}
              clock={lab.clock}
            />
          )}
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
        </section>
        <aside
          className={`panel structured-controls ${sheetOpen ? "sheet-open" : ""}`}
        >
          <button
            className="sheet-close"
            aria-label="설정 닫기"
            onClick={() => setSheetOpen(false)}
          >
            닫기
          </button>
          <LabTabs value={tab} onChange={setTab} />
          <div hidden={!legacyLayout && tab !== "data"}>
            <Recommendations
              key={algorithm}
              algorithm={algorithm}
              onApply={(id, input, suggested) => {
                apply(input);
                if (suggested) setParams(suggested);
                setError("");
                setStorageError(
                  `${id} 데이터셋을 적용했습니다. 되돌리기로 이전 원본을 복원할 수 있습니다.`,
                );
              }}
            />
            <h2>원본 데이터</h2>
            <div className="structured-examples">
              <button
                aria-label="다중 데이터 Undo"
                disabled={!history.past.length}
                onClick={() => restore(true)}
              >
                되돌리기
              </button>
              <button
                aria-label="다중 데이터 Redo"
                disabled={!history.future.length}
                onClick={() => restore(false)}
              >
                다시하기
              </button>
            </div>
            <div className="structured-examples">
              <button onClick={() => apply(numericExample)}>
                3차원 수치 예제
              </button>
              <button onClick={() => apply(graphExample)}>
                가중 그래프 예제
              </button>
              <button
                onClick={() =>
                  apply(makeStructuredPreset("categorical", 12, 3, 42))
                }
              >
                범주형 예제
              </button>
              <button
                onClick={() => apply(makeStructuredPreset("mixed", 12, 2, 42))}
              >
                혼합형 예제
              </button>
              <button
                onClick={() => apply(makeStructuredPreset("graph", 12, 3, 42))}
              >
                연결 커뮤니티 예제
              </button>
              <button
                onClick={() => apply(makeStructuredPreset("stream", 48, 3, 42))}
              >
                개념 드리프트 스트림
              </button>
              <button
                onClick={() => apply(makeStructuredPreset("matrix", 12, 8, 42))}
              >
                이중군집 행렬 예제
              </button>
              <button
                onClick={() =>
                  apply(makeStructuredPreset("timeseries", 12, 3, 42))
                }
              >
                시계열 형태 예제
              </button>
              <button
                onClick={() =>
                  apply(makeExperimentPreset("constrained", 12, 3, 42))
                }
              >
                하드 제약 예제
              </button>
              <button
                onClick={() => {
                  apply(makeExperimentPreset("bernoulli", 24, 3, 42));
                  choose("Bernoulli Mixture");
                }}
              >
                이진 응답 예제
              </button>
              <button
                onClick={() => {
                  apply(makeExperimentPreset("poisson", 24, 3, 42));
                  choose("Poisson Mixture");
                }}
              >
                포아송 카운트 예제
              </button>
              <button
                onClick={() => {
                  apply(makeExperimentPreset("multinomial", 24, 3, 42));
                  choose("Multinomial Mixture");
                }}
              >
                다항 카운트 예제
              </button>
            </div>
            <p className="small">
              {data.kind === "numeric"
                ? "모든 원본 특성으로 계산하며 표시 축은 별도입니다. 이산 혼합모델은 실제 이진 응답·카운트 예제를 사용하세요."
                : data.kind === "categorical"
                  ? "화면 좌표는 선택한 범주 토큰의 표시 배치입니다. 범주를 수치 거리로 계산하지 않습니다."
                  : data.kind === "mixed"
                    ? "점 좌표는 수치 특성 표시이며 실제 계산에는 범주 특성도 포함됩니다."
                    : data.kind === "stream"
                      ? "시각과 원본 특성으로 online CF를 계산합니다. 화면은 첫 두 특성입니다."
                      : "원본 관계와 화면 좌표를 구분합니다."}
            </p>
            {data.kind === "constrained" ? (
              <ConstraintEditor
                data={data}
                onChange={apply}
                onError={setError}
              />
            ) : (
              <DatasetEditor data={data} onChange={apply} onError={setError} />
            )}
            {data.kind === "stream" && (
              <div className="structured-stream-controls">
                <button onClick={() => setAutoFeed((v) => !v)}>
                  {autoFeed ? "유입 일시정지" : "유입 시작"}
                </button>
                <p className="small">
                  추가 관측을 실제 시각에 유입합니다. 이 화면은 재현 가능한 전체
                  prefix를 Worker에서 재계산하며, DenStreamModel 자체는 이전
                  관측을 보관하지 않는 증분 CF 엔진입니다.
                </p>
              </div>
            )}
            <details>
              <summary>시드 데이터 생성</summary>
              <label>
                데이터 유형{" "}
                <select
                  aria-label="다중 생성 유형"
                  value={generator.kind}
                  onChange={(e) =>
                    setGenerator({
                      ...generator,
                      kind: e.target.value as ExperimentPreset,
                    })
                  }
                >
                  {[
                    "numeric",
                    "categorical",
                    "mixed",
                    "graph",
                    "stream",
                    "matrix",
                    "timeseries",
                    "constrained",
                    "bernoulli",
                    "poisson",
                    "multinomial",
                  ].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                개수{" "}
                <input
                  aria-label="다중 생성 개수"
                  type="number"
                  min={2}
                  value={generator.count}
                  onChange={(e) =>
                    setGenerator({ ...generator, count: +e.target.value })
                  }
                />
              </label>
              <label>
                차원{" "}
                <input
                  aria-label="다중 생성 차원"
                  type="number"
                  min={1}
                  value={generator.dimensions}
                  onChange={(e) =>
                    setGenerator({ ...generator, dimensions: +e.target.value })
                  }
                />
              </label>
              <label>
                시드{" "}
                <input
                  aria-label="다중 생성 시드"
                  type="number"
                  value={generator.seed}
                  onChange={(e) =>
                    setGenerator({ ...generator, seed: +e.target.value })
                  }
                />
              </label>
              <button
                onClick={() => {
                  try {
                    apply(
                      makeExperimentPreset(
                        generator.kind,
                        generator.count,
                        generator.dimensions,
                        generator.seed,
                      ),
                    );
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  }
                }}
              >
                원본 생성
              </button>
            </details>
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
              disabled={!lab.traceIsCurrent}
              onClick={() => {
                if (lab.trace)
                  download("clusterlab-result.json", {
                    algorithm,
                    params,
                    input: data,
                    inputKind: data.kind,
                    computedRows: points.length,
                    sourceDimensions:
                      data.kind === "numeric" ||
                      data.kind === "categorical" ||
                      data.kind === "matrix"
                        ? data.values[0].length
                        : data.kind === "mixed"
                          ? data.numeric[0].length + data.categorical[0].length
                          : data.kind === "stream"
                            ? data.samples[0].values.length
                            : data.kind === "timeseries"
                              ? data.series[0].values.length
                              : data.kind === "constrained"
                                ? data.data.values[0].length
                                : undefined,
                    state: stateAt(lab.trace, lab.trace.steps.length),
                    output: nativeResult(
                      stateAt(lab.trace, lab.trace.steps.length),
                    ),
                  });
              }}
            >
              전체 계산 결과 내보내기
            </button>
          </div>
          <div hidden={!legacyLayout && tab !== "settings"}>
            <h2>파라미터</h2>
            <Settings
              algorithm={algorithm}
              value={params}
              onChange={setParams}
            />
            <p className="small">
              작업 공간 추정 {(estimate.workingBytes / 1048576).toFixed(1)} MiB
              · 원본 특성 저장 공간과 전송 복사는 별도입니다.
            </p>
            <p className="small">
              지원하는 원본 유형과 맞는 엔진만 선택할 수 있습니다. 입력을 표시
              좌표로 바꿔 계산하지 않습니다.
            </p>
          </div>
          {(legacyLayout || tab === "analysis") && (
            <>
              <Analysis
                algorithm={algorithm}
                state={state}
                next={next}
                points={points}
                progress={lab.position - index}
              />
            </>
          )}
        </aside>
      </div>
      <LabDetails
        algorithm={algorithm}
        onSelect={choose}
        onExperiment={(a, _preset, event, nextParams, input) => {
          choose(a);
          if (input) apply(input);
          if (nextParams) setParams(nextParams);
          soughtGuideEvent.current = false;
          setRequestedEvent(event);
          if (event) {
            setTab("analysis");
            setSheetOpen(true);
          }
        }}
        onCompare={(pair) => {
          if (onCompare) onCompare(pair, data);
          else location.hash = "#/compare";
        }}
      />
    </div>
  );
}
