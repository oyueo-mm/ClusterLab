import { it, expect } from "vitest";
import {
  HomeCycle,
  HOLD_MS,
  FADE_MS,
  roundDone,
  type WorkerPort,
} from "./homeCycle";
import {
  homeRounds,
  roundData,
  roundParams,
  compatible,
} from "../data/homeRounds";
import { run } from "../engine/run";
import {
  legacyAlgorithms as algorithms,
  type Algorithm,
  type Params,
  type Point,
} from "../engine/types";
import { stateAt } from "../engine/trace";
class FakeWorker implements WorkerPort {
  onmessage: WorkerPort["onmessage"] = null;
  onerror: WorkerPort["onerror"] = null;
  terminated = false;
  request!: {
    id: number;
    algorithm: Algorithm;
    points: Point[];
    params: Params;
  };
  postMessage(message: unknown) {
    this.request = message as typeof this.request;
  }
  terminate() {
    this.terminated = true;
  }
  reply(error?: string) {
    const r = this.request;
    this.onmessage?.({
      data: error
        ? { id: r.id, error }
        : { id: r.id, trace: run(r.algorithm, r.points, r.params) },
    } as MessageEvent);
  }
}
function setup() {
  const workers: FakeWorker[] = [];
  let notifications = 0;
  const cycle = new HomeCycle(
    () => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    },
    () => notifications++,
  );
  [0, 1, 2, 3].forEach((i) => cycle.setVisible(i, true));
  return { cycle, workers, notifications: () => notifications };
}
function settle(workers: FakeWorker[]) {
  for (const w of workers) if (!w.terminated) w.reply();
}
function finish(c: HomeCycle) {
  c.advance(1e8);
  expect(roundDone(c.current)).toBe(true);
}
it("deterministic schedule covers all 13 algorithms with four distinct compatible inputs per round", () => {
  expect(new Set(homeRounds.flatMap((r) => r.algorithms))).toEqual(
    new Set(algorithms),
  );
  for (let i = 0; i < homeRounds.length; i++) {
    const round = homeRounds[i],
      points = roundData(round);
    expect(new Set(round.algorithms).size).toBe(4);
    expect(roundData(round)).toEqual(points);
    if (i) expect(round.preset).not.toBe(homeRounds[i - 1].preset);
    for (const algorithm of round.algorithms) {
      expect(compatible(algorithm, points)).toBe(true);
      const trace = run(algorithm, points, roundParams(algorithm));
      expect(
        stateAt(trace, trace.steps.length).labels.every((l) => l >= -1),
      ).toBe(true);
    }
  }
});
it("shares the exact original record array, not just equal RNG outputs", () => {
  const { cycle, workers } = setup();
  expect(workers).toHaveLength(4);
  for (const w of workers) expect(w.request.points).toBe(cycle.current.points);
});
it("visible cards start independently while other cards are still computing", () => {
  const { cycle, workers } = setup();
  workers[0].reply();
  expect(cycle.phase).toBe("playing");
  cycle.advance(100);
  expect(cycle.current.cards[0].clock.current).toBeGreaterThan(0);
  expect(cycle.current.cards[1].trace).toBeNull();
  expect(cycle.current.cards[1].clock.current).toBe(0);
  expect(cycle.pending).toBeNull();
});
it("holds an early finisher and never treats elapsed wall time or a paused card as completion", () => {
  const { cycle, workers } = setup();
  settle(workers);
  cycle.current.cards.slice(1).forEach((c) => (c.playing = false));
  cycle.advance(1e8);
  const first = cycle.current.cards[0].clock.current;
  expect(first).toBe(cycle.current.cards[0].trace!.steps.length);
  cycle.advance(1e8);
  expect(cycle.current.cards[0].clock.current).toBe(first);
  expect(cycle.phase).toBe("playing");
  expect(cycle.pending).toBeNull();
  for (let i = 1; i < 4; i++) cycle.toggle(i);
  finish(cycle);
  expect(cycle.phase).toBe("holding");
});
it("requires actual final events, 1000ms hold, ready next traces and both 400ms fades", () => {
  const { cycle, workers } = setup();
  settle(workers);
  finish(cycle);
  const old = cycle.current;
  cycle.advance(HOLD_MS + 5000);
  expect(cycle.current).toBe(old);
  expect(cycle.phase).toBe("holding");
  settle(workers);
  cycle.advance(1);
  expect(cycle.phase).toBe("fade-out");
  cycle.advance(FADE_MS / 2);
  expect(cycle.opacity).toBeCloseTo(0.5);
  expect(cycle.current).toBe(old);
  cycle.advance(FADE_MS / 2);
  expect(cycle.current.index).toBe(1);
  expect(cycle.current.points).not.toBe(old.points);
  expect(cycle.phase).toBe("fade-in");
  expect(
    cycle.current.cards.every((c) => c.trace && c.clock.current === 0),
  ).toBe(true);
  cycle.advance(FADE_MS);
  expect(cycle.phase).toBe("playing");
  expect(cycle.opacity).toBe(1);
});
it("loops from the final round to the first, without duplicate transitions", () => {
  const { cycle, workers } = setup();
  for (let i = 0; i < homeRounds.length; i++) {
    settle(workers);
    finish(cycle);
    settle(workers);
    cycle.advance(HOLD_MS);
    cycle.advance(FADE_MS);
    cycle.advance(FADE_MS);
    expect(cycle.current.index).toBe((i + 1) % homeRounds.length);
  }
  expect(cycle.current.id).toBe(homeRounds.length + 1);
  expect(cycle.current.points).toEqual(roundData(homeRounds[0]));
});
it("freezes playback and hold/fade time offscreen or in a hidden tab, then resumes", () => {
  const { cycle, workers } = setup();
  settle(workers);
  cycle.advance(100);
  cycle.setTabVisible(false);
  const positions = cycle.current.cards.map((c) => c.clock.current);
  cycle.advance(1e8);
  expect(cycle.current.cards.map((c) => c.clock.current)).toEqual(positions);
  cycle.setTabVisible(true);
  finish(cycle);
  settle(workers);
  cycle.advance(400);
  [0, 1, 2, 3].forEach((i) => cycle.setVisible(i, false));
  cycle.advance(1e8);
  expect(cycle.phase).toBe("holding");
  expect(cycle.elapsed).toBe(400);
  [0, 1, 2, 3].forEach((i) => cycle.setVisible(i, true));
  cycle.advance(600);
  expect(cycle.phase).toBe("fade-out");
  cycle.setTabVisible(false);
  cycle.advance(1e8);
  expect(cycle.elapsed).toBe(0);
  cycle.setTabVisible(true);
  cycle.advance(200);
  expect(cycle.opacity).toBeCloseTo(0.5);
});
it("ignores stale replies after visibility cancellation, restart, generation changes and disposal", () => {
  const { cycle, workers, notifications } = setup();
  const stale = workers[0];
  cycle.setVisible(0, false);
  expect(stale.terminated).toBe(true);
  cycle.setVisible(0, true);
  stale.reply("late old error");
  expect(cycle.current.cards[0].error).toBe("");
  expect(cycle.current.cards[0].trace).toBeNull();
  settle(workers);
  finish(cycle);
  settle(workers);
  cycle.advance(HOLD_MS);
  cycle.advance(FADE_MS);
  stale.reply("old round error");
  expect(cycle.current.cards[0].error).toBe("");
  const count = notifications();
  cycle.dispose();
  workers.forEach((w) => w.reply("post unmount"));
  expect(notifications()).toBe(count);
  expect(workers.every((w) => w.terminated)).toBe(true);
});
it("turns actual worker errors into terminal cards and continues to a real next round", () => {
  const { cycle, workers } = setup();
  workers[0].reply("expected test error");
  workers.slice(1).forEach((w) => w.reply());
  finish(cycle);
  expect(cycle.current.cards[0].error).toBe("expected test error");
  settle(workers);
  cycle.advance(HOLD_MS);
  cycle.advance(FADE_MS);
  cycle.advance(FADE_MS);
  expect(cycle.current.index).toBe(1);
  expect(cycle.current.cards.every((c) => c.trace && !c.error)).toBe(true);
});
it("card selections preserve coordinates, labels, categorical features and generator settings", () => {
  const { cycle, workers } = setup();
  for (let i = 0; i < 5; i++) {
    settle(workers);
    const s = cycle.selection(0);
    expect(s.points).toBe(cycle.current.points);
    expect(s.preset).toBe(homeRounds[i].preset);
    expect(s.dataOptions.seed).toBe(homeRounds[i].seed);
    if (s.algorithm === "LVQ")
      expect(s.points.every((p) => p.label !== undefined)).toBe(true);
    if (s.algorithm === "ROCK")
      expect(s.points.every((p) => p.features?.length)).toBe(true);
    finish(cycle);
    settle(workers);
    cycle.advance(HOLD_MS);
    cycle.advance(FADE_MS);
    cycle.advance(FADE_MS);
  }
});
