import type { Dataset } from "../dataset";
import type { Params, Point } from "../types";
import type { Recorder } from "../trace";
import type { MatrixAnalysis, Bicluster } from "../matrixTypes";
import { DEFAULT_WORKING_BYTES } from "../resources";
import { biclusterMemberships, matrixRows } from "./matrixCommon";

interface Frame {
  rows: number[];
  columns: number[];
  constraints: number[][];
}
/** Original Bimax GU/GV/GW divide-and-conquer with admissibility sets Z. */
export function bimax(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  const values = matrixRows(points, input),
    n = values.length,
    m = values[0].length;
  if (values.some((row) => row.some((v) => v !== 0 && v !== 1)))
    throw new Error(
      "Bimax는 실제 0/1 이진 행렬만 받습니다. 수치를 자동 임계값으로 바꾸지 않습니다.",
    );
  if (
    !Number.isSafeInteger(o.minSize) ||
    o.minSize < 1 ||
    !Number.isSafeInteger(o.minPts) ||
    o.minPts < 1
  )
    throw new Error("Bimax 최소 행 수·열 수는 양의 정수여야 합니다.");
  const stack: Frame[] = [
    {
      rows: Array.from({ length: n }, (_, i) => i),
      columns: Array.from({ length: m }, (_, j) => j),
      constraints: [],
    },
  ];
  let stackBytes = stack[0].rows.length * 8 + stack[0].columns.length * 8 + 128,
    calls = 0;
  const biclusters: Bicluster[] = [],
    seen = new Set<string>();
  const size = (f: Frame) =>
    128 +
    (f.rows.length +
      f.columns.length +
      f.constraints.reduce((s, c) => s + c.length, 0)) *
      8;
  const push = (frame: Frame) => {
    stackBytes += size(frame);
    if (stackBytes + n * m * 32 > DEFAULT_WORKING_BYTES)
      throw new Error(
        "Bimax 재귀 스택의 메모리 예산을 초과했습니다. 완료 결과가 아닙니다.",
      );
    stack.push(frame);
  };
  const meta = (
    phase: string,
    frame: Frame,
    extra: Partial<MatrixAnalysis> = {},
  ): MatrixAnalysis => {
    const membership = biclusterMemberships(n, m, biclusters);
    return {
      kind: "biclustering",
      method: "Bimax",
      phase,
      values,
      selectedRows: frame.rows,
      selectedColumns: frame.columns,
      biclusters,
      rowMemberships: membership.rows,
      columnMemberships: membership.columns,
      constraints: frame.constraints,
      calls,
      ...extra,
    };
  };
  r.trace.recording!.policy =
    "원래 Bimax의 GU/GV/GW·CU/CV·Z admissibility 분할정복. 실제 모든 inclusion-maximal 1-부분행렬을 반환하며 개수로 조용히 자르지 않음.";
  r.emit(
    "initialize",
    "실제 이진 행렬에서 모든 행·열을 시작 집합으로 사용합니다. 결과는 중첩 가능한 행 집합과 열 집합입니다.",
    { analysis: meta("initialize", stack[0]) },
  );
  while (stack.length) {
    const frame = stack.pop()!;
    stackBytes -= size(frame);
    calls++;
    if (!frame.rows.length || !frame.columns.length) continue;
    const ones = new Map(
      frame.rows.map((i) => [
        i,
        frame.columns.filter((j) => values[i][j] === 1),
      ]),
    );
    const rows = frame.rows.filter(
      (i) =>
        ones.get(i)!.length > 0 &&
        frame.constraints.every((set) =>
          ones.get(i)!.some((j) => set.includes(j)),
        ),
    );
    if (
      !rows.length ||
      rows.length < o.minSize ||
      frame.columns.length < o.minPts
    )
      continue;
    const current = { ...frame, rows };
    r.emit(
      "prune",
      "현재 열 안에 1이 없거나 Z의 각 필수 열 집합과 만나는 1이 없는 행을 실제 reduce 규칙으로 제거합니다.",
      { focus: rows, analysis: meta("reduce", current) },
      { calls, rows: rows.length, columns: frame.columns.length },
    );
    if (rows.every((i) => ones.get(i)!.length === frame.columns.length)) {
      const sortedRows = [...rows].sort((a, b) => a - b),
        columns = [...frame.columns].sort((a, b) => a - b),
        key = `${sortedRows}|${columns}`;
      if (!seen.has(key)) {
        // Correctness audit: output must be globally inclusion-maximal in the original matrix.
        if (
          Array.from({ length: n }, (_, i) => i).some(
            (i) =>
              !sortedRows.includes(i) &&
              columns.every((j) => values[i][j] === 1),
          ) ||
          Array.from({ length: m }, (_, j) => j).some(
            (j) =>
              !columns.includes(j) &&
              sortedRows.every((i) => values[i][j] === 1),
          )
        )
          throw new Error(
            "Bimax 내부 검증 실패: 포함 관계 최대성이 성립하지 않습니다.",
          );
        seen.add(key);
        biclusters.push({
          id: biclusters.length,
          rows: sortedRows,
          columns,
          residue: 0,
          originalResidue: 0,
        });
        const membership = biclusterMemberships(n, m, biclusters);
        r.emit(
          "extract",
          "선택한 모든 셀이 1이고 원본에서 더 확장할 행·열이 없는 실제 inclusion-maximal bicluster를 반환합니다.",
          {
            labels: membership.labels,
            analysis: meta("maximal-bicluster", current),
          },
          {
            biclusters: biclusters.length,
            cells: rows.length * columns.length,
          },
        );
      }
      continue;
    }
    const pivot = rows.find((i) => ones.get(i)!.length < frame.columns.length)!;
    const uColumns = ones.get(pivot)!,
      uSet = new Set(uColumns),
      vColumns = frame.columns.filter((j) => !uSet.has(j));
    const uRows: number[] = [],
      vRows: number[] = [],
      wRows: number[] = [];
    rows.forEach((i) => {
      const cols = ones.get(i)!;
      if (cols.every((j) => uSet.has(j))) uRows.push(i);
      else if (cols.every((j) => !uSet.has(j))) vRows.push(i);
      else wRows.push(i);
    });
    const split = { uRows, vRows, wRows, uColumns, vColumns };
    r.emit(
      "split",
      "실제 pivot 행의 1/0 열로 CU/CV를 나누고 행을 GU/GV/GW로 분할합니다. V 경로에는 CV를 만나는 bicluster만 허용하는 Z 제약을 추가합니다.",
      { analysis: meta("divide", current, { split }), focus: [pivot] },
      {
        pivot: pivot + 1,
        uRows: uRows.length,
        vRows: vRows.length,
        wRows: wRows.length,
      },
    );
    // Push V first so the iterative stack preserves original U-before-V traversal.
    if (!wRows.length && vRows.length)
      push({ rows: vRows, columns: vColumns, constraints: frame.constraints });
    else if (wRows.length)
      push({
        rows: [...wRows, ...vRows],
        columns: frame.columns,
        constraints: [...frame.constraints, vColumns],
      });
    if (uRows.length)
      push({
        rows: [...uRows, ...wRows],
        columns: uColumns,
        constraints: frame.constraints,
      });
  }
  const membership = biclusterMemberships(n, m, biclusters),
    frame = {
      rows: biclusters[0]?.rows ?? [],
      columns: biclusters[0]?.columns ?? [],
      constraints: [],
    };
  r.emit(
    "finish",
    "분할정복을 모두 마쳤습니다. 요청 최소 크기를 만족하는 모든 inclusion-maximal 1-부분행렬과 원본 행·열의 중첩 소속을 반환합니다. Canvas 레이블은 첫 행 소속의 표시 요약입니다.",
    { labels: membership.labels, analysis: meta("finish", frame), focus: [] },
    { biclusters: biclusters.length, calls },
  );
}
