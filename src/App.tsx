import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FlaskConical,
  GitCompareArrows,
  Home,
  Layers,
  Menu,
  MousePointer2,
  Move,
  Plus,
  RefreshCw,
  Undo2,
  Redo2,
  Search,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  algorithms,
  defaults,
  emptyState,
  type Algorithm,
  type Params,
  type Point,
} from "./engine/types";
import { stateAt } from "./engine/trace";
import { silhouette } from "./engine/math";
import { useExperiment } from "./animation/useExperiment";
import { palette } from "./animation/renderer";
import {
  dataset,
  dataDefaults,
  presets,
  presetAliases,
  exportData,
  importData,
  type DataOptions,
} from "./data/presets";
import { algorithmFamilies } from "./data/algorithmFamilies";
import type { EventKind } from "./engine/types";
const GuidePage = lazy(() => import("./components/guide/GuidePage"));
const Catalog = lazy(() => import("./components/Catalog"));
import { Canvas } from "./components/Canvas";
import { Playback } from "./components/Playback";
import { Settings } from "./components/Settings";
import { Analysis } from "./components/Analysis";
import { HomeDemos } from "./components/HomeDemos";
import { useEditorHistory } from "./editor/useEditorHistory";
import { historyShortcut, type EditorSnapshot } from "./editor/history";
const pages = [
  { id: "home", label: "홈", icon: Home },
  { id: "lab", label: "알고리즘 실험실", icon: FlaskConical },
  { id: "data", label: "데이터셋", icon: Database },
  { id: "compare", label: "알고리즘 비교", icon: GitCompareArrows },
  { id: "guide", label: "알고리즘 가이드", icon: BookOpen },
  { id: "catalog", label: "알고리즘 도감", icon: Search },
] as const;
type Page = (typeof pages)[number]["id"];
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
function CompareCard({
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
      ...defaults,
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
        algorithm === "ROCK" ||
        algorithm === "SOM" ||
        algorithm === "LVQ"
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
          onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
        >
          {algorithms.map((a) => (
            <option key={a}>{a}</option>
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
          {new Set(state.labels.filter((x) => x >= 0)).size}{" "}
          {algorithm === "SOM" ? "BMU" : "군집"}
        </span>
        <span>
          노이즈{" "}
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
export default function App() {
  const initialPage = () => {
    const value = location.hash.slice(1);
    return pages.some((p) => p.id === value) ? (value as Page) : "home";
  };
  const [page, setPage] = useState<Page>(initialPage),
    [collapsed, setCollapsed] = useState(false),
    [mobileNav, setMobileNav] = useState(false),
    [algorithm, setAlgorithm] = useState<Algorithm>("K-Means"),
    [params, setParams] = useState<Params>(defaults),
    [dataOptions, setDataOptions] = useState<DataOptions>(dataDefaults),
    [tool, setTool] = useState("move"),
    [selection, setSelection] = useState<number[]>([]),
    [label, setLabel] = useState(0),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState(""),
    [settingsOpen, setSettingsOpen] = useState(false),
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
  const editor = useEditorHistory(() => ({
    points: dataset("blobs", dataDefaults),
    preset: "blobs",
    options: dataDefaults,
  }));
  const { points, preset } = editor.value;
  const { undo, redo } = editor;
  const restoreEditor = (snapshot: EditorSnapshot) => {
    setDataOptions({ ...snapshot.options });
    setSelection([]);
  };
  useEffect(() => {
    if (page !== "data") return;
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
      const snapshot = command === "undo" ? undo() : redo();
      setDataOptions({ ...snapshot.options });
      setSelection([]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page, undo, redo]);
  const setPoints = (next: Point[]) => {
    editor.commit({ ...editor.value, points: next });
    setSelection([]);
  };
  const file = useRef<HTMLInputElement>(null),
    lab = useExperiment(algorithm, points, params, { active: page === "lab" }),
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
    const handler = () => setPage(initialPage());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  const go = (next: Page) => {
    location.hash = next;
    setPage(next);
    setMobileNav(false);
  };
  const choose = (id: string, options = dataOptions) => {
    if (!id) return;
    try {
      editor.commit({ points: dataset(id, options), preset: id, options });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
      return;
    }
    setDataOptions({ ...options });
    setSelection([]);
  };
  const changeAlgorithm = (a: Algorithm) => {
    setAlgorithm(a);
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
    clusters = new Set(state.labels.filter((x) => x >= 0)).size,
    noise = state.labels.filter((x) => x === -1).length;
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
    <div className={`app ${collapsed ? "nav-collapsed" : ""}`}>
      <a className="skip-link" href="#main">
        본문으로 이동
      </a>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <a className="brand" href="#home" onClick={() => go("home")}>
          <span className="brand-mark">
            <Layers size={22} />
          </span>
          {!collapsed && (
            <span>
              Cluster<span className="brand-light">Lab</span>
            </span>
          )}
        </a>
        <button
          className="collapse"
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <nav aria-label="주 메뉴">
          {pages.map((p) => (
            <button
              key={p.id}
              title={p.label}
              className={page === p.id ? "active" : ""}
              aria-current={page === p.id ? "page" : undefined}
              onClick={() => go(p.id)}
            >
              <p.icon size={19} />
              {!collapsed && <span>{p.label}</span>}
            </button>
          ))}
        </nav>
      </aside>
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
        <main id="main">
          {page === "catalog" && (
            <Suspense fallback={<p role="status">도감을 불러오는 중입니다.</p>}>
              <Catalog
                onRun={(a) => {
                  changeAlgorithm(a);
                  go("lab");
                }}
                onGuide={(a) => {
                  setGuideAlgorithm(a);
                  go("guide");
                }}
              />
            </Suspense>
          )}
          {page === "home" && (
            <div className="home-page">
              <div className="hero">
                <section className="hero-copy">
                  <h1>클러스터링 알고리즘</h1>
                  <p className="hero-subtitle">시뮬레이터</p>
                  <div className="hero-actions">
                    <button className="primary" onClick={() => go("lab")}>
                      실험 시작하기 <ArrowRight size={18} />
                    </button>
                    <button onClick={() => go("data")}>
                      데이터셋 둘러보기
                    </button>
                  </div>
                </section>
                <HomeDemos
                  onChoose={(selection) => {
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
              </div>
            </div>
          )}
          <div hidden={page !== "lab"} className="lab-page">
            <div className="lab-layout">
              <section className="stage">
                <div className="stage-heading">
                  <div className="stage-identity">
                    <div className="algorithm-select">
                      <span className="algorithm-icon">
                        <FlaskConical size={19} />
                      </span>
                      <select
                        aria-label="알고리즘 선택"
                        value={algorithm}
                        onChange={(e) =>
                          changeAlgorithm(e.target.value as Algorithm)
                        }
                      >
                        {algorithms.map((a) => (
                          <option key={a}>{a}</option>
                        ))}
                      </select>
                      <span className="family-tag">
                        {algorithmFamilies[algorithm]}
                      </span>
                    </div>
                    <span className="visualization-description">
                      {algorithm} 데이터 및 실제 연산 시각화
                    </span>
                  </div>
                  <div className="stage-summary">
                    <span className="point-count">{points.length} points</span>
                    <span className={`status ${lab.playing ? "running" : ""}`}>
                      <i />
                      {lab.busy
                        ? "계산 중"
                        : lab.playing
                          ? "재생 중"
                          : lab.position >=
                              (lab.trace?.steps.length ?? Infinity)
                            ? "완료"
                            : "준비됨"}
                    </span>
                    <button
                      className="settings-toggle"
                      aria-label="설정 열기"
                      onClick={() => setSettingsOpen(!settingsOpen)}
                    >
                      <Settings2 size={17} />
                    </button>
                  </div>
                </div>
                <div className="stage-subbar">
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
                </div>
                {lab.trace?.recording && (
                  <p className="small muted" role="status">
                    기록: {lab.trace.recording.policy} · 추정 저장량{" "}
                    {(lab.trace.recording.estimatedBytes / 1048576).toFixed(2)}{" "}
                    MiB
                  </p>
                )}
                {lab.error && (
                  <div className="error" role="alert">
                    {lab.error}
                  </div>
                )}
                <Canvas
                  algorithm={algorithm}
                  points={points}
                  trace={lab.trace}
                  position={lab.position}
                  clock={lab.clock}
                />
                <div className="canvas-legend">
                  {legendValues.map((value) => (
                    <span key={value}>
                      <i
                        style={{ background: palette[value % palette.length] }}
                      />
                      {algorithm === "LVQ"
                        ? "클래스"
                        : algorithm === "SOM"
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
                <details className="analysis-panel">
                  <summary>
                    <span>
                      <Activity size={16} /> 분석 및 내부 구조
                    </span>
                    <span>
                      연산 {lab.trace?.elapsed.toFixed(1) ?? "—"} ms{" "}
                      <ChevronDown size={15} />
                    </span>
                  </summary>
                  <div className="stat-row">
                    <div>
                      <small>
                        {algorithm === "SOM" ? "사용된 BMU" : "현재 군집"}
                      </small>
                      <b>{clusters}</b>
                    </div>
                    <div>
                      <small>노이즈</small>
                      <b>
                        {noise} <em>/{points.length}</em>
                      </b>
                    </div>
                    <div>
                      <small>기록된 이벤트</small>
                      <b>{lab.trace?.steps.length ?? 0}</b>
                    </div>
                  </div>
                  <Analysis
                    algorithm={algorithm}
                    state={state}
                    points={points}
                    next={nextState}
                    progress={lab.position - stepIndex}
                  />
                </details>
              </section>
              <aside
                className={`settings-panel ${settingsOpen ? "sheet-open" : ""}`}
              >
                <button
                  className="sheet-close"
                  aria-label="설정 닫기"
                  onClick={() => setSettingsOpen(false)}
                >
                  <X size={18} />
                </button>
                <Settings
                  algorithm={algorithm}
                  value={params}
                  onChange={setParams}
                />
              </aside>
            </div>
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
                Silhouette는 수치형 군집에만 표시하며 노이즈를 제외합니다. SOM은
                뉴런 할당, LVQ는 지도 분류이므로 공통 군집 지표를 적용하지
                않습니다.
              </p>
            </div>
          )}
          {page === "guide" && (
            <Suspense
              fallback={<p role="status">학습 자료를 불러오는 중입니다.</p>}
            >
              <GuidePage
                algorithm={guideAlgorithm}
                onSelect={setGuideAlgorithm}
                onExperiment={(a, presetId, event, experimentParams) => {
                  changeAlgorithm(a);
                  if (experimentParams) setParams(experimentParams);
                  if (presetId) choose(presetId);
                  setGuideEvent(event ?? null);
                  go("lab");
                }}
                onCompare={(pair, presetId) => {
                  setCompareAlgorithms([...pair, "GMM", "AGNES"]);
                  setCompareCount(2);
                  choose(presetId);
                  go("compare");
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
                editor.commit({
                  points: importData(await f.text()),
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
