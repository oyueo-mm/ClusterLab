import { openData } from "./workspace-helpers";
import { test, expect, type Page } from "@playwright/test";
import { algorithms } from "../src/engine/types";
import { recommendations } from "../src/data/recommendations";
interface Metrics {
  active: number;
  max: number;
  draws: number;
  perCanvas: Record<string, number>;
  clips: {
    algorithm: string;
    frames: number;
    events: number;
    elapsed: number;
    bytes: number;
    hasTrace: boolean;
    finalDescription: string;
  }[];
}
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const metrics = {
      active: 0,
      max: 0,
      draws: 0,
      perCanvas: {} as Record<string, number>,
      clips: [] as object[],
    };
    Object.defineProperty(window, "__previewMetrics", { value: metrics });
    const Native = Worker;
    class MeasuredWorker extends Native {
      thumbnail = false;
      counted = false;
      postMessage(message: unknown, transfer: Transferable[]): void;
      postMessage(message: unknown, options?: StructuredSerializeOptions): void;
      postMessage(
        payload: unknown,
        options?: Transferable[] | StructuredSerializeOptions,
      ) {
        const message = payload as { purpose?: string; algorithm?: string };
        if (message.purpose === "thumbnail") {
          this.thumbnail = true;
          this.counted = true;
          metrics.active++;
          metrics.max = Math.max(metrics.max, metrics.active);
          this.addEventListener("message", (event) => {
            if (event.data.preview)
              metrics.clips.push({
                algorithm: message.algorithm,
                frames: event.data.preview.frames.length,
                events: event.data.preview.events,
                elapsed: event.data.preview.elapsed,
                bytes: JSON.stringify(event.data.preview).length,
                hasTrace: !!event.data.trace,
                finalDescription: event.data.preview.frames.at(-1).description,
              });
          });
        }
        if (Array.isArray(options)) super.postMessage(payload, options);
        else super.postMessage(payload, options);
      }
      terminate() {
        if (this.counted) {
          metrics.active--;
          this.counted = false;
        }
        super.terminate();
      }
    }
    window.Worker = MeasuredWorker;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.closest(".algorithm-preview")) {
        metrics.draws++;
        const name = this.canvas.getAttribute("aria-label")!;
        metrics.perCanvas[name] = (metrics.perCanvas[name] ?? 0) + 1;
      }
      return clear.apply(this, args);
    };
  });
}
async function metrics(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __previewMetrics: Metrics }).__previewMetrics,
  );
}

test("all 57 real Worker clips survive catalog scrolling and filters, with bounded Workers", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await instrument(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("#/catalog");
  await expect(page.locator(".candidate-preview")).toHaveCount(75);
  const previews = page.locator(".catalog-grid .algorithm-preview");
  await expect(previews).toHaveCount(57);
  for (let i = 0; i < 57; i++) {
    await previews.nth(i).scrollIntoViewIfNeeded();
    await expect(previews.nth(i)).toHaveAttribute(
      "data-preview-status",
      "computed",
      { timeout: 20000 },
    );
  }
  const complete = await metrics(page);
  expect(complete.clips).toHaveLength(57);
  expect(complete.max).toBeLessThanOrEqual(2);
  expect(complete.active).toBe(0);
  expect(
    complete.clips.every((c) => c.frames > 2 && c.frames <= 36 && !c.hasTrace),
  ).toBe(true);
  const heap = await page.evaluate(
    () =>
      (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize,
  );
  for (let i = 0; i < 12; i++) {
    await page.evaluate(
      (bottom) => window.scrollTo(0, bottom ? document.body.scrollHeight : 0),
      i % 2 === 0,
    );
  }
  await page.getByLabel("알고리즘 검색", { exact: true }).fill("K-Means");
  await page.getByLabel("알고리즘 검색", { exact: true }).fill("DBSCAN");
  await page.getByRole("button", { name: "필터 초기화" }).click();
  await previews.first().scrollIntoViewIfNeeded();
  await expect(previews.first()).toHaveAttribute(
    "data-preview-status",
    "computed",
  );
  const cached = await metrics(page);
  expect(cached.clips.length).toBe(57);
  expect(errors).toEqual([]);
  await info.attach("worker-and-memory", {
    body: JSON.stringify({ ...cached, mainThreadUsedJSHeapSize: heap }),
    contentType: "application/json",
  });
  await page.screenshot({
    path: `docs/preview-scale/catalog-${info.project.name}.png`,
  });
});

test("actual frames loop, stop offscreen/hidden, respect live reduced motion and animate home cards", async ({
  page,
}, info) => {
  await instrument(page);
  await page.goto("#/catalog?q=K-Means");
  const preview = page.locator(".algorithm-preview").first();
  await preview.scrollIntoViewIfNeeded();
  await expect(preview).toHaveAttribute("data-preview-status", "computed");
  await expect(preview).toHaveAttribute("data-preview-motion", "playing");
  const first = await preview.getAttribute("data-preview-frame");
  await expect
    .poll(() => preview.getAttribute("data-preview-frame"))
    .not.toBe(first);
  const start = await metrics(page);
  const raf = await page.evaluate(
    () =>
      new Promise<{ fps: number; maxGap: number }>((resolve) => {
        const times: number[] = [],
          start = performance.now();
        function tick(now: number) {
          times.push(now);
          if (now - start < 2000) requestAnimationFrame(tick);
          else
            resolve({
              fps: ((times.length - 1) * 1000) / (times.at(-1)! - times[0]),
              maxGap: Math.max(...times.slice(1).map((v, i) => v - times[i])),
            });
        }
        requestAnimationFrame(tick);
      }),
  );
  const end = await metrics(page);
  expect(
    Object.keys(end.perCanvas).filter(
      (key) => end.perCanvas[key] > (start.perCanvas[key] ?? 0),
    ).length,
  ).toBeLessThanOrEqual(4);
  await info.attach("render-performance", {
    body: JSON.stringify({
      ...raf,
      canvasDrawsInTwoSeconds: end.draws - start.draws,
      maxWorkers: end.max,
    }),
    contentType: "application/json",
  });
  const seen = await preview.evaluate(
    (element) =>
      new Promise<number[]>((resolve) => {
        const states: number[] = [];
        const observer = new MutationObserver(() =>
          states.push(Number(element.getAttribute("data-preview-frame"))),
        );
        observer.observe(element, {
          attributes: true,
          attributeFilter: ["data-preview-frame"],
        });
        setTimeout(() => {
          observer.disconnect();
          resolve(states);
        }, 6100);
      }),
  );
  expect(seen).toContain(0);
  expect(Math.max(...seen)).toBe(
    (await metrics(page)).clips.find((c) => c.algorithm === "K-Means")!.events,
  );
  expect(
    seen.some(
      (value, index) => value === 0 && index > 0 && seen[index - 1] > 0,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `docs/preview-scale/animated-${info.project.name}.png`,
  });
  // Simulate visibility at the browser API boundary: the runtime must cancel RAF immediately.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const hidden = await metrics(page);
  await page.waitForTimeout(300);
  expect((await metrics(page)).draws).toBe(hidden.draws);
  await page.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(async () => (await metrics(page)).draws)
    .toBeGreaterThan(hidden.draws);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(preview).toHaveAttribute("data-preview-motion", "reduced");
  await expect(preview.locator(".preview-status")).toContainText(
    (await metrics(page)).clips.find((c) => c.algorithm === "K-Means")!
      .finalDescription,
  );
  const reduced = await metrics(page);
  await page.waitForTimeout(300);
  expect((await metrics(page)).draws).toBe(reduced.draws);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(preview).toHaveAttribute("data-preview-motion", "paused");
  const outside = await preview.getAttribute("data-preview-frame");
  await page.waitForTimeout(300);
  expect(await preview.getAttribute("data-preview-frame")).toBe(outside);
  await page.goto("");
  const home = page.locator(".featured-grid .algorithm-preview").first();
  await home.scrollIntoViewIfNeeded();
  await expect(home).toHaveAttribute("data-preview-motion", "playing");
  await page.screenshot({
    path: `docs/preview-scale/home-${info.project.name}.png`,
  });
});

test("recommendation sizes allow presets and custom counts, retain small sequential lessons", async ({
  page,
}) => {
  await page.goto("#/lab/K-Means");
  await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
  await expect(
    page.getByLabel("실험실 실행 취소", { exact: true }),
  ).toBeDisabled();
  const originalCount = await page.locator(".point-count").textContent();
  const mobile = (page.viewportSize()?.width ?? 1440) < 801;
  if (mobile) await page.getByLabel("설정 열기", { exact: true }).click();
  await openData(page);
  await expect(page.getByLabel("추천 데이터 수")).toHaveValue(
    String(recommendations["K-Means"][0].count),
  );
  expect(
    await page.getByLabel("추천 데이터 수").getAttribute("max"),
  ).toBeNull();
  await page
    .locator(".recommendations")
    .getByRole("button", { name: "50", exact: true })
    .click();
  await expect(page.getByLabel("추천 데이터 수")).toHaveValue("50");
  await page
    .locator(".recommendations")
    .getByRole("button", { name: "1,000", exact: true })
    .click();
  await expect(page.getByLabel("추천 데이터 수")).toHaveValue("1000");
  await expect(page.locator(".point-count")).toHaveText(originalCount!);
  await page.getByLabel("추천 데이터 수").fill("321");
  await page.getByLabel("추천 데이터 수").blur();
  await expect(page.getByLabel("추천 데이터 수")).toHaveValue("321");
  await page
    .getByRole("button", { name: "이 데이터셋 적용", exact: true })
    .click();
  if (mobile)
    await page.getByLabel("데이터 패널 닫기", { exact: true }).click();
  await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
  await expect(page.locator(".point-count")).toHaveText("321 points");
  await openData(page);
  await page.getByLabel("실험실 실행 취소", { exact: true }).click();
  await expect(page.locator(".point-count")).toHaveText(originalCount!);
  await openData(page);
  await page.getByLabel("실험실 다시 실행", { exact: true }).click();
  await expect(page.locator(".point-count")).toHaveText("321 points");
  expect(
    algorithms
      .filter((a) => ["BSAS", "MBSAS", "TTSAS"].includes(a))
      .every((a) => recommendations[a][0].count === 12),
  ).toBe(true);
});
