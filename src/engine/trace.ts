import {
  emptyState,
  type Algorithm,
  type State,
  type Step,
  type Trace,
  type EventKind,
} from "./types";
/** Immutable field patches, not a full copy of the complete state at every event. */
export class Recorder {
  state: State;
  trace: Trace;
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
    const undo: Partial<State> = {};
    for (const key of Object.keys(patch) as (keyof State)[])
      Object.assign(undo, { [key]: this.state[key] });
    const frozen = structuredClone(patch);
    this.state = { ...this.state, ...frozen };
    this.trace.steps.push({
      kind,
      description,
      patch: frozen,
      undo,
      duration,
      result,
    });
    if (this.trace.steps.length % 48 === 0)
      this.trace.snapshots.push({
        index: this.trace.steps.length,
        state: this.state,
      });
  }
}
export function stateAt(trace: Trace, index: number): State {
  index = Math.max(0, Math.min(trace.steps.length, Math.floor(index)));
  const snap = trace.snapshots.findLast((s) => s.index <= index);
  let state = snap?.state ?? trace.initial;
  for (let i = snap?.index ?? 0; i < index; i++)
    state = { ...state, ...trace.steps[i].patch };
  return state;
}
export const ease = (t: number) => t * t * (3 - 2 * t);
export function advance(
  position: number,
  dt: number,
  speed: number,
  trace: Trace,
  fast = false,
) {
  let left = dt;
  let p = position;
  while (p < trace.steps.length && left > 0) {
    const i = Math.floor(p),
      duration = fast
        ? 2
        : trace.steps[i].duration / Math.pow(2, (speed - 50) / 18);
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
