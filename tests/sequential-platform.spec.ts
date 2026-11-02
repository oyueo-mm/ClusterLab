import { openSettings } from "./workspace-helpers";
import { chooseAlgorithm, openData, openAnalysis } from "./workspace-helpers";
import { test, expect, type Page, type Locator } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Algorithm, Params, Trace } from "../src/engine/types";
import type { Dataset, NumericDataset } from "../src/engine/dataset";
import { stateAt, applyStep } from "../src/engine/trace";

interface SequentialRequest {
  algorithm: Algorithm;
  params: Params;
  dataset?: Dataset;
}
declare global {
  interface Window {
    sequentialRequests: SequentialRequest[];
    sequentialRuns: { trace: Trace; request: SequentialRequest }[];
    sequentialErrors: string[];
  }
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sequentialRequests = [];
    window.sequentialRuns = [];
    window.sequentialErrors = [];
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      private request!: SequentialRequest;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event) => {
          if (event.data.trace)
            window.sequentialRuns.push({
              trace: event.data.trace,
              request: this.request,
            });
          if (event.data.error) window.sequentialErrors.push(event.data.error);
        });
      }
      postMessage(message: unknown, transfer: Transferable[]): void;
      postMessage(message: unknown, options?: StructuredSerializeOptions): void;
      postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = {},
      ) {
        const m = message as SequentialRequest;
        this.request = structuredClone({
          algorithm: m.algorithm,
          params: m.params,
          dataset: m.dataset,
        });
        window.sequentialRequests.push(this.request);
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
  });
});
const workspace = (page: Page) => page.locator(".structured-page");
const count = (page: Page) => page.evaluate(() => window.sequentialRuns.length);
async function completed(
  page: Page,
  before: number,
  algorithm: Algorithm,
  params: Partial<Params> = {},
) {
  const find = ({
    before,
    algorithm,
    params,
  }: {
    before: number;
    algorithm: Algorithm;
    params: Partial<Params>;
  }) =>
    window.sequentialRuns
      .slice(before)
      .filter(
        (run) =>
          run.trace.algorithm === algorithm &&
          Object.entries(params).every(
            ([key, value]) => run.request.params[key as keyof Params] === value,
          ),
      )
      .at(-1);
  await expect
    .poll(() => page.evaluate(find, { before, algorithm, params }), {
      timeout: 45000,
    })
    .toBeTruthy();
  return (await page.evaluate(find, { before, algorithm, params }))!;
}
async function runSource(
  page: Page,
  algorithm: "BSAS" | "MBSAS" | "TTSAS",
  data: NumericDataset,
  params: Partial<Params>,
) {
  const box = workspace(page),
    before = await count(page);
  await openData(box);
  await box
    .getByLabel("원본 데이터 JSON", { exact: true })
    .fill(JSON.stringify(data));
  await openData(box);
  await box.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await chooseAlgorithm(box, algorithm);
  await openSettings(box);
  const labels: Partial<Record<keyof Params, string>> =
    algorithm === "TTSAS"
      ? { threshold: "할당 하한 θ₁", upperThreshold: "생성 상한 θ₂" }
      : { threshold: "거리 임계값 θ", maxClusters: "최대 군집 수 q" };
  // Set the upper threshold first to avoid an invalid transient lower>=upper.
  for (const key of ["upperThreshold", "threshold", "maxClusters"] as const)
    if (params[key] !== undefined && labels[key])
      await box
        .getByLabel(labels[key]!, { exact: true })
        .fill(String(params[key]));
  return completed(page, before, algorithm, params);
}
async function showFinal(box: Locator, trace: Trace) {
  expect(trace.steps.at(-1)?.kind).toBe("finish");
  await expect(box.getByLabel("재생", { exact: true })).toBeEnabled();
  await box.getByLabel("마지막으로", { exact: true }).click();
  await expect(box.getByLabel("타임라인", { exact: true })).toHaveValue(
    String(trace.steps.length),
  );
  await openAnalysis(box);
  const panel = box.locator("details.analysis-panel");
  if ((await panel.count()) && (await panel.getAttribute("open")) === null)
    await panel.locator(":scope > summary").click();
  await expect(box.locator(".sequential-analysis")).toBeVisible();
  await box.getByLabel("한 단계 뒤로", { exact: true }).click();
  await expect(box.getByLabel("타임라인", { exact: true })).toHaveValue(
    String(trace.steps.length - 1),
  );
  await box.getByLabel("한 단계 앞으로", { exact: true }).click();
  await expect(box.getByLabel("타임라인", { exact: true })).toHaveValue(
    String(trace.steps.length),
  );
  const final = stateAt(trace, trace.steps.length);
  let reversed = final;
  for (const step of [...trace.steps].reverse())
    reversed = applyStep(reversed, step, true);
  expect(reversed).toEqual(trace.initial);
  for (const checkpoint of trace.snapshots)
    expect(stateAt(trace, checkpoint.index)).toEqual(checkpoint.state);
  return final;
}
async function nativeExport(page: Page) {
  await openData(workspace(page));
  const waiting = page.waitForEvent("download");
  await workspace(page)
    .getByRole("button", { name: "전체 계산 결과 내보내기", exact: true })
    .click();
  const download = await waiting,
    path = await download.path();
  if (!path) throw new Error("native sequential export missing");
  return JSON.parse(await readFile(path, "utf8"));
}
async function seek(box: Locator, index: number) {
  const timeline = box.getByLabel("타임라인", { exact: true });
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
}

const ordered: NumericDataset = {
  kind: "numeric",
  featureNames: ["같은 X", "같은 Y", "실제 순차 특성 Z"],
  values: [
    [0, 0, 0],
    [0, 0, 0.6],
    [0, 0, 1.2],
  ],
};

test("three sequential Workers use full raw ND and true passes/defer, BSAS source order matters, projection does not; native all-row and seven-width checks", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.goto("#structured");
  const box = workspace(page);
  for (const algorithm of ["BSAS", "MBSAS", "TTSAS"] as const) {
    const params =
      algorithm === "TTSAS"
        ? { threshold: 0.4, upperThreshold: 1 }
        : { threshold: 1, maxClusters: 10 };
    const run = await runSource(page, algorithm, ordered, params),
      final = await showFinal(box, run.trace),
      a = final.analysis;
    if (a?.kind !== "sequential")
      throw new Error("real sequential analysis missing");
    expect(run.request.dataset).toEqual(ordered);
    expect(a.sourceValues).toEqual(ordered.values);
    expect(a.method).toBe(algorithm);
    expect(a.unassigned).toBe(0);
    expect(final.labels).toHaveLength(3);
    expect(final.labels.every((c) => c >= 0)).toBe(true);
    expect(a.counts.reduce((s, v) => s + v, 0)).toBe(3);
    expect(a.centroids.every((c) => c.length === 3)).toBe(true);
    const directSSE = ordered.values.reduce(
      (sum, row, i) =>
        sum +
        row.reduce(
          (s, value, j) => s + (value - a.centroids[final.labels[i]][j]) ** 2,
          0,
        ),
      0,
    );
    expect(a.objective).toBeCloseTo(directSSE, 11);
    const states = run.trace.steps.map((step, i) => ({
      step,
      state: stateAt(run.trace, i + 1),
    }));
    const distanceIndex =
      run.trace.steps.findIndex((step) => step.kind === "distance") + 1;
    expect(distanceIndex).toBeGreaterThan(0);
    await seek(box, distanceIndex);
    await expect(
      box.getByRole("img", { name: "순차 실제 거리와 임계값", exact: true }),
    ).toBeVisible();
    await expect(
      box.getByRole("table", { name: "순차 실제 거리 판정", exact: true }),
    ).toBeVisible();
    if (algorithm === "TTSAS") {
      await expect(
        box.getByRole("img", { name: "순차 실제 거리와 임계값", exact: true }),
      ).toContainText("하한");
      await expect(
        box.getByRole("img", { name: "순차 실제 거리와 임계값", exact: true }),
      ).toContainText("상한");
    }
    await seek(box, run.trace.steps.length);
    if (algorithm === "BSAS") {
      expect(a.centroids).toHaveLength(1);
      expect(a.centroids[0][2]).toBeCloseTo(0.6, 12);
      const reordered: NumericDataset = {
        ...ordered,
        values: [ordered.values[0], ordered.values[2], ordered.values[1]],
      };
      const changed = await runSource(page, algorithm, reordered, params),
        after = await showFinal(box, changed.trace);
      if (after.analysis?.kind !== "sequential")
        throw new Error("missing reordered state");
      expect(after.analysis.sourceValues).toEqual(reordered.values);
      expect(after.analysis.centroids).toHaveLength(2);
    } else if (algorithm === "MBSAS") {
      expect(
        states.some(
          (s) =>
            s.state.analysis?.kind === "sequential" &&
            s.state.analysis.pass === 2,
        ),
      ).toBe(true);
      expect(a.pass).toBe(2);
      expect(states.some((s) => s.step.kind === "defer")).toBe(true);
    } else {
      const held = states.find((s) => s.step.kind === "defer");
      expect(held).toBeDefined();
      if (held?.state.analysis?.kind !== "sequential")
        throw new Error("missing actual deferred state");
      expect(held.state.analysis.unassigned).toBeGreaterThan(0);
      expect(held.state.analysis.current).toBeDefined();
      expect(held.state.labels[held.state.analysis.current!]).toBeLessThan(0);
      const nearest = Math.min(
        ...held.state.analysis.distances!.map((v) => v.distance),
      );
      expect(nearest).toBeGreaterThan(0.4);
      expect(nearest).toBeLessThanOrEqual(1);
      expect(held.state.labels.some((c) => c < 0)).toBe(true);
      expect(a.pass).toBeGreaterThan(1);
      expect(
        states.some(
          (s) =>
            s.step.kind === "prototype" &&
            s.state.analysis?.kind === "sequential" &&
            s.state.analysis.pass > 1 &&
            s.state.analysis.phase === "force-create",
        ),
      ).toBe(true);
      const deferredPosition = states
        .map((s, i) => (s.step.kind === "defer" ? i + 1 : 0))
        .filter(Boolean)
        .at(-1)!;
      await seek(box, deferredPosition);
      await openData(box);
      await box.getByLabel("표시 Y 차원", { exact: true }).fill("3");
      await openAnalysis(box);
      await box.getByLabel("순차 표시 Y 차원", { exact: true }).fill("3");
      await page.screenshot({
        path: `test-results/sequential-ttsas-defer-${info.project.name}.png`,
        fullPage: true,
      });
      await openData(box);
      await box.getByLabel("표시 Y 차원", { exact: true }).fill("2");
      await openAnalysis(box);
      await box.getByLabel("순차 표시 Y 차원", { exact: true }).fill("2");
      await seek(box, run.trace.steps.length);
    }
    const last = await page.evaluate(() => window.sequentialRuns.at(-1)!),
      requests = await page.evaluate(() => window.sequentialRequests.length);
    await openData(box);
    await box.getByLabel("표시 Y 차원", { exact: true }).fill("3");
    await openAnalysis(box);
    await box.getByLabel("순차 표시 Y 차원", { exact: true }).fill("3");
    await expect(box.getByLabel("표시 Y 차원", { exact: true })).toHaveValue(
      "3",
    );
    expect(await page.evaluate(() => window.sequentialRequests.length)).toBe(
      requests,
    );
    expect(
      (await page.evaluate(() => window.sequentialRuns.at(-1)!)).trace.steps,
    ).toEqual(last.trace.steps);
    const out = await nativeExport(page),
      state = stateAt(last.trace, last.trace.steps.length);
    if (state.analysis?.kind !== "sequential")
      throw new Error("missing native state");
    expect(out.output.kind).toBe("sequential-partition");
    expect(out.input).toEqual(last.request.dataset);
    expect(out.output.labels).toEqual(state.labels);
    expect(out.output.centroids).toEqual(state.analysis.centroids);
    expect(out.output.counts).toEqual(state.analysis.counts);
    expect(out.output.prototypeCounts).toEqual(state.analysis.prototypeCounts);
    expect(out.output.passes).toBe(state.analysis.pass);
    expect(out.output.unassigned).toBe(0);
    expect(out.output.assignedSSE).toBe(state.analysis.objective);
  }
  let referenceWidth: number | undefined;
  for (const scale of [1, 1e308]) {
    const extreme: NumericDataset = {
        kind: "numeric",
        values: [
          [0, 0, 0],
          [scale, 0, 0],
        ],
      },
      run = await runSource(page, "BSAS", extreme, {
        threshold: 0,
        maxClusters: 2,
      });
    await showFinal(box, run.trace);
    const position =
      run.trace.steps.findIndex((s) => s.kind === "distance") + 1;
    await seek(box, position);
    const chart = box.getByRole("img", {
        name: "순차 실제 거리와 임계값",
        exact: true,
      }),
      widths = await chart
        .locator("rect")
        .evaluateAll((elements) =>
          elements.map((el) => Number(el.getAttribute("width"))),
        );
    expect(widths).toHaveLength(1);
    expect(Number.isFinite(widths[0])).toBe(true);
    expect(widths[0]).toBeGreaterThan(100);
    expect(widths[0]).toBeLessThan(540);
    if (referenceWidth === undefined) referenceWidth = widths[0];
    else expect(widths[0]).toBeCloseTo(referenceWidth, 10);
  }
  const many: NumericDataset = {
      kind: "numeric",
      values: Array.from({ length: 1001 }, (_, i) => [
        0,
        0,
        i === 1000 ? 4 : 0,
      ]),
    },
    large = await runSource(page, "BSAS", many, {
      threshold: 0.5,
      maxClusters: 64,
    }),
    end = await showFinal(box, large.trace);
  if (end.analysis?.kind !== "sequential")
    throw new Error("missing all-row state");
  expect(end.analysis.sourceValues).toHaveLength(1001);
  expect(end.labels).toHaveLength(1001);
  expect(end.analysis.counts).toEqual([1000, 1]);
  expect(end.labels[1000]).not.toBe(end.labels[0]);
  expect(end.analysis.unassigned).toBe(0);
  const all = await nativeExport(page);
  expect(all.computedRows).toBe(1001);
  expect(all.sourceDimensions).toBe(3);
  expect(all.output.counts.reduce((s: number, v: number) => s + v, 0)).toBe(
    1001,
  );
  for (const width of [1920, 1440, 1024, 800, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await openAnalysis(box);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await expect(box.locator(".sequential-analysis")).toBeVisible();
  }
  await page.screenshot({
    path: `test-results/sequential-all-source-${info.project.name}.png`,
    fullPage: true,
  });
});

test("three sequential guide minis transfer raw source, changed thresholds and selected real event to the structured Worker", async ({
  page,
}) => {
  test.setTimeout(180000);
  for (const name of ["BSAS", "MBSAS", "TTSAS"] as const) {
    await page.goto("#guide");
    const guide = page.locator(".guide-page"),
      before = await count(page);
    await guide
      .getByRole("navigation", { name: "알고리즘 가이드 목록", exact: true })
      .getByRole("button", { name, exact: true })
      .click();
    const mini = guide.locator(".trace-lesson");
    await expect(mini.getByLabel("재생", { exact: true })).toBeEnabled();
    const initial = await completed(page, before, name);
    expect(initial.request.dataset?.kind).toBe("numeric");
    const settings = mini.locator(".lesson-settings");
    if ((await settings.getAttribute("open")) === null)
      await settings.locator(":scope > summary").click();
    const target =
      name === "TTSAS" ? { upperThreshold: 3 } : { maxClusters: 7 };
    const label = name === "TTSAS" ? "생성 상한 θ₂" : "최대 군집 수 q";
    const changedBefore = await count(page);
    await mini
      .getByLabel(label, { exact: true })
      .fill(name === "TTSAS" ? "3" : "7");
    const changed = await completed(page, changedBefore, name, target);
    const event = name === "BSAS" ? "assign" : "defer",
      position = changed.trace.steps.findIndex((s) => s.kind === event) + 1;
    expect(position).toBeGreaterThan(0);
    const row = mini.locator(".event-links > div").filter({
      has: page.getByRole("button", { name: `${event} 보기`, exact: true }),
    });
    await row
      .getByRole("button", { name: `${event} 보기`, exact: true })
      .click();
    await expect(mini.getByLabel("타임라인", { exact: true })).toHaveValue(
      String(position),
    );
    const transferBefore = await count(page);
    await row
      .getByRole("button", { name: "이 단계 실험에서 보기 ↗", exact: true })
      .click();
    const box = workspace(page);
    await expect(box.getByLabel("알고리즘 선택", { exact: true })).toHaveText(
      name,
    );
    const moved = await completed(page, transferBefore, name, target);
    expect(moved.request.dataset).toEqual(changed.request.dataset);
    expect(moved.request.params).toEqual(changed.request.params);
    expect(
      JSON.parse(
        await box.getByLabel("원본 데이터 JSON", { exact: true }).inputValue(),
      ).data,
    ).toEqual(changed.request.dataset);
    expect(moved.trace.initial).toEqual(changed.trace.initial);
    expect(moved.trace.steps).toEqual(changed.trace.steps);
    expect(stateAt(moved.trace, moved.trace.steps.length)).toEqual(
      stateAt(changed.trace, changed.trace.steps.length),
    );
    await expect(box.getByLabel("타임라인", { exact: true })).toHaveValue(
      String(position),
    );
    await expect(box.locator(".step-explanation")).toHaveText(
      changed.trace.steps[position - 1].description,
    );
  }
});
