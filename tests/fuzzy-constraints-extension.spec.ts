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
