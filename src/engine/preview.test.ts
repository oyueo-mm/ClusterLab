import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { algorithms } from "./types";
import { registry, supportsDataset } from "./registry";
import { Recorder, stateAt } from "./trace";
import { displayPoints } from "./dataset";
import { compactPreview, MAX_PREVIEW_FRAMES } from "./preview";
import { previewInput } from "../animation/previewRuntime";
import { recommendationParams, recommendations } from "../data/recommendations";
import { retainedBytes } from "./resources";
const measurements: object[] = [];
describe("actual thumbnail traces", () => {
  for (const algorithm of algorithms)
    it(algorithm, async () => {
      const data = previewInput(algorithm),
        points = displayPoints(data);
      const recorder = new Recorder(points.length, algorithm);
      const engine = await registry[algorithm].load();
      const start = performance.now();
      engine(
        points,
        recommendationParams(algorithm, recommendations[algorithm][0]),
        recorder,
        supportsDataset(algorithm, data.kind) ? data : undefined,
      );
      recorder.trace.elapsed = performance.now() - start;
      const clip = compactPreview(recorder.trace);
      expect(clip.frames.length).toBeGreaterThan(2);
      expect(clip.frames.length).toBeLessThanOrEqual(MAX_PREVIEW_FRAMES);
      expect(clip.frames[0].index).toBe(0);
      expect(clip.frames.at(-1)!.index).toBe(recorder.trace.steps.length);
      expect(
        clip.frames.some(
          (f) => f.index > 0 && f.index < recorder.trace.steps.length,
        ),
      ).toBe(true);
      for (const frame of clip.frames) {
        const state = stateAt(recorder.trace, frame.index);
        expect(frame.labels).toEqual(state.labels);
        expect(frame.focus).toEqual(state.focus);
        expect(frame.responsibilities).toEqual(state.responsibilities);
        expect(frame.roles).toEqual(state.roles);
        if (state.analysis?.kind === "affinity") {
          expect(frame.panel?.values[0]).toEqual(
            state.analysis.responsibility?.map((row, i) => row[i]) ?? [],
          );
          expect(frame.panel?.values[1]).toEqual(
            state.analysis.availability?.map((row, i) => row[i]) ?? [],
          );
        }
        if (state.analysis?.kind === "density-peaks")
          expect(frame.density).toEqual(state.analysis.rho);
        if (algorithm === "Growing Neural Gas")
          expect(frame.neuronEdges).toBe(true);
        expect(frame.centers).toEqual(
          state.centers.map(({ path: _path, ...c }) => c),
        );
        if (frame.index)
          expect(frame.kind).toBe(recorder.trace.steps[frame.index - 1].kind);
        if (state.analysis?.kind === "biclustering")
          expect(frame.biclusters).toEqual(state.analysis.biclusters);
        if (state.analysis?.kind === "stream")
          expect(frame.processed).toBe(state.analysis.processed);
        if (state.analysis?.kind === "spectral" && state.analysis.embedding)
          expect(frame.embedding).toEqual(
            state.analysis.embedding.map((row) => ({
              x: row[0],
              y: row[1] ?? 0,
            })),
          );
        expect(frame).not.toHaveProperty("analysis");
        expect(frame).not.toHaveProperty("undo");
      }
      const operations = new Set(recorder.trace.steps.map((s) => s.kind));
      for (const kind of operations)
        expect(clip.frames.some((f) => f.kind === kind)).toBe(true);
      const final = clip.frames.at(-1)!;
      expect(final.labels).toEqual(recorder.state.labels);
      if (final.labels.length) final.labels[0] = 999;
      expect(recorder.state.labels[0]).not.toBe(999);
      measurements.push({
        algorithm,
        count: points.length,
        computationMs: clip.elapsed,
        events: clip.events,
        frames: clip.frames.length,
        clipRetainedEstimate: retainedBytes(clip),
        traceRetainedEstimate: recorder.trace.recording?.estimatedBytes,
        operations: [...operations],
      });
    });
});
afterAll(() => {
  mkdirSync("docs/preview-scale", { recursive: true });
  writeFileSync(
    "docs/preview-scale/preview-computation.json",
    JSON.stringify(measurements, null, 2) + "\n",
  );
});
