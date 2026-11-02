import { expect, test } from "@playwright/test";
import { openData, openSettings } from "./workspace-helpers";

test("resizing independent panels and focus preserve actual Trace, edits and playback", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Desktop splitters are replaced by touch drawers.",
  );
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.addInitScript(() => {
    const audit = window as unknown as { workspaceJobs: number };
    audit.workspaceJobs = 0;
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: unknown, transfer: Transferable[]): void;
      postMessage(message: unknown, options?: StructuredSerializeOptions): void;
      postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = {},
      ) {
        if ((message as { algorithm?: string }).algorithm)
          audit.workspaceJobs++;
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
  });
  await page.goto("#/lab/K-Means");
  const lab = page.locator(".lab-page"),
    canvas = lab.locator("canvas");
  await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
  await lab.getByLabel("한 단계 앞으로", { exact: true }).click();
  const position = await lab
    .getByLabel("타임라인", { exact: true })
    .inputValue();
  const jobs = await page.evaluate(
    () => (window as unknown as { workspaceJobs: number }).workspaceJobs,
  );
  expect(jobs).toBeGreaterThan(0);
  await openData(lab);
  const narrow = (await canvas.boundingBox())!;
  const left = lab.getByRole("separator", { name: "데이터 패널 너비" });
  const initial = Number(await left.getAttribute("aria-valuenow"));
  await left.focus();
  await page.keyboard.press("ArrowRight");
  await expect(left).toHaveAttribute("aria-valuenow", String(initial + 10));
  await left.press("Home");
  await expect(left).toHaveAttribute("aria-valuenow", "240");
  await left.press("End");
  await expect(left).toHaveAttribute("aria-valuenow", "520");
  await left.dblclick();
  await expect(left).toHaveAttribute("aria-valuenow", "300");
  const right = lab.getByRole("separator", { name: "설정 패널 너비" });
  const r = (await right.boundingBox())!;
  await page.mouse.move(r.x + 4, r.y + 80);
  await page.mouse.down();
  await page.mouse.move(r.x - 70, r.y + 80, { steps: 15 });
  await page.mouse.up();
  const rightWidth = await right.getAttribute("aria-valuenow");
  await lab.getByLabel("시각화 집중 모드", { exact: true }).click();
  await expect(lab.locator(".workspace-data")).toBeHidden();
  await expect(lab.locator(".workspace-settings")).toBeHidden();
  await expect(page.locator(".app")).toHaveClass(/nav-hidden/);
  expect((await canvas.boundingBox())!.width).toBeGreaterThan(
    narrow.width + 500,
  );
  await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue(
    position,
  );
  await lab
    .locator(".workspace-toolbar")
    .getByLabel("데이터셋 편집", { exact: true })
    .click();
  await expect(lab.locator(".workspace-data")).toBeVisible();
  await lab.getByLabel("시각화 집중 모드", { exact: true }).click();
  await lab.getByLabel("설정 열기", { exact: true }).click();
  await expect(lab.locator(".workspace-settings")).toBeVisible();
  await lab.getByLabel("시각화 집중 모드", { exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(lab.locator(".workspace-data")).toBeVisible();
  await expect(right).toHaveAttribute("aria-valuenow", rightWidth!);
  expect(
    await page.evaluate(
      () => (window as unknown as { workspaceJobs: number }).workspaceJobs,
    ),
  ).toBe(jobs);
  // Actual renderer backing pixels track CSS size, preserving isotropic coordinates.
  await expect
    .poll(() =>
      canvas.evaluate((el) =>
        Math.abs(
          (el as HTMLCanvasElement).width -
            el.getBoundingClientRect().width * devicePixelRatio,
        ),
      ),
    )
    .toBeLessThanOrEqual(1);
  await lab.getByLabel("데이터 패널 닫기", { exact: true }).click();
  await page.getByLabel("탐색 사이드바 전환", { exact: true }).click(); // collapsed -> hidden
  await page.getByLabel("탐색 사이드바 전환", { exact: true }).click(); // hidden -> expanded
  const nav = page.getByRole("separator", { name: "탐색 사이드바 너비" });
  await nav.focus();
  await page.keyboard.press("ArrowRight");
  const navWidth = await nav.getAttribute("aria-valuenow");
  expect(
    await page.evaluate(
      () => (window as unknown as { workspaceJobs: number }).workspaceJobs,
    ),
  ).toBe(jobs);
  await page.reload();
  await expect(nav).toHaveAttribute("aria-valuenow", navWidth!);
  await expect(
    lab.getByRole("separator", { name: "설정 패널 너비" }),
  ).toHaveAttribute("aria-valuenow", rightWidth!);
});

test("search picker supports Korean, keyboard selection and long names", async ({
  page,
}) => {
  await page.goto("#/lab/K-Means");
  await page.getByLabel("알고리즘 선택", { exact: true }).click();
  const search = page.getByLabel("실험실 알고리즘 검색", { exact: true });
  await search.fill("미니배치");
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(1);
  await search.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("알고리즘 선택", { exact: true })).toHaveText(
    "Mini-Batch K-Means",
  );
  await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
});

test("catalog double click enters runnable labs while candidate cards and preview buttons remain independent", async ({
  page,
}) => {
  await page.goto("#/catalog?q=Mini-Batch%20K-Means");
  const card = page
    .locator(".catalog-grid article")
    .filter({ hasText: "Mini-Batch K-Means" })
    .first();
  await card.locator("h2").dblclick();
  await expect(page).toHaveURL(/lab\/Mini-Batch/);
  await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
  await page.goto("#/catalog");
  const candidate = page
    .locator(".catalog-grid article")
    .filter({ has: page.locator(".candidate-preview") })
    .first();
  await candidate.locator("h2").dblclick();
  await expect(page).toHaveURL(/catalog/);
});

test("mobile drawers keep playback exposed and Escape returns to canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("#/lab/K-Means");
  const lab = page.locator(".lab-page");
  await expect(lab.locator(".workspace-settings")).toBeHidden();
  await openData(lab);
  await openSettings(lab);
  const panel = (await lab.locator(".workspace-settings").boundingBox())!;
  const playback = (await lab.locator(".playback").boundingBox())!;
  expect(panel.y + panel.height).toBeLessThanOrEqual(playback.y + 1);
  expect(playback.y + playback.height).toBeLessThanOrEqual(640);
  await lab.getByLabel("한 단계 앞으로", { exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(lab.locator(".workspace-settings")).toBeHidden();
  await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue("1");
});
