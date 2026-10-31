import type { Algorithm, Params, Point, Trace } from "../engine/types";
import { advance } from "../engine/trace";
import {
  homeRounds,
  roundData,
  roundOptions,
  roundParams,
  homeSpeed,
  compatible,
  type HomeRound,
} from "../data/homeRounds";
import type { DataOptions, PresetId } from "../data/presets";
export interface HomeSelection {
  algorithm: Algorithm;
  points: Point[];
  preset: PresetId;
  params: Params;
  dataOptions: DataOptions;
}
export interface WorkerPort {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}
export interface CycleCard {
  algorithm: Algorithm;
  params: Params;
  trace: Trace | null;
  error: string;
  clock: { current: number };
  playing: boolean;
  speed: number;
  worker: WorkerPort | null;
  ticket: number;
}
export interface CycleRound {
  id: number;
  index: number;
  definition: HomeRound;
  points: Point[];
  cards: CycleCard[];
}
export type CyclePhase =
  "loading" | "playing" | "holding" | "fade-out" | "fade-in";
export const HOLD_MS = 1000,
  FADE_MS = 400;
export const cardDone = (c: CycleCard) =>
  !!c.error || (!!c.trace && c.clock.current >= c.trace.steps.length);
export const roundDone = (r: CycleRound) => r.cards.every(cardDone);

/** Pure elapsed-time coordinator. Workers are injected; React owns the rAF.
 * No wall-clock completion timeout, UI progress comparison, or preset results. */
export class HomeCycle {
  current: CycleRound;
  pending: CycleRound | null = null;
  phase: CyclePhase = "loading";
  elapsed = 0;
  opacity = 1;
  visible = [false, false, false, false];
  tabVisible = true;
  disposed = false;
  onChoose?: (selection: HomeSelection) => void;
  private generation = 0;
  private ticket = 0;
  private shown = 0;
  constructor(
    private factory: () => WorkerPort,
    private notify: () => void,
    readonly rounds: readonly HomeRound[] = homeRounds,
    private autoplay = true,
    private fade = FADE_MS,
  ) {
    this.current = this.create(0);
  }
  get active() {
    return !this.disposed && this.tabVisible && this.visible.some(Boolean);
  }
  private create(index: number): CycleRound {
    const definition = this.rounds[index];
    return {
      id: ++this.generation,
      index,
      definition,
      points: roundData(definition),
      cards: definition.algorithms.map((algorithm) => ({
        algorithm,
        params: roundParams(algorithm),
        trace: null,
        error: "",
        clock: { current: 0 },
        playing: this.autoplay,
        speed: 50,
        worker: null,
        ticket: 0,
      })),
    };
  }
  private ready(r: CycleRound) {
    return r.cards.every((c) => !!c.trace || !!c.error);
  }
  private stop(card: CycleCard) {
    card.worker?.terminate();
    card.worker = null;
    card.ticket = ++this.ticket;
  }
  private live(
    round: CycleRound,
    card: CycleCard,
    worker: WorkerPort,
    ticket: number,
  ) {
    return (
      !this.disposed &&
      (round === this.current || round === this.pending) &&
      card.worker === worker &&
      card.ticket === ticket
    );
  }
  private start(round: CycleRound, index: number) {
    const card = round.cards[index];
    if (
      !this.active ||
      !this.visible[index] ||
      card.trace ||
      card.error ||
      card.worker
    )
      return;
    if (!compatible(card.algorithm, round.points)) {
      card.error = "원본 데이터와 알고리즘의 입력 형식이 맞지 않습니다.";
      this.afterReady();
      this.notify();
      return;
    }
    try {
      const worker = this.factory(),
        ticket = ++this.ticket;
      card.worker = worker;
      card.ticket = ticket;
      worker.onmessage = (event) => {
        if (!this.live(round, card, worker, ticket) || event.data.id !== ticket)
          return;
        if (event.data.progress) return;
        const message = event.data as {
          id: number;
          trace?: Trace;
          error?: string;
        };
        if (message.error) card.error = message.error;
        else if (
          message.trace?.algorithm === card.algorithm &&
          message.trace.initial.labels.length === round.points.length
        ) {
          card.trace = message.trace;
          card.speed = homeSpeed(message.trace);
        } else card.error = "올바른 연산 기록을 받지 못했습니다.";
        this.stop(card);
        this.afterReady();
        this.notify();
      };
      worker.onerror = (event) => {
        if (!this.live(round, card, worker, ticket)) return;
        card.error = event.message || "Worker 연산 오류";
        this.stop(card);
        this.afterReady();
        this.notify();
      };
      worker.postMessage({
        id: ticket,
        algorithm: card.algorithm,
        points: round.points,
        params: card.params,
      });
    } catch (e) {
      card.error = e instanceof Error ? e.message : String(e);
      this.stop(card);
      this.afterReady();
      this.notify();
    }
  }
  private afterReady() {
    if (
      this.phase === "loading" &&
      this.current.cards.some((c) => !!c.trace || !!c.error)
    ) {
      this.phase = "playing";
      this.elapsed = 0;
    }
  }
  private sync() {
    for (const r of [this.current, this.pending])
      if (r)
        r.cards.forEach((c, i) => {
          if (!this.active || !this.visible[i]) {
            if (c.worker) this.stop(c);
          } else this.start(r, i);
        });
  }
  setVisible(index: number, value: boolean) {
    if (this.disposed || this.visible[index] === value) return;
    this.visible[index] = value;
    this.sync();
    this.notify();
  }
  setTabVisible(value: boolean) {
    if (this.disposed || this.tabVisible === value) return;
    this.tabVisible = value;
    this.sync();
    this.notify();
  }
  toggle(index: number) {
    const c = this.current.cards[index];
    if (this.phase !== "playing" || !c.trace || cardDone(c)) return;
    c.playing = !c.playing;
    this.notify();
  }
  selection(index: number): HomeSelection {
    const r = this.current,
      c = r.cards[index];
    return {
      algorithm: c.algorithm,
      points: r.points,
      preset: r.definition.preset,
      params: c.params,
      dataOptions: roundOptions(r.definition),
    };
  }
  advance(dt: number) {
    if (!this.active || !Number.isFinite(dt) || dt <= 0) return;
    if (this.phase === "playing") {
      this.current.cards.forEach((c, i) => {
        if (this.visible[i] && c.trace && c.playing && !cardDone(c)) {
          c.clock.current = advance(c.clock.current, dt, c.speed, c.trace);
          if (cardDone(c)) c.playing = false;
        }
      });
      if (roundDone(this.current)) {
        this.phase = "holding";
        this.elapsed = 0;
        this.pending = this.create(
          (this.current.index + 1) % this.rounds.length,
        );
        this.sync();
        this.notify();
      }
    } else if (this.phase === "holding") {
      this.elapsed += dt;
      if (this.elapsed >= HOLD_MS && this.pending && this.ready(this.pending)) {
        this.phase = "fade-out";
        this.elapsed = 0;
        this.notify();
      }
    } else if (this.phase === "fade-out") {
      this.elapsed += dt;
      this.opacity = this.fade ? Math.max(0, 1 - this.elapsed / this.fade) : 0;
      if (this.elapsed >= this.fade && this.pending) {
        const old = this.current;
        this.current = this.pending;
        this.pending = null;
        old.cards.forEach((c) => this.stop(c));
        this.phase = "fade-in";
        this.elapsed = 0;
        this.opacity = 0;
        this.notify();
      }
    } else if (this.phase === "fade-in") {
      this.elapsed += dt;
      this.opacity = this.fade ? Math.min(1, this.elapsed / this.fade) : 1;
      if (this.elapsed >= this.fade) {
        this.phase = "playing";
        this.opacity = 1;
        this.elapsed = 0;
        this.notify();
      }
    }
    this.shown += dt;
    if (this.shown >= 80) {
      this.shown = 0;
      this.notify();
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const r of [this.current, this.pending])
      r?.cards.forEach((c) => this.stop(c));
  }
}
