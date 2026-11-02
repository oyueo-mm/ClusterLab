import { LabWorkspace } from "./lab/LabWorkspace";
import { ResizeHandle, usePanelWidth } from "./lab/ResizeHandle";
import type { CSSProperties } from "react";
import { LabTabs } from "./lab/LabTabs";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Database,
  Download,
  Menu,
  MousePointer2,
  Move,
  Plus,
  RefreshCw,
  Undo2,
  Redo2,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  algorithmDefaults,
  isPrototypeAlgorithm,
  clusterCount,
  emptyState,
  type Algorithm,
  type Params,
  type Point,
} from "./engine/types";
import { stateAt } from "./engine/trace";
import { useExperiment } from "./animation/useExperiment";
import { palette } from "./animation/renderer";
import { legacyDataset, type Dataset } from "./engine/dataset";
import {
  dataset,
  dataDefaults,
  presets,
  presetAliases,
  exportData,
  importData,
  type DataOptions,
} from "./data/presets";
import {
  registry,
  supportsLegacyPoints,
  supportsDataset,
  structuredAlgorithms,
} from "./engine/registry";
import type { EventKind } from "./engine/types";
const GuidePage = lazy(() => import("./components/guide/GuidePage"));
const Catalog = lazy(() => import("./components/Catalog"));
const StructuredLab = lazy(() => import("./components/StructuredLab"));
const CompareWorkbench = lazy(() => import("./compare/CompareWorkbench"));
import { Canvas } from "./components/Canvas";
import { Playback } from "./components/Playback";
import { Settings } from "./components/Settings";
import { Analysis } from "./components/Analysis";
import { Home } from "./pages/Home";
import { CompareCard } from "./compare/LegacyCompareCard";
import { useEditorHistory } from "./editor/useEditorHistory";
import { historyShortcut, type EditorSnapshot } from "./editor/history";
import { Sidebar } from "./components/Sidebar";
import { Recommendations } from "./components/Recommendations";
import { LabDetails } from "./components/LabDetails";
import { parseHash, useRoute, labHref, type Page } from "./router";
import {
  datasetRegistry,
  generateRecommended,
  generateForRecommendation,
  recommendations,
} from "./data/recommendations";
import { readPreference, writePreference } from "./lab/storage";
import { restoreParams } from "./lab/parameters";
function download(name: string, content: string) {
  const url = URL.createObjectURL(
      new Blob([content], {
        type: name.endsWith(".json")
          ? "application/json"
          : "text/csv;charset=utf-8",
      }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App() {
  const route = useRoute();
  const initialPage = () => parseHash(location.hash).page;
  const [page, setPage] = useState<Page>(initialPage),
    [collapsed, setCollapsed] = useState(() => {
      try {
        const saved = localStorage.getItem("clusterlab:sidebar");
        return saved === null
          ? ["lab", "structured"].includes(initialPage())
          : saved === "true";
      } catch {
        return false;
      }
    }),
    [mobileNav, setMobileNav] = useState(false),
    [algorithm, setAlgorithm] = useState<Algorithm>(
      route.algorithm ?? "K-Means",
    ),
    [params, setParams] = useState<Params>(() =>
      restoreParams(route.algorithm ?? "K-Means"),
    ),
    [dataOptions, setDataOptions] = useState<DataOptions>(dataDefaults),
    [tool, setTool] = useState("move"),
    [selection, setSelection] = useState<number[]>([]),
    [label, setLabel] = useState(0),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState(""),
    [guideAlgorithm, setGuideAlgorithm] = useState<Algorithm>("K-Means"),
    [guideEvent, setGuideEvent] = useState<EventKind | null>(null),
    [compareAlgorithms, setCompareAlgorithms] = useState<Algorithm[]>([
      "K-Means",
      "DBSCAN",
      "GMM",
      "AGNES",
    ]),
    [compareCount, setCompareCount] = useState(2),
    [compareStart, setCompareStart] = useState(0);
  const algorithmRef = useRef(algorithm);
  const pointsOwned = useRef(readPreference("points-owned", false));
  const ownPoints = () => {
    pointsOwned.current = true;
    writePreference("points-owned", true);
  };
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.title =
      page === "home"
        ? "ClusterLab · 인터랙티브 군집화 알고리즘 백과사전"
        : `${page === "lab" || page === "structured" ? algorithm : page === "guide" ? `${guideAlgorithm} 가이드` : page === "catalog" ? "알고리즘 도감" : page === "compare" ? "알고리즘 비교" : "데이터 편집"} · ClusterLab`;
  }, [page, algorithm, guideAlgorithm]);
  useEffect(() => {
    writePreference(`params:${algorithm}`, params);
  }, [algorithm, params]);
  const [labTab, setLabTab] = useState("settings");
  const [dataEditing, setDataEditing] = useState(false);
  const [navHidden, setNavHidden] = useState(() =>
    readPreference("nav-hidden", false),
  );
  const [focused, setFocused] = useState(false);
  const [navWidth, setNavWidth] = usePanelWidth("nav-width", 222, 180, 380);
  const isLab = page === "lab" || page === "structured";
  useEffect(() => {
    const toggle = () => {
      if (matchMedia("(max-width: 800px)").matches) setMobileNav((v) => !v);
      else if (focused) setFocused(false);
      else if (navHidden) {
        setNavHidden(false);
        setCollapsed(false);
      } else if (collapsed) setNavHidden(true);
      else setCollapsed(true);
    };
    const focus = (e: Event) => setFocused((e as CustomEvent<boolean>).detail);
    window.addEventListener("clusterlab:navigation", toggle);
    window.addEventListener("clusterlab:focus", focus);
    return () => {
      window.removeEventListener("clusterlab:navigation", toggle);
      window.removeEventListener("clusterlab:focus", focus);
    };
  }, [focused, navHidden, collapsed]);
  useEffect(() => {
    writePreference("nav-hidden", navHidden);
  }, [navHidden]);
  const [modernCompare, setModernCompare] = useState(
    () => location.hash !== "#compare",
  );
  const [compareRequest, setCompareRequest] = useState<{
    algorithms: Algorithm[];
    data: Dataset;
  }>();
  useEffect(() => {
    try {
      localStorage.setItem("clusterlab:sidebar", String(collapsed));
    } catch {
      /* Private browsing can disable storage. */
    }
  }, [collapsed]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const [structuredRequest, setStructuredRequest] = useState<{
    algorithm: Algorithm;
    data?: Dataset;
    params?: Params;
    event?: EventKind;
  }>();
  const editor = useEditorHistory(() => {
    const id = recommendations[algorithm][0].datasetId;
    const data = generateForRecommendation(algorithm);
    const points =
      data.kind === "numeric" && data.display
        ? data.display
        : dataset("blobs", dataDefaults);
    return {
      points,
      preset: id in presetAliases ? id : "blobs",
      options: {
        ...dataDefaults,
        seed: datasetRegistry[id].seed,
        count: points.length,
      },
    };
  }, pointsOwned);
  const { points, preset } = editor.value;
  useEffect(() => {
    if (!editor.ready) return;
    if (!editor.value.preset) ownPoints();
    else if (!pointsOwned.current) initializePoints(algorithmRef.current);
  }, [editor.ready]);
  useEffect(() => {
    if (editor.ready) setDataOptions({ ...editor.value.options });
  }, [editor.ready, editor.value.options]);
  const { undo, redo } = editor;
  const restoreEditor = (snapshot: EditorSnapshot) => {
    ownPoints();
    setDataOptions({ ...snapshot.options });
    setSelection([]);
  };
  useEffect(() => {
    if (page !== "data" && !(page === "lab" && dataEditing)) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        e.defaultPrevented ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.closest("input, textarea, select")))
      )
        return;
      const command = historyShortcut(e);
      if (!command) return;
      e.preventDefault();
      ownPoints();
      const snapshot = command === "undo" ? undo() : redo();
      setDataOptions({ ...snapshot.options });
      setSelection([]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page, dataEditing, undo, redo]);
  const setPoints = (next: Point[]) => {
    ownPoints();
    editor.commit({ ...editor.value, points: next, preset: "" });
    setSelection([]);
  };
  const file = useRef<HTMLInputElement>(null),
    lab = useExperiment(algorithm, points, params, {
      active: page === "lab" && editor.ready,
    }),
    stepIndex = Math.floor(lab.position),
    state = useMemo(
      () =>
        lab.trace ? stateAt(lab.trace, stepIndex) : emptyState(points.length),
      [lab.trace, stepIndex, points.length],
    ),
    nextState = useMemo(
      () => (lab.trace ? stateAt(lab.trace, stepIndex + 1) : state),
      [lab.trace, stepIndex, state],
    );
  useEffect(() => {
    setPage(route.page);
    setMobileNav(false);
    if (route.page === "compare")
      setModernCompare(location.hash !== "#compare");
    if (route.algorithm && algorithmRef.current !== route.algorithm) {
      if (
        (page === "lab" || page === "data") &&
        (pointsOwned.current || !editor.value.preset) &&
        supportsDataset(route.algorithm, "numeric")
      ) {
        setStructuredRequest({
          algorithm: route.algorithm,
          data: legacyDataset(points),
        });
      }
      algorithmRef.current = route.algorithm;
      initializePoints(route.algorithm);
      setAlgorithm(route.algorithm);
      setParams(restoreParams(route.algorithm));
    }
  }, [route]);
  const go = (next: Page) => {
    location.hash =
      next === "lab" || next === "structured"
        ? labHref(algorithmRef.current) +
          (next === "lab" &&
          structuredAlgorithms.some((a) => a === algorithmRef.current)
            ? "?input=points"
            : "")
        : `#/${next === "home" ? "" : next}`;
    setPage(next);
    setMobileNav(false);
  };
  const choose = (id: string, options = dataOptions) => {
    if (!id) return;
    try {
      const recommended = presetAliases[id]
        ? undefined
        : generateRecommended(id, { seed: options.seed, count: options.count });
      const nextPoints =
        recommended?.kind === "numeric" && recommended.display
          ? recommended.display
          : dataset(id, options);
      editor.commit({ points: nextPoints, preset: id, options });
      ownPoints();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
      return;
    }
    setDataOptions({ ...options });
    setSelection([]);
  };
  function initializePoints(a: Algorithm) {
    if (pointsOwned.current) return false;
    const id = recommendations[a][0].datasetId,
      data = generateForRecommendation(a);
    if (data.kind !== "numeric" || !data.display) return false;
    const options = {
      ...dataDefaults,
      seed: datasetRegistry[id].seed,
      count: data.display.length,
    };
    editor.commit({ points: data.display, preset: id, options });
    setDataOptions(options);
    setSelection([]);
    return true;
  }
  const changeAlgorithm = (a: Algorithm, source?: Dataset) => {
    if (source && !structuredAlgorithms.some((id) => id === a)) {
      if (
        source.kind === "numeric" &&
        source.values.every((row) => row.length === 2)
      ) {
        ownPoints();
        editor.commit({
          points: source.values.map((row, i) => ({
            x: row[0],
            y: row[1],
            ...(source.labels?.[i] === undefined
              ? {}
              : { label: source.labels[i] }),
          })),
          preset: "",
          options: dataOptions,
        });
      } else {
        setNotice(
          `${source.kind} 원본은 이 2D 실험실로 변환할 수 없어 원본 편집 기록에 보존했습니다. 데이터셋 편집에서 호환되는 추천을 선택하세요.`,
        );
      }
    }
    if (
      page === "lab" &&
      pointsOwned.current &&
      !supportsDataset(a, "numeric") &&
      structuredAlgorithms.some((id) => id === a)
    ) {
      setNotice(
        `${a}는 현재 수치 데이터를 지원하지 않습니다. 편집 데이터는 보존했습니다. 데이터셋 편집에서 호환되는 추천을 선택하세요.`,
      );
    }
    const initialRecommendation = initializePoints(a);
    algorithmRef.current = a;
    setAlgorithm(a);
    const retainPoints = page === "lab" && supportsLegacyPoints(a);
    location.hash = labHref(a) + (retainPoints ? "?input=points" : "");
    if (!retainPoints && structuredAlgorithms.some((id) => id === a)) {
      setParams(restoreParams(a));
      setStructuredRequest(
        page !== "structured" &&
          pointsOwned.current &&
          supportsDataset(a, "numeric")
          ? { algorithm: a, data: legacyDataset(points) }
          : undefined,
      );
      go("structured");
      return;
    }
    if (initialRecommendation || registry[a].resetParametersOnSelect) {
      setParams(restoreParams(a));
      return;
    }
    setParams((o) => ({
      ...o,
      threshold: a === "ROCK" ? 0.5 : a === "OPTICS" ? 0.09 : 0.055,
      initialization: a === "PAM" ? "build" : "kmeans++",
    }));
  };
  const activeStep =
      lab.trace?.steps[
        Math.min(
          Math.max(0, Math.ceil(lab.position) - 1),
          lab.trace.steps.length - 1,
        )
      ],
    clusters = clusterCount(state);
  const legendValues = (
    algorithm === "LVQ"
      ? [
          ...new Set(
            points.flatMap((p) => (p.label === undefined ? [] : [p.label])),
          ),
        ]
      : clusters
        ? [...new Set(state.labels.filter((l) => l >= 0))]
        : [0, 1, 2]
  )
    .sort((a, b) => a - b)
    .slice(0, 8);
  useEffect(() => {
    if (
      !guideEvent ||
      !lab.trace ||
      !lab.traceIsCurrent ||
      lab.busy ||
      page !== "lab"
    )
      return;
    const index = lab.trace.steps.findIndex((step) => step.kind === guideEvent);
    if (index >= 0) {
      lab.setPlaying(false);
      lab.seek(index + 1);
      setNotice(
        `${algorithm} · ${guideEvent} 실제 이벤트 ${index + 1}로 이동했습니다.`,
      );
    } else
      setNotice(
        `이 데이터에는 ${guideEvent} 이벤트가 없습니다. 가이드의 권장 프리셋을 사용하세요.`,
      );
    setGuideEvent(null);
  }, [
    guideEvent,
    lab.trace,
    lab.traceIsCurrent,
    lab.busy,
    page,
    algorithm,
    lab.seek,
    lab.setPlaying,
  ]);
  return (
    <div
      className={`app ${collapsed ? "nav-collapsed" : ""} ${isLab ? "workspace-app" : ""} ${isLab && (navHidden || focused) ? "nav-hidden" : ""}`}
      style={{ "--nav-width": `${navWidth}px` } as CSSProperties}
    >
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        본문으로 이동
      </a>
      <Sidebar
        page={page}
        category={route.filters.category}
        collapsed={collapsed}
        mobileNav={mobileNav}
        onToggle={() => {
          setNavHidden(false);
          setCollapsed(!collapsed);
        }}
        onClose={() => setMobileNav(false)}
        go={(next) => {
          if (next === "data" && isLab) {
            window.dispatchEvent(new Event("clusterlab:data"));
            setMobileNav(false);
          } else go(next);
        }}
      />
      {isLab && !collapsed && !navHidden && !focused && (
        <div className="nav-resizer">
          <ResizeHandle
            label="탐색 사이드바 너비"
            width={navWidth}
            onChange={setNavWidth}
            initial={222}
            min={180}
            max={380}
          />
        </div>
      )}
      <div className="workspace">
        <header className="mobile-header">
          <button
            className="mobile-menu"
            aria-label="메뉴 열기"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={20} />
          </button>
        </header>
        <main id="main" tabIndex={-1} inert={mobileNav}>
          {editor.storageError && <p role="status">{editor.storageError}</p>}
          {route.unknown && (
            <p role="alert">
              알고리즘 ‘{route.unknown}’을 찾을 수 없습니다. 도감에서 선택해
              주세요.
            </p>
          )}
          {page === "structured" && (
            <Suspense
              fallback={
                <p role="status">다중 데이터 실험을 불러오는 중입니다.</p>
              }
            >
              <StructuredLab
                onAlgorithmChange={changeAlgorithm}
                onCompare={(pair, data) => {
                  setCompareRequest({ algorithms: pair, data });
                  go("compare");
                }}
                initialAlgorithm={algorithm}
                initialData={
                  structuredRequest?.algorithm === algorithm
                    ? structuredRequest.data
                    : undefined
                }
                initialParams={
                  structuredRequest?.algorithm === algorithm
                    ? structuredRequest.params
                    : undefined
                }
                initialEvent={
                  structuredRequest?.algorithm === algorithm
                    ? structuredRequest.event
                    : undefined
                }
              />
            </Suspense>
          )}
          {page === "catalog" && (
            <Suspense fallback={<p role="status">도감을 불러오는 중입니다.</p>}>
              <Catalog
                filters={route.filters}
                onFilter={(filters, replace) => {
                  const query = new URLSearchParams(
                    Object.entries(filters).filter(([, value]) => value),
                  );
                  const href = `#/catalog${query.size ? `?${query}` : ""}`;
                  if (replace) {
                    history.replaceState(null, "", href);
                    window.dispatchEvent(new HashChangeEvent("hashchange"));
                  } else {
                    history.pushState(null, "", href);
                    window.dispatchEvent(new HashChangeEvent("hashchange"));
                  }
                }}
                onRun={changeAlgorithm}
                onGuide={(a) => {
                  setGuideAlgorithm(a);
                  go("guide");
                }}
              />
            </Suspense>
          )}
          {page === "home" && (
            <Home
              navigate={go}
              onChoose={(selection) => {
                ownPoints();
                changeAlgorithm(selection.algorithm);
                editor.commit({
                  points: selection.points,
                  preset: selection.preset,
                  options: selection.dataOptions,
                });
                setSelection([]);
                setParams(selection.params);
                setDataOptions(selection.dataOptions);
                go("lab");
              }}
            />
          )}
          <div hidden={page !== "lab"} className="lab-page">
            <LabWorkspace
              active={page === "lab"}
              algorithm={algorithm}
              onAlgorithmChange={changeAlgorithm}
              onDataOpen={setDataEditing}
              data={
                <>
                  {" "}
                  <div>
                    <div className="lab-panel-links">
                      <button
                        aria-label="실험실 실행 취소"
                        disabled={!editor.canUndo}
                        onClick={() => restoreEditor(undo())}
                      >
                        <Undo2 size={16} />
                        실행 취소
                      </button>
                      <button
                        aria-label="실험실 다시 실행"
                        disabled={!editor.canRedo}
                        onClick={() => restoreEditor(redo())}
                      >
                        <Redo2 size={16} />
                        다시 실행
                      </button>
                    </div>
                    <p>
                      {points.length}개 ·{" "}
                      {preset
                        ? (datasetRegistry[preset]?.name ?? preset)
                        : "사용자 데이터"}
                    </p>
                    <label>
                      <Database size={14} />
                      <select
                        aria-label="실험 프리셋"
                        value={preset}
                        onChange={(e) => choose(e.target.value)}
                      >
                        {!preset && (
                          <option value="" disabled>
                            사용자 데이터
                          </option>
                        )}
                        {preset && !presetAliases[preset] && (
                          <option value={preset}>
                            {datasetRegistry[preset]?.name ?? preset}
                          </option>
                        )}
                        {presets.map((p) => (
                          <option key={p[0]} value={p[0]}>
                            {p[1]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      title="시드로 데이터 재생성"
                      aria-label="데이터 재생성"
                      disabled={!preset}
                      onClick={() => choose(preset)}
                    >
                      <RefreshCw size={14} />
                    </button>

                    <div className="lab-panel-links">
                      <button onClick={() => go("data")}>
                        고급 데이터 편집
                      </button>
                      <button onClick={() => file.current?.click()}>
                        CSV/JSON 가져오기
                      </button>
                      <button
                        onClick={() =>
                          download(
                            "clusterlab-data.json",
                            exportData(points, "json"),
                          )
                        }
                      >
                        JSON 내보내기
                      </button>
                    </div>
                    <p className="small">
                      캔버스에서 편집합니다. 드래그·연속 추가·영역
                      선택·확대·우클릭 이동을 지원합니다.
                    </p>
                    <div className="lab-panel-links">
                      {[
                        ["move", "점 이동"],
                        ["add", "점 추가"],
                        ["delete", "점 삭제"],
                        ["select", "영역 선택"],
                        ["pan", "화면 이동"],
                      ].map(([id, name]) => (
                        <button
                          key={id}
                          aria-pressed={tool === id}
                          onClick={() => setTool(id)}
                        >
                          {name}
                        </button>
                      ))}
                      <button
                        disabled={!selection.length}
                        onClick={() =>
                          setPoints(
                            points.filter((_, i) => !selection.includes(i)),
                          )
                        }
                      >
                        선택 삭제
                      </button>
                    </div>
                    <Recommendations
                      key={algorithm}
                      algorithm={algorithm}
                      onApply={(id, data, suggested) => {
                        if (data.kind !== "numeric" || !data.display) return;
                        ownPoints();
                        const options = {
                          ...dataDefaults,
                          seed: datasetRegistry[id].seed,
                          count: data.display.length,
                        };
                        editor.commit({
                          points: data.display,
                          preset: id,
                          options,
                        });
                        setDataOptions(options);
                        if (suggested) setParams(suggested);
                        setNotice(
                          `${id} 데이터셋을 적용했습니다. 데이터 편집에서 실행 취소할 수 있습니다.`,
                        );
                      }}
                    />
                    {(
                      [
                        {
                          key: "count",
                          label: "데이터 수",
                          min: 10,
                          max: undefined,
                          step: 10,
                        },
                        {
                          key: "noise",
                          label: "노이즈",
                          min: 0,
                          max: 0.1,
                          step: 0.005,
                        },
                        {
                          key: "spread",
                          label: "분산 (표준편차)",
                          min: 0.01,
                          max: 0.2,
                          step: 0.005,
                        },
                        {
                          key: "separation",
                          label: "군집 간 거리",
                          min: 0.05,
                          max: 0.4,
                          step: 0.01,
                        },
                        {
                          key: "seed",
                          label: "난수 시드",
                          min: 0,
                          max: 999999,
                          step: 1,
                        },
                      ] as const
                    ).map((f) => (
                      <label className="field" key={f.key}>
                        <span>{f.label}</span>
                        <input
                          type="number"
                          min={f.min}
                          max={f.max}
                          step={f.step}
                          value={dataOptions[f.key]}
                          onChange={(e) => {
                            const n = +e.target.value;
                            if (
                              Number.isFinite(n) &&
                              n >= f.min &&
                              n <= (f.max ?? Infinity)
                            )
                              setDataOptions({ ...dataOptions, [f.key]: n });
                          }}
                        />
                      </label>
                    ))}
                    <button
                      className="primary full"
                      disabled={!preset}
                      onClick={() => choose(preset)}
                    >
                      <RefreshCw size={15} />
                      현재 프리셋 다시 생성
                    </button>
                    <div className="file-actions">
                      <button onClick={() => file.current?.click()}>
                        <Upload size={14} />
                        가져오기
                      </button>
                      <button
                        onClick={() =>
                          download(
                            "clusterlab-data.csv",
                            exportData(points, "csv"),
                          )
                        }
                      >
                        <Download size={14} />
                        CSV
                      </button>
                      <button
                        onClick={() =>
                          download(
                            "clusterlab-data.json",
                            exportData(points, "json"),
                          )
                        }
                      >
                        JSON
                      </button>
                    </div>
                    <p className="muted small">
                      CSV: x,y,label,features
                      <br />
                      범주형 속성은 세미콜론으로 구분합니다.
                      <br />
                      라벨과 속성은 자동 생성하지 않습니다.
                    </p>
                    <label>
                      새 점 클래스
                      <input
                        aria-label="새 점 클래스"
                        type="number"
                        min="0"
                        max="9"
                        value={label}
                        onChange={(e) =>
                          setLabel(Math.max(0, Math.min(9, +e.target.value)))
                        }
                      />
                    </label>
                    <button onClick={() => setPoints([])}>전체 지우기</button>
                  </div>
                </>
              }
              settings={
                <>
                  <LabTabs
                    value={labTab}
                    onChange={setLabTab}
                    tabs={[
                      ["settings", "설정"],
                      ["analysis", "분석"],
                    ]}
                  />
                  <button
                    onClick={() => setParams(algorithmDefaults(algorithm))}
                  >
                    알고리즘 초기화
                  </button>{" "}
                  <div hidden={labTab !== "settings"}>
                    <Settings
                      algorithm={algorithm}
                      value={params}
                      onChange={setParams}
                    />
                  </div>
                  {labTab === "analysis" && (
                    <Analysis
                      algorithm={algorithm}
                      state={state}
                      points={points}
                      next={nextState}
                      progress={lab.position - stepIndex}
                    />
                  )}
                </>
              }
              details={
                <>
                  {" "}
                  <LabDetails
                    algorithm={algorithm}
                    onSelect={changeAlgorithm}
                    onExperiment={(
                      a,
                      presetId,
                      event,
                      experimentParams,
                      input,
                    ) => {
                      changeAlgorithm(a);
                      if (input) {
                        setStructuredRequest({
                          algorithm: a,
                          data: input,
                          params: experimentParams,
                          event,
                        });
                        go("structured");
                        return;
                      }
                      if (experimentParams) setParams(experimentParams);
                      if (presetId) choose(presetId);
                      setGuideEvent(event ?? null);
                    }}
                    onCompare={(pair, presetId) => {
                      setCompareAlgorithms([...pair, "GMM", "AGNES"]);
                      setCompareCount(2);
                      choose(presetId);
                      location.hash = "#compare";
                      setPage("compare");
                    }}
                  />
                </>
              }
            >
              <section className="stage">
                {" "}
                {lab.error && (
                  <div className="error" role="alert">
                    {lab.error}
                  </div>
                )}
                <Canvas
                  active={page === "lab"}
                  algorithm={algorithm}
                  points={points}
                  trace={lab.traceIsCurrent ? lab.trace : null}
                  position={lab.position}
                  clock={lab.clock}
                  edit={dataEditing}
                  tool={tool}
                  selected={selection}
                  onSelect={setSelection}
                  onChange={setPoints}
                  label={label}
                />
                <div className="canvas-legend">
                  <span className="point-count">{points.length} points</span>
                  <span className="status">
                    {lab.busy
                      ? "계산 중"
                      : lab.playing
                        ? "재생 중"
                        : lab.position >= (lab.trace?.steps.length ?? Infinity)
                          ? "완료"
                          : "준비됨"}
                  </span>
                  {legendValues.map((value) => (
                    <span key={value}>
                      <i
                        style={{ background: palette[value % palette.length] }}
                      />
                      {algorithm === "LVQ"
                        ? "클래스"
                        : isPrototypeAlgorithm(algorithm)
                          ? "뉴런"
                          : "군집"}{" "}
                      {algorithm === "LVQ" ? value : value + 1}
                    </span>
                  ))}
                  <span className="legend-hint">
                    휠·핀치로 확대 / 드래그로 이동
                  </span>
                </div>
                <div className="playback-dock">
                  <Playback lab={lab} />
                </div>
                <div className="step-explanation">
                  <span className="step-label">
                    STEP {Math.floor(lab.position).toString().padStart(3, "0")}
                  </span>
                  <div>
                    <b>
                      {lab.busy
                        ? lab.progress
                        : activeStep?.kind === "finish"
                          ? "실험 완료"
                          : `${algorithm} · ${activeStep?.kind ?? "초기 상태"}`}
                    </b>
                    <p aria-live="polite">
                      {lab.error ||
                        activeStep?.description ||
                        "재생을 눌러 알고리즘의 내부 연산을 관찰하세요."}
                    </p>
                  </div>
                  <span className="event-tag">
                    {activeStep?.kind ?? "ready"}
                  </span>
                </div>
              </section>
            </LabWorkspace>
          </div>
          {page === "data" && (
            <div className="data-page">
              <div className="data-editor-layout">
                <section className="editor-stage panel">
                  <div className="editor-toolbar">
                    <button
                      className="primary editor-experiment"
                      onClick={() => go("lab")}
                    >
                      이 데이터로 실험 <ArrowRight size={16} />
                    </button>
                    <div
                      className="editor-history"
                      role="group"
                      aria-label="편집 기록"
                    >
                      <button
                        aria-label="실행 취소"
                        title="실행 취소 (Ctrl/Cmd+Z)"
                        disabled={!editor.canUndo}
                        onClick={() => restoreEditor(undo())}
                      >
                        <Undo2 size={17} />
                      </button>
                      <button
                        aria-label="다시 실행"
                        title="다시 실행 (Ctrl+Y / Ctrl/Cmd+Shift+Z)"
                        disabled={!editor.canRedo}
                        onClick={() => restoreEditor(redo())}
                      >
                        <Redo2 size={17} />
                      </button>
                    </div>
                    {[
                      { id: "move", label: "점 이동", icon: Move },
                      { id: "add", label: "점 추가", icon: Plus },
                      { id: "delete", label: "점 삭제", icon: Trash2 },
                      { id: "select", label: "영역 선택", icon: MousePointer2 },
                      { id: "pan", label: "화면 이동", icon: Menu },
                    ].map((t) => (
                      <button
                        key={t.id}
                        title={t.label}
                        aria-label={t.label}
                        aria-pressed={tool === t.id}
                        className={tool === t.id ? "active" : ""}
                        onClick={() => setTool(t.id)}
                      >
                        <t.icon size={17} />
                        <span>{t.label}</span>
                      </button>
                    ))}
                    <span className="spacer" />
                    <button
                      title="선택된 점 삭제"
                      aria-label="선택된 점 삭제"
                      disabled={!selection.length}
                      onClick={() => {
                        setPoints(
                          points.filter((_, i) => !selection.includes(i)),
                        );
                        setSelection([]);
                      }}
                    >
                      <Trash2 size={17} />
                      {selection.length > 0 && selection.length}
                    </button>
                  </div>
                  <Canvas
                    algorithm={algorithm}
                    points={points}
                    trace={null}
                    position={0}
                    edit
                    tool={tool}
                    selected={selection}
                    onSelect={setSelection}
                    onChange={(p) => {
                      setPoints(p);
                    }}
                    label={label}
                  />
                  <div className="editor-bottom">
                    <span>
                      {points.length}개 데이터 · {selection.length}개 선택됨
                    </span>
                    <button onClick={() => setPoints([])}>전체 지우기</button>
                    <label>
                      새 점 클래스{" "}
                      <input
                        aria-label="새 점 클래스"
                        type="number"
                        min="0"
                        max="9"
                        value={label}
                        onChange={(e) =>
                          setLabel(Math.max(0, Math.min(9, +e.target.value)))
                        }
                      />
                    </label>
                  </div>
                </section>
                <aside className="generator panel">
                  <div className="section-kicker">GENERATOR</div>
                  <h3>데이터 생성</h3>
                  {(
                    [
                      {
                        key: "count",
                        label: "데이터 수",
                        min: 10,
                        max: undefined,
                        step: 10,
                      },
                      {
                        key: "noise",
                        label: "노이즈",
                        min: 0,
                        max: 0.1,
                        step: 0.005,
                      },
                      {
                        key: "spread",
                        label: "분산 (표준편차)",
                        min: 0.01,
                        max: 0.2,
                        step: 0.005,
                      },
                      {
                        key: "separation",
                        label: "군집 간 거리",
                        min: 0.05,
                        max: 0.4,
                        step: 0.01,
                      },
                      {
                        key: "seed",
                        label: "난수 시드",
                        min: 0,
                        max: 999999,
                        step: 1,
                      },
                    ] as const
                  ).map((f) => (
                    <label className="field" key={f.key}>
                      <span>{f.label}</span>
                      <input
                        type="number"
                        min={f.min}
                        max={f.max}
                        step={f.step}
                        value={dataOptions[f.key]}
                        onChange={(e) => {
                          const n = +e.target.value;
                          if (
                            Number.isFinite(n) &&
                            n >= f.min &&
                            n <= (f.max ?? Infinity)
                          )
                            setDataOptions({ ...dataOptions, [f.key]: n });
                        }}
                      />
                    </label>
                  ))}
                  <button
                    className="primary full"
                    disabled={!preset}
                    onClick={() => choose(preset)}
                  >
                    <RefreshCw size={15} />
                    현재 프리셋 다시 생성
                  </button>
                  <div className="file-actions">
                    <button onClick={() => file.current?.click()}>
                      <Upload size={14} />
                      가져오기
                    </button>
                    <button
                      onClick={() =>
                        download(
                          "clusterlab-data.csv",
                          exportData(points, "csv"),
                        )
                      }
                    >
                      <Download size={14} />
                      CSV
                    </button>
                    <button
                      onClick={() =>
                        download(
                          "clusterlab-data.json",
                          exportData(points, "json"),
                        )
                      }
                    >
                      JSON
                    </button>
                  </div>
                  <p className="muted small">
                    CSV: x,y,label,features
                    <br />
                    범주형 속성은 세미콜론으로 구분합니다.
                    <br />
                    라벨과 속성은 자동 생성하지 않습니다.
                  </p>
                </aside>
              </div>
              <div className="section-heading">
                <div>
                  <h2>
                    프리셋 갤러리{" "}
                    <span className="count-badge">{presets.length}</span>
                  </h2>
                  <p>모양과 데이터 유형에 맞는 알고리즘을 찾아보세요.</p>
                </div>
                <label className="search">
                  <Search size={16} />
                  <input
                    aria-label="프리셋 검색"
                    placeholder="데이터셋 검색"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className="preset-grid">
                {presets
                  .filter((p) =>
                    `${p[1]} ${p[2]} ${presetAliases[p[0]]}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((p) => (
                    <button
                      className={`preset-card ${preset === p[0] ? "selected" : ""}`}
                      key={p[0]}
                      onClick={() => choose(p[0])}
                    >
                      <MiniPlot id={p[0]} />
                      <div>
                        <h3>
                          {p[1]}
                          {preset === p[0] && <Check size={15} />}
                        </h3>
                        <p>{p[2]}</p>
                        <span>
                          {p[0].startsWith("categorical")
                            ? "범주형 · ROCK 호환"
                            : p[0].startsWith("labeled")
                              ? "라벨 있음 · LVQ 호환"
                              : "수치형 · LVQ/ROCK 입력 미충족"}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
          {page === "compare" && (
            <div className="compare-page">
              <h1>알고리즘 비교</h1>
              <div className="lab-panel-links">
                <button
                  aria-pressed={modernCompare}
                  onClick={() => setModernCompare(true)}
                >
                  추천 조합 · 원본 데이터 비교
                </button>
                <button
                  aria-pressed={!modernCompare}
                  onClick={() => setModernCompare(false)}
                >
                  2D 공통 데이터 비교
                </button>
              </div>
              {modernCompare ? (
                <Suspense
                  fallback={
                    <p role="status">비교 실험실을 불러오는 중입니다.</p>
                  }
                >
                  <CompareWorkbench
                    initialAlgorithms={compareRequest?.algorithms}
                    initialData={compareRequest?.data}
                  />
                </Suspense>
              ) : (
                <>
                  <div className="compare-controls panel">
                    <button
                      className="primary"
                      onClick={() => setCompareStart((s) => s + 1)}
                    >
                      모두 처음부터 재생 <ArrowRight size={16} />
                    </button>

                    <label>
                      비교 개수{" "}
                      <select
                        value={compareCount}
                        onChange={(e) => setCompareCount(+e.target.value)}
                      >
                        {[2, 3, 4].map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      공통 데이터셋{" "}
                      <select
                        value={preset}
                        onChange={(e) => choose(e.target.value)}
                      >
                        {!preset && (
                          <option value="" disabled>
                            사용자 데이터
                          </option>
                        )}
                        {preset && !presetAliases[preset] && (
                          <option value={preset}>
                            {datasetRegistry[preset]?.name ?? preset}
                          </option>
                        )}
                        {presets.map((p) => (
                          <option key={p[0]} value={p[0]}>
                            {p[1]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span>{points.length} points · 실험실과 데이터 공유</span>
                  </div>
                  <div className="compare-grid">
                    {Array.from({ length: compareCount }, (_, i) => (
                      <CompareCard
                        key={`${i}-${compareAlgorithms[i]}`}
                        points={points}
                        initial={compareAlgorithms[i]}
                        start={compareStart}
                      />
                    ))}
                  </div>
                  <p className="muted small">
                    Euclidean Silhouette는 수치형 군집에 표시하며 노이즈를
                    제외합니다. SOM·Neural Gas·Growing Neural Gas는 뉴런 BMU,
                    LVQ는 지도 분류이므로 공통 군집 지표를 적용하지 않습니다.
                  </p>
                </>
              )}
            </div>
          )}
          {page === "guide" && (
            <Suspense
              fallback={<p role="status">학습 자료를 불러오는 중입니다.</p>}
            >
              <GuidePage
                algorithm={guideAlgorithm}
                onSelect={setGuideAlgorithm}
                onExperiment={(a, presetId, event, experimentParams, input) => {
                  changeAlgorithm(a);
                  if (input) {
                    setStructuredRequest({
                      algorithm: a,
                      data: input,
                      params: experimentParams,
                      event,
                    });
                    go("structured");
                    return;
                  }
                  if (experimentParams) setParams(experimentParams);
                  if (presetId) choose(presetId);
                  setGuideEvent(event ?? null);
                  go("lab");
                }}
                onCompare={(pair, presetId) => {
                  setCompareAlgorithms([...pair, "GMM", "AGNES"]);
                  setCompareCount(2);
                  choose(presetId);
                  location.hash = "#compare";
                  setPage("compare");
                }}
              />
            </Suspense>
          )}
          <input
            ref={file}
            type="file"
            hidden
            accept=".json,.csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const imported = importData(await f.text());
                ownPoints();
                editor.commit({
                  points: imported,
                  preset: "",
                  options: editor.value.options,
                });
                setDataOptions({ ...editor.value.options });
                setSelection([]);
                setNotice("데이터를 가져왔습니다.");
              } catch (error) {
                setNotice(
                  error instanceof Error ? error.message : String(error),
                );
              }
              e.target.value = "";
            }}
          />
          {notice && (
            <div className="toast" role="status">
              {notice}
              <button aria-label="알림 닫기" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
function MiniPlot({ id }: { id: string }) {
  const points = useMemo(
    () => dataset(id, { ...dataDefaults, count: 60 }),
    [id],
  );
  return (
    <svg className="mini-plot" viewBox="0 0 240 125" aria-hidden="true">
      <defs>
        <pattern
          id={`grid-${id}`}
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path d="M24 0H0V24" fill="none" stroke="#e9eeea" strokeWidth=".7" />
        </pattern>
      </defs>
      <rect width="240" height="125" fill={`url(#grid-${id})`} />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={20 + p.x * 200}
          cy={5 + (1 - p.y) * 115}
          r="2.6"
          fill={palette[(p.label ?? i % 3) % 8]}
          opacity=".85"
        />
      ))}
    </svg>
  );
}
