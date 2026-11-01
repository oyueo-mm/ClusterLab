import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("legacy saved original data migrates without being replaced by a recommendation", async ({
  page,
}) => {
  await page.goto("");
  const source = {
    kind: "numeric",
    values: [
      [0, 0, 0],
      [0, 0, 0.2],
      [0, 0, 4],
      [0, 0, 4.2],
    ],
  };
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("clusterlab-labs", 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("datasets"))
            request.result.createObjectStore("datasets");
        };
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("datasets", "readwrite");
          tx.objectStore("datasets").put(value, "structured-v1");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    source,
  );
  await page.goto("#/lab/X-Means");
  const lab = page.locator(".structured-page");
  await expect
    .poll(
      async () =>
        JSON.parse(
          await lab
            .getByLabel("원본 데이터 JSON", { exact: true })
            .inputValue(),
        ).data,
    )
    .toEqual(source);
  await page.reload();
  await expect
    .poll(
      async () =>
        JSON.parse(
          await lab
            .getByLabel("원본 데이터 JSON", { exact: true })
            .inputValue(),
        ).data,
    )
    .toEqual(source);
});
test("user points restore from IndexedDB even when preference storage is blocked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    for (const name of ["getItem", "setItem"])
      Object.defineProperty(Storage.prototype, name, {
        value() {
          throw new DOMException("Blocked preferences", "SecurityError");
        },
      });
  });
  await page.goto("#/lab/K-Means");
  await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
  await page.locator('input[type="file"]').setInputFiles({
    name: "owned.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("x,y\n0.1,0.2\n0.3,0.4\n0.7,0.8\n0.8,0.9"),
  });
  await expect(page.locator(".point-count")).toHaveText("4 points");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string>((resolve) => {
            const open = indexedDB.open("clusterlab-labs", 1);
            open.onsuccess = () => {
              const db = open.result;
              const get = db
                .transaction("datasets")
                .objectStore("datasets")
                .get("points-v1");
              get.onsuccess = () => {
                resolve(
                  get.result?.points.length === 4 ? get.result.ownership : "",
                );
                db.close();
              };
            };
          }),
      ),
    )
    .toBe("user");
  await page.reload();
  await expect(page.locator(".point-count")).toHaveText("4 points");
});
test("catalog entry selects the algorithm default until a user owns the point data", async ({
  page,
}) => {
  await page.goto("");
  await page
    .getByRole("button", { name: "알고리즘 둘러보기", exact: true })
    .click();
  await page.getByLabel("알고리즘 검색", { exact: true }).fill("DBSCAN");
  await page
    .locator(".catalog-grid article")
    .filter({ has: page.getByText("DBSCAN", { exact: true }) })
    .getByRole("button", { name: "실험실에서 실행", exact: true })
    .click();
  await expect(page.getByLabel("실험 프리셋", { exact: true })).toHaveValue(
    "moons",
  );
  await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
  await page.locator('input[type="file"]').setInputFiles({
    name: "owned.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("x,y\n0.1,0.2\n0.3,0.4\n0.7,0.8\n0.8,0.9"),
  });
  await expect(page.locator(".point-count")).toHaveText("4 points");
  await page.goto("#/catalog?q=GMM");
  await page
    .locator(".catalog-grid article")
    .filter({ has: page.getByText("GMM", { exact: true }) })
    .getByRole("button", { name: "실험실에서 실행", exact: true })
    .click();
  await expect(page.locator(".point-count")).toHaveText("4 points");
});
test("untouched native defaults follow each algorithm while explicit source data survives incompatible navigation", async ({
  page,
}) => {
  await page.goto("#/lab/Spectral%20Clustering");
  const lab = page.locator(".structured-page");
  await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
  await page.goto("#/lab/Louvain");
  await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
  await expect
    .poll(
      async () =>
        JSON.parse(
          await lab
            .getByLabel("원본 데이터 JSON", { exact: true })
            .inputValue(),
        ).data.kind,
    )
    .toBe("graph");
  const narrow = (page.viewportSize()?.width ?? 1440) <= 800;
  if (narrow)
    await lab
      .getByRole("button", { name: "설정·데이터·분석 열기", exact: true })
      .click();
  await lab.getByRole("tab", { name: "데이터", exact: true }).click();
  await lab
    .getByRole("button", { name: "이 데이터셋 적용", exact: true })
    .click();
  const before = JSON.parse(
    await lab.getByLabel("원본 데이터 JSON", { exact: true }).inputValue(),
  ).data;
  if (narrow) await lab.getByLabel("설정 닫기", { exact: true }).click();
  await page.goto("#/lab/Bimax");
  await expect(lab.getByRole("alert")).toContainText(
    "현재 graph 원본은 Bimax에서 지원하지 않습니다",
  );
  expect(
    JSON.parse(
      await lab.getByLabel("원본 데이터 JSON", { exact: true }).inputValue(),
    ).data,
  ).toEqual(before);
  await expect(lab.getByLabel("재생", { exact: true })).toBeDisabled();
});
test("an alternate recommendation keeps its seed when regenerated", async ({
  page,
}) => {
  await page.goto("#/lab/K-Means");
  const lab = page.locator(".lab-page"),
    narrow = (page.viewportSize()?.width ?? 1440) <= 800;
  await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
  const open = async () => {
    if (narrow) await lab.getByLabel("설정 열기", { exact: true }).click();
    await lab.getByRole("tab", { name: "데이터", exact: true }).click();
  };
  await open();
  await lab.getByLabel("추천 데이터셋", { exact: true }).selectOption("2");
  await lab
    .getByRole("button", { name: "이 데이터셋 적용", exact: true })
    .click();
  const exported = async () => {
    const pending = page.waitForEvent("download");
    await lab
      .getByRole("button", { name: "JSON 내보내기", exact: true })
      .click();
    const file = await pending;
    return JSON.parse(await readFile((await file.path())!, "utf8"));
  };
  const before = await exported();
  if (narrow) await lab.getByLabel("설정 닫기", { exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string>((resolve) => {
            const request = indexedDB.open("clusterlab-labs", 1);
            request.onsuccess = () => {
              const db = request.result;
              const get = db
                .transaction("datasets")
                .objectStore("datasets")
                .get("points-v1");
              get.onsuccess = () => {
                resolve(get.result?.preset ?? "");
                db.close();
              };
            };
          }),
      ),
    )
    .toBe("blobs-alternate");
  await page.reload();
  await expect(lab.getByLabel("재생", { exact: true })).toBeEnabled();
  await lab.getByLabel("데이터 재생성", { exact: true }).click();
  await open();
  expect(await exported()).toEqual(before);
  await expect(
    lab.getByLabel("실험 프리셋").locator("option:checked"),
  ).toContainText("다른 표본");
});
test("edited data, undo/redo and IndexedDB restoration survive algorithm navigation", async ({
  page,
}) => {
  await page.goto("#/lab/K-Means");
  await expect(page.getByLabel("재생", { exact: true })).toBeEnabled();
  const original = await page.locator(".point-count").textContent();
  await page.locator('input[type="file"]').setInputFiles({
    name: "custom.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "x,y,label\n0.1,0.2,0\n0.3,0.4,0\n0.7,0.8,1\n0.8,0.9,1",
    ),
  });
  await expect(page.locator(".point-count")).toHaveText("4 points");
  await page.getByLabel("실험실 실행 취소", { exact: true }).click();
  await expect(page.locator(".point-count")).toHaveText(original!);
  await page.getByLabel("실험실 다시 실행", { exact: true }).click();
  await expect(page.locator(".point-count")).toHaveText("4 points");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const open = indexedDB.open("clusterlab-labs", 1);
            open.onsuccess = () => {
              const db = open.result;
              const get = db
                .transaction("datasets")
                .objectStore("datasets")
                .get("points-v1");
              get.onsuccess = () => {
                resolve(get.result?.points.length ?? 0);
                db.close();
              };
            };
          }),
      ),
    )
    .toBe(4);
  await page.goto("#/lab/DBSCAN");
  await expect(page.locator(".point-count")).toHaveText("4 points");
  await page.reload();
  await expect(page.locator(".point-count")).toHaveText("4 points");
  await page.goto("#/lab/Spectral%20Clustering");
  // ID entry must retain original work; explicitly recommended replacements remain undoable.
  await expect(page.locator(".structured-page .lab-header h1")).toContainText(
    "Spectral Clustering",
  );
  const raw = JSON.parse(
    await page
      .locator(".structured-page")
      .getByLabel("원본 데이터 JSON", { exact: true })
      .inputValue(),
  );
  expect(raw.data.values).toEqual([
    [0.1, 0.2],
    [0.3, 0.4],
    [0.7, 0.8],
    [0.8, 0.9],
  ]);
});
test("native comparison uses shared graph input with independent real results", async ({
  page,
}) => {
  await page.goto("#/compare");
  await page.getByLabel("추천 비교 조합").selectOption("5");
  await expect(page.locator(".compare-card")).toHaveCount(3);
  for (const card of await page.locator(".compare-card").all()) {
    await expect(card.getByLabel("재생", { exact: true })).toBeEnabled();
    await card.getByLabel("마지막으로", { exact: true }).click();
    expect(
      Number(await card.getByLabel("타임라인", { exact: true }).inputValue()),
    ).toBeGreaterThan(0);
  }
  await page.getByLabel("비교 원본 데이터셋").selectOption("categorical-base");
  await expect(page.getByRole("alert")).toHaveCount(3);
  await expect(
    page
      .getByLabel("원본 비교 알고리즘")
      .first()
      .getByRole("option", { name: "K-Means · 입력 불일치", exact: true }),
  ).toBeDisabled();
});
