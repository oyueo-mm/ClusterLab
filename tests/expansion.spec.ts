import { algorithms } from "../src/engine/types";
import { test, expect } from "@playwright/test";

test("catalog distinguishes all candidates from executable engines and filters without overflow", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("#catalog");
  await expect(page.locator(".catalog-grid article")).toHaveCount(132);
  await page.getByLabel("도감 구현 상태").selectOption("실행 가능");
  await expect(page.locator(".catalog-grid article")).toHaveCount(
    algorithms.length,
  );
  await page.getByLabel("도감 입력 유형").selectOption("numeric-or-graph");
  await expect(page.locator(".catalog-grid article h2")).toHaveText(
    "Spectral Clustering",
  );
  await page.getByLabel("도감 검증 상태").selectOption("independent-sklearn");
  await page.getByLabel("도감 입력 유형").selectOption("");
  await expect(page.locator(".catalog-grid article")).toHaveCount(2);
  await page.getByLabel("도감 검증 상태").selectOption("");
  await page.getByLabel("도감 기능").selectOption("hierarchical");
  await expect(page.locator(".catalog-grid article h2")).toContainText([
    "CURE",
  ]);
  await page.getByLabel("도감 기능").selectOption("");
  await page.getByLabel("알고리즘 검색", { exact: true }).fill("이분할");
  await expect(page.locator(".catalog-grid article h2")).toHaveText(
    "Bisecting K-Means",
  );
  await page.getByLabel("알고리즘 검색", { exact: true }).fill("Fuzzy C-Means");
  await expect(page.locator(".catalog-grid article")).toHaveCount(1);
  for (const width of [1920, 1440, 1024, 800, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: `test-results/catalog-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "실험실에서 실행" }).click();
  await expect(page.getByLabel("알고리즘 선택", { exact: true })).toHaveValue(
    "Fuzzy C-Means",
  );
  await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
  await page.getByLabel("마지막으로", { exact: true }).click();
  await page.locator(".analysis-panel > summary").click();
  await expect(
    page.getByText("퍼지 소속도 U · 확률 아님", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("new algorithms compute actual events in production workers and reversible playback", async ({
  page,
}, info) => {
  await page.goto("#lab");
  for (const name of ["Fuzzy C-Means", "Bisecting K-Means"]) {
    await page.getByLabel("알고리즘 선택", { exact: true }).selectOption(name);
    await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
    await page.getByLabel("마지막으로", { exact: true }).click();
    await expect(page.locator(".status")).toHaveText("완료");
    const last = +(await page
      .getByLabel("타임라인", { exact: true })
      .inputValue());
    expect(last).toBeGreaterThan(5);
    await page.getByLabel("한 단계 뒤로", { exact: true }).click();
    expect(
      +(await page.getByLabel("타임라인", { exact: true }).inputValue()),
    ).toBe(last - 1);
    await page.getByLabel("한 단계 앞으로", { exact: true }).click();
    expect(
      +(await page.getByLabel("타임라인", { exact: true }).inputValue()),
    ).toBe(last);
  }
  await page.locator(".analysis-panel > summary").click();
  await expect(
    page.getByRole("img", { name: "이분할 트리 · 높이 = 분할 시점 RMS 반경" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/bisecting-${info.project.name}.png`,
    fullPage: true,
  });
});

test("100k import has no truncation and cancellation actually terminates its worker", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let terminated = 0;
    window.Worker = class extends NativeWorker {
      terminate() {
        terminated++;
        document.documentElement.dataset.workersTerminated = String(terminated);
        super.terminate();
      }
    };
  });
  await page.goto("#data");
  const points = Array.from({ length: 100_000 }, (_, i) => ({
    x: (i % 1000) / 1000,
    y: Math.floor(i / 1000) / 1000,
  }));
  await page.locator("input[type=file]").setInputFiles({
    name: "large.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ points })),
  });
  await expect(page.locator(".editor-bottom > span")).toContainText(
    "100000개 데이터",
  );
  await page
    .getByRole("button", { name: "이 데이터로 실험", exact: true })
    .click();
  await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
  await page.getByLabel("알고리즘 선택", { exact: true }).selectOption("GMM");
  await expect(page.locator(".step-explanation")).toContainText(
    "전체 데이터 계산 중",
  );
  const before = +(
    (await page.locator("html").getAttribute("data-workers-terminated")) ?? "0"
  );
  await page.getByRole("button", { name: "계산 취소", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("실행 취소");
  expect(
    +(
      (await page.locator("html").getAttribute("data-workers-terminated")) ??
      "0"
    ),
  ).toBeGreaterThan(before);
  await expect(page.getByLabel("재생", { exact: true })).toBeDisabled();
});
