/** Original-feature operations shared by native numerical engines, never display xy. */
export function ndSquared(a: number[], b: number[]): number {
  let value = 0,
    different = false;
  for (let j = 0; j < a.length; j++) {
    const delta = a[j] - b[j];
    different ||= delta !== 0;
    value += delta * delta;
  }
  if (!Number.isFinite(value) || (different && value === 0))
    throw new Error(
      "수치 불안정: 원본 제곱거리 overflow/underflow. 좌표 스케일을 조정하세요.",
    );
  return value;
}
export function ndMean(x: number[][], rows: number[]): number[] {
  if (!rows.length) throw new Error("빈 원본 평균은 정의되지 않습니다.");
  const anchor = x[rows[0]];
  return anchor.map((v, j) => {
    let offset = 0;
    for (const i of rows) offset += (x[i][j] - v) / rows.length;
    const result = v + offset;
    if (!Number.isFinite(result))
      throw new Error("수치 불안정: 원본 평균이 유한하지 않습니다.");
    return result;
  });
}
export function ndBounds(x: number[][]): [number, number][] {
  return x[0].map((_, j) => {
    let lo = Infinity,
      hi = -Infinity;
    for (const row of x) {
      lo = Math.min(lo, row[j]);
      hi = Math.max(hi, row[j]);
    }
    if (!Number.isFinite(hi - lo))
      throw new Error("수치 불안정: 원본 좌표 범위 overflow.");
    return [lo, hi];
  });
}
export function projectedCenters(
  centroids: number[][],
  bounds: [number, number][],
  axes: [number, number] = [0, 1],
) {
  const project = (row: number[], axis: number) => {
    const j = Math.max(0, Math.min(axis, bounds.length - 1)),
      [lo, hi] = bounds[j];
    return 0.1 + (0.8 * (row[j] - lo)) / (hi - lo || 1);
  };
  return centroids.map((row, id) => ({
    x: project(row, axes[0]),
    y: project(row, axes[1]),
    id,
  }));
}
