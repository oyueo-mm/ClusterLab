/* global process,window,document,innerWidth,console,performance */
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base =
    process.env.CLUSTERLAB_BASE_URL || "http://127.0.0.1:4476/ClusterLab/",
  scope = process.argv[2] || "local",
  output = process.argv[3] || "docs/extension-55",
  observeStartup = process.argv[5] === "--observe-worker-startup",
  algorithms = process.argv[4]?.split(",") || [
    "PCKMeans",
    "Possibilistic C-Means",
  ],
  browser = await chromium.launch(),
  records = [],
  startupRecords = [];
for (const width of [1440, 390])
  for (const algorithm of algorithms) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
      }),
      page = await context.newPage();
    await page.addInitScript(() => {
      window.extensionRecommendationRuns = [];
      window.initialWorkerTimings = [];
      window.initialWorkerErrors = [];
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        postMessage(message, ...args) {
          this.request = message;
          this.started = performance.now();
          return super.postMessage(message, ...args);
        }
        constructor(url, o) {
          super(url, o);
          this.addEventListener("message", (e) => {
            if (e.data.progress)
              window.initialWorkerTimings.push({
                algorithm: this.request.algorithm,
                phase: e.data.progress.phase,
                wallMs: performance.now() - this.started,
              });
            if (e.data.error) window.initialWorkerErrors.push(e.data.error);
            if (e.data.trace) {
              const trace = e.data.trace,
                last = trace.snapshots.at(-1),
                analysis = {};
              for (const step of trace.steps)
                for (const change of step.analysisDelta?.changes || [])
                  analysis[change.key] = change.after;
              window.extensionRecommendationRuns.push({
                algorithm: this.request.algorithm,
                params: this.request.params,
                source: this.request.dataset,
                events: trace.steps.length,
                traceEstimatedBytes: trace.recording.estimatedBytes,
                finalSnapshot: last?.index,
                analysisKind: analysis?.kind,
                outputRows: analysis.counts?.reduce((s, v) => s + v, 0),
                typicalityRows: analysis.typicalities?.length,
                uRowSums: analysis.uRowSums,
                tColumnSums: analysis.tColumnSums,
                metrics: analysis.metrics,
                workerElapsedMs: trace.elapsed,
                workerWallMs: performance.now() - this.started,
              });
            }
          });
        }
      };
    });
    await page.goto(`${base}#/lab/${encodeURIComponent(algorithm)}`);
    const lab = page.locator(".structured-page");
    if (observeStartup) {
      // Optional cold-start observation, not a sub-5s startup claim. Preserve the
      // existing 5s UI assertion below; first await the original Worker response
      // using the same 30s bound as the independent Worker measurement tool.
      await page.waitForFunction(
        () =>
          window.extensionRecommendationRuns.length > 0 ||
          window.initialWorkerErrors.length > 0,
        undefined,
        { timeout: 30000 },
      );
      const startup = await page.evaluate(() => ({
        timings: window.initialWorkerTimings,
        errors: window.initialWorkerErrors,
        worker: window.extensionRecommendationRuns[0],
      }));
      if (startup.errors.length) throw Error(JSON.stringify(startup.errors));
      const diagnostic = {
        width,
        algorithm,
        workerElapsedMs: startup.worker.workerElapsedMs,
        workerWallMs: startup.worker.workerWallMs,
        timings: startup.timings,
      };
      startupRecords.push(diagnostic);
      console.log(JSON.stringify({ startup: diagnostic }));
    }
    await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
    for (let variant = 0; variant < 4; variant++) {
      const toggle = lab
        .locator(".workspace-toolbar")
        .getByLabel("데이터셋 편집", { exact: true });
      if ((await toggle.getAttribute("aria-expanded")) !== "true")
        await toggle.click();
      await lab
        .getByLabel("추천 데이터셋", { exact: true })
        .selectOption(String(variant));
      await lab.getByLabel("추천 파라미터도 적용", { exact: true }).check();
      const count = await page.evaluate(
        () => window.extensionRecommendationRuns.length,
      );
      await lab
        .getByRole("button", { name: "이 데이터셋 적용", exact: true })
        .click();
      await expect
        .poll(() =>
          page.evaluate(() => window.extensionRecommendationRuns.length),
        )
        .toBeGreaterThan(count);
      const actual = await page.evaluate(() =>
        window.extensionRecommendationRuns.at(-1),
      );
      if (actual.algorithm !== algorithm || !actual.events)
        throw Error("Missing actual recommended computation");
      await lab.getByLabel("데이터 패널 닫기", { exact: true }).click();
      await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
      await lab.getByLabel("마지막으로", { exact: true }).click();
      await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue(
        String(actual.events),
      );
      await lab.getByLabel("한 단계 뒤로", { exact: true }).click();
      await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue(
        String(actual.events - 1),
      );
      const values =
        actual.source.kind === "constrained"
          ? actual.source.data.values
          : actual.source.values;
      if (
        values.length !==
        (variant === 3
          ? 24
          : ["PCKMeans", "MPCKMeans", "Fuzzy Possibilistic C-Means"].includes(
                algorithm,
              )
            ? 120
            : 160)
      )
        throw Error("Recommendation source count mismatch");
      if (actual.outputRows !== values.length)
        throw Error("Actual native result does not include every source row");
      if (
        algorithm === "Fuzzy Possibilistic C-Means" &&
        (actual.typicalityRows !== values.length ||
          actual.uRowSums.some((v) => Math.abs(v - 1) > 1e-8) ||
          actual.tColumnSums.some((v) => Math.abs(v - 1) > 1e-8))
      )
        throw Error("FPCM actual row/column constraints mismatch");
      if (
        algorithm === "MPCKMeans" &&
        (!actual.metrics?.flat().every((v) => v > 0 && Number.isFinite(v)) ||
          (variant === 3 && actual.params.metricConditioning <= 0))
      )
        throw Error("Actual positive metric/explicit conditioning missing");
      if (
        algorithm === "Possibilistic C-Means" &&
        variant === 3 &&
        actual.params.pcmScaleMode !== "manual"
      )
        throw Error(
          "Degenerate recommendation needs explicit positive manual scale",
        );
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
      )
        throw Error("Overflow");
      records.push({
        width,
        algorithm,
        variant,
        rows: values.length,
        dimensions: values[0].length,
        events: actual.events,
        traceEstimatedBytes: actual.traceEstimatedBytes,
        sourceKind: actual.source.kind,
        scaleMode: actual.params.pcmScaleMode,
        fullActualWorker: true,
        outputRows: actual.outputRows,
        analysisKind: actual.analysisKind,
        tColumnSums: actual.tColumnSums,
        metricConditioning:
          algorithm === "MPCKMeans"
            ? actual.params.metricConditioning
            : undefined,
        rewind: true,
      });
    }
    await context.close();
  }
await browser.close();
await mkdir(output, { recursive: true });
await writeFile(
  `${output}/${scope}-recommendation-browser.json`,
  JSON.stringify(
    {
      base,
      records,
      ...(observeStartup
        ? {
            startupRecords,
            standaloneUiReadyAssertionMs: 5000,
            precondition:
              "actual original Worker response, bounded30s; not a sub5s cold-start claim; regression timeouts unchanged",
          }
        : {}),
    },
    null,
    2,
  ),
);
console.log(
  `${records.length} recommended dataset computations and rewinds passed`,
);
