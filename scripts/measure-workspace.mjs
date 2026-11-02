/* global document, window, innerWidth, innerHeight, devicePixelRatio, performance, requestAnimationFrame */
import process from "node:process";
import { log } from "node:console";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.WORKSPACE_URL ?? "http://127.0.0.1:4476/ClusterLab/";
const folder = base.startsWith("https:")
  ? "docs/workspace/public"
  : "docs/workspace/final";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch();
const output = {
  base,
  source: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  measuredAt: new Date().toISOString(),
  sizes: [],
  representations: [],
  performance: [],
  errors: [],
};
function audit(page) {
  page.on("pageerror", (e) =>
    output.errors.push({ url: page.url(), message: e.message }),
  );
}
async function metrics(page, label) {
  return page.evaluate((label) => {
    const root = [...document.querySelectorAll(".canvas-workspace")].find(
      (el) => el.getClientRects().length,
    );
    const box = (s) => {
      const el = root.querySelector(s);
      if (!el || !el.getClientRects().length) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const canvas = box(".canvas-workspace canvas") ?? box(".native-stage svg");
    const playback = box(".canvas-workspace .playback");
    return {
      label,
      width: innerWidth,
      height: innerHeight,
      dpr: devicePixelRatio,
      canvas,
      areaRatio: canvas
        ? (canvas.width * canvas.height) / (innerWidth * innerHeight)
        : 0,
      toolbar: box(".workspace-toolbar"),
      playback,
      playbackVisible:
        playback.y >= 0 && playback.y + playback.height <= innerHeight + 1,
      overflowX: document.documentElement.scrollWidth > innerWidth + 1,
      scrollHeight: document.documentElement.scrollHeight,
      backing: [
        root.querySelector("canvas")?.width,
        root.querySelector("canvas")?.height,
      ],
    };
  }, label);
}
for (const width of [1920, 1440, 1024, 800, 768, 390, 320]) {
  const context = await browser.newContext({
      viewport: { width, height: 900 },
    }),
    page = await context.newPage();
  audit(page);
  await page.goto(base + "#/lab/K-Means");
  await page.getByLabel("재생", { exact: true }).waitFor({ state: "visible" });
  await page.waitForFunction(
    () => !document.querySelector('.lab-page [aria-label="재생"]').disabled,
  );
  await page.waitForTimeout(300);
  output.sizes.push(await metrics(page, "default"));
  await page.screenshot({ path: `${folder}/default-${width}.png` });
  await page
    .locator(".workspace-toolbar")
    .getByLabel("데이터셋 편집", { exact: true })
    .click();
  if (
    width > 800 &&
    (await page
      .getByLabel("설정 열기", { exact: true })
      .getAttribute("aria-expanded")) === "false"
  )
    await page.getByLabel("설정 열기", { exact: true }).click();
  await page.waitForTimeout(100);
  output.sizes.push(await metrics(page, "panels"));
  if ([1920, 1440, 390].includes(width))
    await page.screenshot({ path: `${folder}/panels-${width}.png` });
  await page.getByLabel("시각화 집중 모드", { exact: true }).click();
  await page.waitForTimeout(100);
  output.sizes.push(await metrics(page, "focus"));
  if ([1920, 1440, 390].includes(width))
    await page.screenshot({ path: `${folder}/focus-${width}.png` });
  await page.keyboard.press("Escape");
  if (await page.getByLabel("집중 모드 종료", { exact: true }).count())
    throw Error("focus Escape failed");
  await context.close();
}
const representatives = [
  "DBSCAN",
  "AGNES",
  "Growing Neural Gas",
  "Louvain",
  "Bimax",
  "K-Shape",
  "DenStream",
  "COP-KMeans",
  "CLIQUE",
  "K-Prototypes",
  "Bernoulli Mixture",
];
for (const width of [1440, 390])
  for (const algorithm of representatives) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
      }),
      page = await context.newPage();
    audit(page);
    await page.goto(base + "#/lab/" + encodeURIComponent(algorithm));
    const lab = page.locator(".canvas-workspace:visible");
    await lab.getByLabel("재생", { exact: true }).waitFor();
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll(".canvas-workspace")].some(
          (root) =>
            root.getClientRects().length &&
            !root.querySelector('[aria-label="재생"]').disabled,
        ),
      {},
      { timeout: 45000 },
    );
    const timeline = lab.getByLabel("타임라인", { exact: true }),
      max = Number(await timeline.getAttribute("max"));
    await timeline.fill(String(Math.floor(max / 2)));
    await page.waitForTimeout(150);
    output.representations.push({
      ...(await metrics(page, algorithm)),
      events: max,
      mid: Number(await timeline.inputValue()),
    });
    await page.screenshot({
      path: `${folder}/${algorithm.replaceAll(/[^a-z0-9]/gi, "-")}-${width}.png`,
    });
    await lab.getByLabel("마지막으로", { exact: true }).click();
    await lab.getByLabel("한 단계 뒤로", { exact: true }).click();
    if (Number(await timeline.inputValue()) !== max - 1)
      throw Error("rewind failed " + algorithm);
    await context.close();
  }
for (const dpr of [1, 2]) {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: dpr,
    }),
    page = await context.newPage();
  audit(page);
  await page.addInitScript(() => {
    window.workspaceJobs = 0;
    const WorkerBase = window.Worker;
    window.Worker = class extends WorkerBase {
      postMessage(message, options) {
        if (message.algorithm) window.workspaceJobs++;
        super.postMessage(message, options ?? []);
      }
    };
  });
  await page.goto(base + "#/lab/K-Means");
  await page.waitForFunction(() => {
    const b = document.querySelector('.lab-page [aria-label="재생"]');
    return b && !b.disabled;
  });
  await page.getByLabel("재생", { exact: true }).click();
  await page.waitForTimeout(1000);
  const before = await page.evaluate(() => window.workspaceJobs);
  await page.evaluate(() => {
    window.frameTimes = [];
    window.captureFrames = true;
    let last = performance.now();
    const frame = (now) => {
      if (!window.captureFrames) return;
      window.frameTimes.push(now - last);
      last = now;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  const separator = page.getByRole("separator", { name: "설정 패널 너비" }),
    r = await separator.boundingBox();
  await page.mouse.move(r.x + 4, r.y + 80);
  await page.mouse.down();
  for (let i = 0; i < 90; i++) {
    await page.mouse.move(r.x + Math.sin(i / 12) * 100, r.y + 80);
    await page.waitForTimeout(12);
  }
  await page.mouse.up();
  const result = await page.evaluate(() => {
    window.captureFrames = false;
    const t = window.frameTimes.slice(1).sort((a, b) => a - b);
    return {
      frames: t.length,
      meanMs: t.reduce((s, v) => s + v, 0) / t.length,
      p95Ms: t[Math.floor(t.length * 0.95)],
      maxMs: t.at(-1),
      jobs: window.workspaceJobs,
    };
  });
  output.performance.push({
    dpr,
    beforeJobs: before,
    ...result,
    geometry: await metrics(page, "drag"),
  });
  if (result.jobs !== before) throw Error("resize restarted computation");
  await context.close();
}
await browser.close();
await writeFile(`${folder}/measurements.json`, JSON.stringify(output, null, 2));
log(
  JSON.stringify(
    {
      folder,
      sizes: output.sizes.length,
      representations: output.representations.length,
      performance: output.performance,
      errors: output.errors,
    },
    null,
    2,
  ),
);
if (
  output.errors.length ||
  output.sizes.some(
    (s) => s.overflowX || !s.playbackVisible || s.scrollHeight > 901,
  )
)
  process.exitCode = 1;
