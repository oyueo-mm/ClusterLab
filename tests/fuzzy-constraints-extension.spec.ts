import { test, expect, type Page } from "@playwright/test";
import {
  openData,
  openSettings,
  openAnalysis,
  closeData,
} from "./workspace-helpers";
import type { Algorithm, Params, Trace } from "../src/engine/types";
import type { Dataset } from "../src/engine/dataset";
import { stateAt } from "../src/engine/trace";

type Request = {
  algorithm: Algorithm;
  params: Params;
  dataset?: Dataset;
  purpose?: string;
};
declare global {
  interface Window {
    extensionRuns: { request: Request; trace: Trace; wallMs: number }[];
    extensionWorkerUrl: string;
    extensionRequests: number;
  }
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.extensionRuns = [];
    window.extensionRequests = 0;
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      private request!: Request;
      private started = 0;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        window.extensionWorkerUrl = String(url);
        this.addEventListener("message", (event) => {
          if (event.data.trace)
            window.extensionRuns.push({
              request: this.request,
              trace: event.data.trace,
              wallMs: performance.now() - this.started,
            });
        });
      }
      postMessage(message: unknown, transfer: Transferable[]): void;
      postMessage(message: unknown, options?: StructuredSerializeOptions): void;
      postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = {},
      ) {
        this.request = structuredClone(message as Request);
        if (this.request.algorithm && !this.request.purpose)
          window.extensionRequests++;
        this.started = performance.now();
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
  });
});
const count = (page: Page) => page.evaluate(() => window.extensionRuns.length);
async function completed(
  page: Page,
  before: number,
  algorithm: Algorithm,
  penalty?: number,
) {
  const find = ({
    before,
    algorithm,
    penalty,
  }: {
    before: number;
    algorithm: Algorithm;
    penalty?: number;
  }) =>
    window.extensionRuns
      .slice(before)
      .find(
        (run) =>
          run.request.algorithm === algorithm &&
          (penalty === undefined ||
            run.request.params.constraintPenalty === penalty),
      );
  await expect
    .poll(() => page.evaluate(find, { before, algorithm, penalty }), {
      timeout: 30000,
    })
    .toBeTruthy();
  return (await page.evaluate(find, { before, algorithm, penalty }))!;
}
const pairwise: Dataset = {
  kind: "constrained",
  data: {
    kind: "numeric",
    values: [
      [0, 0, 0],
      [0.1, 0, 0],
      [4, 0, 0],
      [4.1, 0, 0],
    ],
  },
  mustLink: [[0, 3]],
  cannotLink: [[0, 1]],
};

test("PCM actual ND typicalities, scale controls, reversible trace, projection and data restoration", async ({
  page,
}, info) => {
  await page.goto("#/catalog?q=Possibilistic");
  const card = page
    .locator(".catalog-grid article")
    .filter({ has: page.getByText("Possibilistic C-Means", { exact: true }) });
  await expect(card).toHaveCount(1);
  await card.locator("canvas").scrollIntoViewIfNeeded();
  await expect(card.locator(".algorithm-preview")).toHaveAttribute(
    "data-preview-status",
    "computed",
  );
  await card.locator("h2").dblclick();
  const lab = page.locator(".structured-page");
  await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
  await expect(lab.locator(".workspace-settings")).toBeHidden();
  const source: Dataset = {
    kind: "numeric",
    values: [
      [0, 0, 0],
      [1, 0, 0],
      [4, 0, 0],
    ],
  };
  await openData(lab);
  await lab
    .getByLabel("원본 데이터 JSON", { exact: true })
    .fill(JSON.stringify(source));
  let before = await count(page);
  await lab.getByRole("button", { name: "데이터 적용", exact: true }).click();
  const run = await completed(page, before, "Possibilistic C-Means"),
    end = stateAt(run.trace, run.trace.steps.length),
    a = end.analysis;
  if (a?.kind !== "possibilistic") throw Error("missing actual PCM");
  expect(a.dimensions).toBe(3);
  expect(a.typicalities).toHaveLength(3);
  expect(a.centroids[0]).toHaveLength(3);
  a.typicalities.forEach((row, i) =>
    row.forEach((t, h) => {
      const d = source.values[i].reduce(
        (s, v, j) => s + (v - a.centroids[h][j]) ** 2,
        0,
      );
      expect(t).toBeCloseTo(
        1 /
          (1 +
            (d / a.scales[h]) **
              (1 / (run.request.params.typicalityExponent - 1))),
        10,
      );
    }),
  );
  expect(a.rowSums.some((v) => Math.abs(v - 1) > 0.1)).toBe(true);
  a.warmMemberships.forEach((row) =>
    expect(row.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12),
  );
  await lab.getByLabel("마지막으로", { exact: true }).click();
  await openAnalysis(lab);
  await expect(
    lab.getByRole("heading", { name: "전형성 · 원본 ND PCM", exact: true }),
  ).toBeVisible();
  await lab.getByLabel("설정 열기", { exact: true }).click();
  await closeData(lab);
  await lab.getByLabel("표본 전형성 검사", { exact: true }).click();
  await expect(
    lab.getByLabel("선택 표본 전형성", { exact: true }),
  ).toContainText("독립 전형성");
  await expect(lab.locator(".typicality-inspector meter")).toHaveCount(2);
  await lab.getByLabel("전형성 검사 닫기", { exact: true }).click();
  await lab.getByLabel("한 단계 뒤로", { exact: true }).click();
  await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue(
    String(run.trace.steps.length - 1),
  );
  await lab.getByLabel("처음으로", { exact: true }).click();
  await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue("0");
  await lab.getByLabel("마지막으로", { exact: true }).click();
  const position = await lab
      .getByLabel("타임라인", { exact: true })
      .inputValue(),
    requests = await page.evaluate(() => window.extensionRequests);
  await openData(lab);
  await lab.getByLabel("표시 X 차원", { exact: true }).fill("3");
  await closeData(lab);
  await lab.getByLabel("시각화 집중 모드", { exact: true }).click();
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.extensionRequests)).toBe(requests);
  await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue(
    position,
  );
  await openSettings(lab);
  before = await count(page);
  await lab.getByLabel("전형성 지수 η", { exact: true }).fill("3");
  const changed = await completed(page, before, "Possibilistic C-Means"),
    changedA = stateAt(changed.trace, changed.trace.steps.length).analysis;
  expect(changed.request.params.typicalityExponent).toBe(3);
  if (changedA?.kind !== "possibilistic") throw Error("missing changed T");
  expect(changedA.typicalities).not.toEqual(a.typicalities);
  await openData(lab);
  await lab.getByLabel("원본 데이터 JSON", { exact: true }).fill(
    JSON.stringify({
      kind: "numeric",
      values: [
        [2, 2, 2],
        [2, 2, 2],
        [2, 2, 2],
      ],
    }),
  );
  await lab.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await expect(lab.getByText(/PCM Ω_.*양수여야/)).toBeVisible();
  await openSettings(lab);
  before = await count(page);
  await lab.getByLabel("척도 정책", { exact: true }).selectOption("manual");
  const manual = await completed(page, before, "Possibilistic C-Means"),
    ma = stateAt(manual.trace, manual.trace.steps.length).analysis;
  if (ma?.kind !== "possibilistic") throw Error("missing manual");
  expect(ma.rowSums).toEqual([2, 2, 2]);
  expect(ma.coincidentCenters).toBe(1);
  expect(ma.distinctAtLeastK).toBe(false);
  await openData(lab);
  before = await count(page);
  await lab.getByLabel("다중 데이터 Undo", { exact: true }).click();
  const restored = await completed(page, before, "Possibilistic C-Means");
  expect(restored.request.dataset).toEqual(source);
  await closeData(lab);
  await lab.getByLabel("마지막으로", { exact: true }).click();
  await page.screenshot({ path: `test-results/pcm-${info.project.name}.png` });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  const reload = await completed(page, 0, "Possibilistic C-Means");
  expect(reload.request.dataset).toEqual(source);
  expect(reload.request.params.pcmScaleMode).toBe("manual");
});

test("PCM guide mini compares real ND FCM U with unnormalized T and opens its actual typicality event", async ({
  page,
}) => {
  await page.goto("#guide");
  const guide = page.locator(".guide-page");
  await guide
    .getByRole("navigation", { name: "알고리즘 가이드 목록", exact: true })
    .getByRole("button", { name: "Possibilistic C-Means", exact: true })
    .click();
  const mini = guide.locator(".trace-lesson");
  await expect(mini.getByLabel("재생", { exact: true })).toBeEnabled();
  await expect(guide.locator(".katex-mathml math").first()).toBeAttached();
  await mini.locator(".lesson-settings > summary").click();
  const before = await count(page);
  await mini.getByLabel("척도 계수 κ", { exact: true }).fill("2");
  const run = await completed(page, before, "Possibilistic C-Means"),
    a = stateAt(run.trace, run.trace.steps.length).analysis;
  expect(run.request.params.scaleCoefficient).toBe(2);
  if (a?.kind !== "possibilistic") throw Error("missing mini T");
  expect(a.dimensions).toBe(3);
  expect(a.rowSums.some((v) => Math.abs(v - 1) > 0.1)).toBe(true);
  a.warmMemberships.forEach((row) =>
    expect(row.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12),
  );
  const row = mini
    .locator(".event-links > div")
    .filter({
      has: page.getByRole("button", { name: "typicality 보기", exact: true }),
    });
  await row
    .getByRole("button", { name: "typicality 보기", exact: true })
    .click();
  const position =
    run.trace.steps.findIndex((step) => step.kind === "typicality") + 1;
  await expect(mini.getByLabel("타임라인", { exact: true })).toHaveValue(
    String(position),
  );
  const prior = await count(page);
  await row
    .getByRole("button", { name: "이 단계 실험에서 보기 ↗", exact: true })
    .click();
  const opened = await completed(page, prior, "Possibilistic C-Means");
  expect(opened.request.dataset).toEqual(run.request.dataset);
  expect(opened.request.params.scaleCoefficient).toBe(2);
  await expect(
    page.locator(".structured-page").getByLabel("타임라인", { exact: true }),
  ).toHaveValue(String(position));
});

test("PCKMeans actual finite penalties, ND projection, editable relations, rewind and persistent canvas workspace", async ({
  page,
}, info) => {
  await page.goto("#/catalog?q=PCKMeans");
  const card = page.locator(".catalog-grid article").filter({
    has: page.getByText("PCKMeans", { exact: true }),
  });
  await expect(card).toHaveCount(1);
  await card.locator("canvas").waitFor();
  await card.locator("canvas").scrollIntoViewIfNeeded();
  await expect(card.locator(".algorithm-preview")).toHaveAttribute(
    "data-preview-status",
    "computed",
  );
  await card.locator("h2").dblclick();
  const lab = page.locator(".structured-page");
  await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
  await expect(lab.locator(".workspace-settings")).toBeHidden();
  await openData(lab);
  await lab
    .getByLabel("원본 데이터 JSON", { exact: true })
    .fill(JSON.stringify(pairwise));
  let before = await count(page);
  await lab.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await completed(page, before, "PCKMeans");
  await openSettings(lab);
  before = await count(page);
  await lab.getByLabel("제약 위반 비용 w", { exact: true }).fill("0.01");
  const low = await completed(page, before, "PCKMeans", 0.01),
    end = stateAt(low.trace, low.trace.steps.length);
  expect(low.request.dataset).toEqual(pairwise);
  expect(end.analysis?.kind).toBe("pairwise");
  if (end.analysis?.kind !== "pairwise") throw Error("native analysis missing");
  expect(end.analysis.dimensions).toBe(3);
  expect(end.analysis.objective).toBeCloseTo(0.03, 10);
  expect(end.analysis.mustViolations).toBe(1);
  expect(end.analysis.cannotViolations).toBe(1);
  await lab.getByLabel("마지막으로", { exact: true }).click();
  await openAnalysis(lab);
  await expect(
    lab.getByRole("heading", {
      name: "쌍별 유한 제약 · 실제 원본 연산",
      exact: true,
    }),
  ).toBeVisible();
  await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue(
    String(low.trace.steps.length),
  );
  await lab.getByLabel("한 단계 뒤로", { exact: true }).click();
  await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue(
    String(low.trace.steps.length - 1),
  );
  await lab.getByLabel("처음으로", { exact: true }).click();
  await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue("0");
  await lab.getByLabel("마지막으로", { exact: true }).click();
  const position = await lab
    .getByLabel("타임라인", { exact: true })
    .inputValue();
  await openData(lab);
  before = await count(page);
  const requestsBeforeLayout = await page.evaluate(
    () => window.extensionRequests,
  );
  await lab.getByLabel("표시 X 차원", { exact: true }).fill("3");
  await closeData(lab);
  await lab.getByLabel("제약선 표시", { exact: true }).selectOption("violated");
  await lab.getByLabel("시각화 집중 모드", { exact: true }).click();
  await page.keyboard.press("Escape");
  expect(await count(page)).toBe(before);
  expect(await page.evaluate(() => window.extensionRequests)).toBe(
    requestsBeforeLayout,
  );
  await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue(
    position,
  );
  await openSettings(lab);
  before = await count(page);
  await lab.getByLabel("제약 위반 비용 w", { exact: true }).fill("30");
  const high = await completed(page, before, "PCKMeans", 30),
    highEnd = stateAt(high.trace, high.trace.steps.length);
  expect(highEnd.labels).not.toEqual(end.labels);
  if (highEnd.analysis?.kind !== "pairwise") throw Error("missing costs");
  expect(highEnd.analysis.objective).toBeCloseTo(10.94, 9);
  await openData(lab);
  before = await count(page);
  const relation = lab.getByLabel("Must-Link 1 끝 행", { exact: true });
  await relation.fill("3");
  await relation.press("Enter");
  const edited = await completed(page, before, "PCKMeans", 30);
  expect(edited.request.dataset?.kind).toBe("constrained");
  if (edited.request.dataset?.kind !== "constrained")
    throw Error("source missing");
  expect(edited.request.dataset.mustLink).toEqual([[0, 2]]);
  before = await count(page);
  await lab.getByLabel("다중 데이터 Undo", { exact: true }).click();
  const undone = await completed(page, before, "PCKMeans", 30);
  expect(undone.request.dataset).toEqual(pairwise);
  await closeData(lab);
  await lab.getByLabel("마지막으로", { exact: true }).click();
  await page.screenshot({
    path: `test-results/pckmeans-${info.project.name}.png`,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  const restored = await completed(page, 0, "PCKMeans", 30);
  expect(restored.request.dataset).toEqual(pairwise);
});

test("PCKMeans guide mini computes both penalty regimes and opens the actual selected event with its source", async ({
  page,
}) => {
  await page.goto("#guide");
  const guide = page.locator(".guide-page");
  await guide
    .getByRole("navigation", { name: "알고리즘 가이드 목록", exact: true })
    .getByRole("button", { name: "PCKMeans", exact: true })
    .click();
  const mini = guide.locator(".trace-lesson");
  await expect(mini.getByLabel("재생", { exact: true })).toBeEnabled();
  await expect(guide.locator(".katex-mathml math").first()).toBeAttached();
  const settings = mini.locator(".lesson-settings");
  await settings.locator(":scope > summary").click();
  const before = await count(page);
  await mini.getByLabel("제약 위반 비용 w", { exact: true }).fill("30");
  const changed = await completed(page, before, "PCKMeans", 30),
    end = stateAt(changed.trace, changed.trace.steps.length);
  if (end.analysis?.kind !== "pairwise")
    throw Error("mini missing real analysis");
  expect(end.analysis.objective).toBeCloseTo(10.94, 9);
  const row = mini.locator(".event-links > div").filter({
    has: page.getByRole("button", { name: "test 보기", exact: true }),
  });
  await row.getByRole("button", { name: "test 보기", exact: true }).click();
  const position =
    changed.trace.steps.findIndex((step) => step.kind === "test") + 1;
  await expect(mini.getByLabel("타임라인", { exact: true })).toHaveValue(
    String(position),
  );
  const prior = await count(page);
  await row
    .getByRole("button", { name: "이 단계 실험에서 보기 ↗", exact: true })
    .click();
  const opened = await completed(page, prior, "PCKMeans", 30);
  expect(opened.request.dataset).toEqual(changed.request.dataset);
  const lab = page.locator(".structured-page");
  await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue(
    String(position),
  );
});
