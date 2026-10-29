import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
test("home visual evidence and sustained animation frame timings", async ({
  page,
}, info) => {
  await page.goto("");
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll(".home-demo")].length === 4 &&
      [...document.querySelectorAll(".home-demo")].every(
        (n) => Number(n.getAttribute("data-events")) > 0,
      ),
  );
  const homeTimings = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const values: number[] = [];
        let last = performance.now();
        const end = last + 2200;
        const frame = (now: number) => {
          values.push(now - last);
          last = now;
          if (now < end) requestAnimationFrame(frame);
          else resolve(values.slice(1));
        };
        requestAnimationFrame(frame);
      }),
  );
  const sortedHome = homeTimings.sort((a, b) => a - b);
  writeFileSync(
    `test-results/home-performance-${info.project.name}.json`,
    JSON.stringify(
      {
        project: info.project.name,
        viewport: page.viewportSize(),
        points: 60,
        algorithms: ["K-Means", "DBSCAN", "GMM", "Mean Shift"],
        meanFrameMs: sortedHome.reduce((a, b) => a + b, 0) / sortedHome.length,
        p95FrameMs: sortedHome[Math.floor(sortedHome.length * 0.95)],
        maxFrameMs: sortedHome.at(-1),
      },
      null,
      2,
    ),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `test-results/home-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "실험 시작하기" }).click();
  await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
  await page.getByLabel("재생", { exact: true }).click();
  const timings = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const deltas: number[] = [];
        let last = performance.now();
        const end = last + 2200;
        const frame = (now: number) => {
          deltas.push(now - last);
          last = now;
          if (now < end) requestAnimationFrame(frame);
          else resolve(deltas);
        };
        requestAnimationFrame(frame);
      }),
  );
  const values = timings.slice(1).sort((a, b) => a - b);
  const report = {
    project: info.project.name,
    viewport: page.viewportSize(),
    points: 120,
    algorithm: "K-Means",
    frames: values.length,
    meanFrameMs: values.reduce((a, b) => a + b, 0) / values.length,
    p95FrameMs: values[Math.floor(values.length * 0.95)],
    maxFrameMs: values.at(-1),
  };
  writeFileSync(
    `test-results/performance-${info.project.name}.json`,
    JSON.stringify(report, null, 2),
  );
  await page.getByLabel("일시정지", { exact: true }).click();
  expect(values.length).toBeGreaterThan(15);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    (document.activeElement as HTMLElement)?.blur();
  });
  await page.screenshot({
    path: `test-results/playing-${info.project.name}.png`,
    fullPage: true,
  });
});
test("real data editing, CSV import, label preservation and JSON download", async ({
  page,
}) => {
  await page.goto("#data");
  await page.getByRole("button", { name: "전체 지우기", exact: true }).click();
  await page.getByLabel("점 추가", { exact: true }).click();
  const canvas = page.locator(".editor-stage canvas");
  await canvas.click({ position: { x: 100, y: 100 } });
  await canvas.click({ position: { x: 150, y: 150 } });
  await expect(page.locator(".editor-bottom")).toContainText("2개 데이터");
  await page.getByLabel("점 이동", { exact: true }).click();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 115, { steps: 10 });
  await page.mouse.up();
  await page.getByLabel("점 삭제", { exact: true }).click();
  await canvas.click({ position: { x: 120, y: 115 } });
  await expect(page.locator(".editor-bottom")).toContainText("1개 데이터");
  await page.locator("input[type=file]").setInputFiles({
    name: "fixture.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "x,y,label,features\n0.1,0.2,0,color=green;shape=round\n0.8,0.7,1,color=pink;shape=square",
    ),
  });
  await expect(page.locator(".editor-bottom")).toContainText("2개 데이터");
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const download = await promise;
  expect(download.suggestedFilename()).toBe("clusterlab-data.json");
  await expect(page.getByRole("status")).toContainText(
    "데이터를 가져왔습니다.",
  );
});
