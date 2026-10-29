import { test, expect } from "@playwright/test";
type Audit = {
  requests: { algorithm: string; points: string }[];
  terminated: string[];
};
declare global {interface Window {__audit:Audit}}
test("four real home Workers share exactly the same source data and stop when not visible", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as Window & { __audit: Audit };
    w.__audit = { requests: [], terminated: [] };
    const post = Worker.prototype.postMessage,
      terminate = Worker.prototype.terminate,
      owners = new WeakMap<Worker, string>();
    Object.defineProperty(Worker.prototype, "postMessage", {
      value: function (
        this: Worker,
        message: { algorithm: string; points: unknown },
      ) {
        if (message.algorithm) {
          owners.set(this, message.algorithm);
          w.__audit.requests.push({
            algorithm: message.algorithm,
            points: JSON.stringify(message.points),
          });
        }
        return post.call(this, message);
      },
    });
    Worker.prototype.terminate = function () {
      const a = owners.get(this);
      if (a) w.__audit.terminated.push(a);
      return terminate.call(this);
    };
  });
  await page.goto("");
  await expect(
    page.getByRole("heading", { name: "클러스터링 알고리즘", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".hero-subtitle")).toHaveText("시뮬레이터");
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll(".home-demo")].length === 4 &&
      [...document.querySelectorAll(".home-demo")].every(
        (n) => Number(n.getAttribute("data-events")) > 0,
      ),
  );
  const audit = await page.evaluate(
    () => (window as Window & { __audit: Audit }).__audit,
  );
  const names = ["K-Means", "DBSCAN", "GMM", "Mean Shift"];
  for (const a of names)
    expect(audit.requests.some((r) => r.algorithm === a)).toBe(true);
  expect(
    new Set(
      audit.requests
        .filter((r) => names.includes(r.algorithm))
        .map((r) => r.points),
    ).size,
  ).toBe(1);
  for (const a of names)
    await expect(
      page.getByLabel(`${a} 데모 일시정지`, { exact: true }),
    ).toHaveCount(1);
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.id = "offscreen-test";
    spacer.style.height = "200vh";
    document.body.append(spacer);
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".home-demo")].every(
      (n) => n.getAttribute("data-active") === "false",
    ),
  );
  const positions = await page
    .locator(".home-demo")
    .evaluateAll((ns) => ns.map((n) => n.getAttribute("data-position")));
  await page.waitForTimeout(250);
  expect(
    await page
      .locator(".home-demo")
      .evaluateAll((ns) => ns.map((n) => n.getAttribute("data-position"))),
  ).toEqual(positions);
  const stopped = await page.evaluate(
    () => (window as Window & { __audit: Audit }).__audit.terminated,
  );
  for (const a of names) expect(stopped).toContain(a);
  await page.evaluate(() => {
    document.getElementById("offscreen-test")?.remove();
    window.scrollTo(0, 0);
  });
  await page
    .getByRole("button", { name: "Mean Shift 실험실 열기", exact: true })
    .click();
  await expect(page.getByLabel("알고리즘 선택")).toHaveValue("Mean Shift");
  await expect(page.locator(".point-count")).toHaveText("60 points");
  await expect(page.locator(".visualization-description")).toHaveText(
    "Mean Shift 데이터 및 실제 연산 시각화",
  );
});
test("simplified chrome, white surfaces, mobile menu and dynamic parameters", async ({
  page,
}, info) => {
  await page.goto("");
  const forbidden = [
    "INTERACTIVE CLUSTERING LAB",
    "점들이 모이는 순간",
    "EXPlORE THE LAB",
    "LIVE DEMO",
    "WORKSPACE",
    "브라우저에서 실행",
    "작은 점에서 시작하는 발견",
    "ClusterLab · Interactive ML Lab",
  ];
  for (const text of forbidden)
    await expect(page.getByText(text, { exact: false })).toHaveCount(0);
  expect(
    await page
      .locator(".sidebar")
      .evaluate((n) => getComputedStyle(n).backgroundColor),
  ).toBe("rgb(255, 255, 255)");
  if (info.project.name === "mobile") {
    await page.getByLabel("메뉴 열기").click();
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "알고리즘 실험실", exact: true })
      .click();
  } else {
    await page.getByLabel("사이드바 접기").click();
    await expect(page.locator(".app")).toHaveClass(/nav-collapsed/);
    await page.getByLabel("사이드바 펼치기").click();
    await page.getByRole("button", { name: "실험 시작하기" }).click();
  }
  await expect(page.locator(".lab-page>.page-heading")).toHaveCount(0);
  await expect(page.locator(".stage-heading .family-tag")).toBeVisible();
  await expect(page.getByRole("button", { name: /^(일반|고속)$/ })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("재생 속도")).toHaveAttribute("max", "200");
  await page.getByLabel("알고리즘 선택").selectOption("Mean Shift");
  if (info.project.name === "mobile")
    await page.getByLabel("설정 열기").click();
  const panel = page.locator(".settings-panel");
  await expect(panel.getByText("PARAMETERS")).toHaveCount(0);
  await expect(panel.getByRole("heading")).toHaveCount(0);
  await expect(panel.getByText("관찰 포인트", { exact: true })).toHaveCount(0);
  await panel.getByLabel("Bandwidth", { exact: true }).fill("0");
  await expect(page.getByRole("alert")).toContainText("Bandwidth");
  await panel.getByLabel("Bandwidth", { exact: true }).fill("0.2");
  await expect(page.locator(".status")).toHaveText("준비됨");
  await expect(page.locator(".error")).toHaveCount(0);
  if (info.project.name === "mobile")
    await page.getByLabel("설정 닫기").click();
  await page.getByLabel("재생 속도").fill("200");
  await page.getByLabel("마지막으로").click();
  await expect(page.locator(".status")).toHaveText("완료");
});
