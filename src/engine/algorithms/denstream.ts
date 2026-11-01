import type { Dataset, StreamDataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { MicroClusterState } from "../streamTypes";
import {
  DEFAULT_WORKING_BYTES,
  DEFAULT_TRACE_BYTES,
  retainedBytes,
} from "../resources";

interface Micro {
  id: number;
  anchor: number[];
  ls: number[];
  ss: number[];
  weight: number;
  created: number;
  potential: boolean;
}
const squared = (a: number[], b: number[]) => {
  let value = 0;
  for (let j = 0; j < a.length; j++) value += (a[j] - b[j]) ** 2;
  if (!Number.isFinite(value))
    throw new Error(
      "DenStream 수치 불안정: 거리 제곱이 유한하지 않습니다. 원본 스케일을 조정하세요.",
    );
  return value;
};
const center = (c: Micro) => c.anchor.map((a, j) => a + c.ls[j] / c.weight);
function radius(c: Micro) {
  let variance = 0;
  for (let j = 0; j < c.ls.length; j++) {
    const a = c.ss[j] / c.weight,
      b = (c.ls[j] / c.weight) ** 2;
    const v = a - b;
    if (!Number.isFinite(v) || v < -1e-10 * Math.max(1, a, b))
      throw new Error("DenStream 수치 불안정: CF 분산이 유효하지 않습니다.");
    variance += Math.max(0, v);
  }
  return Math.sqrt(variance);
}
function add(c: Micro, point: number[]): Micro {
  const ls = c.ls.map((v, j) => v + (point[j] - c.anchor[j]));
  const ss = c.ss.map((v, j) => v + (point[j] - c.anchor[j]) ** 2);
  if (
    ls.some((v) => !Number.isFinite(v)) ||
    ss.some((v) => !Number.isFinite(v))
  )
    throw new Error("DenStream 수치 불안정: CF 갱신 범위 초과.");
  return { ...c, ls, ss, weight: c.weight + 1 };
}
/** Stateful online synopsis. It never stores the historical stream observations. */
export class DenStreamModel {
  micro: Micro[] = [];
  time: number | undefined;
  readonly pruneInterval: number;
  private nextPrune: number | undefined;
  private nextId = 0;
  constructor(
    readonly params: Params,
    readonly dimensions: number,
  ) {
    const { epsilon, beta, minWeight, decayRate, streamInitSize } = params;
    if (
      !(epsilon > 0) ||
      !Number.isFinite(epsilon) ||
      !(beta > 0 && beta <= 1) ||
      !Number.isSafeInteger(minWeight) ||
      minWeight < 1 ||
      beta * minWeight <= 1 ||
      !(decayRate > 0) ||
      !Number.isFinite(decayRate) ||
      !Number.isSafeInteger(streamInitSize) ||
      streamInitSize < 0 ||
      !Number.isSafeInteger(dimensions) ||
      dimensions < 1
    )
      throw new Error(
        "DenStream 파라미터 오류: ε>0, 0<β≤1, 정수 μ≥1, βμ>1, λ>0, 초기 배치≥0이 필요합니다.",
      );
    this.pruneInterval = Math.ceil(
      Math.log2((beta * minWeight) / (beta * minWeight - 1)) / decayRate,
    );
    if (!Number.isSafeInteger(this.pruneInterval) || this.pruneInterval < 1)
      throw new Error(
        "DenStream pruning 간격이 표현 범위를 넘습니다. 감쇠율을 조정하세요.",
      );
  }
  private check(point: number[], time: number) {
    if (
      point.length !== this.dimensions ||
      point.some((x) => !Number.isFinite(x)) ||
      !Number.isFinite(time) ||
      (this.time !== undefined && time < this.time)
    )
      throw new Error(
        "DenStream 입력 오류: 유한한 동일 차원 벡터와 감소하지 않는 시각이 필요합니다.",
      );
  }
  private create(point: number[], time: number, potential = false) {
    if (
      (this.micro.length + 1) * (160 + this.dimensions * 48) >
      DEFAULT_WORKING_BYTES
    )
      throw new Error(
        "DenStream micro-cluster 메모리 예산 초과. 입력을 버리지 않고 실행을 중단했습니다.",
      );
    const c: Micro = {
      id: this.nextId++,
      anchor: [...point],
      ls: point.map(() => 0),
      ss: point.map(() => 0),
      weight: 1,
      created: time,
      potential,
    };
    this.micro.push(c);
    return c;
  }
  private fade(time: number) {
    const dt = this.time === undefined ? 0 : time - this.time;
    const factor = Math.pow(2, -this.params.decayRate * dt);
    for (const c of this.micro) {
      c.weight *= factor;
      c.ls = c.ls.map((v) => v * factor);
      c.ss = c.ss.map((v) => v * factor);
    }
    this.time = time;
  }
  /** Executes every scheduled pruning instant crossed by a timestamp jump. */
  advance(time: number, beforeArrival = false) {
    if (!Number.isFinite(time) || (this.time !== undefined && time < this.time))
      throw new Error("DenStream 시간은 감소할 수 없습니다.");
    if (
      !Number.isFinite(time + this.pruneInterval) ||
      time + this.pruneInterval <= time
    )
      throw new Error(
        "DenStream 수치 불안정: 시각의 부동소수점 해상도로 pruning 간격을 표현할 수 없습니다. 시간 원점·단위를 조정하세요.",
      );
    const removed: number[] = [];
    if (this.time === undefined) {
      this.time = time;
      this.nextPrune = time + this.pruneInterval;
    }
    // Once all synopsis entries are gone, empty ticks can be skipped exactly.
    while (
      (this.nextPrune! < time ||
        (!beforeArrival && this.nextPrune! === time)) &&
      this.micro.length
    ) {
      this.fade(this.nextPrune!);
      const at = this.nextPrune!;
      this.micro = this.micro.filter((c) => {
        const threshold = c.potential
          ? this.params.beta * this.params.minWeight
          : this.outlierThreshold(at, c.created);
        if (c.weight < threshold) {
          removed.push(c.id);
          return false;
        }
        return true;
      });
      const next = this.nextPrune! + this.pruneInterval;
      if (!Number.isFinite(next) || next <= this.nextPrune!)
        throw new Error(
          "DenStream 수치 불안정: pruning 시계가 진행할 수 없습니다. 시간 원점을 조정하세요.",
        );
      this.nextPrune = next;
    }
    if (this.nextPrune! <= time) {
      this.nextPrune! +=
        (beforeArrival
          ? Math.ceil((time - this.nextPrune!) / this.pruneInterval)
          : Math.floor((time - this.nextPrune!) / this.pruneInterval) + 1) *
        this.pruneInterval;
      if (
        !Number.isFinite(this.nextPrune!) ||
        this.nextPrune! < time ||
        (!beforeArrival && this.nextPrune! === time)
      )
        throw new Error(
          "DenStream 수치 불안정: 시간 점프의 pruning 시각을 표현할 수 없습니다.",
        );
    }
    this.fade(time);
    return removed;
  }
  outlierThreshold(time: number, created: number) {
    const a =
      -this.params.decayRate * (time - created + this.pruneInterval) * Math.LN2;
    const b = -this.params.decayRate * this.pruneInterval * Math.LN2;
    return Math.expm1(a) / Math.expm1(b);
  }
  insert(
    point: number[],
    time: number,
    onMerged?: (event: {
      id: number;
      promoted: boolean;
      created: boolean;
    }) => void,
  ) {
    this.check(point, time);
    // Paper Algorithm 2: arrival is merged before pruning at the same tick.
    // Earlier empty ticks are still pruned when a timestamp jumps forward.
    const removed = this.advance(time, true);
    const finish = (event: {
      id: number;
      promoted: boolean;
      created: boolean;
      distance: number;
    }) => {
      onMerged?.(event);
      return { ...event, removed: [...removed, ...this.advance(time)] };
    };
    for (const potential of [true, false]) {
      const candidates = this.micro.filter(
        (c) => c.potential === potential && c.weight > 0,
      );
      let best: Micro | undefined,
        distance = Infinity;
      for (const c of candidates) {
        const d = squared(point, center(c));
        if (d < distance) {
          best = c;
          distance = d;
        }
      }
      if (best) {
        const proposal = add(best, point);
        if (radius(proposal) <= this.params.epsilon) {
          const promoted =
            !potential &&
            proposal.weight > this.params.beta * this.params.minWeight;
          proposal.potential ||= promoted;
          this.micro[this.micro.indexOf(best)] = proposal;
          return finish({
            id: proposal.id,
            promoted,
            created: false,
            distance: Math.sqrt(distance),
          });
        }
      }
    }
    const c = this.create(point, time);
    return finish({ id: c.id, promoted: false, created: true, distance: 0 });
  }
  /** Paper's greedy epsilon-neighborhood initialization; residual points are noise. */
  initialize(points: number[][], time: number) {
    points.forEach((p) => this.check(p, time));
    if (this.micro.length || this.time !== undefined)
      throw new Error("DenStream 초기화는 빈 모델에서만 가능합니다.");
    this.advance(time);
    const owners = points.map(() => -1),
      available = new Set(points.map((_, i) => i));
    for (let i = 0; i < points.length; i++) {
      if (!available.has(i)) continue;
      const neighbors = [...available].filter(
        (j) => squared(points[i], points[j]) <= this.params.epsilon ** 2,
      );
      if (neighbors.length <= this.params.beta * this.params.minWeight)
        continue;
      let c = this.create(points[i], time, true);
      for (const j of neighbors) {
        if (j !== i) c = add(c, points[j]);
        owners[j] = c.id;
        available.delete(j);
      }
      this.micro[this.micro.length - 1] = c;
    }
    return owners;
  }
  /** Macro extraction uses each core micro-cluster's OWN weight >= mu, not
   * a DBSCAN sum over neighboring micro-cluster weights (paper Definition 4.1). */
  snapshot(): MicroClusterState[] {
    const states = this.micro
      .filter((c) => c.weight > 0)
      .map((c) => ({
        id: c.id,
        center: center(c),
        radius: radius(c),
        weight: c.weight,
        created: c.created,
        potential: c.potential,
        label: -1,
        anchor: [...c.anchor],
        linearSum: [...c.ls],
        squaredSum: [...c.ss],
      }));
    let label = 0;
    const visited = new Set<number>();
    for (let i = 0; i < states.length; i++) {
      const origin = states[i];
      if (
        !origin.potential ||
        origin.weight < this.params.minWeight ||
        visited.has(i)
      )
        continue;
      const queue = [i];
      visited.add(i);
      origin.label = label;
      for (let q = 0; q < queue.length; q++) {
        const a = states[queue[q]];
        for (let j = 0; j < states.length; j++) {
          const b = states[j];
          if (
            !b.potential ||
            squared(a.center, b.center) > (2 * this.params.epsilon) ** 2
          )
            continue;
          if (b.label < 0) b.label = label;
          if (b.weight >= this.params.minWeight && !visited.has(j)) {
            visited.add(j);
            queue.push(j);
          }
        }
      }
      label++;
    }
    return states;
  }
}

export function denstream(p: Point[], o: Params, r: Recorder, input?: Dataset) {
  const data: StreamDataset = input
    ? input.kind === "stream"
      ? input
      : (() => {
          throw new Error("DenStream은 실제 stream 원본이 필요합니다.");
        })()
    : {
        kind: "stream",
        samples: p.map((point, time) => ({ time, values: [point.x, point.y] })),
      };
  if (!data.samples.length || data.samples.length !== p.length)
    throw new Error("DenStream 스트림 입력 수가 표시 데이터와 다릅니다.");
  const dimensions = data.samples[0].values.length,
    model = new DenStreamModel(o, dimensions);
  const owners = p.map(() => -1);
  const bounds = [0, 1].map((axis) => {
    const j = Math.min(axis, dimensions - 1);
    let min = Infinity,
      max = -Infinity;
    for (const sample of data.samples) {
      min = Math.min(min, sample.values[j]);
      max = Math.max(max, sample.values[j]);
    }
    return { min, max };
  });
  const displayCenter = (values: number[]) =>
    input
      ? {
          x:
            0.1 +
            (0.8 * (values[0] - bounds[0].min)) /
              (bounds[0].max - bounds[0].min || 1),
          y:
            0.1 +
            (0.8 * (values[Math.min(1, dimensions - 1)] - bounds[1].min)) /
              (bounds[1].max - bounds[1].min || 1),
        }
      : { x: values[0], y: values[1] };
  let processed = 0;
  let removedCount = 0,
    promotedCount = 0;
  const detailed =
    data.samples.length *
      Math.min(data.samples.length, model.pruneInterval) *
      dimensions *
      200 <
    16 * 1048576;
  r.trace.recording!.policy = `${input ? "원본 시각·전체 특성" : "2D 원본 순서→정수 시각 변환"} · 실제 online CF/감쇠/승격/pruning · ${detailed ? "유입별" : "체크포인트 요약"} 기록 · 역사 점 레이블은 현재 살아 있는 micro-cluster 소유 관계`;
  const emit = (
    kind: "initialize" | "insert" | "decay" | "prune" | "extract" | "finish",
    phase: string,
    description: string,
    current?: number[],
    promoted?: number,
    removed?: number[],
  ) => {
    const microClusters = model.snapshot(),
      byId = new Map(microClusters.map((c) => [c.id, c]));
    const labels = owners.map((id, i) =>
      i < processed ? (byId.get(id)?.label ?? -1) : -2,
    );
    const labelCount = new Set(
      microClusters.filter((c) => c.label >= 0).map((c) => c.label),
    ).size;
    r.emit(
      kind,
      description,
      {
        labels,
        centers: microClusters.map((c) => ({
          ...displayCenter(c.center),
          id: c.id,
          label: c.label,
          weight: c.weight,
        })),
        focus: current && processed ? [processed - 1] : [],
        roles: detailed
          ? owners.map((id, i) =>
              i >= processed
                ? "unvisited"
                : byId.get(id)?.potential
                  ? "potential"
                  : "outlier",
            )
          : [],
        analysis: {
          kind: "stream",
          phase,
          method: "DenStream",
          time: model.time ?? data.samples[0].time,
          processed,
          dimensions,
          microClusters,
          current,
          promoted,
          removed,
          removedCount,
          promotedCount,
          detailedRoles: detailed,
          decayRate: o.decayRate,
          pruneInterval: model.pruneInterval,
        },
        metric: [...r.state.metric, labelCount],
        metricName: "현재 밀도 연결 macro-cluster 수",
      },
      {
        processed,
        microClusters: microClusters.length,
        clusters: labelCount,
        removedCount,
        promotedCount,
      },
    );
  };
  emit(
    "initialize",
    "initialize",
    "원본 스트림의 모든 특성과 시각을 유지하며 DenStream CF 요약을 준비합니다.",
  );
  const init = Math.min(o.streamInitSize, data.samples.length);
  if (init > 0) {
    // The initialization batch is collected before the online clock starts;
    // its paper-defined count weights are one at the batch endpoint.
    for (let i = 0; i < init; i++)
      if (i && data.samples[i].time < data.samples[i - 1].time)
        throw new Error("DenStream 초기 시각은 감소할 수 없습니다.");
    const initialOwners = model.initialize(
      data.samples.slice(0, init).map((s) => s.values),
      data.samples[init - 1].time,
    );
    initialOwners.forEach((id, i) => (owners[i] = id));
    processed = init;
    emit(
      "insert",
      "warm-start",
      `초기 ${init}개 모두의 ε 이웃을 검사해 potential micro-cluster를 만들었습니다. 초기 배치 가중치는 종료 시각에서 개수로 정의하며 나머지는 noise입니다.`,
    );
  }
  const available = Math.max(
    0,
    DEFAULT_TRACE_BYTES -
      (r.trace.recording?.estimatedBytes ?? retainedBytes(r.state)) -
      1048576,
  );
  const checkpoints = Math.max(
    1,
    Math.min(7, Math.floor(available / Math.max(1, data.samples.length * 16))),
  );
  const stride = Math.max(1, Math.ceil(data.samples.length / checkpoints));
  for (let i = init; i < data.samples.length; i++) {
    const sample = data.samples[i],
      previousTime = model.time;
    const earlierRemoved = model.advance(sample.time, true);
    removedCount += earlierRemoved.length;
    if (detailed && earlierRemoved.length)
      emit(
        "prune",
        "prune-before-arrival",
        `유입 시각 ${sample.time} 이전에 지난 예정 pruning을 실행해 CF ${earlierRemoved.join(", ")}를 제거했습니다.`,
        undefined,
        undefined,
        earlierRemoved,
      );
    else if (
      detailed &&
      previousTime !== undefined &&
      sample.time > previousTime
    )
      emit(
        "decay",
        "decay",
        `시각 ${previousTime}→${sample.time}: CF1·CF2·가중치에 2^(−λΔt)를 적용했습니다.`,
      );
    const result = model.insert(sample.values, sample.time, (event) => {
      owners[i] = event.id;
      processed = i + 1;
      if (event.promoted) promotedCount++;
      if (detailed || i === init)
        emit(
          "insert",
          event.promoted
            ? "promote"
            : event.created
              ? "outlier-create"
              : "merge",
          `시각 ${sample.time}: 원본 ${i + 1}번째 관측을 ${event.id}번 CF에 ${event.created ? "새 outlier로 생성" : event.promoted ? "흡수하고 potential로 승격" : "흡수"}했습니다.`,
          sample.values,
          event.promoted ? event.id : undefined,
        );
    });
    removedCount += result.removed.length;
    if (detailed && result.removed.length)
      emit(
        "prune",
        "prune-after-arrival",
        `시각 ${sample.time}: 유입 처리 후 같은 tick의 pruning으로 CF ${result.removed.join(", ")}를 제거했습니다.`,
        undefined,
        undefined,
        result.removed,
      );
    if (!detailed && (i + 1) % stride === 0 && i + 1 < data.samples.length)
      emit(
        "insert",
        "checkpoint",
        `전체 ${i + 1}개를 처리한 실제 요약입니다. 누적 승격 ${promotedCount}회·제거 ${removedCount}개이며 상세 역할/개별 이벤트는 기록하지 않습니다.`,
      );
  }
  emit(
    "extract",
    "macro-extract",
    "현재 potential CF 중 자체 가중치가 μ 이상인 core에서 2ε 밀도 연결을 확장합니다. outlier와 소멸한 CF의 역사 소속은 noise입니다.",
  );
  emit(
    "finish",
    "finish",
    "전체 스트림을 실제 처리했습니다. 결과는 현재 시간의 micro/macro-cluster 요약이며 과거 전체 데이터의 정적 DBSCAN 결과가 아닙니다.",
  );
}
