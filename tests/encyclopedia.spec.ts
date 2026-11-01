import { test, expect } from "@playwright/test";
import { algorithms } from "../src/engine/types";
import { structuredAlgorithms } from "../src/engine/registry";
test("home, category sidebar and shareable independent catalog filters", async ({
  page,
}) => {
  await page.goto("");
  await expect(page.locator(".hero h1")).toHaveText("ClusterLab");
  await expect(page.locator(".home-demo")).toHaveCount(4);
  await expect(page.locator(".featured-grid .algorithm-card")).toHaveCount(6);
  await page.getByRole("button", { name: "알고리즘 둘러보기" }).click();
  await page.getByLabel("도감 카테고리").selectOption("density");
  await page.getByLabel("노이즈 지원", { exact: true }).check();
  await page.getByLabel("알고리즘 검색", { exact: true }).fill("DBSCAN");
  // DenStream's textbook summary also explicitly discusses static DBSCAN.
  await expect(page.locator(".catalog-grid .algorithm-card")).toHaveCount(3);
  await expect(page).toHaveURL(/category=density.*noiseLabels=1.*q=DBSCAN/);
  await page.reload();
  await expect(page.getByLabel("알고리즘 검색", { exact: true })).toHaveValue(
    "DBSCAN",
  );
  await expect(page.getByLabel("노이즈 지원", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "필터 초기화" }).click();
  await expect(page.locator(".catalog-grid .algorithm-card")).toHaveCount(132);
});
test("each engine opens by ID and runs its actual recommended original data", async ({
  page,
}) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const algorithm of algorithms) {
    // Separate documents intentionally verify direct URL entry and restoration compatibility.
    await page.goto(`#/lab/${encodeURIComponent(algorithm)}`);
    const structured = structuredAlgorithms.some((a) => a === algorithm);
    const lab = page.locator(structured ? ".structured-page" : ".lab-page");
    await expect(lab.locator(".lab-header h1")).toContainText(algorithm);
    if (structured && (page.viewportSize()?.width ?? 1440) < 801)
      await lab.getByRole("button", { name: "설정·데이터·분석 열기" }).click();
    else if ((page.viewportSize()?.width ?? 1440) < 801)
      await lab.getByLabel("설정 열기", { exact: true }).click();
    await lab.getByRole("tab", { name: "데이터", exact: true }).click();
    await lab.getByLabel("추천 데이터셋", { exact: true }).selectOption("0");
    await lab.getByLabel("추천 파라미터도 적용", { exact: true }).check();
    await lab
      .getByRole("button", { name: "이 데이터셋 적용", exact: true })
      .click();
    if ((page.viewportSize()?.width ?? 1440) < 801)
      await lab.getByLabel("설정 닫기", { exact: true }).click();
    await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled({
      timeout: 20000,
    });
    await lab.getByLabel("마지막으로", { exact: true }).click();
    expect(
      Number(await lab.getByLabel("타임라인", { exact: true }).inputValue()),
    ).toBeGreaterThan(0);
    await lab.getByLabel("한 단계 뒤로", { exact: true }).click();
    await lab.getByLabel("처음으로", { exact: true }).click();
    await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue("0");
  }
  expect(errors).toEqual([]);
});
test("sidebar state, viewport layouts and screenshots", async ({
  page,
}, info) => {
  for (const width of [1920, 1440, 1024, 800, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("");
    await expect(page.locator(".hero h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/ui-datasets/home-${width}-${info.project.name}.png`,
      fullPage: true,
    });
  }
});
