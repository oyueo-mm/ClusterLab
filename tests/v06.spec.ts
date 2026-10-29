import { test, expect, type Page } from "@playwright/test";
import type { Point } from "../src/engine/types";

const canvas = (page: Page) => page.locator(".editor-stage canvas");
const count = (page: Page, n: number) =>
  expect(page.locator(".editor-bottom > span")).toHaveText(
    new RegExp(`^${n}개 데이터`),
  );
const undo = (page: Page) =>
  page.getByRole("button", { name: "실행 취소", exact: true }).click();
const redo = (page: Page) =>
  page.getByRole("button", { name: "다시 실행", exact: true }).click();
const tool = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).click();
const fixture: Point[] = [
  { x: 0.4, y: 0.5, label: 2, features: ["color=green", "shape=round"] },
  { x: 0.6, y: 0.5, label: 5, features: ["color=black"] },
];
async function readPoints(page: Page): Promise<Point[]> {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const stream = (await (await pending).createReadStream())!;
  let text = "";
  for await (const chunk of stream) text += chunk.toString();
  return JSON.parse(text).points;
}
async function loadPoints(page: Page, points = fixture) {
  await page.locator("input[type=file]").setInputFiles({
    name: "records.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ points })),
  });
  await count(page, points.length);
}
async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  button: "left" | "right" = "left",
  steps = 1,
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button });
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up({ button });
}
async function geometry(page: Page) {
  const box = (await canvas(page).boundingBox())!;
  const scale = Math.min(box.width - 70, box.height - 60);
  return {
    box,
    scale,
    screen: (p: Point) => ({
      x: box.x + box.width / 2 + (p.x - 0.5) * scale,
      y: box.y + box.height / 2 + (0.5 - p.y) * scale,
    }),
  };
}

test.describe("v0.6 desktop editing", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(
      info.project.name !== "chromium",
      "Mouse matrix runs on desktop; native touch is tested separately.",
    );
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("#data");
  });

  test("single add/move/delete, multi-delete and clear undo/redo exact records; no-op keeps redo", async ({
    page,
  }) => {
    await expect(page.getByLabel("실행 취소", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("다시 실행", { exact: true })).toBeDisabled();
    await loadPoints(page);
    await tool(page, "점 추가");
    await page.getByLabel("새 점 클래스", { exact: true }).fill("7");
    await canvas(page).click({ position: { x: 100, y: 100 } });
    await count(page, 3);
    const added = await readPoints(page);
    expect(added.at(-1)?.label).toBe(7);
    await undo(page);
    expect(await readPoints(page)).toEqual(fixture);
    await redo(page);
    expect(await readPoints(page)).toEqual(added);

    await tool(page, "점 이동");
    const { screen } = await geometry(page);
    const from = screen(fixture[0]),
      to = { x: from.x + 36, y: from.y - 24 };
    await drag(page, from, to, "left", 12);
    const moved = await readPoints(page);
    expect(moved[0].x).not.toBe(fixture[0].x);
    expect(moved[0].features).toEqual(fixture[0].features);
    expect(moved[0].label).toBe(2);
    await undo(page);
    expect(await readPoints(page)).toEqual(added);
    // A click and an out-and-back drag do not consume or invalidate redo.
    await page.mouse.click(from.x, from.y);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 25, from.y);
    await page.mouse.move(from.x, from.y);
    await page.mouse.up();
    await expect(page.getByLabel("다시 실행", { exact: true })).toBeEnabled();
    await redo(page);
    expect(await readPoints(page)).toEqual(moved);

    await tool(page, "점 삭제");
    await page.mouse.click(to.x, to.y);
    await count(page, 2);
    const deleted = await readPoints(page);
    await undo(page);
    expect(await readPoints(page)).toEqual(moved);
    await redo(page);
    expect(await readPoints(page)).toEqual(deleted);
    await undo(page);
    await tool(page, "영역 선택");
    const a = screen({ x: 0.2, y: 0.8 }),
      b = screen({ x: 0.8, y: 0.2 });
    await drag(page, a, b, "left", 5);
    await expect(page.locator(".editor-bottom")).toContainText("2개 선택됨");
    await page.getByLabel("선택된 점 삭제", { exact: true }).click();
    await count(page, 1);
    const multiDeleted = await readPoints(page);
    await undo(page);
    expect(await readPoints(page)).toEqual(moved);
    await expect(
      page.getByLabel("선택된 점 삭제", { exact: true }),
    ).toBeDisabled();
    await redo(page);
    expect(await readPoints(page)).toEqual(multiDeleted);
    await page
      .getByRole("button", { name: "전체 지우기", exact: true })
      .click();
    await count(page, 0);
    await undo(page);
    expect(await readPoints(page)).toEqual(multiDeleted);
    await redo(page);
    await count(page, 0);
    await undo(page);
    await tool(page, "점 추가");
    await canvas(page).click({ position: { x: 130, y: 100 } });
    await expect(page.getByLabel("다시 실행", { exact: true })).toBeDisabled();
  });

  test("50 points from one stroke form one transaction; slow/fast density and 600 cap", async ({
    page,
  }, info) => {
    await loadPoints(page);
    await page
      .getByRole("button", { name: "전체 지우기", exact: true })
      .click();
    await tool(page, "점 추가");
    await page.getByLabel("새 점 클래스", { exact: true }).fill("7");
    const { box, scale } = await geometry(page);
    const start = { x: box.x + 80, y: box.y + 100 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.waitForTimeout(80);
    await count(page, 0); // Only the Canvas preview changes before pointer-up.
    const timings = page.evaluate(
      () =>
        new Promise<number[]>((resolve) => {
          const frames: number[] = [];
          let last = performance.now();
          const end = last + 600;
          const tick = (now: number) => {
            frames.push(now - last);
            last = now;
            if (now < end) requestAnimationFrame(tick);
            else resolve(frames.slice(1));
          };
          requestAnimationFrame(tick);
        }),
    );
    await page.mouse.move(start.x + 588, start.y);
    await page.waitForTimeout(100);
    await page.mouse.up();
    await count(page, 50);
    const fast = await readPoints(page);
    expect(fast.every((p) => p.label === 7 && p.features === undefined)).toBe(
      true,
    );
    for (let i = 1; i < fast.length; i++)
      expect((fast[i].x - fast[i - 1].x) * scale).toBeCloseTo(12, 6);
    await undo(page);
    await count(page, 0);
    await undo(page);
    expect(await readPoints(page)).toEqual(fixture);
    await redo(page);
    await count(page, 0);
    await redo(page);
    expect(await readPoints(page)).toEqual(fast);
    await undo(page);
    await drag(page, start, { x: start.x + 588, y: start.y }, "left", 196);
    const slow = await readPoints(page);
    expect(slow).toHaveLength(50);
    slow.forEach((p, i) => {
      expect(p.x).toBeCloseTo(fast[i].x, 6);
      expect(p.y).toBeCloseTo(fast[i].y, 6);
    });
    const frames = (await timings).sort((a, b) => a - b);
    await info.attach("stroke-frame-times", {
      body: JSON.stringify({
        samples: frames.length,
        p95Ms: frames[Math.floor(frames.length * 0.95)],
        maxMs: frames.at(-1),
      }),
      contentType: "application/json",
    });

    const many = Array.from({ length: 590 }, (_, i) => ({
      x: i / 590,
      y: 0.3,
      label: i % 3,
      features: [`id=${i}`],
    }));
    await loadPoints(page, many);
    await drag(page, start, { x: start.x + 588, y: start.y });
    await count(page, 600);
    const full = await readPoints(page);
    expect(full.slice(0, 590)).toEqual(many);
    expect(full.slice(590).every((p) => p.label === 7)).toBe(true);
    await canvas(page).click({ position: { x: 180, y: 160 } });
    await count(page, 600);
    await undo(page);
    expect(await readPoints(page)).toEqual(many);
    await redo(page);
    expect(await readPoints(page)).toEqual(full);
  });

  test("right drag pans every tool without edits/history and zoom/pan coordinates stay correct", async ({
    page,
  }) => {
    await loadPoints(page);
    const { box, scale, screen } = await geometry(page);
    const from = screen(fixture[0]),
      to = { x: from.x + 36, y: from.y + 24 };
    for (const name of [
      "점 이동",
      "점 추가",
      "점 삭제",
      "영역 선택",
      "화면 이동",
    ]) {
      await tool(page, name);
      await drag(page, from, to, "right", 5);
      await expect(canvas(page)).toHaveAttribute("data-gesture", "idle");
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(await readPoints(page)).toEqual(fixture);
      await page
        .locator(".editor-stage")
        .getByTitle("확대·이동 초기화", { exact: true })
        .click();
    }
    await undo(page);
    await count(page, 120); // Pan/tool/reset created no history.
    await redo(page);
    expect(await readPoints(page)).toEqual(fixture);
    expect(
      await canvas(page).evaluate(
        (node) =>
          !node.dispatchEvent(
            new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
          ),
      ),
    ).toBe(true);
    expect(
      await page.locator(".editor-toolbar").evaluate(
        (node) =>
          !node.dispatchEvent(
            new MouseEvent("contextmenu", {
              bubbles: true,
              cancelable: true,
            }),
          ),
      ),
    ).toBe(false);
    await tool(page, "점 추가");
    await page.mouse.move(from.x, from.y);
    await page.mouse.down({ button: "right" });
    await expect(canvas(page)).toHaveAttribute("data-gesture", "panning");
    await expect(canvas(page)).toHaveCSS("cursor", "grabbing");
    await page.mouse.move(to.x, to.y);
    await page.mouse.up({ button: "right" });
    await canvas(page).dispatchEvent("wheel", {
      deltaY: -Math.log(2) * 1000,
      deltaMode: 0,
    });
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await drag(page, start, { x: start.x + 60, y: start.y });
    const points = (await readPoints(page)).slice(2);
    expect(points).toHaveLength(6);
    expect(points[0].x).toBeCloseTo(0.5 - 36 / (scale * 2), 5);
    expect(points[0].y).toBeCloseTo(0.5 + 24 / (scale * 2), 5);
    expect(points[1].x - points[0].x).toBeCloseTo(12 / (scale * 2), 6);
    await page.goto("#lab");
    expect(
      await page.locator(".stage canvas").evaluate(
        (node) =>
          !node.dispatchEvent(
            new MouseEvent("contextmenu", {
              bubbles: true,
              cancelable: true,
            }),
          ),
      ),
    ).toBe(false);
  });

  test("preset, regeneration options and CSV/JSON replacements restore matching metadata", async ({
    page,
  }) => {
    const original = await readPoints(page);
    await page
      .locator(".preset-card")
      .filter({
        has: page.getByRole("heading", { name: "두 개의 초승달", exact: true }),
      })
      .click();
    const moons = await readPoints(page);
    await undo(page);
    expect(await readPoints(page)).toEqual(original);
    await expect(page.locator(".preset-card.selected")).toContainText(
      "가우시안 군집",
    );
    await redo(page);
    expect(await readPoints(page)).toEqual(moons);
    await page
      .locator(".generator")
      .getByLabel("데이터 수", { exact: true })
      .fill("10");
    await page
      .locator(".generator")
      .getByLabel("난수 시드", { exact: true })
      .fill("99");
    await page
      .getByRole("button", { name: "현재 프리셋 다시 생성", exact: true })
      .click();
    await count(page, 10);
    const generated = await readPoints(page);
    await undo(page);
    expect(await readPoints(page)).toEqual(moons);
    await expect(
      page.locator(".generator").getByLabel("데이터 수", { exact: true }),
    ).toHaveValue("120");
    await expect(
      page.locator(".generator").getByLabel("난수 시드", { exact: true }),
    ).toHaveValue("42");
    await redo(page);
    expect(await readPoints(page)).toEqual(generated);
    await expect(
      page.locator(".generator").getByLabel("난수 시드", { exact: true }),
    ).toHaveValue("99");
    await page.locator("input[type=file]").setInputFiles({
      name: "labeled.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "x,y,label,features\n0.1,0.2,3,a=b;c=d\n0.7,0.8,8,e=f",
      ),
    });
    await count(page, 2);
    const csv = await readPoints(page);
    expect(csv[0]).toEqual({
      x: 0.1,
      y: 0.2,
      label: 3,
      features: ["a=b", "c=d"],
    });
    await expect(page.locator(".preset-card.selected")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "현재 프리셋 다시 생성", exact: true }),
    ).toBeDisabled();
    await undo(page);
    expect(await readPoints(page)).toEqual(generated);
    await expect(page.locator(".preset-card.selected")).toContainText(
      "두 개의 초승달",
    );
    await redo(page);
    expect(await readPoints(page)).toEqual(csv);
    const json = [...fixture, { x: 0.9, y: 0.1, features: [] }];
    await loadPoints(page, json);
    await undo(page);
    expect(await readPoints(page)).toEqual(csv);
    await redo(page);
    expect(await readPoints(page)).toEqual(json);
    await page.goto("#lab");
    await expect(page.getByLabel("실험 프리셋", { exact: true })).toHaveValue(
      "",
    );
    await expect(
      page.getByLabel("데이터 재생성", { exact: true }),
    ).toBeDisabled();
  });

  test("shortcuts are page-scoped, skip editable controls and preserve native text undo", async ({
    page,
  }) => {
    await loadPoints(page);
    await tool(page, "점 추가");
    await canvas(page).click({ position: { x: 100, y: 100 } });
    await page.evaluate(() => {
      window.addEventListener("keydown", (e) => {
        document.documentElement.dataset.shortcutPrevented = String(
          e.defaultPrevented,
        );
      });
      const host = document.querySelector(".data-page")!;
      host.insertAdjacentHTML(
        "afterbegin",
        '<textarea aria-label="test textarea"></textarea><select aria-label="test select"><option>A</option></select><div contenteditable="true" role="textbox" aria-label="test editable">text</div>',
      );
    });
    const input = page.getByLabel("프리셋 검색", { exact: true });
    await input.fill("");
    await input.pressSequentially("abc");
    await input.press("Control+z");
    await expect(input).not.toHaveValue("abc");
    await count(page, 3);
    for (const label of [
      "새 점 클래스",
      "test textarea",
      "test select",
      "test editable",
    ]) {
      const field = page.getByLabel(label, { exact: true });
      await field.focus();
      await field.press("Control+z");
      expect(
        await page.locator("html").getAttribute("data-shortcut-prevented"),
      ).toBe("false");
      await count(page, 3);
    }
    await page.locator(".editor-bottom > span").click();
    await page.keyboard.press("Control+z");
    await count(page, 2);
    await page.keyboard.press("Control+y");
    await count(page, 3);
    await page.keyboard.press("Meta+z");
    await count(page, 2);
    await page.keyboard.press("Meta+Shift+z");
    await count(page, 3);
    await page.keyboard.press("Control+z");
    await count(page, 2);
    await page.keyboard.press("Control+Shift+z");
    await count(page, 3);
    await page.goto("#lab");
    await page.keyboard.press("Control+z");
    expect(
      await page.locator("html").getAttribute("data-shortcut-prevented"),
    ).toBe("false");
    await page.goto("#data");
    await count(page, 3);
  });

  test("cancel, capture loss, button chords, resize and navigation discard previews; outside release commits once", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: "전체 지우기", exact: true })
      .click();
    await tool(page, "점 추가");
    await canvas(page).evaluate((node) =>
      node.addEventListener("pointerdown", (e) => {
        node.dataset.testPointerId = String((e as PointerEvent).pointerId);
      }),
    );
    const { box } = await geometry(page);
    const start = { x: box.x + 100, y: box.y + 100 };
    const begin = async () => {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x + 60, start.y);
    };
    await begin();
    await canvas(page).dispatchEvent("pointercancel", {
      pointerId: 1,
      pointerType: "mouse",
    });
    await page.mouse.up();
    await count(page, 0);
    await begin();
    await canvas(page).evaluate((node) =>
      node.releasePointerCapture(Number(node.dataset.testPointerId)),
    );
    await page.mouse.move(start.x + 70, start.y);
    await page.mouse.up();
    await count(page, 0);
    await begin();
    await page.mouse.down({ button: "right" });
    await page.mouse.move(start.x + 80, start.y);
    await page.mouse.up({ button: "right" });
    await page.mouse.up();
    await count(page, 0);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down({ button: "right" });
    await page.mouse.down();
    await page.mouse.move(start.x + 24, start.y);
    await page.mouse.up();
    await page.mouse.up({ button: "right" });
    await count(page, 0);
    await begin();
    await page.setViewportSize({ width: 1820, height: 1080 });
    await expect(canvas(page)).toHaveAttribute("data-gesture", "idle");
    await page.mouse.up();
    await count(page, 0);
    await begin();
    await page.goto("#lab");
    await page.mouse.up();
    await page.goto("#data");
    await count(page, 0);
    await undo(page);
    await count(page, 120);
    await redo(page);
    await count(page, 0);
    const current = await geometry(page);
    await drag(
      page,
      { x: current.box.x + 80, y: current.box.y + 100 },
      { x: current.box.x + current.box.width + 30, y: current.box.y + 100 },
    );
    expect((await readPoints(page)).length).toBeGreaterThan(10);
    await undo(page);
    await count(page, 0);
    await expect(canvas(page)).toHaveAttribute("data-gesture", "idle");
  });
});

test("native touch add, cancelled drawing on second finger, pinch zoom and toolbar fit", async ({
  page,
  context,
}, info) => {
  test.skip(
    info.project.name !== "mobile",
    "Uses the real touch-enabled mobile browser context.",
  );
  await page.goto("#data");
  await page.getByRole("button", { name: "전체 지우기", exact: true }).click();
  await tool(page, "점 추가");
  const { box, scale } = await geometry(page);
  const session = await context.newCDPSession(page);
  const touch = (x: number, y: number, id: number) => ({
    x: box.x + x,
    y: box.y + y,
    id,
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touch(80, 100, 1)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await count(page, 1);
  await undo(page);
  await count(page, 0);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touch(80, 100, 1)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [touch(100, 100, 1)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touch(100, 100, 1), touch(200, 100, 2)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [touch(80, 100, 1), touch(220, 100, 2)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await count(page, 0);
  await expect(page.getByLabel("다시 실행", { exact: true })).toBeEnabled(); // Pinch did not replace the undone tap.
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touch(100, 100, 3)],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await count(page, 1);
  const [point] = await readPoints(page);
  expect(point.x).toBeCloseTo(0.5 + (100 - box.width / 2) / (scale * 1.4), 4);
  expect(point.y).toBeCloseTo(0.5 - (100 - box.height / 2) / (scale * 1.4), 4);
  for (const label of ["실행 취소", "다시 실행"]) {
    const bounds = (await page
      .getByLabel(label, { exact: true })
      .boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(
    page.getByRole("group", { name: "편집 기록", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: "test-results/v06-editor-touch.png" });
});

test("larger home typography and editor toolbar fit requested viewport widths", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "chromium",
    "Explicit viewport matrix; mobile behavior is covered separately.",
  );
  const sizes = [
    [1920, 54, 31, 16],
    [1440, 52.56, 31, 16],
    [1024, 42, 28, 14],
    [800, 48, 30, 15],
    [768, 48, 30, 15],
    [390, 33.54, 26, 14],
    [320, 28, 24, 12],
  ];
  for (const [width, title, subtitle, button] of sizes) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("");
    await page.evaluate(() => document.fonts.ready);
    const values = await page.evaluate(() =>
      [".hero h1", ".hero-subtitle", ".hero-actions button"].map((s) =>
        parseFloat(getComputedStyle(document.querySelector(s)!).fontSize),
      ),
    );
    values.forEach((value, i) =>
      expect(value).toBeCloseTo([title, subtitle, button][i], 1),
    );
    await page.screenshot({
      path: `test-results/v06-home-${width}.png`,
      fullPage: true,
    });
    await page.goto("#data");
    for (const label of ["실행 취소", "다시 실행"]) {
      const bounds = (await page
        .getByLabel(label, { exact: true })
        .boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `test-results/v06-editor-${width}.png` });
  }
});
