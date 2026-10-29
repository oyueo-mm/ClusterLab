import { test, expect } from "@playwright/test";
test("home demo, navigation, playback pause/resume/seek and mobile layout", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("");
  await expect(
    page.getByRole("heading", { name: /클러스터링 알고리즘/ }),
  ).toBeVisible();
  await expect(page.locator(".home-demo")).toHaveCount(4);
  await page.getByRole("button", { name: "실험 시작하기" }).click();
  await expect(page.locator(".visualization-description")).toBeVisible();
  await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
  await page.getByLabel("재생", { exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByLabel("일시정지", { exact: true }).click();
  const value = await page.getByLabel("타임라인", { exact: true }).inputValue();
  await page.waitForTimeout(300);
  expect(await page.getByLabel("타임라인", { exact: true }).inputValue()).toBe(
    value,
  );
  await page.getByLabel("재생 속도").fill("90");
  await page.getByLabel("한 단계 앞으로").click();
  expect(
    +(await page.getByLabel("타임라인", { exact: true }).inputValue()),
  ).toBeGreaterThan(+value);
  await page.getByLabel("한 단계 뒤로").click();
  await page.getByLabel("마지막으로").click();
  await expect(page.locator(".status")).toHaveText("완료");
  await page.getByLabel("처음으로").click();
  expect(await page.getByLabel("타임라인", { exact: true }).inputValue()).toBe(
    "0",
  );
  await page.screenshot({
    path: `test-results/lab-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("all algorithms run to completion in actual Workers with dedicated analyses", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("#lab");
  for (const name of [
    "K-Means",
    "DBSCAN",
    "HDBSCAN",
    "AGNES",
    "DIANA",
    "SOM",
    "LVQ",
    "OPTICS",
    "PAM",
    "ROCK",
    "GMM",
    "BIRCH",
    "Mean Shift",
  ]) {
    await page.getByLabel("알고리즘 선택").selectOption(name);
    if (name === "LVQ")
      await page.getByLabel("실험 프리셋").selectOption("labeled");
    else if (name === "ROCK")
      await page.getByLabel("실험 프리셋").selectOption("categorical");
    else await page.getByLabel("실험 프리셋").selectOption("tiny");
    await expect(page.locator(".status")).toHaveText("준비됨", {
      timeout: 30000,
    });
    await expect(page.locator(".error")).toHaveCount(0);
    await expect(page.locator(".visualization-description")).toHaveText(
      `${name} 데이터 및 실제 연산 시각화`,
    );
    if (name === "LVQ")
      await expect(page.locator(".canvas-legend")).toContainText("클래스 0");
    await page.getByLabel("재생 속도").fill("75");
    await page.getByLabel("재생", { exact: true }).click();
    await page.waitForTimeout(90);
    await page.getByLabel("일시정지", { exact: true }).click();
    const paused = await page
      .getByLabel("타임라인", { exact: true })
      .inputValue();
    expect(+paused).toBeGreaterThan(0);
    await page.waitForTimeout(60);
    expect(
      await page.getByLabel("타임라인", { exact: true }).inputValue(),
    ).toBe(paused);
    await page.getByLabel("재생 속도").fill("200");
    await page.getByLabel("재생", { exact: true }).click();
    await page.waitForTimeout(90);
    await page.getByLabel("마지막으로").click();
    await page.getByLabel("재생 속도").fill("50");
    await page.getByLabel("마지막으로").click();
    await expect(page.locator(".status")).toHaveText("완료");
    await page.getByLabel("한 단계 뒤로").click();
    await page.getByLabel("한 단계 앞으로").click();
    await expect(page.locator(".status")).toHaveText("완료");
  }
});
test("dataset gallery, import/export UI, guide, compare and direct hash routing", async ({
  page,
}, info) => {
  await page.goto("#data");
  await expect(page.locator(".preset-card")).toHaveCount(32);
  await page.getByLabel("프리셋 검색").fill("Categorical");
  await expect(page.locator(".preset-card")).toHaveCount(1);
  await page.locator(".preset-card").click();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await page.screenshot({
    path: `test-results/data-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto("#compare");
  await expect(page.locator(".compare-card")).toHaveCount(2);
  await page.getByLabel("비교 개수").selectOption("4");
  await expect(page.locator(".compare-card")).toHaveCount(4);
  await expect(page.locator(".compare-card .play:disabled")).toHaveCount(0);
  await page.getByRole("button", { name: /모두 처음부터 재생/ }).click();
  await expect(page.getByLabel("일시정지", { exact: true })).toHaveCount(4);
  const first = page.locator(".compare-card").first();
  await first.getByLabel("일시정지", { exact: true }).click();
  const paused = await first
    .getByLabel("타임라인", { exact: true })
    .inputValue();
  await page.waitForTimeout(150);
  expect(await first.getByLabel("타임라인", { exact: true }).inputValue()).toBe(
    paused,
  );
  await expect(page.getByLabel("일시정지", { exact: true })).toHaveCount(3);
  for (const card of await page.locator(".compare-card").all())
    await card.getByLabel("마지막으로").click();
  await page.goto("#guide");
  await expect(
    page.getByRole("heading", { name: "K-Means", exact: true }),
  ).toBeVisible();
  await page
    .locator(".guide-nav")
    .getByRole("button", { name: "HDBSCAN" })
    .click();
  await expect(
    page.locator(".equation-card").filter({ hasText: "안정도와 EOM" }),
  ).toContainText("S(C)");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
