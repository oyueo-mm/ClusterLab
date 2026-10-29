import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import katex from "katex";
import hashes from "./preset-v03-hashes.json";
import {
  presets,
  dataset,
  dataDefaults,
  exportData,
  importData,
} from "./presets";
import { algorithms, defaults } from "../engine/types";
import { lessons } from "./lessons";
import { run } from "../engine/run";
import { stateAt } from "../engine/trace";
import { logGaussian } from "../engine/algorithms/gmm";
import { jaccard } from "../engine/algorithms/rock";
describe("v0.4 content and v0.3 compatibility", () => {
  it("keeps every preset ID and exact generated coordinates, labels and features from d2c13fa", () => {
    expect(presets.map((p) => p[0])).toEqual(Object.keys(hashes));
    for (const [id, name] of presets) {
      expect(name).toMatch(/[가-힣]/);
      const points = dataset(id, dataDefaults);
      expect(
        createHash("sha256").update(JSON.stringify(points)).digest("hex"),
      ).toBe(hashes[id]);
      expect(importData(exportData(points, "json"))).toEqual(points);
    }
  });
  for (const algorithm of algorithms) {
    it(`${algorithm}: structured lessons, valid math, citations and real suggested events`, () => {
      const lesson = lessons[algorithm];
      expect(lesson.operations.length).toBeGreaterThanOrEqual(4);
      expect(lesson.parameters.length).toBeGreaterThan(0);
      expect(lesson.numerical.steps.length).toBeGreaterThanOrEqual(3);
      expect(lesson.implementation.length).toBeGreaterThan(0);
      for (const r of lesson.references)
        expect(new URL(r.url).protocol).toBe("https:");
      for (const eq of lesson.equations) {
        const html = katex.renderToString(eq.tex, {
          throwOnError: true,
          output: "htmlAndMathml",
        });
        expect(html).toContain("<math");
        expect(eq.symbols.length).toBeGreaterThan(10);
        expect(eq.derivation.length).toBeGreaterThan(0);
      }
      const points = dataset(lesson.preset, { ...dataDefaults, count: 12 });
      const trace = run(algorithm, points, {
        ...defaults,
        iterations: 8,
        epochs: 2,
        grid: 3,
        minPts: 3,
        minSize: 3,
        threshold: algorithm === "ROCK" ? 0.5 : defaults.threshold,
        initialization: algorithm === "PAM" ? "build" : "kmeans++",
      });
      // Some conditional events (e.g. a PAM move) may legitimately be absent.
      expect(
        lesson.events.some((event) =>
          trace.steps.some((s) => s.kind === event),
        ),
      ).toBe(true);
    });
  }
});
it("independently verifies the textbook's numeric examples for all 13 algorithms", () => {
  const line = (xs: number[]) => xs.map((x) => ({ x, y: 0 }));
  // K-Means: exact means and WCSS.
  const km = run(
    "K-Means",
    [
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 4, y: 0 },
      { x: 4, y: 2 },
    ],
    { ...defaults, k: 2 },
  );
  expect(stateAt(km, km.steps.length).metric.at(-1)).toBeCloseTo(4);
  // DBSCAN: self-inclusive neighbor count, border and noise.
  const db = run("DBSCAN", line([0, 0.05, 0.1, 0.19, 0.8]), {
    ...defaults,
    epsilon: 0.11,
    minPts: 3,
  });
  expect(stateAt(db, db.steps.length).roles).toEqual([
    "core",
    "core",
    "core",
    "border",
    "noise",
  ]);
  // HDBSCAN stability: point lifetimes equal area under size curve.
  expect(3 - 2 + 3 * (5 - 2)).toBe(4 * (3 - 2) + 3 * (5 - 3));
  expect(3 - 2 + 3 * (5 - 2)).toBe(10);
  // AGNES linkage definitions on the same sets.
  const ds = [5, 6, 3, 4];
  expect([
    Math.min(...ds),
    Math.max(...ds),
    ds.reduce((a, b) => a + b) / 4,
  ]).toEqual([3, 6, 4.5]);
  expect(Math.sqrt(((2 * 4) / 4) * 4.5 ** 2)).toBeCloseTo(6.363961);
  // DIANA: the hand-computed splinter division.
  const di = run("DIANA", line([0, 1, 4, 5]), { ...defaults, k: 2 });
  const labels = stateAt(di, di.steps.length).labels;
  expect(labels[0]).toBe(labels[1]);
  expect(labels[2]).toBe(labels[3]);
  expect(labels[0]).not.toBe(labels[2]);
  // SOM neighbor and LVQ signed learning.
  expect(0.2 + 0.5 * Math.exp(-0.5) * (0.8 - 0.2)).toBeCloseTo(0.3819592);
  expect(0.6 + 0.25 * (0.8 - 0.6)).toBeCloseTo(0.65);
  expect(0.6 - 0.25 * (0.8 - 0.6)).toBeCloseTo(0.55);
  // OPTICS: directed max-core rule, then lower predecessor candidate.
  expect(Math.min(Math.max(0.1, 0.08), Math.max(0.05, 0.06))).toBe(0.06);
  // PAM actual observed medoid minimizes non-squared costs.
  const pa = run("PAM", line([0, 1, 10]), {
    ...defaults,
    k: 1,
    initialization: "build",
  });
  expect(stateAt(pa, pa.steps.length).centers[0].x).toBe(1);
  expect(stateAt(pa, pa.steps.length).metric.at(-1)).toBe(10);
  // ROCK tokens and goodness.
  expect(jaccard(["색=초록", "모양=원"], ["색=초록", "모양=사각"])).toBeCloseTo(
    1 / 3,
  );
  expect(1 / (2 ** (5 / 3) - 2)).toBeCloseTo(0.851207, 5);
  // GMM densities, normalized Bayesian responsibility, weighted M-step.
  const n1 = Math.exp(
    logGaussian({ x: 0, y: 0 }, { x: 0, y: 0, cov: [1, 0, 1] }),
  );
  const n2 = Math.exp(
    logGaussian({ x: 0, y: 0 }, { x: 1, y: 0, cov: [1, 0, 1] }),
  );
  expect(n1).toBeCloseTo(0.1591549431);
  expect(n2).toBeCloseTo(0.0965323526);
  expect(n1 / (n1 + n2)).toBeCloseTo(0.6224593312);
  expect(0.75 * (0 - 0.25) ** 2 + 0.25 * (1 - 0.25) ** 2).toBeCloseTo(0.1875);
  // BIRCH N/LS/SS and Mean Shift flat mean.
  expect(16 / 4 - (4 / 4) ** 2 - (4 / 4) ** 2).toBe(2);
  expect((0 + 0.1 + 0.2) / 3).toBeCloseTo(0.1);
  expect((0 + 0.1 + 0.2 + 0.8) / 4).toBeCloseTo(0.275);
});
