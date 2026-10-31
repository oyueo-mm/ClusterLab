import { test, expect } from "@playwright/test";
import { algorithms } from "../src/engine/types";
import type { Trace } from "../src/engine/types";
import { homeRounds } from "../src/data/homeRounds";
interface Ellipse {
  rx: number;
  ry: number;
  transform: number[];
}
declare global {
  interface Window {
    v04Frames: Record<string, Ellipse[]>;
    v04Traces: Record<string, Trace>;
  }
}
test("compact task pages retain controls and consistently show Korean preset names", async ({
  page,
}, info) => {
  await page.goto("#data");
  await expect(page.locator(".data-page .page-heading")).toHaveCount(0);
  await expect(
    page
      .locator(".editor-toolbar")
      .getByRole("button", { name: "이 데이터로 실험" }),
  ).toBeVisible();
  await expect(page.locator(".preset-card")).toHaveCount(32);
  const names = await page.locator(".preset-card h3").allTextContents();
  expect(names.every((n) => /[가-힣]/.test(n))).toBe(true);
  await page.getByLabel("프리셋 검색").fill("초승달");
  await expect(page.locator(".preset-card")).toHaveCount(2);
  await page.getByLabel("프리셋 검색").fill("가우시안");
  await page.locator(".preset-card").click();
  await page.getByRole("button", { name: "이 데이터로 실험" }).click();
  await expect(page.getByLabel("실험 프리셋")).toHaveValue("blobs");
  await expect(
    page.getByLabel("실험 프리셋").locator("option:checked"),
  ).toHaveText("가우시안 군집");
  await page.goto("#compare");
  await expect(page.locator(".compare-page .page-heading")).toHaveCount(0);
  await expect(
    page
      .locator(".compare-controls")
      .getByRole("button", { name: /모두 처음부터 재생/ }),
  ).toBeVisible();
  await expect(
    page.getByLabel("공통 데이터셋").locator("option:checked"),
  ).toHaveText("가우시안 군집");
  await page.screenshot({
    path: `test-results/v04-compare-${info.project.name}.png`,
    fullPage: true,
  });
});
test("all executable textbooks render math and real events, switch levels, navigate sections and open lab/comparison", async ({
  page,
}, info) => {
  await page.goto("#guide");
  await expect(
    page.getByRole("heading", { name: "알고리즘 가이드", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".guide-nav button")).toHaveCount(algorithms.length);
  for (const algorithm of algorithms) {
    await page
      .locator(".guide-nav")
      .getByRole("button", { name: algorithm, exact: true })
      .click();
    await expect(page.locator(".lesson-header h1")).toHaveText(algorithm);
    await expect(page.locator(".guide-article section[id]")).toHaveCount(10);
    await expect(page.locator(".katex-mathml math").first()).toBeAttached();
    await expect(page.locator(".katex-error")).toHaveCount(0);
    await expect(page.locator(".equation-card details")).toHaveCount(0);
    await page.getByRole("button", { name: "심화", exact: true }).click();
    await page
      .locator(".equation-card details")
      .first()
      .locator("summary")
      .click();
    await expect(
      page.locator(".equation-card details").first(),
    ).toHaveAttribute("open", "");
    expect(
      await page.locator("#lesson-references a").count(),
    ).toBeGreaterThanOrEqual(2);
    const demo = page.locator(".trace-lesson");
    await expect(demo.getByLabel("재생", { exact: true })).toBeEnabled();
    const event = demo
      .locator(".event-links button")
      .filter({ hasText: / 보기$/ })
      .first();
    await event.click();
    expect(
      Number(await demo.getByLabel("타임라인", { exact: true }).inputValue()),
    ).toBeGreaterThan(0);
    await page.getByRole("button", { name: "기초", exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await page
    .locator(".guide-nav")
    .getByRole("button", { name: "GMM", exact: true })
    .click();
  const toc =
    info.project.name === "mobile"
      ? page.locator(".mobile-toc")
      : page.locator(".desktop-toc");
  if (info.project.name === "mobile") await toc.locator("summary").click();
  await toc.getByRole("link", { name: /수학적 원리/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#lesson-mathematics")).toBeFocused();
  await expect(toc.getByRole("link", { name: /수학적 원리/ })).toHaveAttribute(
    "aria-current",
    "location",
  );
  await page.screenshot({
    path: `test-results/v04-guide-${info.project.name}.png`,
    fullPage: true,
  });
  const demo = page.locator(".trace-lesson");
  await expect(demo.getByLabel("재생", { exact: true })).toBeEnabled();
  await demo
    .locator(".event-links>div")
    .filter({ hasText: "maximization 보기" })
    .getByRole("button", { name: "이 단계 실험에서 보기" })
    .click();
  await expect(page.getByLabel("알고리즘 선택")).toHaveValue("GMM");
  await expect(page.locator(".event-tag")).toHaveText("maximization");
  await expect(page.locator(".toast[role=status]")).toContainText("실제 이벤트");
  await page.reload();
  await expect(page.getByLabel("알고리즘 선택")).toBeVisible();
  await page.goto("#guide");
  await page.getByRole("button", { name: "두 알고리즘 비교" }).first().click();
  await expect(page.locator(".compare-heading select").first()).toHaveValue(
    "K-Means",
  );
  await expect(page.locator(".compare-heading select").nth(1)).toHaveValue(
    "PAM",
  );
});
test("real Worker GMM renders initialization, E/M covariance motion and final ellipses in every home round", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Full cycle requires all cards visible; minimal renderer and mobile guide are tested separately.",
  );
  test.setTimeout(260000);
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    // Force the lifecycle ordering that broke precomputed next-round GMM cards:
    // rAF fires before the first measured ResizeObserver viewport is delivered.
    const NativeResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends NativeResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super((entries, observer) =>
          setTimeout(() => callback(entries, observer), 100),
        );
      }
    };
    window.v04Frames = {};
    window.v04Traces = {};
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      window.v04Frames[this.canvas.getAttribute("aria-label") ?? ""] = [];
      return clear.apply(this, args);
    };
    const ellipse = CanvasRenderingContext2D.prototype.ellipse;
    CanvasRenderingContext2D.prototype.ellipse = function (...args) {
      const m = this.getTransform();
      window.v04Frames[this.canvas.getAttribute("aria-label") ?? ""]?.push({
        rx: args[2],
        ry: args[3],
        transform: [m.a, m.b, m.c, m.d, m.e, m.f],
      });
      return ellipse.apply(this, args);
    };
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown) {
      this.addEventListener("message", (e) => {
        if (e.data.trace)
          window.v04Traces[e.data.trace.algorithm] = e.data.trace;
      });
      return post.call(this, message);
    };
  });
  await page.goto("");
  const evidence = [];
  for (let i = 0; i < homeRounds.length; i++) {
    await expect(page.locator(".home-cycle")).toHaveAttribute(
      "data-round",
      String(i),
      { timeout: 30000 },
    );
    if (!homeRounds[i].algorithms.includes("GMM")) continue;
    const card = page.locator('.home-demo[data-algorithm="GMM"]');
    const samples: Record<string, Ellipse[]> = {};
    for (const [name, event] of [
      ["initial", "initialize"],
      ["expectation", "expectation"],
      ["maximization", "maximization"],
    ]) {
      await expect(card).toHaveAttribute("data-event", event, {
        timeout: 15000,
      });
      await page.waitForTimeout(80);
      await card
        .getByRole("button", { name: "GMM 데모 일시정지", exact: true })
        .click();
      await page.waitForTimeout(40);
      samples[name] = await page.evaluate(
        () => window.v04Frames["GMM 데이터 및 실제 연산 시각화"],
      );
      expect(samples[name]).toHaveLength(6);
      expect(
        samples[name].every(
          (e) =>
            e.rx > 0 &&
            e.ry > 0 &&
            [e.rx, e.ry, ...e.transform].every(Number.isFinite),
        ),
      ).toBe(true);
      await card.screenshot({
        path: `test-results/gmm-${homeRounds[i].preset}-${name}.png`,
      });
      await card
        .getByRole("button", { name: "GMM 데모 재생", exact: true })
        .click();
    }
    expect(samples.maximization).not.toEqual(samples.initial);
    await expect(card).toHaveAttribute("data-status", "complete", {
      timeout: 18000,
    });
    await card.screenshot({
      path: `test-results/gmm-${homeRounds[i].preset}-final.png`,
    });
    const final = await page.evaluate(() => ({
      trace: window.v04Traces.GMM,
      ellipses: window.v04Frames["GMM 데이터 및 실제 연산 시각화"],
    }));
    expect(final.trace.steps.some((s) => s.kind === "expectation")).toBe(true);
    expect(final.trace.steps.some((s) => s.kind === "maximization")).toBe(true);
    expect(final.ellipses).toHaveLength(6);
    expect(final.ellipses).not.toEqual(samples.initial);
    evidence.push({
      preset: homeRounds[i].preset,
      events: final.trace.steps.length,
      samples,
      final: final.ellipses,
    });
  }
  expect(evidence).toHaveLength(5);
  expect(browserErrors).toEqual([]);
  await expect(page.locator(".home-cycle")).toHaveAttribute("data-round", "0", {
    timeout: 30000,
  });
  await info.attach("GMM geometry from real Canvas calls", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
});
