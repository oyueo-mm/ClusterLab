import type { Dataset } from "../dataset";
import type { Point, Params } from "../types";
import { random } from "../math";

export function dataParams(o: Params) {
  if (
    !Number.isSafeInteger(o.k) ||
    o.k < 1 ||
    !Number.isSafeInteger(o.iterations) ||
    o.iterations < 1 ||
    !Number.isSafeInteger(o.seed)
  )
    throw new Error("K와 반복 수는 양의 정수, 시드는 유한 정수여야 합니다.");
}
export function categoricalRows(points: Point[], input?: Dataset) {
  const rows =
    input?.kind === "categorical"
      ? input.values
      : input
        ? undefined
        : points.map((p) => p.features);
  if (
    !rows ||
    rows.length !== points.length ||
    !rows.length ||
    !rows[0]?.length ||
    rows.some(
      (r) =>
        !r ||
        r.length !== rows[0]!.length ||
        r.some((v) => typeof v !== "string"),
    )
  )
    throw new Error(
      "K-Modes에는 모든 행의 실제 범주형 문자열 속성이 필요합니다. 좌표를 범주로 추정하지 않습니다.",
    );
  return rows as string[][];
}
export function mixedRows(points: Point[], input?: Dataset) {
  const numeric =
    input?.kind === "mixed"
      ? input.numeric
      : input
        ? undefined
        : points.map((p) => [p.x, p.y]);
  const categorical =
    input?.kind === "mixed"
      ? input.categorical
      : input
        ? undefined
        : points.map((p) => p.features);
  if (
    !numeric ||
    !categorical ||
    numeric.length !== points.length ||
    categorical.length !== points.length ||
    !numeric.length ||
    !numeric[0]?.length ||
    !categorical[0]?.length ||
    numeric.some(
      (r) =>
        r.length !== numeric[0].length || r.some((v) => !Number.isFinite(v)),
    ) ||
    categorical.some(
      (r) =>
        !r ||
        r.length !== categorical[0]!.length ||
        r.some((v) => typeof v !== "string"),
    )
  )
    throw new Error(
      "K-Prototypes에는 같은 행 수의 유한 수치형·실제 범주형 문자열 원본이 필요합니다.",
    );
  return { numeric, categorical: categorical as string[][] };
}
export function mismatch(a: string[], b: string[]) {
  return a.reduce((s, v, j) => s + Number(v !== b[j]), 0);
}
export function squared(a: number[], b: number[]) {
  const value = a.reduce((s, v, j) => s + (v - b[j]) ** 2, 0);
  if (!Number.isFinite(value))
    throw new Error(
      "수치 불안정: 원본 제곱거리가 유한하지 않습니다. 스케일을 조정하세요.",
    );
  return value;
}
export function chooseDistinct<T>(
  rows: T[],
  k: number,
  seed: number,
  key: (r: T) => string,
) {
  const unique: number[] = [];
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const s = key(r);
    if (!seen.has(s)) {
      seen.add(s);
      unique.push(i);
    }
  });
  const rng = random(seed);
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  return unique.slice(0, Math.min(k, unique.length));
}
export function frequencies(rows: string[][], labels: number[], k: number) {
  const maps = Array.from({ length: k }, () =>
    Array.from({ length: rows[0].length }, () => new Map<string, number>()),
  );
  rows.forEach((r, i) =>
    r.forEach((v, j) => {
      const m = maps[labels[i]][j];
      m.set(v, (m.get(v) ?? 0) + 1);
    }),
  );
  return maps;
}
export function modes(rows: string[][], labels: number[], old: string[][]) {
  const maps = frequencies(rows, labels, old.length);
  const centers = maps.map((attributes, c) =>
    attributes.map((counts, j) => {
      if (!counts.size) return old[c][j];
      // Preserve the previous mode on a frequency tie, then use code-point order.
      let largest = 0;
      counts.forEach((n) => {
        largest = Math.max(largest, n);
      });
      if (counts.get(old[c][j]) === largest) return old[c][j];
      return [...counts]
        .filter(([, n]) => n === largest)
        .map(([v]) => v)
        .sort()[0];
    }),
  );
  const table = maps.flatMap((attributes, cluster) =>
    attributes.flatMap((m, attribute) =>
      [...m]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([value, count]) => ({ cluster, attribute, value, count })),
    ),
  );
  return { centers, table };
}
export function displayCenters(points: Point[], labels: number[], k: number) {
  return Array.from({ length: k }, (_, id) => {
    const members = labels
      .map((label, i) => (label === id ? i : -1))
      .filter((i) => i >= 0);
    return {
      x: members.length
        ? members.reduce((s, i) => s + points[i].x / members.length, 0)
        : points[0].x,
      y: members.length
        ? members.reduce((s, i) => s + points[i].y / members.length, 0)
        : points[0].y,
      id,
      label: id,
    };
  });
}
