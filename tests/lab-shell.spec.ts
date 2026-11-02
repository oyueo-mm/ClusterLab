import { openData, openSettings, closeData } from "./workspace-helpers";
import { expect, test } from "@playwright/test";
import type { Trace } from "../src/engine/types";
import { stateAt } from "../src/engine/trace";
test("a fresh lab applies its tailored initial parameters and produces real deferred passes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const audit = window as unknown as { freshTraces: Trace[] };
    audit.freshTraces = [];
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event) => {
          if (event.data.trace) audit.freshTraces.push(event.data.trace);
        });
      }
    };
  });
  await page.goto("#/lab/TTSAS");
  const lab = page.locator(".structured-page");
  await expect(lab.getByLabel("할당 하한 θ₁", { exact: true })).toHaveValue(
    "0.4",
  );
  await expect(lab.getByLabel("생성 상한 θ₂", { exact: true })).toHaveValue(
    "1",
  );
  await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
  const trace = await page.evaluate(() =>
    (window as unknown as { freshTraces: Trace[] }).freshTraces.at(-1)!,
  );
  expect(trace.algorithm).toBe("TTSAS");
  expect(trace.steps.some((step) => step.kind === "defer")).toBe(true);
  const state = stateAt(trace, trace.steps.length);
  expect(state.analysis?.kind).toBe("sequential");
  if (state.analysis?.kind === "sequential")
    expect(state.analysis.pass).toBeGreaterThan(1);
});
test("keyboard panel tabs, integrated math guide and fullscreen remain usable", async ({
  page,
}) => {
  await page.goto("#/lab/K-Means");
  const lab = page.locator(".lab-page");
  await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
  if ((page.viewportSize()?.width ?? 1440) <= 800)
    await lab.getByLabel("설정 열기", { exact: true }).click();
  const data = lab.getByRole("tab", { name: "설정", exact: true });
  await data.click();
  await data.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    lab.getByRole("tab", { name: "분석", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  if ((page.viewportSize()?.width ?? 1440) <= 800)
    await lab.getByLabel("설정 닫기", { exact: true }).click();
  await lab.getByRole("button", { name: "전체 화면", exact: true }).click();
  await expect(
    lab.getByRole("button", { name: "전체 화면 종료", exact: true }),
  ).toBeVisible();
  await lab
    .getByRole("button", { name: "전체 화면 종료", exact: true })
    .click();
  await lab.getByLabel("상세 설명·수학 가이드", { exact: true }).click();
  await lab.locator(".lab-details > summary").click();
  await expect(lab.locator(".guide-article")).toBeVisible();
  await expect(lab.locator(".katex-mathml math").first()).toBeAttached();
  await expect(
    lab.locator(".trace-lesson").getByLabel("재생", { exact: true }),
  ).toBeEnabled();
});
test("modern point and original-data panels fit seven viewport widths without covering playback", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "chromium",
    "The explicit viewport matrix includes mobile widths.",
  );
  test.setTimeout(120000);
  for (const algorithm of ["K-Means", "K-Shape"])
    for (const width of [1920, 1440, 1024, 800, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`#/lab/${algorithm}`);
      const lab = page.locator(
        algorithm === "K-Means" ? ".lab-page" : ".structured-page",
      );
      await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
      if (width <= 800) {
        await openSettings(lab);
        await openData(lab);
        const panel = (await lab.locator(".workspace-data").boundingBox())!;
        const playback = (await lab.locator(".playback").boundingBox())!;
        expect(panel.y + panel.height).toBeLessThanOrEqual(playback.y + 2);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/workspace-${algorithm}-${width}.png`,
      });
      if (width <= 800) {
        await closeData(lab);
        if (await lab.getByLabel("설정 닫기", { exact: true }).isVisible())
          await lab.getByLabel("설정 닫기", { exact: true }).click();
      }
    }
});
test("unavailable persistent storage reports the failure while real computation works", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    });
  });
  await page.goto("#/lab/K-Means");
  await expect(
    page.getByRole("status").filter({ hasText: /데이터 복원|자동 저장/ }),
  ).toBeVisible();
  await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
  await page.getByLabel("마지막으로", { exact: true }).click();
  expect(
    Number(await page.getByLabel("타임라인", { exact: true }).inputValue()),
  ).toBeGreaterThan(0);
});
