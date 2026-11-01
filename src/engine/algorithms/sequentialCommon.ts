import { numericRows, type Dataset } from "../dataset";
import type { SequentialAnalysis } from "../sequentialTypes";
import { DEFAULT_TRACE_BYTES, DEFAULT_WORKING_BYTES } from "../resources";
import type { Recorder } from "../trace";
import type { EventKind, Params, Point } from "../types";

export type SequentialMethod = SequentialAnalysis["method"];

/** Scaled Euclidean norm: distance is not squared, and uses every source axis. */
export function sequentialDistance(a: number[], b: number[]): number {
  let norm = 0;
  for (let j = 0; j < a.length; j++) {
    const difference = a[j] - b[j];
    if (!Number.isFinite(difference))
      throw new Error(
        "수치 불안정: 순차 군집화 원본 좌표 차이가 유한하지 않습니다.",
      );
    norm = Math.hypot(norm, difference);
  }
  if (!Number.isFinite(norm))
    throw new Error("수치 불안정: 원본 Euclidean 거리가 유한하지 않습니다.");
  return norm;
}

/** Ordered algorithms share arithmetic and recording, not their decision rules. */
export class SequentialRun {
  readonly x: number[][];
  readonly labels: number[];
  readonly centroids: number[][] = [];
  readonly counts: number[] = [];
  readonly detailed: boolean;
  assigned = 0;
  pass = 1;
  visits = 0;
  objective = 0;
  private compensation = 0;
  private recordedSource?: number[][];

  constructor(
    readonly method: SequentialMethod,
    points: Point[],
    readonly options: Params,
    readonly recorder: Recorder,
    input?: Dataset,
  ) {
    this.x = numericRows(points, input);
    const n = this.x.length,
      d = this.x[0]?.length;
    if (!n || n !== points.length || !d)
      throw new Error(
        "순차 군집화는 원본/표시 행 수가 같은 1행 이상의 수치 벡터가 필요합니다.",
      );
    for (let i = 0; i < n; i++)
      if (
        !Array.isArray(this.x[i]) ||
        this.x[i].length !== d ||
        this.x[i].some((v) => !Number.isFinite(v))
      )
        throw new Error(
          "순차 군집화의 모든 원본 행은 같은 차원의 유한한 수치 벡터여야 합니다.",
        );
    if (!Number.isFinite(options.threshold) || options.threshold < 0)
      throw new Error(
        "순차 군집화 threshold는 유한한 0 이상의 Euclidean 거리여야 합니다.",
      );
    if (method === "TTSAS") {
      if (
        !Number.isFinite(options.upperThreshold) ||
        options.upperThreshold <= options.threshold
      )
        throw new Error(
          "TTSAS는 유한한 upperThreshold > threshold가 필요합니다.",
        );
    } else if (
      !Number.isSafeInteger(options.maxClusters) ||
      options.maxClusters < 1
    )
      throw new Error(
        "BSAS/MBSAS maxClusters는 양의 정수 군집 수 예산이어야 합니다.",
      );
    const k = method === "TTSAS" ? n : Math.min(n, options.maxClusters),
      estimate = n * (d * 24 + 128) + k * (d * 48 + 128);
    if (!Number.isFinite(estimate) || estimate > DEFAULT_WORKING_BYTES)
      throw new Error(
        `순차 군집화 작업 메모리 예산 초과: 추정 ${(estimate / 1048576).toFixed(1)}MiB. 입력을 버리지 않고 중단합니다.`,
      );
    this.labels = Array(n).fill(-1) as number[];
    const visits =
      method === "TTSAS" ? 2 * n * n : method === "MBSAS" ? 2 * n : n;
    this.detailed =
      visits * (n * 16 + k * (d * 32 + 64) + 2300) < DEFAULT_TRACE_BYTES / 4;
    recorder.trace.recording!.policy = `전체 원본 ${d}차원·입력 순서 유지·Euclidean 거리·시드 무작위 없음 · ${this.detailed ? "실제 거리 검사·생성/할당/유보" : "모든 원본 계산·첫 검사와 2의 거듭제곱 검사/회차 및 최종 상태 요약(중간 사건 생략)"} · −1은 미처리/유보, 통계적 noise 아님 · SSE는 진단값`;
    this.emit(
      "initialize",
      "initialize",
      "전체 원본 순서와 Euclidean 임계값을 확인했습니다. 미할당 행은 −1이며 노이즈 판정이 아닙니다.",
    );
  }

  selected(ordinal: number) {
    return (
      this.detailed ||
      ordinal <= 4 ||
      (ordinal > 0 && Math.log2(ordinal) % 1 === 0)
    );
  }

  nearest(i: number) {
    const distances = this.centroids.map((center, cluster) => ({
      cluster,
      distance: sequentialDistance(this.x[i], center),
    }));
    let cluster = 0;
    for (let j = 1; j < distances.length; j++)
      if (distances[j].distance < distances[cluster].distance) cluster = j;
    this.visits++;
    if (this.selected(this.visits))
      this.emit(
        "distance",
        "distance",
        `${i + 1}행과 실제 ${this.centroids.length}개 대표점의 전체 원본 거리를 계산했습니다. 동률은 먼저 생성된 군집입니다.`,
        { current: i, distances },
      );
    return { cluster, distance: distances[cluster].distance, distances };
  }

  create(i: number, forced = false) {
    const cluster = this.centroids.length;
    this.centroids.push([...this.x[i]]);
    this.counts.push(1);
    this.labels[i] = cluster;
    this.assigned++;
    if (
      this.selected(this.visits) ||
      (forced && this.selected(this.pass)) ||
      this.assigned === 1
    )
      this.emit(
        "prototype",
        forced ? "force-create" : "create",
        forced
          ? `${this.pass}번째 회차: 이전 회차에 배정 진전이 없어 첫 미할당 ${i + 1}행으로 새 대표점을 만듭니다. 최초 회차도 이 규칙을 사용합니다.`
          : `${i + 1}행을 실제 새 군집 ${cluster + 1}의 대표점으로 만듭니다.`,
        { current: i, created: cluster },
      );
  }

  append(
    i: number,
    cluster: number,
    distances: { cluster: number; distance: number }[],
  ) {
    const previousCount = this.counts[cluster],
      count = previousCount + 1,
      previous = this.centroids[cluster],
      mean = previous.map((v, j) => v + (this.x[i][j] - v) / count),
      scaled = distances[cluster].distance * Math.sqrt(previousCount / count),
      increase = scaled * scaled;
    if (
      mean.some((v) => !Number.isFinite(v)) ||
      !Number.isFinite(increase) ||
      (scaled !== 0 && increase === 0)
    )
      throw new Error(
        "수치 불안정: 순차 평균 또는 진단 SSE가 overflow/underflow했습니다. 원본 스케일을 조정하세요.",
      );
    const adjusted = increase - this.compensation,
      next = this.objective + adjusted;
    if (!Number.isFinite(next))
      throw new Error("수치 불안정: 전체 배정 SSE가 유한하지 않습니다.");
    this.compensation = next - this.objective - adjusted;
    this.objective = next;
    this.centroids[cluster] = mean;
    this.counts[cluster] = count;
    this.labels[i] = cluster;
    this.assigned++;
    if (this.selected(this.visits))
      this.emit(
        "assign",
        "assign",
        `${i + 1}행을 군집 ${cluster + 1}에 배정하고 실제 ${count}행 산술평균으로 대표점을 갱신했습니다. SSE는 배정 오차 진단이며 단조 최소화 목표가 아닙니다.`,
        { current: i, distances },
      );
  }

  defer(i: number, distances: { cluster: number; distance: number }[]) {
    if (this.selected(this.visits))
      this.emit(
        "defer",
        "defer",
        `${i + 1}행의 배정을 유보합니다. 대표점·학습 가중치에 아직 포함하지 않습니다.`,
        { current: i, distances },
      );
  }

  endPass() {
    if (this.selected(this.pass))
      this.emit(
        "visit",
        "pass-complete",
        `${this.pass}번째 실제 순회 완료: ${this.assigned}/${this.x.length}행 배정, ${this.x.length - this.assigned}행 미할당.`,
      );
  }

  finish() {
    if (this.assigned !== this.x.length)
      throw new Error(
        "순차 군집화 내부 오류: 미할당 행이 있는 결과는 완료할 수 없습니다.",
      );
    this.emit(
      "finish",
      "finish",
      "모든 원본 행의 순차 배정을 완료했습니다. 기존 행의 최근접 재배치나 Lloyd 반복은 수행하지 않았습니다.",
      { converged: true },
    );
  }

  private emit(
    kind: EventKind,
    phase: string,
    description: string,
    extra: Partial<SequentialAnalysis> = {},
  ) {
    const analysis: SequentialAnalysis = {
      kind: "sequential",
      method: this.method,
      phase,
      sourceValues: this.recordedSource ?? this.x,
      centroids: this.centroids,
      counts: this.counts,
      prototypeCounts: this.counts,
      processed: this.assigned,
      unassigned: this.x.length - this.assigned,
      pass: this.pass,
      threshold: this.options.threshold,
      ...(this.method === "TTSAS"
        ? { upperThreshold: this.options.upperThreshold }
        : { maxClusters: this.options.maxClusters }),
      decision: phase,
      converged: false,
      objective: this.objective,
      ...extra,
    };
    this.recorder.emit(
      kind,
      description,
      {
        labels: this.labels,
        centers: [],
        focus: extra.current === undefined ? [] : [extra.current],
        analysis,
        metric: [...this.recorder.state.metric, this.objective],
        metricName: "Assigned SSE (diagnostic)",
      },
      {
        assigned: this.assigned,
        unassigned: analysis.unassigned,
        pass: this.pass,
        objective: this.objective,
      },
    );
    const recorded = this.recorder.state.analysis;
    if (recorded?.kind === "sequential")
      this.recordedSource = recorded.sourceValues;
  }
}
