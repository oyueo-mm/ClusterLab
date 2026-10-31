import type { Center, Params, Point, EventKind } from "../types";
import type { Recorder } from "../trace";
import { random, sq } from "../math";
import { shuffledOrder, prototypeError, prototypeLabels } from "./neuralgas";

export interface GasNode extends Point {
  id: number;
  error: number;
}
export interface GasEdge {
  a: number;
  b: number;
  age: number;
}
export interface GasModel {
  nodes: GasNode[];
  edges: GasEdge[];
  nextId: number;
}
type GasOptions = Pick<
  Params,
  "learningRate" | "maxAge" | "insertionInterval" | "maxNeurons"
>;
export function growingGasStep(
  model: GasModel,
  point: Point,
  o: GasOptions,
  count: number,
  onChange?: (
    kind: EventKind,
    phase: string,
    winner: number,
    ranks?: number[],
  ) => void,
) {
  const sorted = model.nodes
    .map((node) => ({ node, d: sq(node, point) }))
    .sort((a, b) => a.d - b.d || a.node.id - b.node.id);
  if (sorted.length < 2)
    throw new Error("Growing Neural Gas에는 최소 두 뉴런이 필요합니다.");
  if (sorted.some((x) => !Number.isFinite(x.d)))
    throw new Error(
      "수치 불안정: Growing Neural Gas 거리 제곱이 유한하지 않습니다.",
    );
  const winner = sorted[0].node,
    runner = sorted[1].node;
  onChange?.(
    "rank",
    "winner-and-runner",
    winner.id,
    model.nodes.map((node) =>
      sorted.findIndex((item) => item.node.id === node.id),
    ),
  );
  // Original NIPS 1995 order: age old winner edges, accumulate pre-update error,
  // adapt existing neighbors, then connect/refresh the winner-runner edge.
  const neighbors = new Set<number>();
  model.edges.forEach((edge) => {
    if (edge.a === winner.id || edge.b === winner.id) {
      edge.age++;
      neighbors.add(edge.a === winner.id ? edge.b : edge.a);
    }
  });
  winner.error += sorted[0].d;
  if (!Number.isFinite(winner.error))
    throw new Error(
      "수치 불안정: Growing Neural Gas 누적 오차가 유한하지 않습니다.",
    );
  for (const node of model.nodes) {
    const rate =
      node === winner
        ? o.learningRate
        : neighbors.has(node.id)
          ? o.learningRate * 0.03
          : 0;
    node.x = (1 - rate) * node.x + rate * point.x;
    node.y = (1 - rate) * node.y + rate * point.y;
  }
  onChange?.("prototype", "adapt-and-accumulate", winner.id);
  const edge = model.edges.find(
    (e) =>
      (e.a === winner.id && e.b === runner.id) ||
      (e.b === winner.id && e.a === runner.id),
  );
  if (edge) edge.age = 0;
  else
    model.edges.push({
      a: Math.min(winner.id, runner.id),
      b: Math.max(winner.id, runner.id),
      age: 0,
    });
  model.edges = model.edges.filter((e) => e.age <= o.maxAge);
  const connected = new Set(model.edges.flatMap((e) => [e.a, e.b]));
  model.nodes = model.nodes.filter((node) => connected.has(node.id));
  onChange?.("connect", "refresh-and-prune", winner.id);
  if (count % o.insertionInterval === 0 && model.nodes.length < o.maxNeurons) {
    const q = model.nodes.reduce((a, b) => (b.error > a.error ? b : a));
    const ids = new Set(
      model.edges
        .filter((e) => e.a === q.id || e.b === q.id)
        .map((e) => (e.a === q.id ? e.b : e.a)),
    );
    const adjacent = model.nodes.filter((node) => ids.has(node.id));
    const f = adjacent.reduce((a, b) => (b.error > a.error ? b : a));
    q.error *= 0.5;
    f.error *= 0.5;
    const inserted: GasNode = {
      id: model.nextId++,
      x: q.x / 2 + f.x / 2,
      y: q.y / 2 + f.y / 2,
      error: q.error,
    };
    model.edges = model.edges.filter(
      (e) =>
        !((e.a === q.id && e.b === f.id) || (e.a === f.id && e.b === q.id)),
    );
    model.nodes.push(inserted);
    model.edges.push(
      {
        a: Math.min(q.id, inserted.id),
        b: Math.max(q.id, inserted.id),
        age: 0,
      },
      {
        a: Math.min(f.id, inserted.id),
        b: Math.max(f.id, inserted.id),
        age: 0,
      },
    );
    onChange?.("insert", "error-driven-insertion", winner.id);
  }
  model.nodes.forEach((node) => {
    node.error *= 0.995;
  });
  onChange?.("prototype", "error-decay", winner.id);
  return winner.id;
}
export function growingneuralgas(p: Point[], o: Params, r: Recorder) {
  if (
    !Number.isInteger(o.epochs) ||
    o.epochs < 1 ||
    !Number.isInteger(o.maxNeurons) ||
    o.maxNeurons < 2 ||
    !Number.isInteger(o.maxAge) ||
    o.maxAge < 0 ||
    !Number.isInteger(o.insertionInterval) ||
    o.insertionInterval < 1 ||
    !(o.learningRate > 0 && o.learningRate <= 1)
  )
    throw new Error(
      "Growing Neural Gas 파라미터 오류: epoch/삽입 간격, 뉴런 한도, 간선 나이, 학습률을 확인하세요.",
    );
  const rng = random(o.seed),
    initial = shuffledOrder(p.length, rng).slice(0, 2);
  const model: GasModel = {
    nodes: initial.map((i, id) => ({ id, x: p[i].x, y: p[i].y, error: 0 })),
    edges: [],
    nextId: 2,
  };
  const patch = (phase: string) => {
    const index = new Map(model.nodes.map((node, i) => [node.id, i]));
    const edgeAges = model.edges.map((e) => ({
      a: index.get(e.a)!,
      b: index.get(e.b)!,
      age: e.age,
    }));
    return {
      centers: model.nodes.map(({ id, x, y }): Center => ({ id, x, y })),
      edges: edgeAges.map(({ a, b }) => ({ a, b })),
      analysis: {
        kind: "neural-gas" as const,
        phase,
        ranks: [],
        errors: model.nodes.map((node) => node.error),
        edgeAges,
      },
    };
  };
  r.emit(
    "initialize",
    "시드로 두 원본 관측점에서 뉴런을 초기화합니다. 연결 집합은 비어 있습니다.",
    patch("initialize"),
  );
  let count = 0;
  for (let epoch = 0; epoch < o.epochs; epoch++) {
    for (const i of shuffledOrder(p.length, rng)) {
      count++;
      growingGasStep(model, p[i], o, count, (kind, phase, winnerId, ranks) => {
        const winner = model.nodes.findIndex((node) => node.id === winnerId);
        const snapshot = patch(phase);
        const descriptions: Record<string, string> = {
          "winner-and-runner":
            "실제 거리를 정렬해 가장 가까운 두 뉴런을 찾습니다.",
          "adapt-and-accumulate":
            "기존 승자 간선의 나이를 늘리고 제곱 오차를 누적한 뒤 승자·기존 이웃을 이동합니다.",
          "refresh-and-prune":
            "승자와 2등 뉴런 간선을 생성·갱신하고 오래된 간선 및 고립 뉴런을 삭제합니다.",
          "error-driven-insertion":
            "최대 누적 오차 뉴런과 최대 오차 이웃 사이에 중점 뉴런을 삽입합니다.",
          "error-decay": "모든 국소 오차에 고정 감소 계수 0.995를 적용합니다.",
        };
        r.emit(
          kind,
          descriptions[phase],
          {
            ...snapshot,
            ...(ranks ? { analysis: { ...snapshot.analysis, ranks } } : {}),
            focus: [i],
            learning: { winner, radius: 0, rate: o.learningRate },
          },
          { step: count, nodes: model.nodes.length, edges: model.edges.length },
          kind === "rank" ? 130 : 240,
        );
      });
    }
    const error = prototypeError(p, model.nodes);
    r.emit(
      "prototype",
      `${epoch + 1} epoch: 전체 데이터 평균 제곱 양자화 오차`,
      {
        metric: [...r.state.metric, error],
        metricName: "Mean squared quantization error",
      },
      { error },
    );
  }
  r.emit(
    "finish",
    "학습 종료. 색은 최근접 뉴런 BMU입니다. 연결 성분의 군집 추출을 수행한 결과가 아닙니다.",
    { ...patch("finish"), labels: prototypeLabels(p, model.nodes), focus: [] },
  );
}
