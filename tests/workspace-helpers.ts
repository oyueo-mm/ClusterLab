import { expect, type Locator, type Page } from "@playwright/test";
type Scope = Page | Locator;
export async function chooseAlgorithm(scope: Scope, algorithm: string) {
  await scope
    .locator(".workspace-toolbar:visible")
    .getByLabel("알고리즘 선택", { exact: true })
    .click();
  await scope
    .locator(".picker-popover:visible")
    .getByLabel("실험실 알고리즘 검색", { exact: true })
    .fill(algorithm);
  const name = algorithm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await scope
    .locator(".picker-popover:visible")
    .getByRole("option", { name: new RegExp(`^${name}(?:\\s|$)`) })
    .click();
}
export async function openData(scope: Scope) {
  const button = scope
    .locator(".workspace-toolbar:visible")
    .getByLabel("데이터셋 편집", { exact: true });
  if ((await button.getAttribute("aria-expanded")) !== "true")
    await button.click();
}
export async function closeData(scope: Scope) {
  const button = scope
    .locator(".workspace-data:visible")
    .getByLabel("데이터 패널 닫기", { exact: true });
  if (await button.isVisible()) await button.click();
}
export async function openSettings(scope: Scope) {
  const page = "viewportSize" in scope ? scope : scope.page();
  if ((page.viewportSize()?.width ?? 1440) <= 800) await closeData(scope);
  const button = scope
    .locator(".workspace-toolbar:visible")
    .getByLabel("설정 열기", { exact: true });
  if ((await button.getAttribute("aria-expanded")) !== "true")
    await button.click();
  await scope.getByRole("tab", { name: "설정", exact: true }).click();
}
export async function openAnalysis(scope: Scope) {
  const page = "viewportSize" in scope ? scope : scope.page();
  if ((page.viewportSize()?.width ?? 1440) <= 800) await closeData(scope);
  const button = scope
    .locator(".workspace-toolbar:visible")
    .getByLabel("설정 열기", { exact: true });
  if ((await button.getAttribute("aria-expanded")) !== "true")
    await button.click();
  await scope.getByRole("tab", { name: "분석", exact: true }).click();
}
export async function expectAlgorithm(scope: Scope, algorithm: string) {
  await expect(scope.getByLabel("알고리즘 선택", { exact: true })).toHaveText(
    algorithm,
  );
}
