import { chooseAlgorithm } from "./workspace-helpers";
import { openData, openAnalysis } from "./workspace-helpers";
import { test, expect, type Page, type Locator } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Algorithm, Trace } from "../src/engine/types";
import { stateAt } from "../src/engine/trace";

declare global {
  interface Window {
    nextTraces: Trace[];
    nextMessages: {
      id: number;
      algorithm?: string;
      error?: string;
      completed?: boolean;
    }[];
    nextJobs: number;
  }
}

// Capture messages from the real Vite-built Worker; no engine or Worker stubs.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.nextTraces = [];
    window.nextMessages = [];
    window.nextJobs = 0;
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event) => {
          const { id, trace, error } = event.data;
          if (trace) window.nextTraces.push(trace);
          if (trace || error)
            window.nextMessages.push({
              id,
              algorithm: trace?.algorithm,
              error,
              completed: !!trace,
            });
        });
      }
      postMessage(message: unknown, transfer: Transferable[]): void;
      postMessage(message: unknown, options?: StructuredSerializeOptions): void;
      postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = {},
      ) {
        window.nextJobs++;
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
  });
});

async function afterRun(
  page: Page,
  before: number,
  algorithm: Algorithm,
  rows?: number,
) {
  await expect
    .poll(
      () =>
        page.evaluate(
          ({ before, algorithm, rows }) =>
            window.nextTraces
              .slice(before)
              .some(
                (t) =>
                  t.algorithm === algorithm &&
                  (rows === undefined || t.initial.labels.length === rows),
              ),
          { before, algorithm, rows },
        ),
      { timeout: 30000 },
    )
    .toBe(true);
  return page.evaluate(
    ({ before, algorithm, rows }) =>
      window.nextTraces
        .slice(before)
        .filter(
          (t) =>
            t.algorithm === algorithm &&
            (rows === undefined || t.initial.labels.length === rows),
        )
        .at(-1)!,
    { before, algorithm, rows },
  );
}

async function tracesSoFar(page: Page) {
  return page.evaluate(() => window.nextTraces.length);
}

async function choose(
  page: Page,
  scope: Locator,
  algorithm: Algorithm,
  _structured: boolean,
  rows: number,
) {
  const before = await tracesSoFar(page);
  const selector = scope.getByLabel("알고리즘 선택", { exact: true });
  if ((await selector.textContent()) === algorithm) {
    await expect(scope.getByLabel("재생", { exact: true })).toBeEnabled();
    return page.evaluate(
      (algorithm) =>
        window.nextTraces.filter((t) => t.algorithm === algorithm).at(-1)!,
      algorithm,
    );
  }
  await chooseAlgorithm(scope, algorithm);
  return afterRun(page, before, algorithm, rows);
}

async function inspectTrace(
  scope: Locator,
  trace: Trace,
  event: string,
  heading: string,
  rows: number,
) {
  expect(trace.initial.labels).toHaveLength(rows);
  expect(trace.steps.some((step) => step.kind === event)).toBe(true);
  expect(trace.steps.at(-1)?.kind).toBe("finish");
  const end = stateAt(trace, trace.steps.length);
  expect(end.labels).toHaveLength(rows);
  expect(
    end.labels.every((label) => Number.isInteger(label) && label >= -1),
  ).toBe(true);
  expect(end.analysis).toBeDefined();
  await expect(scope.getByLabel("재생", { exact: true })).toBeEnabled();
  await scope.getByLabel("마지막으로", { exact: true }).click();
  await openAnalysis(scope);
  const panel = scope.locator("details.analysis-panel");
  if ((await panel.count()) && (await panel.getAttribute("open")) === null)
    await panel.locator(":scope > summary").click();
  await expect(
    scope.getByRole("heading", { name: heading, exact: true }),
  ).toBeVisible();
  const timeline = scope.getByLabel("타임라인", { exact: true });
  await expect(timeline).toHaveValue(String(trace.steps.length));
  await scope.getByLabel("한 단계 뒤로", { exact: true }).click();
  await expect(timeline).toHaveValue(String(trace.steps.length - 1));
  await scope.getByLabel("한 단계 앞으로", { exact: true }).click();
  await expect(timeline).toHaveValue(String(trace.steps.length));
  // Verify the recorded state at the family-specific operation, then seek it in the UI.
  const index = trace.steps.findIndex((step) => step.kind === event) + 1;
  const operation = stateAt(trace, index);
  expect(operation.analysis).toBeDefined();
  await timeline.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, index);
  await expect(timeline).toHaveValue(String(index));
  await scope.getByLabel("처음으로", { exact: true }).click();
  await expect(timeline).toHaveValue("0");
  await scope.getByLabel("마지막으로", { exact: true }).click();
  expect(stateAt(trace, trace.steps.length)).toEqual(end);
  return end;
}

test("six numeric engines run real split, penalty and subspace operations with reversible analysis", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("#lab");
  const lab = page.locator(".lab-page");
  await openData(lab);
  await lab.getByLabel("실험 프리셋", { exact: true }).selectOption("tiny");
  const cases = [
    ["X-Means", "test", "자동 군집 수 결정 · X-Means"],
    ["G-Means", "test", "자동 군집 수 결정 · G-Means"],
    ["Dip-Means", "test", "자동 군집 수 결정 · Dip-Means"],
    ["DP-Means", "insert", "자동 군집 수 결정 · DP-Means"],
    ["CLIQUE", "grid", "CLIQUE 부분공간·밀집 격자"],
    ["PROCLUS", "dimension", "PROCLUS 실제 선택 차원"],
  ] as const;
  for (const [name, event, heading] of cases) {
    const trace = await choose(page, lab, name, false, 12);
    await inspectTrace(lab, trace, event, heading, 12);
    const analysis = stateAt(trace, trace.steps.length).analysis!;
    if (analysis.kind === "model-selection") {
      expect(analysis.dimensions).toBe(2);
      expect(
        analysis.centroids.every(
          (c) => c.length === 2 && c.every(Number.isFinite),
        ),
      ).toBe(true);
      expect(Number.isFinite(analysis.sse)).toBe(true);
    } else if (analysis.kind === "data-clustering") {
      expect(analysis.dimensions).toBe(2);
      if (name === "CLIQUE") expect(analysis.memberships).toHaveLength(12);
      if (name === "PROCLUS")
        expect(
          analysis.dimensionsByCluster?.every((ds) => ds.length === 2),
        ).toBe(true);
    }
  }
});

test("seven graph engines consume actual connected edges and expose their distinct operations", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("#structured");
  const lab = page.locator(".structured-page");
  await openData(lab);
  await lab
    .getByRole("button", { name: "연결 커뮤니티 예제", exact: true })
    .click();
  const cases = [
    ["Louvain", "aggregate"],
    ["Leiden", "refine"],
    ["Label Propagation", "messages"],
    ["Girvan–Newman", "distance"],
    ["Markov Clustering (MCL)", "inflate"],
    ["Greedy Modularity (CNM)", "merge"],
    ["Fluid Communities", "messages"],
  ] as const;
  for (const [name, event] of cases) {
    const trace = await choose(page, lab, name, true, 12);
    const end = await inspectTrace(
      lab,
      trace,
      event,
      "실제 그래프 커뮤니티 연산",
      12,
    );
    const a = end.analysis;
    expect(a?.kind).toBe("community");
    if (a?.kind !== "community")
      throw new Error("Expected actual community analysis");
    expect(a.inputEdges.length).toBeGreaterThan(12);
    expect(Number.isFinite(a.objective)).toBe(true);
    expect(new Set(end.labels).size).toBeGreaterThan(1);
    if (name === "Markov Clustering (MCL)") {
      expect(a.transition).toHaveLength(12);
      for (let j = 0; j < 12; j++)
        expect(a.transition!.reduce((sum, row) => sum + row[j], 0)).toBeCloseTo(
          1,
          9,
        );
    }
    if (name === "Fluid Communities") {
      expect(a.assignedCount).toBe(12);
      a.counts!.forEach((count, c) =>
        expect(a.densities![c]).toBeCloseTo(1 / count, 12),
      );
    }
  }
});

test("six typed engines return actual categories, mixed prototypes, stream CFs, biclusters and shapes", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("#structured");
  const lab = page.locator(".structured-page");
  await openData(lab);
  const cases = [
    [
      "범주형 예제",
      "K-Modes",
      "prototype",
      "K-Modes 실제 범주 빈도·최빈값",
      12,
    ],
    [
      "혼합형 예제",
      "K-Prototypes",
      "prototype",
      "K-Prototypes 실제 수치·범주 프로토타입",
      12,
    ],
    [
      "개념 드리프트 스트림",
      "DenStream",
      "decay",
      "DenStream · 실제 시간 감쇠와 micro-cluster",
      48,
    ],
    [
      "이중군집 행렬 예제",
      "Bimax",
      "extract",
      "Bimax 실제 행·열 최대 1-부분행렬",
      12,
    ],
    [
      "이중군집 행렬 예제",
      "Cheng–Church Biclustering",
      "residue",
      "Cheng–Church 실제 평균 제곱 잔차",
      12,
    ],
    ["시계열 형태 예제", "K-Shape", "align", "실제 시계열 정렬·형태 추출", 12],
  ] as const;
  for (const [example, name, event, heading, rows] of cases) {
    await openData(lab);
    await lab.getByRole("button", { name: example, exact: true }).click();
    const trace = await choose(page, lab, name, true, rows);
    const end = await inspectTrace(lab, trace, event, heading, rows);
    const a = end.analysis!;
    if (a.kind === "data-clustering") {
      expect(a.categoricalCenters?.length).toBeGreaterThan(0);
      expect(a.frequencies?.length).toBeGreaterThan(0);
      if (name === "K-Prototypes")
        expect(a.numericCenters?.[0]).toHaveLength(2);
    } else if (a.kind === "stream") {
      expect(a.processed).toBe(48);
      expect(a.time).toBe(127);
      expect(a.microClusters.length).toBeGreaterThan(0);
      expect(
        a.microClusters.every((c) => c.center.length === 3 && c.weight > 0),
      ).toBe(true);
    } else if (a.kind === "biclustering") {
      expect(a.values).toHaveLength(12);
      expect(a.values[0]).toHaveLength(8);
      expect(a.biclusters.length).toBeGreaterThan(0);
      expect(a.rowMemberships).toHaveLength(12);
      expect(a.columnMemberships).toHaveLength(8);
      if (name === "Bimax")
        for (const b of a.biclusters)
          expect(
            b.rows.every((i) => b.columns.every((j) => a.values[i][j] === 1)),
          ).toBe(true);
    } else if (a.kind === "timeseries-clustering") {
      expect(a.series).toHaveLength(12);
      expect(a.series.every((s) => s.length === 32)).toBe(true);
      expect(a.centroids.every((c) => c.length === 32)).toBe(true);
      expect(Number.isFinite(a.objective)).toBe(true);
    }
  }
});

test("category and mixed table edits alter actual model statistics and Undo/Redo restores original input", async ({
  page,
}) => {
  await page.goto("#structured");
  const lab = page.locator(".structured-page");
  await openData(lab);
  await lab.getByRole("button", { name: "범주형 예제", exact: true }).click();
  await choose(page, lab, "K-Modes", true, 12);
  const original = JSON.parse(
    await lab.getByLabel("원본 데이터 JSON", { exact: true }).inputValue(),
  );
  let before = await tracesSoFar(page);
  await openData(lab);
  await lab
    .getByLabel("원본 1행 1열", { exact: true })
    .fill("새로운 검증 범주");
  await openData(lab);
  await lab.getByLabel("원본 1행 1열", { exact: true }).press("Enter");
  let trace = await afterRun(page, before, "K-Modes", 12);
  const changed = stateAt(trace, trace.steps.length).analysis;
  expect(changed?.kind).toBe("data-clustering");
  if (changed?.kind === "data-clustering")
    expect(
      changed.frequencies?.some(
        (f) => f.value === "새로운 검증 범주" && f.count === 1,
      ),
    ).toBe(true);
  before = await tracesSoFar(page);
  await openData(lab);
  await lab.getByLabel("다중 데이터 Undo", { exact: true }).click();
  await afterRun(page, before, "K-Modes", 12);
  await expect
    .poll(async () =>
      JSON.parse(
        await lab.getByLabel("원본 데이터 JSON", { exact: true }).inputValue(),
      ),
    )
    .toEqual(original);
  before = await tracesSoFar(page);
  await openData(lab);
  await lab.getByLabel("다중 데이터 Redo", { exact: true }).click();
  await afterRun(page, before, "K-Modes", 12);
  await expect(lab.getByLabel("원본 1행 1열", { exact: true })).toHaveValue(
    "새로운 검증 범주",
  );
  await openData(lab);
  await lab.getByRole("button", { name: "혼합형 예제", exact: true }).click();
  trace = await choose(page, lab, "K-Prototypes", true, 12);
  const old = stateAt(trace, trace.steps.length).analysis;
  before = await tracesSoFar(page);
  await openData(lab);
  await lab.getByLabel("원본 1행 1열", { exact: true }).fill("1000");
  await openData(lab);
  await lab.getByLabel("원본 1행 1열", { exact: true }).press("Enter");
  trace = await afterRun(page, before, "K-Prototypes", 12);
  const next = stateAt(trace, trace.steps.length).analysis;
  expect(next?.kind).toBe("data-clustering");
  if (old?.kind === "data-clustering" && next?.kind === "data-clustering")
    expect(next.numericCenters).not.toEqual(old.numericCenters);
});

test("graph weights, matrix cells and time series values are editable mathematical inputs", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("#structured");
  const lab = page.locator(".structured-page");
  await openData(lab);
  await lab
    .getByRole("button", { name: "연결 커뮤니티 예제", exact: true })
    .click();
  const graph = await choose(page, lab, "Louvain", true, 12);
  let before = await tracesSoFar(page);
  await openData(lab);
  await lab.getByLabel("간선 1 가중치", { exact: true }).fill("7");
  await openData(lab);
  await lab.getByLabel("간선 1 가중치", { exact: true }).press("Enter");
  let trace = await afterRun(page, before, "Louvain", 12);
  expect(stateAt(trace, trace.steps.length).analysis).not.toEqual(
    stateAt(graph, graph.steps.length).analysis,
  );
  const ga = stateAt(trace, trace.steps.length).analysis;
  if (ga?.kind === "community")
    expect(ga.inputEdges.some((e) => e.weight === 7)).toBe(true);
  await openData(lab);
  await lab
    .getByRole("button", { name: "이중군집 행렬 예제", exact: true })
    .click();
  await choose(page, lab, "Bimax", true, 12);
  before = await tracesSoFar(page);
  await openData(lab);
  await lab.getByLabel("원본 1행 1열", { exact: true }).fill("0");
  await openData(lab);
  await lab.getByLabel("원본 1행 1열", { exact: true }).press("Enter");
  trace = await afterRun(page, before, "Bimax", 12);
  const ma = stateAt(trace, trace.steps.length).analysis;
  if (ma?.kind !== "biclustering") throw new Error("Missing native biclusters");
  expect(ma.values[0][0]).toBe(0);
  expect(
    ma.biclusters.every((b) => !(b.rows.includes(0) && b.columns.includes(0))),
  ).toBe(true);
  const downloadPromise = page.waitForEvent("download");
  await openData(lab);
  await lab
    .getByRole("button", { name: "전체 계산 결과 내보내기", exact: true })
    .click();
  const download = await downloadPromise;
  const result = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(result.computedRows).toBe(12);
  expect(result.state.analysis.biclusters).toEqual(ma.biclusters);
  expect(result.output.kind).toBe("biclustering");
  expect(result.output.biclusters).toEqual(ma.biclusters);
  expect(result.output.columnMemberships).toHaveLength(8);
  await openData(lab);
  await lab
    .getByRole("button", { name: "시계열 형태 예제", exact: true })
    .click();
  const shape = await choose(page, lab, "K-Shape", true, 12);
  before = await tracesSoFar(page);
  // First column is the identifier; the second is the first actual observation.
  await openData(lab);
  await lab.getByLabel("원본 1행 2열", { exact: true }).fill("10");
  await openData(lab);
  await lab.getByLabel("원본 1행 2열", { exact: true }).press("Enter");
  trace = await afterRun(page, before, "K-Shape", 12);
  const sa = stateAt(shape, shape.steps.length).analysis,
    sb = stateAt(trace, trace.steps.length).analysis;
  if (
    sa?.kind !== "timeseries-clustering" ||
    sb?.kind !== "timeseries-clustering"
  )
    throw new Error("Missing actual time series shapes");
  expect(sb.series[0]).not.toEqual(sa.series[0]);
  expect(sb.centroids).not.toEqual(sa.centroids);
  const shapeDownloadPromise = page.waitForEvent("download");
  await openData(lab);
  await lab
    .getByRole("button", { name: "전체 계산 결과 내보내기", exact: true })
    .click();
  const shapeDownload = await shapeDownloadPromise;
  const shapeResult = JSON.parse(
    await readFile((await shapeDownload.path())!, "utf8"),
  );
  expect(shapeResult.inputKind).toBe("timeseries");
  expect(shapeResult.computedRows).toBe(12);
  expect(shapeResult.output.kind).toBe("timeseries-partition");
  expect(shapeResult.output.centroids).toEqual(sb.centroids);
  expect(shapeResult.output.objective).toBe(sb.objective);
});

test("stream arrivals increase the computed prefix and actual CF time; automatic input can pause", async ({
  page,
}) => {
  await page.goto("#structured");
  const lab = page.locator(".structured-page");
  await openData(lab);
  await lab
    .getByRole("button", { name: "개념 드리프트 스트림", exact: true })
    .click();
  await choose(page, lab, "DenStream", true, 48);
  const before = await tracesSoFar(page);
  await lab.getByRole("button", { name: "관측 1개 유입", exact: true }).click();
  const trace = await afterRun(page, before, "DenStream", 49);
  const a = stateAt(trace, trace.steps.length).analysis;
  if (a?.kind !== "stream") throw new Error("Missing stream CFs");
  expect(a.processed).toBe(49);
  expect(a.time).toBe(128);
  expect(
    a.microClusters.every((c) => c.weight > 0 && c.center.length === 3),
  ).toBe(true);
  await lab.getByRole("button", { name: "유입 시작", exact: true }).click();
  await expect
    .poll(
      async () =>
        JSON.parse(await lab.getByLabel("원본 데이터 JSON").inputValue()).data
          .samples.length,
    )
    .toBeGreaterThan(49);
  await lab.getByRole("button", { name: "유입 일시정지", exact: true }).click();
  const stopped = await lab.getByLabel("원본 데이터 JSON").inputValue();
  await page.waitForTimeout(1000);
  await expect(lab.getByLabel("원본 데이터 JSON")).toHaveValue(stopped);
});

test("typed validation reports invalid binary matrices, irregular time grids and malformed JSON without fake success", async ({
  page,
}) => {
  await page.goto("#structured");
  const lab = page.locator(".structured-page");
  await openData(lab);
  await lab
    .getByRole("button", { name: "이중군집 행렬 예제", exact: true })
    .click();
  await choose(page, lab, "Bimax", true, 12);
  let before = await tracesSoFar(page);
  await openData(lab);
  await lab.getByLabel("원본 1행 1열", { exact: true }).fill("0.5");
  await openData(lab);
  await lab.getByLabel("원본 1행 1열", { exact: true }).press("Enter");
  await expect(lab.getByRole("alert")).toContainText(/이진|0.*1|binary/i);
  expect(await tracesSoFar(page)).toBe(before);
  await openData(lab);
  await lab
    .getByRole("button", { name: "시계열 형태 예제", exact: true })
    .click();
  await choose(page, lab, "K-Shape", true, 12);
  const raw = JSON.parse(await lab.getByLabel("원본 데이터 JSON").inputValue());
  raw.data.series[0].times[2] += 0.25;
  before = await tracesSoFar(page);
  await openData(lab);
  await lab.getByLabel("원본 데이터 JSON").fill(JSON.stringify(raw));
  await openData(lab);
  await lab.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await expect(lab.getByRole("alert")).toContainText(/간격|grid|시간축/);
  expect(await tracesSoFar(page)).toBe(before);
  await openData(lab);
  await lab.getByLabel("원본 데이터 JSON").fill("{invalid json");
  await openData(lab);
  await lab.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await expect(lab.getByRole("alert")).toBeVisible();
  expect(await tracesSoFar(page)).toBe(before);
  await openData(lab);
  await lab.getByRole("button", { name: "범주형 예제", exact: true }).click();
  await choose(page, lab, "K-Modes", true, 12);
  await expect(lab.getByRole("alert")).toHaveCount(0);
});

test("a thousand raw rows remain computed and editable through a bounded table at seven viewport widths", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("#structured");
  const lab = page.locator(".structured-page");
  await openData(lab);
  await lab.getByRole("button", { name: "범주형 예제", exact: true }).click();
  await choose(page, lab, "K-Modes", true, 12);
  await lab.getByText("시드 데이터 생성", { exact: true }).click();
  await lab
    .getByLabel("다중 생성 유형", { exact: true })
    .selectOption("categorical");
  await lab.getByLabel("다중 생성 개수", { exact: true }).fill("1000");
  await lab.getByLabel("다중 생성 차원", { exact: true }).fill("12");
  await lab.getByLabel("다중 생성 시드", { exact: true }).fill("42");
  let before = await tracesSoFar(page);
  await openData(lab);
  await lab.getByRole("button", { name: "원본 생성", exact: true }).click();
  const trace = await afterRun(page, before, "K-Modes", 1000);
  expect(stateAt(trace, trace.steps.length).labels).toHaveLength(1000);
  const raw = JSON.parse(await lab.getByLabel("원본 데이터 JSON").inputValue());
  expect(raw.data.values).toHaveLength(1000);
  expect(raw.data.values.every((r: string[]) => r.length === 12)).toBe(true);
  const table = lab.getByRole("table", { name: "원본 속성 편집", exact: true });
  await expect(table.locator("tbody tr")).toHaveCount(16);
  await expect(table.locator("tbody tr").first().locator("input")).toHaveCount(
    8,
  );
  await openData(lab);
  await lab.getByLabel("원본 표 시작 행").fill("1000");
  await openData(lab);
  await lab.getByLabel("원본 표 시작 열").fill("12");
  before = await tracesSoFar(page);
  await openData(lab);
  await lab
    .getByLabel("원본 1000행 12열", { exact: true })
    .fill("마지막 원본도 계산");
  await openData(lab);
  await lab.getByLabel("원본 1000행 12열", { exact: true }).press("Enter");
  const edited = await afterRun(page, before, "K-Modes", 1000);
  const a = stateAt(edited, edited.steps.length).analysis;
  if (a?.kind !== "data-clustering")
    throw new Error("Missing categorical statistics");
  expect(
    a.frequencies?.some(
      (f) =>
        f.attribute === 11 && f.value === "마지막 원본도 계산" && f.count === 1,
    ),
  ).toBe(true);
  for (const width of [1920, 1440, 1024, 800, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      lab.getByLabel("알고리즘 선택", { exact: true }),
    ).toBeVisible();
    await expect(
      lab.getByLabel("원본 1000행 12열", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/next-raw-${info.project.name}-${width}.png`,
      fullPage: true,
    });
  }
});

test("the raw K-Shape guide preserves its dataset, changed parameters and selected real event in the structured lab", async ({
  page,
}) => {
  await page.goto("#guide");
  const guide = page.locator(".guide-page");
  for (const name of ["Bimax", "Cheng–Church Biclustering", "K-Shape"]) {
    await guide
      .getByRole("navigation", { name: "알고리즘 가이드 목록", exact: true })
      .getByRole("button", { name, exact: true })
      .click();
    await expect(
      guide
        .getByRole("button", { name: "두 알고리즘 비교 ↗", exact: true })
        .first(),
    ).toBeDisabled();
  }
  const mini = guide.locator(".trace-lesson");
  await expect(mini.getByLabel("재생", { exact: true })).toBeEnabled();
  await mini.locator(".lesson-settings > summary").click();
  let before = await tracesSoFar(page);
  await mini.getByLabel("반복 한도", { exact: true }).fill("7");
  const guideTrace = await afterRun(page, before, "K-Shape", 6);
  const eventPosition =
    guideTrace.steps.findIndex((step) => step.kind === "align") + 1;
  expect(eventPosition).toBeGreaterThan(0);
  const eventRow = mini.locator(".event-links > div").filter({
    has: page.getByRole("button", { name: "align 보기", exact: true }),
  });
  await eventRow
    .getByRole("button", { name: "align 보기", exact: true })
    .click();
  await expect(mini.getByLabel("타임라인", { exact: true })).toHaveValue(
    String(eventPosition),
  );
  before = await tracesSoFar(page);
  await eventRow
    .getByRole("button", { name: "이 단계 실험에서 보기 ↗", exact: true })
    .click();
  const lab = page.locator(".structured-page");
  await openData(lab);
  await expect(lab.getByLabel("알고리즘 선택", { exact: true })).toHaveText(
    "K-Shape",
  );
  const trace = await afterRun(page, before, "K-Shape", 6);
  await expect(lab.getByLabel("반복 한도", { exact: true })).toHaveValue("7");
  const raw = JSON.parse(
    await lab.getByLabel("원본 데이터 JSON", { exact: true }).inputValue(),
  ).data;
  expect(raw.kind).toBe("timeseries");
  expect(raw.provenance).toEqual({
    generator: "shape-patterns",
    seed: 42,
    parameters: { series: 6, length: 8 },
  });
  expect(raw.series).toHaveLength(6);
  expect(raw.series[0]).toEqual({
    id: "shape-1",
    times: [0, 1, 2, 3, 4, 5, 6, 7],
    values: [0, 0, 1, 2, 1, 0, -1, 0],
  });
  expect(trace.steps).toEqual(guideTrace.steps);
  expect(stateAt(trace, trace.steps.length)).toEqual(
    stateAt(guideTrace, guideTrace.steps.length),
  );
  await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue(
    String(eventPosition),
  );
  await expect(lab.locator(".step-explanation")).toHaveText(
    guideTrace.steps[eventPosition - 1].description,
  );
});
