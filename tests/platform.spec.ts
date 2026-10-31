import { test, expect } from "@playwright/test";
import type { Trace } from "../src/engine/types";
import { stateAt } from "../src/engine/trace";

declare global {
  interface Window {
    platformTraces: Trace[];
    platformJobs: number;
  }
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.platformTraces = [];
    window.platformJobs = 0;
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (e) => {
          if (e.data.trace) window.platformTraces.push(e.data.trace);
        });
      }
      postMessage(message: unknown, transfer: Transferable[]): void;
      postMessage(message: unknown, options?: StructuredSerializeOptions): void;
      postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = {},
      ) {
        window.platformJobs++;
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
  });
});
test("ten new engines expose real events, dedicated analysis and reversible production traces", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("#lab");
  await page.getByLabel("실험 프리셋", { exact: true }).selectOption("tiny");
  const search = page.getByLabel("실험실 알고리즘 검색", { exact: true });
  await search.fill("스펙트럴");
  const selector = page.getByLabel("알고리즘 선택", { exact: true });
  await expect(
    selector.getByRole("option", { name: "Spectral Clustering", exact: true }),
  ).toHaveCount(1);
  await expect(
    selector.getByRole("option", { name: "CLARANS", exact: true }),
  ).toHaveCount(0);
  await search.fill("");
  const cases = [
    ["Spectral Clustering", "embedding", "스펙트럴 임베딩"],
    ["Affinity Propagation", "messages", "친화도 전파 · 실제 메시지"],
    ["Density Peaks / CFSFDP", "density", "밀도 봉우리 결정 그래프"],
    ["CURE", "representatives", "CURE 대표점 선택·축소·병합"],
    ["Neural Gas", "rank", "실제 뉴런 경쟁·연결"],
    ["Growing Neural Gas", "insert", "실제 뉴런 경쟁·연결"],
    ["K-Medians", "move", "실제 L1 할당·좌표별 중앙값"],
    ["Mini-Batch K-Means", "move", "실제 미니배치·누적 방문 횟수"],
    ["CLARA", "swap", "실제 Medoid 탐색·전체 데이터 평가"],
    ["CLARANS", "swap", "실제 Medoid 탐색·전체 데이터 평가"],
  ];
  for (const [name, event, title] of cases) {
    await page.getByLabel("알고리즘 선택", { exact: true }).selectOption(name);
    await expect
      .poll(() => page.evaluate(() => window.platformTraces.at(-1)?.algorithm))
      .toBe(name);
    await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
    const trace = await page.evaluate(() => window.platformTraces.at(-1)!);
    expect(trace.steps.some((s) => s.kind === event)).toBe(true);
    const end = stateAt(trace, trace.steps.length);
    expect(end.labels).toHaveLength(12);
    expect(end.labels.every((i) => i >= 0)).toBe(true);
    await page.getByLabel("마지막으로", { exact: true }).click();
    await expect(page.locator(".status")).toHaveText("완료");
    const panel = page.locator(".analysis-panel");
    if ((await panel.getAttribute("open")) === null)
      await panel.locator(":scope > summary").click();
    await expect(panel.getByText(title, { exact: true }).first()).toBeVisible();
    await page.getByLabel("한 단계 뒤로", { exact: true }).click();
    await page.getByLabel("한 단계 앞으로", { exact: true }).click();
    await expect(page.getByLabel("타임라인", { exact: true })).toHaveValue(
      String(trace.steps.length),
    );
  }
  await page.screenshot({
    path: `test-results/platform-engines-${info.project.name}.png`,
    fullPage: true,
  });
});

test("ND raw computation survives projection changes; weighted graph ignores display positions", async ({
  page,
}, info) => {
  await page.goto("#structured");
  const workspace = page.locator(".structured-page");
  await expect(workspace.getByLabel("재생", { exact: true })).toBeEnabled();
  await expect(page.getByRole("status")).toContainText("원본 3차원");
  await workspace.getByLabel("마지막으로", { exact: true }).click();
  await expect(
    page.getByRole("img", { name: "스펙트럴 임베딩", exact: true }),
  ).toBeVisible();
  const before = await page.evaluate(() => ({
    trace: window.platformTraces.at(-1)!,
    jobs: window.platformJobs,
  }));
  const labels = stateAt(before.trace, before.trace.steps.length).labels;
  expect(labels[0]).not.toBe(labels[6]);
  const matrix = workspace
    .locator("details.matrix-view")
    .filter({ hasText: "유사도 인접 행렬 W" });
  await matrix.locator("summary").click();
  await expect(matrix.getByRole("table")).toBeVisible();
  await matrix.getByLabel("유사도 인접 행렬 W 시작 행").fill("11");
  await expect(matrix.locator("tbody tr")).toHaveCount(2);
  await matrix.getByLabel("유사도 인접 행렬 W 시작 행").fill("1");
  await matrix.locator("summary").click();
  await page.getByLabel("표시 Y 차원").fill("3");
  expect(await page.evaluate(() => window.platformJobs)).toBe(before.jobs);
  await page.screenshot({
    path: `test-results/structured-nd-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "가중 그래프 예제", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => window.platformTraces.at(-1)?.initial.labels.length),
    )
    .toBe(6);
  const first = await page.evaluate(() => window.platformTraces.at(-1)!);
  const firstState = stateAt(first, first.steps.length);
  expect(firstState.labels[0]).toBe(firstState.labels[2]);
  expect(firstState.labels[0]).not.toBe(firstState.labels[3]);
  const raw = JSON.parse(
    await page.getByLabel("원본 데이터 JSON").inputValue(),
  );
  raw.data.nodes.forEach(
    (n: { position?: { x: number; y: number } }, i: number) => {
      n.position = { x: 0.1 + i * 0.12, y: 0.8 - i * 0.1 };
    },
  );
  const count = await page.evaluate(() => window.platformTraces.length);
  await page.getByLabel("원본 데이터 JSON").fill(JSON.stringify(raw));
  await page.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.platformTraces.length))
    .toBe(count + 1);
  const projected = await page.evaluate(() => window.platformTraces.at(-1)!);
  expect(stateAt(projected, projected.steps.length).analysis).toEqual(
    firstState.analysis,
  );
  raw.data.edges[0].weight = 7;
  await page.getByLabel("원본 데이터 JSON").fill(JSON.stringify(raw));
  await page.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.platformTraces.length))
    .toBe(count + 2);
  const weighted = await page.evaluate(() => window.platformTraces.at(-1)!);
  const weightedState = stateAt(weighted, weighted.steps.length);
  expect(
    weightedState.analysis?.kind === "spectral" &&
      weightedState.analysis.adjacency?.[0][1],
  ).toBe(7);
  await workspace.getByLabel("마지막으로", { exact: true }).click();
  await matrix.locator("summary").click();
  await expect(
    matrix.locator("tbody tr").first().locator("td").nth(1),
  ).toHaveText("7.000");
  await matrix.locator("summary").click();
  for (const width of [1920, 1440, 1024, 800, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: `test-results/structured-graph-${info.project.name}.png`,
    fullPage: true,
  });
});
test("unsupported structured data and contradictory constraints fail explicitly", async ({
  page,
}) => {
  await page.goto("#structured");
  await page.getByLabel("원본 데이터 JSON").fill(
    JSON.stringify({
      kind: "timeseries",
      series: [{ id: "s", times: [0, 1], values: [1, 2] }],
    }),
  );
  await page.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("아직 지원하지");
  await page.getByLabel("원본 데이터 JSON").fill(
    JSON.stringify({
      kind: "constrained",
      data: {
        kind: "numeric",
        values: [
          [0, 0],
          [1, 1],
        ],
      },
      mustLink: [[0, 1]],
      cannotLink: [[0, 1]],
    }),
  );
  await page.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("모순");
});
