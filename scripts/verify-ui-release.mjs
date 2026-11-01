/* global document, window, innerWidth -- callbacks below run in the browser. */
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { log } from "node:console";

const url =
  process.env.CLUSTERLAB_PUBLIC_URL ?? "https://oyueo-mm.github.io/ClusterLab/";
const evidence = [];
await mkdir("docs/ui-datasets", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [1440, 390]) {
    const name = width > 800 ? "desktop" : "mobile";
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      isMobile: width <= 800,
      hasTouch: width <= 800,
    });
    const page = await context.newPage(),
      errors = [];
    page.setDefaultTimeout(25000);
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(url);
    assert.equal(response?.status(), 200);
    await expect(page.locator(".hero h1")).toHaveText("ClusterLab");
    await expect(page.locator(".home-demo")).toHaveCount(4);
    await expect(page.locator(".featured-grid .algorithm-card")).toHaveCount(6);
    await page.locator(".home-cycle").scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".home-demo")].every(
        (card) => Number(card.getAttribute("data-events")) > 0,
      ),
    );
    const homeEvents = await page.locator(".home-demo").evaluateAll((cards) =>
      cards.map((card) => ({
        algorithm: card.getAttribute("data-algorithm"),
        events: Number(card.getAttribute("data-events")),
      })),
    );
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      return document.fonts.ready;
    });
    await page.screenshot({
      path: `docs/ui-datasets/public-home-${name}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "알고리즘 둘러보기", exact: true })
      .click();
    await expect(page.locator(".catalog-grid article")).toHaveCount(132);
    await page.getByLabel("알고리즘 검색", { exact: true }).fill("DBSCAN");
    await page
      .locator(".catalog-grid article")
      .filter({ has: page.getByText("DBSCAN", { exact: true }) })
      .getByRole("button", { name: "실험실에서 실행", exact: true })
      .click();
    let lab = page.locator(".lab-page");
    await expect(lab.getByLabel("실험 프리셋", { exact: true })).toHaveValue(
      "moons",
    );
    await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
    await lab.getByLabel("마지막으로", { exact: true }).click();
    const dbscanEvents = Number(
      await lab.getByLabel("타임라인", { exact: true }).inputValue(),
    );
    assert.ok(dbscanEvents > 0);
    await lab.getByLabel("한 단계 뒤로", { exact: true }).click();
    assert.equal(
      Number(await lab.getByLabel("타임라인", { exact: true }).inputValue()),
      dbscanEvents - 1,
    );
    await page.screenshot({
      path: `docs/ui-datasets/public-dbscan-${name}.png`,
    });
    await page.goto(`${url}#/lab/Louvain`);
    lab = page.locator(".structured-page");
    await expect(lab.locator(".lab-header h1")).toContainText("Louvain");
    await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
    const original = JSON.parse(
      await lab.getByLabel("원본 데이터 JSON", { exact: true }).inputValue(),
    ).data;
    assert.equal(original.kind, "graph");
    await lab.getByLabel("마지막으로", { exact: true }).click();
    const graphEvents = Number(
      await lab.getByLabel("타임라인", { exact: true }).inputValue(),
    );
    assert.ok(graphEvents > 0);
    await page.screenshot({
      path: `docs/ui-datasets/public-louvain-${name}.png`,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    evidence.push({
      url,
      viewport: { width, height: 1000 },
      homeEvents,
      dbscanEvents,
      originalGraph: {
        nodes: original.nodes.length,
        edges: original.edges.length,
      },
      graphEvents,
      errors,
    });
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  "docs/ui-datasets/public-verification.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
log(`Release desktop/mobile verification passed: ${url}`);
