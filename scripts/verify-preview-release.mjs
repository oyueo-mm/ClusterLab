import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";

const url =
  process.env.CLUSTERLAB_PUBLIC_URL ?? "https://oyueo-mm.github.io/ClusterLab/";
const directory =
  process.env.CLUSTERLAB_EVIDENCE_DIR ?? "docs/preview-scale/public";
const algorithms = [
  "K-Means",
  "DBSCAN",
  "Spectral Clustering",
  "GMM",
  "Growing Neural Gas",
  "Bimax",
  "DenStream",
  "MBSAS",
];
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const evidence = [];
try {
  for (const width of [1440, 390]) {
    const device = width > 800 ? "desktop" : "mobile";
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      isMobile: width < 801,
      hasTouch: width < 801,
    });
    await context.addInitScript(() => {
      globalThis.__clips = {};
      globalThis.__draws = 0;
      globalThis.__times = [];
      const Native = globalThis.Worker;
      globalThis.Worker = class extends Native {
        constructor(...args) {
          super(...args);
          this.addEventListener("message", (event) => {
            if (event.data.preview)
              globalThis.__clips[this.algorithm] = event.data.preview;
          });
        }
        postMessage(message, options) {
          if (message.purpose === "thumbnail")
            this.algorithm = message.algorithm;
          super.postMessage(message, options);
        }
      };
      const clear = globalThis.CanvasRenderingContext2D.prototype.clearRect;
      globalThis.CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        if (this.canvas.closest(".algorithm-preview")) globalThis.__draws++;
        return clear.apply(this, args);
      };
      function tick(time) {
        globalThis.__times.push(time);
        globalThis.requestAnimationFrame(tick);
      }
      globalThis.requestAnimationFrame(tick);
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const [i, algorithm] of algorithms.entries()) {
      const response = await page.goto(
        `${url}#/catalog?q=${encodeURIComponent(algorithm)}`,
      );
      assert.equal(response.status(), 200);
      const preview = page
        .getByRole("img", {
          name: `${algorithm} 실제 Trace 주요 단계 미리보기`,
          exact: true,
        })
        .locator("../..");
      await preview.scrollIntoViewIfNeeded();
      await expect(preview).toHaveAttribute("data-preview-status", "computed");
      await page.waitForFunction((name) => !!globalThis.__clips[name], algorithm);
      const clip = await page.evaluate((name) => {
        const clip = globalThis.__clips[name];
        return {
          events: clip.events,
          frames: clip.frames.map((frame) => ({
            index: frame.index,
            kind: frame.kind,
          })),
          computationMs: clip.elapsed,
        };
      }, algorithm);
      const target = clip.frames[Math.floor(clip.frames.length / 2)].index;
      const canvas = preview.locator("canvas");
      for (const [stage, index] of [
        ["initial", 0],
        ["middle", target],
        ["final", clip.events],
      ]) {
        await expect(preview).toHaveAttribute(
          "data-preview-frame",
          String(index),
          { timeout: 12000 },
        );
        await preview.screenshot({
          path: `${directory}/${device}-${i}-${stage}.png`,
        });
        const pixels = await canvas.evaluate((element) => {
          const pixels = element
            .getContext("2d")
            .getImageData(0, 0, element.width, element.height).data;
          return pixels.some((value, i) => i % 4 === 3 && value > 0);
        });
        assert.equal(pixels, true);
      }
      const measured = await page.evaluate(() => {
        const times = globalThis.__times,
          gaps = times.slice(1).map((v, i) => v - times[i]);
        return {
          rafFPS: ((times.length - 1) * 1000) / (times.at(-1) - times[0]),
          maxRafGapMs: Math.max(...gaps),
          canvasDraws: globalThis.__draws,
          usedJSHeapSize: globalThis.performance.memory?.usedJSHeapSize,
        };
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(preview).toHaveAttribute("data-preview-motion", "reduced");
      const draws = await page.evaluate(() => globalThis.__draws);
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => globalThis.__draws), draws);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      evidence.push({
        device,
        width,
        algorithm,
        ...clip,
        ...measured,
        stagesVerified: [0, target, clip.events],
        reducedMotion: "static final",
      });
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  `${directory}/verification.json`,
  JSON.stringify(
    { url, checkedAt: new Date().toISOString(), evidence },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  `Verified ${evidence.length} public algorithm/device combinations, initial/middle/final and reduced motion.\n`,
);
