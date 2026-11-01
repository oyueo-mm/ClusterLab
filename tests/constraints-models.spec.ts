import { test, expect, type Page, type Locator } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Algorithm, Params, Trace } from "../src/engine/types";
import type {
  Dataset,
  GraphDataset,
  ConstrainedDataset,
} from "../src/engine/dataset";
import { stateAt, applyStep } from "../src/engine/trace";

type Request = { algorithm?: Algorithm; params?: Params; dataset?: Dataset };
declare global {
  interface Window {
    constraintModelRuns: { trace: Trace; request: Request }[];
    constraintModelErrors: { message: string; request: Request }[];
  }
}

// Passive observation of real built Worker messages. No engine/Worker response stubs.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.constraintModelRuns = [];
    window.constraintModelErrors = [];
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      private captured: Request = {};
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener("message", (event) => {
          if (event.data.trace)
            window.constraintModelRuns.push({
              trace: event.data.trace,
              request: this.captured,
            });
          if (event.data.error)
            window.constraintModelErrors.push({
              message: event.data.error,
              request: this.captured,
            });
        });
      }
      postMessage(message: unknown, transfer: Transferable[]): void;
      postMessage(message: unknown, options?: StructuredSerializeOptions): void;
      postMessage(
        message: unknown,
        options: Transferable[] | StructuredSerializeOptions = {},
      ) {
        const request = message as Request;
        this.captured = structuredClone({
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

const scope = (page: Page) => page.locator(".structured-page");
const count = (page: Page) =>
  page.evaluate(() => window.constraintModelRuns.length);
async function completed(
  page: Page,
  before: number,
  algorithm: Algorithm,
  rows: number,
  k?: number,
) {
  const find = ({
    before,
    algorithm,
    rows,
    k,
  }: {
    before: number;
    algorithm: Algorithm;
    rows: number;
    k?: number;
  }) =>
    window.constraintModelRuns
      .slice(before)
      .filter(
        (run) =>
          run.trace.algorithm === algorithm &&
          run.trace.initial.labels.length === rows &&
          (k === undefined || run.request.params?.k === k),
      )
      .at(-1);
  await expect
    .poll(() => page.evaluate(find, { before, algorithm, rows, k }), {
      timeout: 45000,
    })
    .toBeTruthy();
  const result = await page.evaluate(find, { before, algorithm, rows, k });
  return result!;
}
async function source(
  page: Page,
  data: Dataset,
  algorithm: Algorithm,
  rows: number,
  k?: number,
) {
  const box = scope(page),
    before = await count(page);
  await box
    .getByLabel("원본 데이터 JSON", { exact: true })
    .fill(JSON.stringify(data));
  await box.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await box
    .getByLabel("다중 데이터 알고리즘", { exact: true })
    .selectOption(algorithm);
  if (k !== undefined)
    await box.getByLabel("군집 수 K", { exact: true }).fill(String(k));
  return completed(page, before, algorithm, rows, k);
}
async function inspected(
  box: Locator,
  trace: Trace,
  event: string,
  heading: string,
) {
  expect(trace.steps.at(-1)?.kind).toBe("finish");
  expect(trace.steps.some((s) => s.kind === event)).toBe(true);
  const end = stateAt(trace, trace.steps.length);
  let reversed = end;
  for (const step of [...trace.steps].reverse())
    reversed = applyStep(reversed, step, true);
  expect(reversed).toEqual(trace.initial);
  await expect(box.getByLabel("재생", { exact: true })).toBeEnabled();
  await box.getByLabel("마지막으로", { exact: true }).click();
  const panel = box.locator("details.analysis-panel");
  if ((await panel.count()) && (await panel.getAttribute("open")) === null)
    await panel.locator(":scope > summary").click();
  await expect(
    box.getByRole("heading", { name: heading, exact: true }),
  ).toBeVisible();
  const timeline = box.getByLabel("타임라인", { exact: true });
  await expect(timeline).toHaveValue(String(trace.steps.length));
  await box.getByLabel("한 단계 뒤로", { exact: true }).click();
  await expect(timeline).toHaveValue(String(trace.steps.length - 1));
  await box.getByLabel("한 단계 앞으로", { exact: true }).click();
  await expect(timeline).toHaveValue(String(trace.steps.length));
  const index = trace.steps.findIndex((s) => s.kind === event) + 1;
  await timeline.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, index);
  await expect(timeline).toHaveValue(String(index));
  await box.getByLabel("처음으로", { exact: true }).click();
  await expect(timeline).toHaveValue("0");
  await box.getByLabel("마지막으로", { exact: true }).click();
  return end;
}
async function exported(page: Page) {
  const download = page.waitForEvent("download");
  await scope(page)
    .getByRole("button", { name: "전체 계산 결과 내보내기", exact: true })
    .click();
  const file = await download,
    path = await file.path();
  if (!path) throw new Error("native export missing");
  return JSON.parse(await readFile(path, "utf8"));
}
async function currentSource(page: Page) {
  const raw = JSON.parse(
    await scope(page)
      .getByLabel("원본 데이터 JSON", { exact: true })
      .inputValue(),
  );
  return (raw.data ?? raw) as Dataset;
}

const constrained: ConstrainedDataset = {
  kind: "constrained",
  data: {
    kind: "numeric",
    values: [
      [0, 0, 0],
      [0, 0, 0.1],
      [0, 0, 3],
      [0, 0, 3.1],
    ],
  },
  mustLink: [[0, 1]],
  cannotLink: [[1, 2]],
};

test("COP real hard constraints edit, undo/redo, contradiction and greedy failure recover without fake success", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("#structured");
  const box = scope(page);
  await box
    .getByRole("button", { name: "하드 제약 예제", exact: true })
    .click();
  await expect(
    box.getByLabel("다중 데이터 알고리즘", { exact: true }),
  ).toHaveValue("COP-KMeans");
  await expect(
    box
      .getByLabel("다중 데이터 알고리즘", { exact: true })
      .getByRole("option", { name: "COP-KMeans", exact: true }),
  ).toHaveCount(1);
  const run = await source(page, constrained, "COP-KMeans", 4, 2),
    end = await inspected(box, run.trace, "test", "Hard 제약 · 실제 원본 연산");
  expect(end.analysis?.kind).toBe("constraints");
  if (end.analysis?.kind !== "constraints")
    throw new Error("actual constraint analysis missing");
  expect(end.analysis.dimensions).toBe(3);
  expect(end.analysis.assigned).toBe(4);
  expect(end.labels[0]).toBe(end.labels[1]);
  expect(end.labels[1]).not.toBe(end.labels[2]);
  expect(run.request.dataset).toEqual(constrained);
  expect(end.analysis.objective).toBeCloseTo(0.01, 10);
  let before = await count(page);
  const input = box.getByLabel("Must-Link 1 끝 행", { exact: true });
  await input.fill("4");
  await input.press("Enter");
  let changed = await completed(page, before, "COP-KMeans", 4, 2),
    changedEnd = stateAt(changed.trace, changed.trace.steps.length);
  expect(changedEnd.labels[0]).toBe(changedEnd.labels[3]);
  expect(((await currentSource(page)) as ConstrainedDataset).mustLink).toEqual([
    [0, 3],
  ]);
  before = await count(page);
  await box.getByLabel("다중 데이터 Undo", { exact: true }).click();
  await completed(page, before, "COP-KMeans", 4, 2);
  expect(((await currentSource(page)) as ConstrainedDataset).mustLink).toEqual([
    [0, 1],
  ]);
  before = await count(page);
  await box.getByLabel("다중 데이터 Redo", { exact: true }).click();
  await completed(page, before, "COP-KMeans", 4, 2);
  expect(((await currentSource(page)) as ConstrainedDataset).mustLink).toEqual([
    [0, 3],
  ]);
  before = await count(page);
  await box
    .getByRole("button", { name: "Must-Link 추가", exact: true })
    .click();
  changed = await completed(page, before, "COP-KMeans", 4, 2);
  expect(
    ((await currentSource(page)) as ConstrainedDataset).mustLink,
  ).toHaveLength(2);
  const addedMustLinks = ((await currentSource(page)) as ConstrainedDataset)
    .mustLink;
  const addedMustEnd = stateAt(changed.trace, changed.trace.steps.length);
  for (const [a, b] of addedMustLinks)
    expect(addedMustEnd.labels[a]).toBe(addedMustEnd.labels[b]);
  before = await count(page);
  await box.getByLabel("Must-Link 2 삭제", { exact: true }).click();
  await completed(page, before, "COP-KMeans", 4, 2);
  before = await count(page);
  await box
    .getByRole("button", { name: "Cannot-Link 추가", exact: true })
    .click();
  changed = await completed(page, before, "COP-KMeans", 4, 2);
  expect(
    ((await currentSource(page)) as ConstrainedDataset).cannotLink,
  ).toHaveLength(2);
  // The editor chooses a valid default pair, which may duplicate an existing
  // constraint. Explicitly set a new pair rather than assuming its default.
  for (const [label, value] of [
    ["Cannot-Link 2 시작 행", "1"],
    ["Cannot-Link 2 끝 행", "2"],
  ] as const) {
    const cell = box.getByLabel(label, { exact: true });
    if ((await cell.inputValue()) === value) continue;
    before = await count(page);
    await cell.fill(value);
    await cell.press("Enter");
    changed = await completed(page, before, "COP-KMeans", 4, 2);
  }
  changedEnd = stateAt(changed.trace, changed.trace.steps.length);
  const editedSource = (await currentSource(page)) as ConstrainedDataset;
  expect(editedSource.cannotLink[1]).toEqual([0, 1]);
  for (const [a, b] of editedSource.cannotLink)
    expect(changedEnd.labels[a]).not.toBe(changedEnd.labels[b]);
  expect(changedEnd.labels[0]).not.toBe(changedEnd.labels[1]);
  before = await count(page);
  await box.getByLabel("Cannot-Link 2 삭제", { exact: true }).click();
  await completed(page, before, "COP-KMeans", 4, 2);
  const native = await exported(page);
  expect(native.output.kind).toBe("constrained-partition");
  expect(native.output.labels).toEqual(native.state.labels);
  expect(native.output.componentIds).toHaveLength(4);
  expect(native.computedRows).toBe(4);
  const contradictory = { ...constrained, cannotLink: [[0, 1]] };
  before = await count(page);
  await box
    .getByLabel("원본 데이터 JSON", { exact: true })
    .fill(JSON.stringify(contradictory));
  await box.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await expect(box.getByRole("alert")).toContainText("모순");
  expect(await count(page)).toBe(before);
  const impossibleOrder: ConstrainedDataset = {
    kind: "constrained",
    data: { kind: "numeric", values: [[0], [0.05], [3], [3.05]] },
    mustLink: [],
    cannotLink: [
      [0, 2],
      [2, 3],
      [3, 1],
    ],
  };
  const errors = await page.evaluate(() => window.constraintModelErrors.length);
  before = await count(page);
  await box
    .getByLabel("원본 데이터 JSON", { exact: true })
    .fill(JSON.stringify(impossibleOrder));
  await box.getByRole("button", { name: "데이터 적용", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        (start) =>
          window.constraintModelErrors
            .slice(start)
            .some(
              (e) =>
                e.request.algorithm === "COP-KMeans" &&
                e.request.params?.k === 2 &&
                /greedy.*실패/.test(e.message),
            ),
        errors,
      ),
    )
    .toBe(true);
  await expect(box.getByRole("alert")).toContainText("증명");
  expect(await count(page)).toBe(before);
  const recovered = await source(page, constrained, "COP-KMeans", 4, 2);
  expect(
    stateAt(recovered.trace, recovered.trace.steps.length).analysis?.kind,
  ).toBe("constraints");
  await expect(box.getByRole("alert")).toHaveCount(0);
});

const mixtures = [
  {
    name: "Bernoulli Mixture" as const,
    button: "이진 응답 예제",
    values: [
      [0, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [1, 1, 1, 0],
    ],
    mean: [0.5, 1, 0.5, 0],
    bad: 0.5,
  },
  {
    name: "Poisson Mixture" as const,
    button: "포아송 카운트 예제",
    values: [
      [0, 0, 2],
      [2, 0, 0],
      [4, 0, 2],
      [2, 0, 4],
    ],
    mean: [2, 0, 2],
    bad: -1,
  },
  {
    name: "Multinomial Mixture" as const,
    button: "다항 카운트 예제",
    values: [
      [2, 0, 0],
      [0, 3, 0],
      [1, 1, 0],
      [0, 0, 0],
    ],
    mean: [3 / 7, 4 / 7, 0],
    bad: 1.5,
  },
];
const logFactorial = (n: number) => {
  let result = 0;
  for (let i = 2; i <= n; i++) result += Math.log(i);
  return result;
};
function independentLogLikelihood(
  method: string,
  values: number[][],
  p: number[],
) {
  return values.reduce((sum, row) => {
    if (method === "Bernoulli Mixture")
      return (
        sum +
        row.reduce((s, x, j) => s + (x ? Math.log(p[j]) : Math.log1p(-p[j])), 0)
      );
    if (method === "Poisson Mixture")
      return (
        sum +
        row.reduce(
          (s, x, j) =>
            s + (x ? x * Math.log(p[j]) : 0) - p[j] - logFactorial(x),
          0,
        )
      );
    const total = row.reduce((s, v) => s + v, 0);
    return (
      sum +
      logFactorial(total) +
      row.reduce(
        (s, x, j) => s - logFactorial(x) + (x ? x * Math.log(p[j]) : 0),
        0,
      )
    );
  }, 0);
}

test("three actual discrete EM Workers expose normalized posteriors, exact boundary MLE/likelihood, exports and invalid-support recovery", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("#structured");
  const box = scope(page);
  for (const model of mixtures) {
    await box.getByRole("button", { name: model.button, exact: true }).click();
    const raw: Dataset = { kind: "numeric", values: model.values },
      run = await source(page, raw, model.name, 4, 1),
      end = await inspected(
        box,
        run.trace,
        "maximization",
        `${model.name} · 실제 이산 확률 EM`,
      );
    const a = end.analysis;
    if (a?.kind !== "discrete-mixture")
      throw new Error("actual mixture analysis missing");
    expect(a.sourceValues).toEqual(model.values);
    expect(run.request.dataset).toEqual(raw);
    expect(run.request.params?.k).toBe(1);
    model.mean.forEach((v, j) => expect(a.parameters[0][j]).toBeCloseTo(v, 11));
    expect(a.weights).toEqual([1]);
    expect(a.logLikelihood).toBeCloseTo(
      independentLogLikelihood(model.name, model.values, model.mean),
      10,
    );
    for (let i = 1; i <= run.trace.steps.length; i++) {
      const state = stateAt(run.trace, i),
        analysis = state.analysis;
      if (analysis?.kind !== "discrete-mixture") continue;
      state.responsibilities.forEach((row) => {
        expect(row.every((v) => Number.isFinite(v) && v >= 0 && v <= 1)).toBe(
          true,
        );
        expect(row.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12);
      });
      if (run.trace.steps[i - 1].kind === "maximization") {
        expect(analysis.maximizationCounts).toBeDefined();
        expect(analysis.maximizationSums).toBeDefined();
        const sums = analysis.maximizationSums![0],
          denominator =
            model.name === "Multinomial Mixture"
              ? sums.reduce((s, v) => s + v, 0)
              : analysis.maximizationCounts![0];
        sums.forEach((v, j) =>
          expect(analysis.parameters[0][j]).toBeCloseTo(v / denominator, 11),
        );
      }
    }
    const exportedRun = await exported(page);
    expect(exportedRun.output.kind).toBe("mixture");
    expect(exportedRun.output.parameters).toEqual(a.parameters);
    expect(exportedRun.output.responsibilities).toEqual(end.responsibilities);
    expect(exportedRun.output.logLikelihood).toBe(a.logLikelihood);
    const errors = await page.evaluate(
        () => window.constraintModelErrors.length,
      ),
      before = await count(page),
      bad = structuredClone(model.values);
    bad[0][0] = model.bad;
    await box
      .getByLabel("원본 데이터 JSON", { exact: true })
      .fill(JSON.stringify({ kind: "numeric", values: bad }));
    await box.getByRole("button", { name: "데이터 적용", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(
          ({ errors, name }) =>
            window.constraintModelErrors
              .slice(errors)
              .some(
                (e) =>
                  e.request.algorithm === name &&
                  /0\/1|정수|이진|count/.test(e.message),
              ),
          { errors, name: model.name },
        ),
      )
      .toBe(true);
    await expect(box.getByRole("alert")).toBeVisible();
    expect(await count(page)).toBe(before);
    await source(page, raw, model.name, 4, 1);
    await expect(box.getByRole("alert")).toHaveCount(0);
  }
});

const graph = (n: number, edges: number[][]): GraphDataset => ({
  kind: "graph",
  directed: false,
  nodes: Array.from({ length: n }, (_, i) => ({ id: `n${i}` })),
  edges: edges.map(([a, b]) => ({
    source: `n${a}`,
    target: `n${b}`,
    weight: 1,
  })),
});
function originalModularity(data: GraphDataset, labels: number[]) {
  const degrees = data.nodes.map(() => 0),
    inside = new Map<number, number>(),
    total = new Map<number, number>();
  let m = 0;
  for (const e of data.edges) {
    const a = data.nodes.findIndex((n) => n.id === e.source),
      b = data.nodes.findIndex((n) => n.id === e.target);
    degrees[a] += e.weight;
    degrees[b] += e.weight;
    m += e.weight;
    if (labels[a] === labels[b])
      inside.set(labels[a], (inside.get(labels[a]) ?? 0) + e.weight);
  }
  degrees.forEach((v, i) =>
    total.set(labels[i], (total.get(labels[i]) ?? 0) + v),
  );
  return [...total].reduce(
    (s, [c, k]) => s + (inside.get(c) ?? 0) / m - (k / (2 * m)) ** 2,
    0,
  );
}

test("Walktrap computes full P^t and Ward candidates/best original-Q cut; CPM preserves canonical overlapping communities and uncovered nodes", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("#structured");
  const box = scope(page),
    walk = graph(7, [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 3],
    ]);
  const wr = await source(page, walk, "Walktrap", 7),
    we = await inspected(box, wr.trace, "walk", "실제 그래프 커뮤니티 연산"),
    wa = we.analysis;
  if (wa?.kind !== "community") throw new Error("walk analysis missing");
  expect(wa.method).toBe("Walktrap");
  expect(wa.walkSteps).toBeGreaterThan(0);
  expect(wa.dendrogram?.length).toBeGreaterThan(0);
  expect(wa.walkProbabilities).toHaveLength(7);
  const transition = Array.from(
    { length: 7 },
    () => Array(7).fill(0) as number[],
  );
  walk.edges.forEach((e) => {
    const a = +e.source.slice(1),
      b = +e.target.slice(1);
    transition[a][b] = 1;
    transition[b][a] = 1;
  });
  transition.forEach((row, i) => {
    row[i] = 1;
    const sum = row.reduce((s, v) => s + v, 0);
    row.forEach((v, j) => (row[j] = v / sum));
  });
  let power = Array.from(
    { length: 7 },
    (_, i) =>
      Array.from({ length: 7 }, (_, j) => (i === j ? 1 : 0)) as number[],
  );
  for (let t = 0; t < wa.walkSteps!; t++)
    power = power.map((row) =>
      row.map((_, j) => row.reduce((s, v, k) => s + v * transition[k][j], 0)),
    );
  power.forEach((row, i) =>
    row.forEach((v, j) =>
      expect(wa.walkProbabilities![i][j]).toBeCloseTo(v, 10),
    ),
  );
  wa.walkProbabilities!.forEach((row) =>
    expect(row.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10),
  );
  const qualities = wa.levels.map((labels) => originalModularity(walk, labels));
  expect(wa.objective).toBeCloseTo(Math.max(...qualities), 10);
  expect(originalModularity(walk, we.labels)).toBeCloseTo(wa.objective, 10);
  const mergeIndex =
      wr.trace.steps.findIndex(
        (s, i) =>
          s.kind === "test" &&
          stateAt(wr.trace, i + 1).analysis?.kind === "community",
      ) + 1,
    merge = stateAt(wr.trace, mergeIndex).analysis;
  if (merge?.kind !== "community") throw new Error("merge missing");
  expect(merge.walkMergeCandidates?.length).toBeGreaterThan(0);
  expect(merge.wardIncrease).toBeCloseTo(
    Math.min(...merge.walkMergeCandidates!.map((c) => c.increase)),
    11,
  );
  const treeDetails = box
    .locator("details.community-detail")
    .filter({ hasText: "실제 병합 덴드로그램" });
  if ((await treeDetails.getAttribute("open")) === null)
    await treeDetails.locator(":scope > summary").click();
  await expect(
    box.getByRole("img", { name: "실제 Walktrap 병합 트리", exact: true }),
  ).toBeVisible();
  const wn = await exported(page);
  expect(wn.output.dendrogram).toEqual(wa.dendrogram);
  expect(wn.output.selectedLevel).toBe(wa.selectedLevel);
  const overlap = graph(7, [
      [0, 1],
      [1, 2],
      [2, 0],
      [1, 6],
      [2, 6],
      [2, 3],
      [3, 4],
      [4, 2],
    ]),
    cp = await source(page, overlap, "Clique Percolation", 7),
    ce = await inspected(
      box,
      cp.trace,
      "percolate",
      "실제 그래프 커뮤니티 연산",
    ),
    ca = ce.analysis;
  if (ca?.kind !== "community") throw new Error("clique analysis missing");
  expect(ca.cliqueSize).toBe(3);
  expect(ca.cliques).toHaveLength(3);
  expect(ca.communities).toEqual([
    [0, 1, 2, 6],
    [2, 3, 4],
  ]);
  expect(ca.memberships).toEqual(ca.communities);
  expect(ca.communities!.filter((c) => c.includes(2))).toHaveLength(2);
  expect(ce.labels[5]).toBe(-1);
  expect(ca.unassignedCount).toBe(1);
  await expect(box.locator(".clique-analysis")).toContainText(
    /통계적\s*noise가 아닙니다/,
  );
  await expect(
    box.getByRole("img", { name: "실제 clique percolation 연결", exact: true }),
  ).toBeVisible();
  const cn = await exported(page);
  expect(cn.output.communities).toEqual(ca.communities);
  expect(cn.output.memberships).toEqual(ca.memberships);
  expect(cn.state.labels[5]).toBe(-1);
});

test("1000-row Bernoulli source keeps the last-row-only feature, paged editor, all native rows and seven responsive widths", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("#structured");
  const box = scope(page),
    values = Array.from({ length: 1000 }, (_, i) => [
      i % 2,
      Math.floor(i / 2) % 2,
      i % 5 === 0 ? 1 : 0,
      i === 999 ? 1 : 0,
    ]),
    raw: Dataset = { kind: "numeric", values };
  const run = await source(page, raw, "Bernoulli Mixture", 1000, 1),
    end = await inspected(
      box,
      run.trace,
      "expectation",
      "Bernoulli Mixture · 실제 이산 확률 EM",
    ),
    a = end.analysis;
  if (a?.kind !== "discrete-mixture") throw new Error("missing full source");
  expect(a.sourceValues).toHaveLength(1000);
  expect(end.labels).toHaveLength(1000);
  expect(end.responsibilities).toHaveLength(1000);
  expect(a.parameters[0][3]).toBeCloseTo(0.001, 12);
  expect(a.logLikelihood).toBeCloseTo(
    independentLogLikelihood(
      "Bernoulli Mixture",
      values,
      [0.5, 0.5, 0.2, 0.001],
    ),
    7,
  );
  expect(run.request.dataset).toEqual(raw);
  await box.getByLabel("원본 표 시작 행", { exact: true }).fill("1000");
  await expect(box.getByLabel("원본 1000행 4열", { exact: true })).toHaveValue(
    "1",
  );
  await expect(
    box
      .getByRole("table", { name: "원본 속성 편집", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(1);
  const native = await exported(page);
  expect(native.computedRows).toBe(1000);
  expect(native.sourceDimensions).toBe(4);
  expect(native.output.responsibilities).toHaveLength(1000);
  expect(native.output.parameters[0][3]).toBeCloseTo(0.001, 12);
  for (const width of [1920, 1440, 1024, 800, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await expect(
      box.getByRole("heading", {
        name: "Bernoulli Mixture · 실제 이산 확률 EM",
        exact: true,
      }),
    ).toBeVisible();
  }
  await page.screenshot({
    path: `test-results/constraints-models-1000-${info.project.name}.png`,
    fullPage: true,
  });
});
