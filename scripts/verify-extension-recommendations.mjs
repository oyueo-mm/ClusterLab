/* global process,window,document,innerWidth,console */
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base =
    process.env.CLUSTERLAB_BASE_URL || "http://127.0.0.1:4476/ClusterLab/",
  scope = process.argv[2] || "local",
  browser = await chromium.launch(),
  records = [];
for (const width of [1440, 390])
  for (const algorithm of ["PCKMeans", "Possibilistic C-Means"]) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
      }),
      page = await context.newPage();
    await page.addInitScript(() => {
      window.extensionRecommendationRuns = [];
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        postMessage(message, ...args) {
          this.request = message;
          return super.postMessage(message, ...args);
        }
        constructor(url, o) {
          super(url, o);
          this.addEventListener("message", (e) => {
            if (e.data.trace) {
              const trace = e.data.trace,
                last = trace.snapshots.at(-1),
                analysis = last?.state.analysis;
              window.extensionRecommendationRuns.push({
                algorithm: this.request.algorithm,
                params: this.request.params,
                source: this.request.dataset,
                events: trace.steps.length,
                traceEstimatedBytes: trace.recording.estimatedBytes,
                finalSnapshot: last?.index,
                analysisKind: analysis?.kind,
              });
            }
          });
        }
      };
    });
    await page.goto(`${base}#/lab/${encodeURIComponent(algorithm)}`);
    const lab = page.locator(".structured-page");
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
        (variant === 3 ? 24 : algorithm === "PCKMeans" ? 120 : 160)
      )
        throw Error("Recommendation source count mismatch");
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
        rewind: true,
      });
    }
    await context.close();
  }
await browser.close();
await mkdir("docs/extension-55", { recursive: true });
await writeFile(
  `docs/extension-55/${scope}-recommendation-browser.json`,
  JSON.stringify({ base, records }, null, 2),
);
console.log(
  `${records.length} recommended dataset computations and rewinds passed`,
);
