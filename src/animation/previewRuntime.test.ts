import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { algorithms } from "../engine/types";

class ThumbnailWorker {
  static instances: ThumbnailWorker[] = [];
  onmessage?: (event: { data: object }) => void;
  onerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    ThumbnailWorker.instances.push(this);
  }
}
const clip = { frames: [], events: 5, elapsed: 1 };
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
  vi.resetModules();
  ThumbnailWorker.instances = [];
  vi.stubGlobal("Worker", ThumbnailWorker);
});

it("shares in-flight requests, reuses completed clips and never releases a completed slot twice", async () => {
  const runtime = await import("./previewRuntime");
  const first = vi.fn(),
    second = vi.fn();
  const disposeFirst = runtime.requestPreview("K-Means", first);
  const disposeSecond = runtime.requestPreview("K-Means", second);
  expect(ThumbnailWorker.instances).toHaveLength(1);
  ThumbnailWorker.instances[0].onmessage!({ data: { preview: clip } });
  expect(first).toHaveBeenCalledWith(clip, undefined);
  expect(second).toHaveBeenCalledWith(clip, undefined);
  disposeFirst();
  disposeSecond();
  expect(runtime.previewStats.workers).toBe(0);
  runtime.requestPreview("K-Means", vi.fn())();
  expect(ThumbnailWorker.instances).toHaveLength(1);
});

it("cancels rapid-scroll queues and rejects stale success/error replies after termination", async () => {
  const runtime = await import("./previewRuntime");
  const client = vi.fn();
  const disposers = algorithms
    .slice(0, 10)
    .map((algorithm) => runtime.requestPreview(algorithm, client));
  expect(ThumbnailWorker.instances).toHaveLength(2);
  disposers.forEach((dispose) => dispose());
  expect(runtime.previewStats.workers).toBe(0);
  ThumbnailWorker.instances.forEach((worker) => {
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    worker.onmessage!({ data: { preview: clip } });
    worker.onerror!();
  });
  expect(runtime.previewStats.workers).toBe(0);
  expect(runtime.previewCache.size).toBe(0);
  expect(client).not.toHaveBeenCalled();
});

it("one disappearing subscriber cannot cancel another visible copy and errors release the next queue slot", async () => {
  const runtime = await import("./previewRuntime");
  const first = runtime.requestPreview("K-Means", vi.fn());
  const remaining = vi.fn();
  const second = runtime.requestPreview("K-Means", remaining);
  first();
  expect(ThumbnailWorker.instances[0].terminate).not.toHaveBeenCalled();
  const disposeDBSCAN = runtime.requestPreview("DBSCAN", vi.fn());
  const disposeGMM = runtime.requestPreview("GMM", vi.fn());
  expect(ThumbnailWorker.instances).toHaveLength(2);
  ThumbnailWorker.instances[0].onerror!();
  expect(remaining).toHaveBeenCalledWith(undefined, expect.any(String));
  expect(ThumbnailWorker.instances).toHaveLength(3);
  expect(runtime.previewStats.workers).toBe(2);
  second();
  disposeDBSCAN();
  disposeGMM();
  expect(runtime.previewStats.workers).toBe(0);
});

it("limits six visible players to four, hands over slots and suspends the shared clock when hidden", async () => {
  let visibility = () => {};
  const document = {
    hidden: false,
    addEventListener: (_type: string, listener: () => void) => {
      visibility = listener;
    },
  };
  const pending = new Map<number, FrameRequestCallback>();
  let sequence = 0;
  vi.stubGlobal("document", document);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pending.set(++sequence, callback);
    return sequence;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => pending.delete(id));
  const runtime = await import("./previewRuntime");
  const callbacks = Array.from({ length: 6 }, () => vi.fn());
  const disposers = callbacks.map((callback) => runtime.playPreview(callback));
  const frame = (now: number) => {
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((callback) => callback(now));
  };
  expect(pending.size).toBe(1);
  frame(10);
  frame(50);
  expect(callbacks.map((callback) => callback.mock.calls.length)).toEqual([
    1, 1, 1, 1, 0, 0,
  ]);
  disposers[0]();
  frame(90);
  expect(callbacks[4]).toHaveBeenCalledOnce();
  expect(callbacks[5]).not.toHaveBeenCalled();
  document.hidden = true;
  visibility();
  expect(pending.size).toBe(0);
  document.hidden = false;
  visibility();
  expect(pending.size).toBe(1);
  disposers.forEach((dispose) => dispose());
  expect(pending.size).toBe(0);
});
