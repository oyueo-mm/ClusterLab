import {
  emptyState,
  type Algorithm,
  type State,
  type Step,
  type Trace,
  type EventKind,
  type Center,
} from "./types";
/** Immutable field patches, not a full copy of the complete state at every event. */
export class Recorder {
  state: State;
  trace: Trace;
  private sourceCenters: Center[] = [];
  constructor(n: number, algorithm: Algorithm) {
    this.state = emptyState(n);
    this.trace = {
      algorithm,
      initial: this.state,
      steps: [],
      snapshots: [],
      elapsed: 0,
    };
  }
  emit(
    kind: EventKind,
    description: string,
    patch: Partial<State>,
    result?: Step["result"],
    duration = 600,
  ) {
    const source = patch.centers;
    let centerChanges: Step["centerChanges"];
    if (
      this.trace.algorithm === "Mean Shift" &&
      source &&
      source.length === this.sourceCenters.length &&
      source.every((c, i) => c.id === this.sourceCenters[i].id)
    ) {
      centerChanges = source.flatMap((c, i) =>
        c === this.sourceCenters[i]
          ? []
          : [
              {
                index: i,
                before: this.state.centers[i],
                after: structuredClone(c),
              },
            ],
      );
      const rest = { ...patch };
      delete rest.centers;
      patch = rest;
    }
    if (source) this.sourceCenters = source;
    const undo: Partial<State> = {};
    for (const key of Object.keys(patch) as (keyof State)[])
      Object.assign(undo, { [key]: this.state[key] });
    const frozen = structuredClone(patch);
    this.state = { ...this.state, ...frozen };
    if (centerChanges) {
      const centers = [...this.state.centers];
      centerChanges.forEach((c) => (centers[c.index] = c.after));
      this.state = { ...this.state, centers };
    }
    this.trace.steps.push({
      kind,
      description,
      patch: frozen,
      undo,
      duration,
      result,
      ...(centerChanges ? { centerChanges } : {}),
    });
    if (this.trace.steps.length % 48 === 0)
      this.trace.snapshots.push({
        index: this.trace.steps.length,
        state: this.state,
      });
  }
}
export function applyStep(state: State, step: Step, reverse = false): State {
  const next = { ...state, ...(reverse ? step.undo : step.patch) };
  if (step.centerChanges) {
    const centers = [...next.centers];
    step.centerChanges.forEach(
      (c) => (centers[c.index] = reverse ? c.before : c.after),
    );
    return { ...next, centers };
  }
  return next;
}
export function stateAt(trace: Trace, index: number): State {
  index = Math.max(0, Math.min(trace.steps.length, Math.floor(index)));
  const snap = trace.snapshots.findLast((s) => s.index <= index);
  let state = snap?.state ?? trace.initial;
  for (let i = snap?.index ?? 0; i < index; i++)
    state = applyStep(state, trace.steps[i]);
  return state;
}
export const ease = (t: number) => t * t * (3 - 2 * t);
/** One continuous exponential curve, with no mode boundary at any value. */
export const speedMultiplier = (speed: number) =>
  Math.pow(2, (Math.max(1, Math.min(200, speed)) - 50) / 18);
export function advance(
  position: number,
  dt: number,
  speed: number,
  trace: Trace,
) {
  let left = dt;
  let p = position;
  while (p < trace.steps.length && left > 0) {
    const i = Math.floor(p),
      duration = trace.steps[i].duration / speedMultiplier(speed);
    const remaining = (1 - (p - i)) * duration;
    if (left >= remaining) {
      p = i + 1;
      left -= remaining;
    } else {
      p += left / duration;
      left = 0;
    }
  }
  return Math.min(p, trace.steps.length);
}
