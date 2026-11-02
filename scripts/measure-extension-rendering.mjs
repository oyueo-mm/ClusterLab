/* global process,window,performance,requestAnimationFrame,devicePixelRatio,console */
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base =
    process.env.CLUSTERLAB_BASE_URL || "http://127.0.0.1:4476/ClusterLab/",
  scope = process.argv[2] || "local",
  browser = await chromium.launch(),
  records = [];
for (const algorithm of ["PCKMeans", "Possibilistic C-Means"]) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.addInitScript(() => {
    window.renderRuns = [];
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(request, ...args) {
        this.request = request;
        this.started = performance.now();
        return super.postMessage(request, ...args);
      }
      constructor(url, o) {
        super(url, o);
        this.addEventListener("message", (e) => {
          if (!e.data.trace) return;
          const trace = e.data.trace,
            a = {};
          for (const step of trace.steps)
            for (const change of step.analysisDelta?.changes || [])
              a[change.key] = change.after;
          window.renderRuns.push({
            algorithm: this.request.algorithm,
            params: this.request.params,
            n:
              this.request.dataset.kind === "constrained"
                ? this.request.dataset.data.values.length
                : this.request.dataset.values.length,
            dimensions: a.dimensions,
            returnedRows:
              a.kind === "possibilistic"
                ? a.typicalities.length
                : a.counts.reduce((s, v) => s + v, 0),
            workerComputationMs: trace.elapsed,
            workerWallMs: performance.now() - this.started,
            events: trace.steps.length,
            traceEstimatedBytes: trace.recording.estimatedBytes,
            recording: trace.recording.policy,
          });
        });
      }
    };
  });
  await page.goto(`${base}#/lab/${encodeURIComponent(algorithm)}`);
  const lab = page.locator(".structured-page");
  await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
  for (const n of [100, 1000]) {
    const values = Array.from({ length: n }, (_, i) =>
        Array.from(
          { length: 4 },
          (_, j) => (i < n / 2 ? 0 : 4) + 0.1 * Math.sin(i * 42 + j) + j * 0.01,
        ),
      ),
      dataset =
        algorithm === "PCKMeans"
          ? {
              kind: "constrained",
              data: { kind: "numeric", values },
              mustLink: [
                [0, 1],
                [Math.floor(n / 2), Math.floor(n / 2) + 1],
              ],
              cannotLink: [[0, n - 1]],
            }
          : { kind: "numeric", values };
    const dataButton = lab
      .locator(".workspace-toolbar")
      .getByLabel("데이터셋 편집", { exact: true });
    await dataButton.click();
    await lab
      .getByLabel("원본 데이터 JSON", { exact: true })
      .fill(JSON.stringify(dataset));
    const before = await page.evaluate(() => window.renderRuns.length);
    await lab.getByRole("button", { name: "데이터 적용", exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.renderRuns.length), {
        timeout: 30000,
      })
      .toBeGreaterThan(before);
    await lab.getByLabel("데이터 패널 닫기", { exact: true }).click();
    await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
    const actual = await page.evaluate(() => window.renderRuns.at(-1));
    if (actual.n !== n || actual.returnedRows !== n || actual.dimensions !== 4)
      throw Error("Actual UI source/output mismatch");
    const loop = lab.getByLabel("반복 재생", { exact: true });
    if ((await loop.getAttribute("aria-pressed")) !== "true")
      await loop.click();
    await lab.getByLabel("재생 속도", { exact: true }).fill("100");
    await lab.getByLabel("재생", { exact: true }).click();
    const frames = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const samples = [],
            start = performance.now();
          let last = start;
          const tick = (now) => {
            samples.push(now - last);
            last = now;
            if (now - start < 2200) requestAnimationFrame(tick);
            else resolve(samples);
          };
          requestAnimationFrame(tick);
        }),
    );
    await expect(lab.getByLabel("일시정지", { exact: true })).toBeVisible();
    const position = await lab
      .getByLabel("타임라인", { exact: true })
      .inputValue();
    await lab.getByLabel("일시정지", { exact: true }).click();
    const sorted = frames.slice(1).sort((a, b) => a - b),
      mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    records.push({
      ...actual,
      viewport: { width: 1440, height: 900 },
      dpr: await page.evaluate(() => devicePixelRatio),
      playback: {
        loop: true,
        activeAtEnd: true,
        speed: 100,
        position,
        frames: sorted.length,
        meanMs: mean,
        p95Ms: sorted[Math.floor(sorted.length * 0.95)],
        fps: 1000 / mean,
      },
    });
  }
  await page.close();
}
const output = {
  base,
  scope,
  browser: await browser.version(),
  scopeNote:
    "Actual UI source/Worker/Canvas rendering at 100 and 1000 rows; side panels closed, 2.2s looping real Trace. RAF cadence is not GPU timing or long-run performance. Worker wall excludes the UI debounce and input editing.",
  generator:
    "x[i,j]=(i<n/2?0:4)+0.1*sin(i*42+j)+j*0.01; d4; PCK ML(0,1),(floor(n/2),floor(n/2)+1), CL(0,n-1)",
  records,
};
await browser.close();
await mkdir("docs/extension-55", { recursive: true });
await writeFile(
  `docs/extension-55/${scope}-rendering-performance.json`,
  JSON.stringify(output, null, 2),
);
console.log(
  JSON.stringify(
    records.map((r) => ({
      algorithm: r.algorithm,
      n: r.n,
      workerMs: r.workerComputationMs,
      fps: r.playback.fps,
      p95Ms: r.playback.p95Ms,
    })),
    null,
    2,
  ),
);
