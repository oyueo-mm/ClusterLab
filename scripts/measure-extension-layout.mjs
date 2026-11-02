/* global process,window,document,innerWidth,console */
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base =
    process.env.CLUSTERLAB_BASE_URL || "http://127.0.0.1:4476/ClusterLab/",
  scope = process.argv[2] || "local",
  folder = `docs/extension-55/${scope}-layout`;
await mkdir(folder, { recursive: true });
const browser = await chromium.launch(),
  records = [];
for (const algorithm of ["PCKMeans", "Possibilistic C-Means"]) {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.extensionLayoutRequests = 0;
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url, o) {
        super(url, o);
        this.addEventListener("message", (e) => {
          if (e.data.trace) {
            window.extensionActualInitial = e.data.trace.initial;
            window.extensionActualRecording = e.data.trace.recording;
          }
        });
      }
      postMessage(message, ...args) {
        if (message.algorithm && !message.purpose)
          window.extensionLayoutRequests++;
        window.extensionLayoutSource = message.dataset;
        return super.postMessage(message, ...args);
      }
    };
  });
  await page.goto(`${base}#/lab/${encodeURIComponent(algorithm)}`);
  const lab = page.locator(".structured-page");
  await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
  await lab.getByLabel("마지막으로", { exact: true }).click();
  const originalPosition = await lab
      .getByLabel("타임라인", { exact: true })
      .inputValue(),
    originalRequests = await page.evaluate(
      () => window.extensionLayoutRequests,
    );
  for (const width of [1920, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(lab.locator(".workspace-settings")).toBeHidden();
    const canvas = lab.locator("canvas"),
      rect = await canvas.boundingBox(),
      play = await lab.getByLabel("재생", { exact: true }).boundingBox(),
      overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
    if (
      !rect ||
      !play ||
      overflow ||
      play.y + play.height > 900 ||
      rect.height < 200
    )
      throw Error(`layout failed ${algorithm}/${width}`);
    await page.screenshot({
      path: `${folder}/${algorithm === "PCKMeans" ? "pck" : "pcm"}-${width}.png`,
    });
    records.push({
      algorithm,
      width,
      height: 900,
      canvas: rect,
      playback: play,
      settingsDefaultClosed: true,
      noHorizontalOverflow: !overflow,
      positionPreserved:
        (await lab.getByLabel("타임라인", { exact: true }).inputValue()) ===
        originalPosition,
    });
  }
  // Observe beyond the existing Worker debounce; resizing must not enqueue a new run.
  await page.waitForTimeout(180);
  const finalRequests = await page.evaluate(
    () => window.extensionLayoutRequests,
  );
  await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue(
    originalPosition,
  );
  if (finalRequests !== originalRequests)
    throw Error(`Resize restarted ${algorithm}`);
  records.push({
    algorithm,
    resizedSixWidthsWithoutNewComputation: true,
    workerRequestsBefore: originalRequests,
    workerRequestsAfter: finalRequests,
    position: originalPosition,
  });
  if (algorithm === "Possibilistic C-Means") {
    await page.setViewportSize({ width: 1440, height: 900 });
    const canvas = lab.locator("canvas"),
      rect = await canvas.boundingBox(),
      point = await page.evaluate(() => {
        const x = window.extensionLayoutSource.values,
          lo = [
            Math.min(...x.map((r) => r[0])),
            Math.min(...x.map((r) => r[1])),
          ],
          hi = [
            Math.max(...x.map((r) => r[0])),
            Math.max(...x.map((r) => r[1])),
          ];
        return {
          x: 0.1 + (0.8 * (x[0][0] - lo[0])) / (hi[0] - lo[0] || 1),
          y: 0.1 + (0.8 * (x[0][1] - lo[1])) / (hi[1] - lo[1] || 1),
        };
      });
    const scale = Math.min(rect.width - 70, rect.height - 60);
    await canvas.click({
      position: {
        x: (rect.width - scale) / 2 + point.x * scale,
        y: (rect.height - scale) / 2 + (1 - point.y) * scale,
      },
    });
    await expect(
      lab.getByLabel("선택 표본 전형성", { exact: true }),
    ).toBeVisible();
    await expect(lab.locator(".typicality-inspector meter")).toHaveCount(2);
    await page.screenshot({ path: `${folder}/pcm-point-inspector.png` });
    records.push({
      algorithm,
      actualPointClickOpensIndependentTypicalities: true,
    });
  }
  if (errors.length) throw Error(errors.join("\n"));
  await context.close();
}
await browser.close();
await writeFile(
  `${folder}/measurements.json`,
  JSON.stringify({ base, scope, records }, null, 2),
);
console.log(`${records.length} layout/point-click checks passed at ${base}`);
