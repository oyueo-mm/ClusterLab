import { test, expect } from "@playwright/test";

test("home introduction centers beside the demos and stays compact when stacked", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "chromium",
    "Explicit viewport matrix covers desktop and mobile sizes.",
  );
  await page.goto("");
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1920, 1440, 1024, 820, 801, 800, 768, 390, 320]) {
    for (const height of [600, 1080]) {
      for (const collapsed of [false, true]) {
        // The existing UI hides the collapse control at <=1000px. Resize
        // after toggling to cover both persisted states at narrow widths.
        await page.setViewportSize({ width: Math.max(width, 1024), height });
        const toggle = page.locator(".collapse");
        if (
          (await toggle.getAttribute("aria-expanded")) !== String(!collapsed)
        ) {
          await toggle.click();
        }
        await page.setViewportSize({ width, height });
        if (width <= 520) {
          await page
            .getByRole("button", { name: "메뉴 열기", exact: true })
            .click();
          await expect(page.locator(".sidebar")).toHaveClass(/open/);
          await page
            .getByRole("button", { name: "메뉴 닫기", exact: true })
            .click({ position: { x: width - 8, y: 8 } });
          await expect(page.locator(".sidebar")).not.toHaveClass(/open/);
        }
        await expect(page.locator(".app")).toHaveClass(
          collapsed ? /nav-collapsed/ : /^app\s*$/,
        );
        await expect(async () => {
          const layout = await page.evaluate(() => {
            const box = (selector: string) =>
              document.querySelector(selector)!.getBoundingClientRect();
            const copy = box(".hero-copy"),
              title = box(".hero h1"),
              subtitle = box(".hero-subtitle"),
              actions = box(".hero-actions"),
              cycle = box(".home-cycle"),
              grid = box(".home-demo-grid"),
              hero = box(".hero"),
              buttons = [
                ...document.querySelectorAll(".hero-actions button"),
              ].map((n) => ({
                rect: n.getBoundingClientRect(),
                fits: n.scrollWidth <= n.clientWidth,
              })),
              cards = [...document.querySelectorAll(".home-demo")].map((n) =>
                n.getBoundingClientRect(),
              );
            // Include text overflow: a nowrap heading can exceed its CSS box.
            const range = document.createRange();
            range.selectNodeContents(document.querySelector(".hero h1")!);
            return {
              centerDelta: Math.abs(
                (title.top + actions.bottom) / 2 -
                  (cycle.top + cycle.bottom) / 2,
              ),
              titleFits: range.getBoundingClientRect().right <= copy.right + 1,
              ordered:
                title.bottom <= subtitle.top && subtitle.bottom <= actions.top,
              buttonsFit: buttons.every(
                ({ rect, fits }) =>
                  fits &&
                  rect.left >= copy.left &&
                  rect.right <= copy.right + 1,
              ),
              buttonsAligned:
                Math.abs(buttons[0].rect.top - buttons[1].rect.top) < 1,
              noOverflow: document.documentElement.scrollWidth <= innerWidth,
              navHidden: innerWidth > 520 || box(".sidebar").right <= 1,
              noOverlap: copy.right <= cycle.left,
              stacked: cycle.top >= copy.bottom,
              topGap: title.top - hero.top,
              stackGap: cycle.top - actions.bottom,
              gridFits: grid.right <= innerWidth,
              twoByTwo:
                cards.length === 4 &&
                Math.abs(cards[0].top - cards[1].top) < 1 &&
                Math.abs(cards[2].top - cards[3].top) < 1 &&
                cards[2].top >= cards[0].bottom,
              singleColumn:
                cards.length === 4 &&
                cards.slice(1).every((card, i) => card.top >= cards[i].bottom),
            };
          });
          expect(
            layout,
            `${width}x${height} collapsed=${collapsed}`,
          ).toMatchObject({
            titleFits: true,
            ordered: true,
            buttonsFit: true,
            buttonsAligned: true,
            noOverflow: true,
            navHidden: true,
            gridFits: true,
            // Preserve v0.4's single card column at <=340px.
            ...(width <= 340 ? { singleColumn: true } : { twoByTwo: true }),
          });
          if (width > 800) {
            expect(layout.noOverlap).toBe(true);
            expect(layout.centerDelta).toBeLessThan(1);
          } else {
            expect(layout.stacked).toBe(true);
            expect(layout.topGap).toBeLessThanOrEqual(32);
            expect(layout.stackGap).toBeLessThanOrEqual(32);
          }
        }).toPass({ timeout: 2000 });
        if ([1920, 1440, 768, 390, 320].includes(width) && height === 1080) {
          await page.screenshot({
            path: `test-results/v05-home-${width}-${collapsed ? "collapsed" : "expanded"}.png`,
            fullPage: true,
          });
        }
      }
    }
  }
  await page
    .getByRole("button", { name: "실험 시작하기", exact: true })
    .click();
  await expect(page.getByLabel("알고리즘 선택")).toBeVisible();
  await page.goto("#home");
  await page
    .getByRole("button", { name: "데이터셋 둘러보기", exact: true })
    .click();
  await expect(page.locator(".preset-card")).toHaveCount(32);
});
