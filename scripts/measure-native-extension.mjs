// Real built Worker protocol and live UI measurements; no computation/result stubs.
/* global process, window, Worker, structuredClone, document, setTimeout, clearTimeout, performance, requestAnimationFrame, devicePixelRatio, console */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const algorithm = process.argv[2] || "PCKMeans",
  kind = process.argv[3] || "constrained",
  slug = process.argv[4] || "pckmeans";
const base =
  process.env.CLUSTERLAB_BASE_URL || "http://127.0.0.1:4476/ClusterLab/";
const browser = await chromium.launch(),
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      window.measureWorkerURL = String(url);
    }
  };
  const native = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (message, ...args) {
    if (message.algorithm && !message.purpose)
      window.measureRequest = structuredClone(message);
    return native.call(this, message, ...args);
  };
});
await page.goto(`${base}#/lab/${encodeURIComponent(algorithm)}`);
const lab = page.locator(".structured-page");
await lab.getByLabel("재생", { exact: true }).waitFor();
await page.waitForFunction(
  () =>
    window.measureRequest &&
    [...document.querySelectorAll('button[aria-label="재생"]')].some(
      (el) => !el.disabled && el.getClientRects().length,
    ),
);
const result = await page.evaluate(
  async ({ algorithm, kind }) => {
    const params = {
      ...window.measureRequest.params,
      k: 3,
      seed: 42,
      iterations: 10,
      tolerance: 1e-9,
    };
    const input = (n) => {
      const values = Array.from({ length: n }, (_, i) =>
        Array.from(
          { length: 4 },
          (_, j) =>
            (i < n / 3 ? 0 : i < (2 * n) / 3 ? 4 : 8) +
            0.1 * Math.sin(i * 42 + j) +
            j * 0.01,
        ),
      );
      return kind === "constrained"
        ? {
            kind,
            data: { kind: "numeric", values },
            mustLink: [
              [0, 1],
              [Math.floor(n / 2), Math.floor(n / 2) + 1],
            ],
            cannotLink: [[0, n - 1]],
          }
        : { kind: "numeric", values };
    };
    const samples = [];
    for (const n of [100, 1000]) {
      const sample = await new Promise((resolve, reject) => {
        const worker = new Worker(window.measureWorkerURL, { type: "module" }),
          start = performance.now();
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(Error("actual Worker timed out"));
        }, 30000);
        worker.onmessage = (event) => {
          if (event.data.error) {
            clearTimeout(timeout);
            worker.terminate();
            reject(Error(event.data.error));
          }
          const trace = event.data.trace;
          if (!trace) return;
          const a = {};
          for (const step of trace.steps)
            for (const change of step.analysisDelta?.changes || [])
              a[change.key] = change.after;
          clearTimeout(timeout);
          worker.terminate();
          resolve({
            n,
            dimensions: 4,
            k: 3,
            seed: 42,
            params,
            workerComputationMs: trace.elapsed,
            wallMs: performance.now() - start,
            events: trace.steps.length,
            traceEstimatedBytes: trace.recording.estimatedBytes,
            policy: trace.recording.policy,
            computedRows: trace.initial.labels.length,
            finalCounts: a.counts,
            objective: a.objective,
            mustLink: kind === "constrained" ? 2 : undefined,
            cannotLink: kind === "constrained" ? 1 : undefined,
            typicalityCells: kind === "numeric" ? n * 3 : undefined,
          });
        };
        worker.postMessage({
          id: 900 + n,
          algorithm,
          params,
          points: [],
          dataset: input(n),
        });
      });
      samples.push(sample);
    }
    const cancelled = await new Promise((resolve, reject) => {
      const worker = new Worker(window.measureWorkerURL, { type: "module" }),
        start = performance.now();
      let received = 0,
        at = 0;
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(Error("Worker did not expose real computing progress"));
      }, 30000);
      worker.onmessage = (event) => {
        if (event.data.trace || event.data.error) {
          received++;
          if (!at) {
            clearTimeout(timeout);
            worker.terminate();
            reject(
              Error(
                "Worker finished before cancellation: " +
                  (event.data.error || "trace"),
              ),
            );
          }
        }
        if (event.data.progress?.phase === "computing" && !at) {
          at = performance.now();
          worker.terminate();
          clearTimeout(timeout);
          setTimeout(
            () =>
              resolve({
                n: 100000,
                dimensions: 4,
                k: 8,
                terminatedAfterActualComputingProgress: true,
                startedToTerminateMs: at - start,
                noCompletionAfterTerminate: received === 0,
                observationMs: 250,
              }),
            250,
          );
        }
      };
      worker.postMessage({
        id: 999,
        algorithm,
        params: { ...params, k: 8, iterations: 1000 },
        points: [],
        dataset: input(100000),
      });
    });
    return { params, samples, cancelled };
  },
  { algorithm, kind },
);
await lab.getByLabel("재생 속도", { exact: true }).fill("100");
const before = await lab.getByLabel("타임라인", { exact: true }).inputValue();
await lab.getByLabel("재생", { exact: true }).click();
const frames = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const intervals = [],
        start = performance.now();
      let last = start;
      const tick = (now) => {
        intervals.push(now - last);
        last = now;
        if (now - start < 2200) requestAnimationFrame(tick);
        else resolve(intervals);
      };
      requestAnimationFrame(tick);
    }),
);
const after = await lab.getByLabel("타임라인", { exact: true }).inputValue();
const sorted = frames.slice(1).sort((a, b) => a - b),
  mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
const output = {
  base,
  algorithm,
  environment: {
    browser: await browser.version(),
    viewport: { width: 1440, height: 900 },
    dpr: await page.evaluate(() => devicePixelRatio),
  },
  scope:
    "Worker elapsed excludes input generation/transport; wall includes Worker module startup, message copy and response. Cached modules possible. RAF cadence is not GPU timing; 2.2s single observations.",
  generator: "x[i,j]=(i<n/3?0:i<2*n/3?4:8)+0.1*sin(i*42+j)+j*0.01",
  ...result,
  playback: {
    before,
    after,
    frames: sorted.length,
    meanMs: mean,
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
    maxMs: sorted.at(-1),
    fps: 1000 / mean,
  },
};
if (
  result.samples.some((s) => s.computedRows !== s.n) ||
  !result.cancelled.noCompletionAfterTerminate ||
  Number(after) <= Number(before)
)
  throw Error("Actual input/cancellation/playback measurement failed");
await mkdir("docs/research", { recursive: true });
await writeFile(
  `docs/research/${slug}-browser-performance.json`,
  JSON.stringify(output, null, 2),
);
await page.screenshot({ path: `docs/research/${slug}-browser-playback.png` });
await browser.close();
console.log(JSON.stringify(output, null, 2));
