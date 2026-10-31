import {
  emptyState,
  type Algorithm,
  type State,
  type Step,
  type Trace,
  type EventKind,
  type Center,
  type AlgorithmAnalysis,
} from "./types";
import { DEFAULT_TRACE_BYTES, retainedBytes } from "./resources";
/** Immutable field patches, not a full copy of the complete state at every event. */
export class Recorder {
  state: State;
  trace: Trace;
  private sourceCenters: Center[] = [];
  private bytes = 0;
  private lastProgress = 0;
  constructor(
    n: number,
    algorithm: Algorithm,
    private budgetBytes = DEFAULT_TRACE_BYTES,
    private onProgress?: (events: number) => void,
  ) {
    this.state = emptyState(n);
    this.trace = {
      algorithm,
      initial: this.state,
      steps: [],
      snapshots: [],
      elapsed: 0,
      recording: {
        policy: "상세 실제 이벤트 · 예산 초과 시 명시적 실패 (표본 계산 없음)",
        estimatedBytes: 0,
      },
    };
    this.bytes = retainedBytes(this.state);
    if (this.bytes > this.budgetBytes)
      throw new Error("Trace 초기 상태가 메모리 예산을 초과했습니다.");
  }
  emit(
    kind: EventKind,
    description: string,
    patch: Partial<State>,
    result?: Step["result"],
    duration = 600,
  ) {
    let analysisDelta: Step["analysisDelta"];
    let nextAnalysis: AlgorithmAnalysis | undefined;
    let analysisBytes = 0;
    if (Object.hasOwn(patch, "analysis")) {
      const source = patch.analysis as unknown as
        Record<string, unknown> | undefined;
      const previous = this.state.analysis as unknown as
        Record<string, unknown> | undefined;
      const keys = new Set([
        ...Object.keys(previous ?? {}),
        ...Object.keys(source ?? {}),
      ]);
      const changes: NonNullable<Step["analysisDelta"]>["changes"] = [];
      const matrixKeys = new Set([
        "adjacency",
        "laplacian",
        "similarities",
        "responsibility",
        "availability",
        "eigenvectors",
        "embedding",
        "embeddingCenters",
      ]);
      const sameMatrix = (a: unknown, b: unknown) =>
        Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every(
          (row, i) =>
            Array.isArray(row) &&
            Array.isArray(b[i]) &&
            row.length === b[i].length &&
            row.every((v, j) => Object.is(v, b[i][j])),
        );
      const result = { ...previous };
      for (const key of keys) {
        const before = previous?.[key],
          incoming = source?.[key];
        if (
          Object.is(before, incoming) ||
          (matrixKeys.has(key) && sameMatrix(before, incoming))
        )
          continue;
        analysisBytes += retainedBytes(incoming) + 96 + key.length * 2;
        if (this.bytes + analysisBytes > this.budgetBytes)
          throw new Error(
            "Trace 분석 상태의 메모리 예산 초과. 완료 결과가 아닙니다.",
          );
        const after = structuredClone(incoming);
        changes.push({ key, before, after });
        if (incoming === undefined) delete result[key];
        else result[key] = after;
      }
      analysisDelta = {
        beforeExists: previous !== undefined,
        afterExists: source !== undefined,
        changes,
      };
      nextAnalysis =
        source === undefined
          ? undefined
          : (result as unknown as AlgorithmAnalysis);
      const rest = { ...patch };
      delete rest.analysis;
      patch = rest;
    }
    let labelChanges: Step["labelChanges"];
    const sourceLabels = patch.labels;
    if (sourceLabels && sourceLabels.length === this.state.labels.length) {
      // Decide density before allocating per-point objects: initial million-row
      // assignments should not transiently create a million discarded deltas.
      let changed = 0;
      for (let i = 0; i < sourceLabels.length; i++)
        if (
          sourceLabels[i] !== this.state.labels[i] &&
          ++changed * 8 >= sourceLabels.length
        )
          break;
      if (changed * 8 < sourceLabels.length) {
        const changes: NonNullable<Step["labelChanges"]> = [];
        for (let index = 0; index < sourceLabels.length; index++)
          if (sourceLabels[index] !== this.state.labels[index])
            changes.push({
              index,
              before: this.state.labels[index],
              after: sourceLabels[index],
            });
        labelChanges = changes;
        const rest = { ...patch };
        delete rest.labels;
        patch = rest;
      }
    }
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
    const cost =
      analysisBytes +
      retainedBytes(patch) +
      retainedBytes(centerChanges) +
      retainedBytes(labelChanges) +
      description.length * 2 +
      retainedBytes(result) +
      160;
    if (this.bytes + cost > this.budgetBytes)
      throw new Error(
        `Trace 메모리 예산 초과: ${(this.budgetBytes / 1048576).toFixed(1)} MiB. 상세 기록을 중단했습니다. 완료 결과가 아닙니다.`,
      );
    this.bytes += cost;
    const frozen = structuredClone(patch);
    this.state = { ...this.state, ...frozen };
    if (analysisDelta) {
      this.state = { ...this.state };
      if (nextAnalysis) this.state.analysis = nextAnalysis;
      else delete this.state.analysis;
    }
    if (labelChanges?.length)
      this.state = { ...this.state, labels: [...sourceLabels!] };
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
      ...(labelChanges ? { labelChanges } : {}),
      ...(analysisDelta ? { analysisDelta } : {}),
    });
    if (this.trace.steps.length % 48 === 0) {
      const checkpointBytes = retainedBytes(this.state);
      if (this.bytes + checkpointBytes > this.budgetBytes)
        throw new Error(
          "Trace 체크포인트 메모리 예산 초과. 완료 결과가 아닙니다.",
        );
      this.bytes += checkpointBytes;
      this.trace.snapshots.push({
        index: this.trace.steps.length,
        state: this.state,
      });
    }
    this.trace.recording!.estimatedBytes = this.bytes;
    const now = performance.now();
    if (this.onProgress && now - this.lastProgress > 100) {
      this.lastProgress = now;
      this.onProgress(this.trace.steps.length);
    }
  }
}
export function applyStep(state: State, step: Step, reverse = false): State {
  const next = { ...state, ...(reverse ? step.undo : step.patch) };
  if (step.analysisDelta) {
    const delta = step.analysisDelta;
    if (reverse ? delta.beforeExists : delta.afterExists) {
      const analysis = { ...next.analysis } as Record<string, unknown>;
      for (const c of delta.changes) {
        const value = reverse ? c.before : c.after;
        if (value === undefined) delete analysis[c.key];
        else analysis[c.key] = value;
      }
      next.analysis = analysis as unknown as AlgorithmAnalysis;
    } else delete next.analysis;
  }
  if (step.labelChanges?.length) {
    next.labels = [...next.labels];
    step.labelChanges.forEach((c) => {
      next.labels[c.index] = reverse ? c.before : c.after;
    });
  }
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
