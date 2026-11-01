import { numericRows, type Dataset } from "../dataset";
import type { Point, Params } from "../types";
import type { Recorder } from "../trace";
import type { DataAnalysis, DenseUnit, SubspaceCluster } from "../dataTypes";
import { DEFAULT_WORKING_BYTES } from "../resources";

const unitKey = (dimensions: number[], coordinates: number[]) =>
  `${dimensions.join(",")}|${coordinates.join(",")}`;
const lex = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
};
function memory(units: number, members: number, dimensions: number) {
  const bytes = units * (128 + dimensions * 32) + members * 16;
  if (!Number.isFinite(bytes) || bytes > DEFAULT_WORKING_BYTES)
    throw new Error(
      `CLIQUE 메모리 예산 초과: 현재 후보·격자·소속 추정 ${(bytes / 1048576).toFixed(1)} MiB. 탐색 차원/격자 설정을 줄이세요. 원본 점을 버리지 않았습니다.`,
    );
}
/** Grow maximal boxes, then remove redundant ones: a nonredundant cover, not minimum cardinality. */
export function cliqueRegions(cells: number[][]) {
  const occupied = new Set(cells.map((c) => c.join(","))),
    covered = new Set<string>();
  const boxes: { low: number[]; high: number[] }[] = [];
  const enumerate = (low: number[], high: number[]) => {
    const result: string[] = [];
    const visit = (prefix: number[], axis: number) => {
      if (axis === low.length) {
        result.push(prefix.join(","));
        return;
      }
      for (let v = low[axis]; v <= high[axis]; v++)
        visit([...prefix, v], axis + 1);
    };
    visit([], 0);
    return result;
  };
  for (const cell of cells) {
    if (covered.has(cell.join(","))) continue;
    const low = [...cell],
      high = [...cell];
    for (let axis = 0; axis < cell.length; axis++)
      for (const sign of [-1, 1]) {
        while (true) {
          const nextLow = [...low],
            nextHigh = [...high];
          if (sign < 0) nextLow[axis]--;
          else nextHigh[axis]++;
          const keys = enumerate(nextLow, nextHigh);
          if (!keys.every((k) => occupied.has(k))) break;
          low[axis] = nextLow[axis];
          high[axis] = nextHigh[axis];
        }
      }
    const box = { low, high };
    boxes.push(box);
    enumerate(low, high).forEach((k) => covered.add(k));
  }
  // Original removal heuristic: remove a box if the others still cover its cells.
  for (let i = boxes.length - 1; i >= 0; i--) {
    const other = new Set(
      boxes.flatMap((b, j) => (j === i ? [] : enumerate(b.low, b.high))),
    );
    if (enumerate(boxes[i].low, boxes[i].high).every((k) => other.has(k)))
      boxes.splice(i, 1);
  }
  return boxes;
}

/** Unpruned dense-unit CLIQUE, with an explicit requested maximum subspace dimension. */
export function clique(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  const rows = numericRows(points, input),
    n = rows.length,
    d = rows[0]?.length ?? 0;
  if (
    n !== points.length ||
    n < 2 ||
    !d ||
    rows.some((row) => row.length !== d || row.some((v) => !Number.isFinite(v)))
  )
    throw new Error(
      "CLIQUE에는 두 개 이상의 같은 차원 유한 원본 벡터가 필요합니다.",
    );
  if (
    !Number.isSafeInteger(o.gridBins) ||
    o.gridBins < 1 ||
    !Number.isFinite(o.densityThreshold) ||
    o.densityThreshold < 0 ||
    o.densityThreshold >= 1 ||
    !Number.isSafeInteger(o.subspaceDimensions) ||
    o.subspaceDimensions < 1
  )
    throw new Error(
      "CLIQUE: 격자 수·최대 탐색 차원은 양의 정수, 밀도 비율은 0 이상 1 미만이어야 합니다.",
    );
  memory(n, n * d, d);
  const min = Array(d).fill(Infinity) as number[],
    max = Array(d).fill(-Infinity) as number[];
  rows.forEach((row) =>
    row.forEach((v, j) => {
      min[j] = Math.min(min[j], v);
      max[j] = Math.max(max[j], v);
    }),
  );
  const bins = rows.map((row) =>
    row.map((v, j) => {
      const width = max[j] - min[j];
      if (!Number.isFinite(width))
        throw new Error("수치 불안정: CLIQUE 특성 범위가 유한하지 않습니다.");
      // Last interval includes the observed maximum; constant dimensions have one occupied bin.
      return width === 0
        ? 0
        : Math.min(
            o.gridBins - 1,
            Math.floor(((v - min[j]) / width) * o.gridBins),
          );
    }),
  );
  const maxDimension = Math.min(d, o.subspaceDimensions);
  let previous: DenseUnit[] = [],
    all: DenseUnit[] = [],
    subspaces: SubspaceCluster[] = [],
    memberships = rows.map(() => [] as number[]);
  let retainedMembers = 0,
    exploredDimensions = 0;
  const analysis = (
    phase: string,
    exploredDimensions: number,
  ): DataAnalysis => ({
    kind: "data-clustering",
    method: "CLIQUE",
    phase,
    dimensions: d,
    units: all,
    subspaces,
    bounds: { min, max },
    gridBins: o.gridBins,
    densityThreshold: o.densityThreshold,
    exploredDimensions,
    memberships,
  });
  r.trace.recording!.policy = `전체 ${d}차원 원본에서 최대 ${maxDimension}차원까지 unpruned Apriori 밀집 격자 탐색. 전체 부분공간 소속을 보존하며 Canvas 레이블은 대표 소속만 표시.`;
  r.emit(
    "initialize",
    "원본 모든 특성의 범위를 같은 개수 구간으로 나눕니다. 마지막 구간은 관측 최댓값을 포함합니다.",
    { analysis: analysis("grid-initialize", 0) },
  );
  for (let level = 1; level <= maxDimension; level++) {
    const candidates = new Map<string, DenseUnit>();
    const add = (dimensions: number[], coordinates: number[]) => {
      const key = unitKey(dimensions, coordinates);
      if (!candidates.has(key)) {
        memory(
          all.length + candidates.size + 1,
          retainedMembers + n * d,
          level,
        );
        candidates.set(key, { dimensions, coordinates, count: 0, members: [] });
      }
    };
    if (level === 1)
      bins.forEach((row) =>
        row.forEach((coordinate, j) => add([j], [coordinate])),
      );
    else {
      const prior = new Set(
        previous.map((u) => unitKey(u.dimensions, u.coordinates)),
      );
      for (let a = 0; a < previous.length; a++)
        for (let b = a + 1; b < previous.length; b++) {
          const x = previous[a],
            y = previous[b],
            last = level - 2;
          if (
            x.dimensions[last] >= y.dimensions[last] ||
            !x.dimensions
              .slice(0, last)
              .every(
                (v, j) =>
                  v === y.dimensions[j] &&
                  x.coordinates[j] === y.coordinates[j],
              )
          )
            continue;
          const dimensions = [...x.dimensions, y.dimensions[last]],
            coordinates = [...x.coordinates, y.coordinates[last]];
          if (
            dimensions.every((_, drop) =>
              prior.has(
                unitKey(
                  dimensions.filter((_, j) => j !== drop),
                  coordinates.filter((_, j) => j !== drop),
                ),
              ),
            )
          )
            add(dimensions, coordinates);
        }
    }
    if (!candidates.size) break;
    const groups = new Map<
      string,
      { dimensions: number[]; units: Map<string, DenseUnit> }
    >();
    candidates.forEach((u) => {
      const key = u.dimensions.join(",");
      if (!groups.has(key))
        groups.set(key, { dimensions: u.dimensions, units: new Map() });
      groups.get(key)!.units.set(u.coordinates.join(","), u);
    });
    for (const group of groups.values())
      bins.forEach((row, i) => {
        const unit = group.units.get(
          group.dimensions.map((j) => row[j]).join(","),
        );
        if (unit) {
          unit.count++;
          unit.members.push(i);
          retainedMembers++;
          memory(all.length + candidates.size, retainedMembers + n * d, level);
        }
      });
    exploredDimensions = level;
    const dense = [...candidates.values()]
      .filter((u) => u.count / n > o.densityThreshold)
      .sort(
        (a, b) =>
          lex(a.dimensions, b.dimensions) || lex(a.coordinates, b.coordinates),
      );
    retainedMembers -= [...candidates.values()]
      .filter((u) => u.count / n <= o.densityThreshold)
      .reduce((s, u) => s + u.members.length, 0);
    const offset = all.length;
    all = [...all, ...dense];
    const denseGroups = new Map<string, number[]>();
    dense.forEach((u, i) => {
      const key = u.dimensions.join(",");
      if (!denseGroups.has(key)) denseGroups.set(key, []);
      denseGroups.get(key)!.push(offset + i);
    });
    for (const ids of denseGroups.values()) {
      const lookup = new Map(ids.map((i) => [all[i].coordinates.join(","), i])),
        visited = new Set<number>();
      for (const start of ids) {
        if (visited.has(start)) continue;
        const queue = [start],
          component: number[] = [];
        visited.add(start);
        for (let head = 0; head < queue.length; head++) {
          const id = queue[head];
          component.push(id);
          all[id].coordinates.forEach((_, axis) => {
            for (const sign of [-1, 1]) {
              const coord = [...all[id].coordinates];
              coord[axis] += sign;
              const next = lookup.get(coord.join(","));
              if (next !== undefined && !visited.has(next)) {
                visited.add(next);
                queue.push(next);
              }
            }
          });
        }
        const members = [
          ...new Set(component.flatMap((i) => all[i].members)),
        ].sort((a, b) => a - b);
        const cluster: SubspaceCluster = {
          id: subspaces.length,
          dimensions: all[start].dimensions,
          members,
          units: component,
          regions: cliqueRegions(component.map((i) => all[i].coordinates)),
        };
        subspaces = [...subspaces, cluster];
        members.forEach((i) => memberships[i].push(cluster.id));
      }
    }
    r.emit(
      "grid",
      `${level}차원 후보 ${candidates.size}개를 전체 원본에서 계수해 selectivity > τ인 밀집 격자 ${dense.length}개를 찾았습니다.`,
      { analysis: analysis("dense-units", level) },
      {
        candidateUnits: candidates.size,
        denseUnits: dense.length,
        subspaceClusters: subspaces.length,
      },
    );
    r.emit(
      "dimension",
      "같은 부분공간에서 면을 공유하는 밀집 격자들을 연결하고 중복 제거한 최대 직사각형 DNF cover를 구성합니다.",
      { analysis: analysis("subspace-components", level) },
      { subspaceClusters: subspaces.length },
    );
    previous = dense;
    if (!dense.length) break;
  }
  memberships = memberships.map((ids) =>
    [...ids].sort(
      (a, b) =>
        subspaces[b].dimensions.length - subspaces[a].dimensions.length ||
        a - b,
    ),
  );
  const labels = memberships.map((ids) => ids[0] ?? -1);
  r.emit(
    "finish",
    "부분공간별 모든 중첩 소속·밀집 격자·비중복 DNF cover를 반환합니다. Canvas는 가장 높은 차원의 첫 소속만 표시하며 단일 partition이 전체 결과가 아닙니다.",
    {
      labels,
      analysis: analysis("finish", exploredDimensions),
      focus: [],
      centers: [],
    },
    {
      subspaceClusters: subspaces.length,
      noise: labels.filter((v) => v < 0).length,
    },
  );
}
