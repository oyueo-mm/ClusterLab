import type { Dataset } from "../dataset";
import type { Point } from "../types";
import type { Bicluster } from "../matrixTypes";
import { DEFAULT_WORKING_BYTES } from "../resources";

export function matrixRows(points: Point[], input?: Dataset) {
  if (input?.kind !== "matrix")
    throw new Error(
      "이중군집화는 실제 행·열 MatrixDataset 원본이 필요합니다. 2D 좌표를 행렬 데이터로 임의 대체하지 않습니다.",
    );
  const values = input.values,
    n = values.length,
    m = values[0]?.length ?? 0;
  if (
    n !== points.length ||
    !n ||
    !m ||
    values.some(
      (row) => row.length !== m || row.some((v) => !Number.isFinite(v)),
    )
  )
    throw new Error(
      "행렬은 비어 있지 않은 직사각형 유한 숫자 배열이어야 합니다.",
    );
  if (n * m * 64 > DEFAULT_WORKING_BYTES)
    throw new Error(
      `행렬 작업 메모리 예산 초과: 원본/작업 행렬 추정 ${((n * m * 64) / 1048576).toFixed(1)} MiB. 입력을 잘라 계산하지 않았습니다.`,
    );
  return values;
}
export function biclusterMemberships(
  n: number,
  m: number,
  biclusters: Bicluster[],
) {
  const rows = Array.from({ length: n }, () => [] as number[]),
    columns = Array.from({ length: m }, () => [] as number[]);
  biclusters.forEach((b) => {
    b.rows.forEach((i) => rows[i].push(b.id));
    b.columns.forEach((j) => columns[j].push(b.id));
  });
  return { rows, columns, labels: rows.map((ids) => ids[0] ?? -1) };
}
export function meanSquaredResidue(
  values: number[][],
  rows: number[],
  columns: number[],
  rowSigns?: number[],
) {
  if (!rows.length || !columns.length)
    throw new Error(
      "평균 제곱 잔차에는 비어 있지 않은 행·열 집합이 필요합니다.",
    );
  const signed = (i: number, j: number) => (rowSigns?.[i] ?? 1) * values[i][j];
  const rowMeans = rows.map((i) =>
    columns.reduce((s, j) => s + signed(i, j) / columns.length, 0),
  );
  const columnMeans = columns.map((j) =>
    rows.reduce((s, i) => s + signed(i, j) / rows.length, 0),
  );
  const grandMean = rowMeans.reduce((s, v) => s + v / rows.length, 0);
  const rowResidues = rows.map(() => 0),
    columnResidues = columns.map(() => 0);
  let residue = 0;
  rows.forEach((i, a) =>
    columns.forEach((j, b) => {
      const square =
        (signed(i, j) - rowMeans[a] - columnMeans[b] + grandMean) ** 2;
      if (!Number.isFinite(square))
        throw new Error(
          "수치 불안정: 행렬 잔차 제곱이 유한하지 않습니다. 원본 스케일을 조정하세요.",
        );
      rowResidues[a] += square / columns.length;
      columnResidues[b] += square / rows.length;
      residue += square / rows.length / columns.length;
    }),
  );
  if (!Number.isFinite(residue))
    throw new Error("수치 불안정: 전체 평균 제곱 잔차가 유한하지 않습니다.");
  return {
    residue,
    rowMeans,
    columnMeans,
    grandMean,
    rowResidues,
    columnResidues,
  };
}
