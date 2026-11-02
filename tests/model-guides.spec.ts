import { openAnalysis } from "./workspace-helpers";
import { test, expect, type Page } from "@playwright/test";
import type { Algorithm, Params, Trace } from "../src/engine/types";
import type { Dataset } from "../src/engine/dataset";
import { stateAt } from "../src/engine/trace";
import { copkmeans } from "../src/data/lessons/constrained";
import {
  bernoulli,
  poisson,
  multinomial,
} from "../src/data/lessons/discreteMixtures";
import { walktrap, cliquepercolation } from "../src/data/lessons/graphFollowup";

interface GuideRequest {
  algorithm: Algorithm;
  params: Params;
  dataset?: Dataset;
}
declare global {
  interface Window {
    modelGuideRuns: { trace: Trace; request?: GuideRequest }[];
    modelGuideErrors: { message: string; request?: GuideRequest }[];
  }
}

// Observe the actual module Worker and its original request/response; never
// synthesize results, replace engines, or bypass the public guide/lab controls.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.modelGuideRuns = [];
    window.modelGuideErrors = [];
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      private request?: GuideRequest;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event) => {
          if (event.data.trace)
            window.modelGuideRuns.push({
              trace: event.data.trace,
              request: this.request,
            });
          if (event.data.error)
            window.modelGuideErrors.push({
              message: event.data.error,
              request: this.request,
            });
        });
      }
      postMessage(message: unknown, transfer: Transferable[]): void;
      postMessage(message: unknown, options?: StructuredSerializeOptions): void;
      postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = {},
      ) {
        const request = message as GuideRequest;
        this.request = structuredClone({
          algorithm: request.algorithm,
          params: request.params,
          dataset: request.dataset,
        });
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
  });
});

async function completed(
  page: Page,
  before: number,
  algorithm: Algorithm,
  changed?: { key: keyof Params; value: number },
) {
  const find = ({
    before,
    algorithm,
    changed,
  }: {
    before: number;
    algorithm: Algorithm;
    changed?: { key: keyof Params; value: number };
  }) =>
    window.modelGuideRuns
      .slice(before)
      .filter(
        (run) =>
          run.trace.algorithm === algorithm &&
          run.request?.dataset !== undefined &&
          (!changed || run.request.params[changed.key] === changed.value),
      )
      .at(-1);
  await expect
    .poll(() => page.evaluate(find, { before, algorithm, changed }), {
      timeout: 45000,
    })
    .toBeTruthy();
  return (await page.evaluate(find, { before, algorithm, changed }))!;
}

test("six model guides preserve actual mini source, changed parameters and selected real event into the structured Worker experiment", async ({
  page,
}) => {
  test.setTimeout(240000);
  const cases = [
    {
      name: "COP-KMeans" as const,
      lesson: copkmeans,
      event: "test",
      label: "반복 한도",
      key: "iterations" as const,
      value: 7,
      disabledCompare: true,
    },
    {
      name: "Bernoulli Mixture" as const,
      lesson: bernoulli,
      event: "maximization",
      label: "반복 한도",
      key: "iterations" as const,
      value: 7,
      disabledCompare: true,
      screenshot: "bernoulli",
    },
    {
      name: "Poisson Mixture" as const,
      lesson: poisson,
      event: "expectation",
      label: "반복 한도",
      key: "iterations" as const,
      value: 9,
      disabledCompare: true,
    },
    {
      name: "Multinomial Mixture" as const,
      lesson: multinomial,
      event: "maximization",
      label: "반복 한도",
      key: "iterations" as const,
      value: 11,
      disabledCompare: true,
    },
    {
      name: "Walktrap" as const,
      lesson: walktrap,
      event: "walk",
      label: "확률보행 길이",
      key: "walkSteps" as const,
      value: 2,
      disabledCompare: false,
      screenshot: "walktrap",
    },
    {
      name: "Clique Percolation" as const,
      lesson: cliquepercolation,
      event: "clique",
      label: "Clique 크기 k",
      key: "cliqueSize" as const,
      value: 2,
      disabledCompare: false,
    },
  ];
  for (const item of cases) {
    const expected = item.lesson.experimentDataset;
    if (!expected)
      throw new Error(`${item.name} requires an explicit original dataset`);
    await page.goto("#guide");
    const guide = page.locator(".guide-page"),
      beforeSelect = await page.evaluate(() => window.modelGuideRuns.length);
    await guide
      .getByRole("navigation", { name: "알고리즘 가이드 목록", exact: true })
      .getByRole("button", { name: item.name, exact: true })
      .click();
    await expect(
      guide.getByRole("heading", { name: item.name, exact: true }),
    ).toBeVisible();
    const mini = guide.locator(".trace-lesson");
    await expect(mini.getByLabel("재생", { exact: true })).toBeEnabled();
    const initial = await completed(page, beforeSelect, item.name);
    expect(initial.request?.dataset).toEqual(expected);
    expect(initial.trace.steps.at(-1)?.kind).toBe("finish");
    if (item.disabledCompare) {
      const buttons = guide.getByRole("button", {
        name: "두 알고리즘 비교 ↗",
        exact: true,
      });
      expect(await buttons.count()).toBeGreaterThan(0);
      for (const button of await buttons.all())
        await expect(button).toBeDisabled();
    }
    const settings = mini.locator(".lesson-settings");
    if ((await settings.getAttribute("open")) === null)
      await settings.locator(":scope > summary").click();
    const beforeChange = await page.evaluate(
      () => window.modelGuideRuns.length,
    );
    await mini.getByLabel(item.label, { exact: true }).fill(String(item.value));
    const changed = await completed(page, beforeChange, item.name, {
      key: item.key,
      value: item.value,
    });
    expect(changed.request?.dataset).toEqual(expected);
    expect(changed.request?.params[item.key]).toBe(item.value);
    const position =
      changed.trace.steps.findIndex((step) => step.kind === item.event) + 1;
    expect(position).toBeGreaterThan(0);
    const eventRow = mini.locator(".event-links > div").filter({
      has: page.getByRole("button", {
        name: `${item.event} 보기`,
        exact: true,
      }),
    });
    await eventRow
      .getByRole("button", { name: `${item.event} 보기`, exact: true })
      .click();
    await expect(mini.getByLabel("타임라인", { exact: true })).toHaveValue(
      String(position),
    );
    await expect(mini.locator(".trace-description")).toContainText(
      changed.trace.steps[position - 1].description,
    );
    const beforeOpen = await page.evaluate(() => window.modelGuideRuns.length);
    await eventRow
      .getByRole("button", { name: "이 단계 실험에서 보기 ↗", exact: true })
      .click();
    const lab = page.locator(".structured-page");
    await expect(lab.getByLabel("알고리즘 선택", { exact: true })).toHaveText(
      item.name,
    );
    const experiment = await completed(page, beforeOpen, item.name, {
      key: item.key,
      value: item.value,
    });
    expect(experiment.request?.dataset).toEqual(expected);
    expect(experiment.request?.params).toEqual(changed.request?.params);
    await expect(lab.getByLabel(item.label, { exact: true })).toHaveValue(
      String(item.value),
    );
    const raw = JSON.parse(
      await lab.getByLabel("원본 데이터 JSON", { exact: true }).inputValue(),
    );
    expect(raw.schema).toBe("clusterlab.dataset/v1");
    expect(raw.data).toEqual(expected);
    expect(experiment.trace.initial).toEqual(changed.trace.initial);
    expect(experiment.trace.steps).toEqual(changed.trace.steps);
    expect(experiment.trace.snapshots).toEqual(changed.trace.snapshots);
    expect(stateAt(experiment.trace, position)).toEqual(
      stateAt(changed.trace, position),
    );
    expect(stateAt(experiment.trace, experiment.trace.steps.length)).toEqual(
      stateAt(changed.trace, changed.trace.steps.length),
    );
    await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue(
      String(position),
    );
    await expect(lab.locator(".step-explanation")).toHaveText(
      changed.trace.steps[position - 1].description,
    );
    await expect(lab.getByRole("alert")).toHaveCount(0);
    if (item.screenshot) {
      await lab.getByLabel("마지막으로", { exact: true }).click();
      await expect(lab.getByLabel("타임라인", { exact: true })).toHaveValue(
        String(experiment.trace.steps.length),
      );
      await openAnalysis(lab);
      const panel = lab.locator("details.analysis-panel");
      if ((await panel.count()) && (await panel.getAttribute("open")) === null)
        await panel.locator(":scope > summary").click();
      if (item.screenshot === "walktrap") {
        await expect(lab.locator(".walktrap-analysis")).toBeVisible();
        for (const detail of await lab
          .locator(".walktrap-analysis > details.community-detail")
          .all())
          if ((await detail.getAttribute("open")) === null)
            await detail.locator(":scope > summary").click();
        await expect(
          lab.getByRole("img", {
            name: "실제 Walktrap 병합 트리",
            exact: true,
          }),
        ).toBeVisible();
      } else
        await expect(
          lab.getByRole("heading", {
            name: "Bernoulli Mixture · 실제 이산 확률 EM",
            exact: true,
          }),
        ).toBeVisible();
      await page.screenshot({
        path: `test-results/model-guide-${item.screenshot}-${test.info().project.name}.png`,
        fullPage: true,
      });
    }
  }
  expect(
    await page.evaluate(() =>
      window.modelGuideErrors.filter((e) =>
        [
          "COP-KMeans",
          "Bernoulli Mixture",
          "Poisson Mixture",
          "Multinomial Mixture",
          "Walktrap",
          "Clique Percolation",
        ].includes(e.request?.algorithm ?? ""),
      ),
    ),
  ).toEqual([]);
});
