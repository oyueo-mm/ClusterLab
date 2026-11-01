import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus, release, totalmem } from "node:os";
import { DenStreamModel, denstream } from "./algorithms/denstream";
import { Recorder } from "./trace";
import { defaults, type Params } from "./types";

const params: Params = {
  ...defaults,
  epsilon: 0.125,
  beta: 0.5,
  minWeight: 4,
  decayRate: 1,
  streamInitSize: 0,
};
describe("DenStream independent source-boundary audit", () => {
  it("rejects finite timestamps whose floating-point spacing cannot represent pruning ticks", () => {
    const model = new DenStreamModel(params, 1);
    expect(() => model.insert([0], 1e20)).toThrow(/해상도|시각|pruning/);
    const active = new DenStreamModel(params, 1);
    active.insert([0], 0);
    expect(() => active.advance(1e20)).toThrow(/해상도|시각|pruning/);
  });
  it("promotion is strict >beta*mu, while potential pruning retains exact equality", () => {
    const cold = new DenStreamModel(params, 1);
    cold.insert([0], 0);
    cold.insert([0], 0);
    expect(cold.snapshot()[0].weight).toBe(2);
    expect(cold.snapshot()[0].potential).toBe(false);
    cold.insert([0], 0);
    expect(cold.snapshot()[0].potential).toBe(true);
    const equal = new DenStreamModel(params, 1);
    equal.initialize([[0], [0], [0], [0]], 0);
    equal.advance(1);
    expect(equal.snapshot()).toHaveLength(1);
    expect(equal.snapshot()[0].weight).toBe(2);
    equal.advance(2);
    expect(equal.snapshot()).toHaveLength(0);
  });
  it("a newborn outlier at a pruning tick is retained at exact xi=1", () => {
    const model = new DenStreamModel(params, 1);
    model.advance(0);
    model.insert([10], 1);
    expect(model.outlierThreshold(1, 1)).toBe(1);
    expect(model.snapshot()).toHaveLength(1);
    model.advance(2);
    expect(model.snapshot()).toHaveLength(0);
  });
  it("macro border micros are included but cannot bridge two non-core steps", () => {
    const model = new DenStreamModel(
      { ...params, epsilon: 0.1, beta: 0.6, decayRate: 0.01 },
      1,
    );
    model.initialize(
      [[0], [0], [0], [0], [0.15], [0.15], [0.15], [0.3], [0.3], [0.3]],
      0,
    );
    const states = model.snapshot();
    expect(states.map((c) => c.weight)).toEqual([4, 3, 3]);
    expect(states.map((c) => c.label)).toEqual([0, 0, -1]);
  });
  it("own weight exactly mu and exact distance2epsilon satisfy the stated macro rule", () => {
    const model = new DenStreamModel({ ...params, decayRate: 0.01 }, 1);
    model.initialize([[0], [0], [0], [0], [0.25], [0.25], [0.25], [0.25]], 0);
    const states = model.snapshot();
    expect(states).toHaveLength(2);
    expect(states.every((c) => c.weight === 4 && c.label === 0)).toBe(true);
  });
  it("warm initialization uses greedy epsilon neighbor counts and leaves true residuals as noise", () => {
    const model = new DenStreamModel({ ...params, decayRate: 0.01 }, 1);
    const owners = model.initialize([[0], [0.0625], [0.125], [10]], 100);
    expect(owners).toEqual([0, 0, 0, -1]);
    expect(model.time).toBe(100);
    expect(model.snapshot()[0].weight).toBe(3);
    expect(model.snapshot()[0].potential).toBe(true);
    expect(model.snapshot()[0].center[0]).toBe(0.0625);
    expect(model.snapshot()[0].radius).toBeCloseTo(
      Math.sqrt((0.0625 ** 2 + 0 + 0.0625 ** 2) / 3),
      12,
    );
  });
  it("the default twelve-row warm batch uses all raw dimensions and endpoint count weights", () => {
    const samples = Array.from({ length: 12 }, (_, i) => ({
      time: i / 10,
      values: [0, 0, (i % 2) * 5],
    }));
    const options = {
      ...defaults,
      epsilon: 0.2,
      beta: 0.6,
      minWeight: 3,
      decayRate: 0.001,
      streamInitSize: 12,
    };
    const r = new Recorder(12, "DenStream");
    denstream(
      samples.map(() => ({ x: 0, y: 0 })),
      options,
      r,
      { kind: "stream", samples },
    );
    const analysis = r.state.analysis;
    if (analysis?.kind !== "stream") throw new Error("stream analysis missing");
    expect(analysis.time).toBe(1.1);
    expect(analysis.processed).toBe(12);
    expect(analysis.microClusters.map((c) => c.weight)).toEqual([6, 6]);
    expect(analysis.microClusters.map((c) => c.center)).toEqual([
      [0, 0, 0],
      [0, 0, 5],
    ]);
    expect(
      analysis.microClusters.every((c) => c.created === 1.1 && c.potential),
    ).toBe(true);
    expect(r.state.labels).toEqual(Array.from({ length: 12 }, (_, i) => i % 2));
  });
  it("translating the stream clock preserves CFs and labels with creation times translated", () => {
    const a = new DenStreamModel({ ...params, decayRate: 0.05 }, 2),
      b = new DenStreamModel({ ...params, decayRate: 0.05 }, 2);
    const points = [
      [0, 0],
      [0.0625, 0],
      [0, 0.0625],
      [0.0625, 0.0625],
      [5, 5],
      [5.0625, 5],
    ];
    points.forEach((p, i) => {
      a.insert(p, i);
      b.insert(p, i + 100.25);
    });
    const as = a.snapshot(),
      bs = b.snapshot();
    expect(as.map((c) => ({ ...c, created: c.created + 100.25 }))).toEqual(bs);
  });
  it("scheduled long empty-time jumps delete old summaries without retaining old stream observations", () => {
    const model = new DenStreamModel(params, 1);
    model.initialize([[0], [0], [0], [0]], 0);
    const removed = model.advance(1e12);
    expect(removed).toEqual([0]);
    expect(model.snapshot()).toEqual([]);
    model.insert([10], 1e12);
    expect(model.snapshot()[0].weight).toBe(1);
    expect("observations" in model.micro[0]).toBe(false);
  });
  it("records100/1000/10000/100000 exact CF and full-trace observations with all-input fading-mass checks", () => {
    const observations = [];
    for (const n of [100, 1000, 10000, 100000]) {
      const o = {
        ...defaults,
        epsilon: 0.2,
        beta: 0.6,
        minWeight: 3,
        decayRate: 0.001,
        streamInitSize: 0,
      };
      const samples = Array.from({ length: n }, (_, i) => ({
        time: i / 10,
        values: [(i % 2) * 5 + (i % 7) / 100, (i % 11) / 100, 0],
      }));
      const model = new DenStreamModel(o, 3),
        start = performance.now(),
        before = process.memoryUsage().heapUsed;
      for (const sample of samples) model.insert(sample.values, sample.time);
      const micros = model.snapshot(),
        elapsed = performance.now() - start,
        weight = micros.reduce((s, c) => s + c.weight, 0),
        a = -o.decayRate * 0.1 * Math.LN2;
      const expected = Math.expm1(a * n) / Math.expm1(a);
      expect(micros).toHaveLength(2);
      expect(weight).toBeCloseTo(expected, 7);
      observations.push({
        n,
        mode: "stateful-CF",
        dimensions: 3,
        milliseconds: +elapsed.toFixed(2),
        heapDeltaBytes: process.memoryUsage().heapUsed - before,
        microClusters: micros.length,
        totalWeight: weight,
        independentExpectedWeight: expected,
      });
      const points = samples.map(() => ({ x: 0, y: 0 })),
        r = new Recorder(n, "DenStream"),
        traceStart = performance.now(),
        traceBefore = process.memoryUsage().heapUsed;
      try {
        denstream(points, o, r, { kind: "stream", samples });
        const analysis = r.state.analysis;
        if (analysis?.kind !== "stream")
          throw new Error("stream analysis missing");
        expect(analysis.processed).toBe(n);
        expect(r.state.labels).toHaveLength(n);
        expect(r.state.labels.every((label) => label >= -1)).toBe(true);
        expect(
          analysis.microClusters.reduce((s, c) => s + c.weight, 0),
        ).toBeCloseTo(expected, 7);
        observations.push({
          n,
          mode: "full-trace",
          dimensions: 3,
          status: "complete",
          milliseconds: +(performance.now() - traceStart).toFixed(2),
          heapDeltaBytes: process.memoryUsage().heapUsed - traceBefore,
          events: r.trace.steps.length,
          traceEstimatedBytes: r.trace.recording?.estimatedBytes,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("예산")) throw error;
        observations.push({
          n,
          mode: "full-trace",
          dimensions: 3,
          status: "resource-error",
          milliseconds: +(performance.now() - traceStart).toFixed(2),
          message,
        });
      }
    }
    mkdirSync(".local", { recursive: true });
    writeFileSync(
      ".local/denstream-performance.json",
      JSON.stringify(
        {
          recordedAt: new Date().toISOString(),
          node: process.version,
          platform: process.platform,
          architecture: process.arch,
          system: {
            cpu: cpus()[0]?.model,
            logicalProcessors: cpus().length,
            osRelease: release(),
            totalMemoryBytes: totalmem(),
          },
          parameters: {
            epsilon: 0.2,
            beta: 0.6,
            minWeight: 3,
            decayRate: 0.001,
            streamInitSize: 0,
          },
          input:
            "row i: time=i/10, values=[(i%2)*5+(i%7)/100,(i%11)/100,0]; all rows processed; exactly two separated live micro-clusters",
          note: "Single Node observations; generation/Worker/rendering excluded; heap delta is not peak and GC can make it negative. Stateful-CF and full-Trace timings are separate. Not a dense-micro worst-case benchmark.",
          observations,
        },
        null,
        2,
      ),
    );
  });
});
