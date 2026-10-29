import { test, expect } from "@playwright/test";
import { homeRounds } from "../src/data/homeRounds";
import { palette } from "../src/animation/renderer";
test("real bundled display/UI fonts, forest tokens and aligned responsive layout", async ({
  page,
}, info) => {
  const fonts: string[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/fonts/") && response.status() === 200)
      fonts.push(response.url());
  });
  await page.goto("");
  await page.evaluate(async () => {
    await document.fonts.load(
      '400 44px "Black Han Sans"',
      "클러스터링 알고리즘",
    );
    await document.fonts.load(
      "600 14px Pretendard",
      "클러스터링 알고리즘 ClusterLab",
    );
    await document.fonts.ready;
  });
  const result = await page.evaluate(() => {
    const title = document.querySelector(".hero h1")!,
      subtitle = document.querySelector(".hero-subtitle")!,
      buttons = [...document.querySelectorAll(".hero-actions button")],
      root = getComputedStyle(document.documentElement),
      a = buttons[0].getBoundingClientRect(),
      b = buttons[1].getBoundingClientRect(),
      titleBox = title.getBoundingClientRect(),
      container = title.parentElement!.getBoundingClientRect();
    return {
      display: getComputedStyle(title).fontFamily,
      ui: getComputedStyle(subtitle).fontFamily,
      displayLoaded: document.fonts.check(
        '400 44px "Black Han Sans"',
        "클러스터링 알고리즘",
      ),
      uiLoaded: document.fonts.check(
        "600 14px Pretendard",
        "클러스터링 알고리즘 ClusterLab",
      ),
      primary: root.getPropertyValue("--primary-green").trim(),
      color: getComputedStyle(title).color,
      subtitleColor: getComputedStyle(subtitle).color,
      titleSize: parseFloat(getComputedStyle(title).fontSize),
      subtitleSize: parseFloat(getComputedStyle(subtitle).fontSize),
      topDiff: Math.abs(a.top - b.top),
      heightDiff: Math.abs(a.height - b.height),
      overflow: document.documentElement.scrollWidth > innerWidth,
      titleFits: titleBox.right <= container.right + 1,
      sections: [...title.parentElement!.children].map((n) => n.tagName),
    };
  });
  expect(result.display).toContain("Black Han Sans");
  expect(result.ui).toContain("Pretendard");
  expect(result.displayLoaded && result.uiLoaded).toBe(true);
  expect(fonts.some((u) => u.includes("BlackHanSans-title.ttf"))).toBe(true);
  expect(fonts.some((u) => u.includes("PretendardVariable.woff2"))).toBe(true);
  expect(result.primary.toLowerCase()).toBe("#34564d");
  expect(result.color).toBe("rgb(52, 86, 77)");
  expect(result.subtitleColor).toBe("rgb(17, 23, 21)");
  expect(result.titleSize).toBeGreaterThan(result.subtitleSize);
  expect(result.topDiff).toBeLessThan(1);
  expect(result.heightDiff).toBeLessThan(1);
  expect(result.overflow).toBe(false);
  expect(result.titleFits).toBe(true);
  expect(result.sections).toEqual(["H1", "P", "DIV"]);
  await expect(page.getByText("클러스터링을 이해하는 공간")).toHaveCount(0);
  expect(palette).toEqual([
    "#61ad95",
    "#db8ca9",
    "#a491cf",
    "#709ed0",
    "#dbab65",
    "#74b9bb",
    "#bd9982",
    "#a9b66c",
  ]);
  await page.screenshot({
    path: `test-results/design-${info.project.name}.png`,
    fullPage: true,
  });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const bounds = await page
      .locator(".hero h1")
      .evaluate((n) => ({
        right: n.getBoundingClientRect().right,
        parent: n.parentElement!.getBoundingClientRect().right,
      }));
    expect(bounds.right).toBeLessThanOrEqual(bounds.parent + 1);
  }
});
test("font failure uses fallbacks without clipping or disabling navigation", async ({
  page,
}) => {
  await page.route("**/fonts/*", (route) => route.abort());
  await page.goto("");
  await expect(
    page.getByRole("heading", { name: "클러스터링 알고리즘", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "실험 시작하기" }).click();
  await expect(page.getByLabel("알고리즘 선택")).toBeVisible();
  await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
});
test("automatic cycle holds real final results, changes every preset/combination and wraps after exposing all 13", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Full cycle uses a desktop viewport with all four cards fully visible; mobile lifecycle/layout is covered separately.",
  );
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    Object.defineProperty(Worker.prototype, "postMessage", {
      value: function (this: Worker, message: { id: number }) {
        const handler = this.onmessage;
        setTimeout(
          () =>
            handler?.call(this, {
              data: { id: message.id, error: "STALE_REPLY_TEST" },
            } as MessageEvent),
          16000,
        );
        return original.call(this, message);
      },
    });
  });
  await page.goto("");
  const seen = new Set<string>();
  const seenPresets = new Set<string>();
  for (let i = 0; i < homeRounds.length; i++) {
    const section = page.locator(".home-cycle");
    await expect(section).toHaveAttribute("data-round", String(i), {
      timeout: 25000,
    });
    await page.waitForFunction(
      () =>
        document.querySelector(".home-cycle")?.getAttribute("data-phase") ===
        "playing",
    );
    const names = await page
      .locator(".home-demo")
      .evaluateAll((ns) => ns.map((n) => n.getAttribute("data-algorithm")!));
    expect(names).toEqual([...homeRounds[i].algorithms]);
    names.forEach((n) => seen.add(n));
    const preset = await page.locator(".round-meta>span").first().textContent();
    expect(seenPresets.has(preset!)).toBe(false);
    seenPresets.add(preset!);
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll(".home-demo")].some(
          (n) => n.getAttribute("data-status") === "complete",
        ),
      null,
      { timeout: 20000 },
    );
    const early = await page
      .locator(".home-demo[data-status=complete]")
      .first()
      .getAttribute("data-algorithm");
    const held = await page
      .locator(`.home-demo[data-algorithm="${early}"]`)
      .getAttribute("data-position");
    await page.waitForTimeout(120);
    expect(
      await page
        .locator(`.home-demo[data-algorithm="${early}"]`)
        .getAttribute("data-position"),
    ).toBe(held);
    await page.waitForFunction(
      () =>
        document.querySelector(".home-cycle")?.getAttribute("data-phase") ===
        "holding",
      null,
      { timeout: 20000 },
    );
    const completed = await page.locator(".home-demo").evaluateAll((ns) =>
      ns.map((n) => ({
        position: Number(n.getAttribute("data-position")),
        events: Number(n.getAttribute("data-events")),
        status: n.getAttribute("data-status"),
      })),
    );
    expect(
      completed.every(
        (c) => c.status === "complete" && c.position === c.events,
      ),
    ).toBe(true);
    await page.waitForTimeout(300);
    await expect(section).toHaveAttribute("data-round", String(i));
    if (i === 0) {
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          value: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      const generation = await section.getAttribute("data-generation");
      await page.waitForTimeout(1300);
      await expect(section).toHaveAttribute("data-generation", generation!);
      await page.evaluate(() => {
        delete (document as unknown as { hidden?: boolean }).hidden;
        document.dispatchEvent(new Event("visibilitychange"));
      });
    }
    await expect(section).toHaveAttribute(
      "data-round",
      String((i + 1) % homeRounds.length),
      { timeout: 10000 },
    );
  }
  expect(seen.size).toBe(13);
  await expect(page.getByText("STALE_REPLY_TEST")).toHaveCount(0);
});
test("labeled and categorical home cards transfer the exact original records into the lab", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Full round progression is checked on desktop; mobile selection is checked by the existing lifecycle test.",
  );
  test.setTimeout(110000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const datasets = new Map<string, unknown>();
  await page.exposeFunction(
    "recordDataset",
    (algorithm: string, points: unknown) => {
      datasets.set(algorithm, points);
    },
  );
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    Object.defineProperty(Worker.prototype, "postMessage", {
      value: function (
        this: Worker,
        message: { algorithm: string; points: unknown },
      ) {
        (
          window as unknown as {
            recordDataset: (a: string, p: unknown) => void;
          }
        ).recordDataset(message.algorithm, message.points);
        return original.call(this, message);
      },
    });
  });
  await page.goto("");
  await page.waitForFunction(
    () =>
      document.querySelector(".home-cycle")?.getAttribute("data-round") === "3",
    null,
    { timeout: 60000 },
  );
  await page
    .getByRole("button", { name: "LVQ 실험실 열기", exact: true })
    .click();
  await expect(page.getByLabel("알고리즘 선택")).toHaveValue("LVQ");
  const expected = datasets.get("LVQ") as { label?: number }[];
  expect(expected.every((p) => p.label !== undefined)).toBe(true);
  // Preserve the exact data through the existing JSON export path, without reseeding.
  await page.goto("#data");
  const file = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const download = await file;
  const stream = (await download.createReadStream())!;
  let text = "";
  for await (const chunk of stream) text += chunk.toString();
  expect(JSON.parse(text).points).toEqual(expected);
  await page.goto("");
  await page.waitForFunction(
    () =>
      document.querySelector(".home-cycle")?.getAttribute("data-round") === "4",
    null,
    { timeout: 70000 },
  );
  const categorical = datasets.get("ROCK") as { features?: string[] }[];
  expect(categorical.every((p) => p.features?.length)).toBe(true);
  await page
    .getByRole("button", { name: "ROCK 실험실 열기", exact: true })
    .click();
  await expect(page.getByLabel("알고리즘 선택")).toHaveValue("ROCK");
  await expect(page.locator(".status")).toHaveText("준비됨");
  await page.goto("#data");
  const next = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const result = await next;
  const content = (await result.createReadStream())!;
  let json = "";
  for await (const chunk of content) json += chunk.toString();
  expect(JSON.parse(json).points).toEqual(categorical);
});
