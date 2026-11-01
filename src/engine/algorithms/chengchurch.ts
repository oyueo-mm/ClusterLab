import type { Dataset } from "../dataset";
import type { Point, Params } from "../types";
import type { Recorder } from "../trace";
import type { MatrixAnalysis, Bicluster } from "../matrixTypes";
import { random } from "../math";
import {
  biclusterMemberships,
  matrixRows,
  meanSquaredResidue,
} from "./matrixCommon";

/** Cheng–Church MSR deletion/addition, optional inverse rows, and seeded masking. */
export function chengchurch(
  points: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) {
  const values = matrixRows(points, input),
    n = values.length,
    m = values[0].length;
  if (
    !Number.isFinite(o.residueThreshold) ||
    o.residueThreshold < 0 ||
    !Number.isSafeInteger(o.biclusterCount) ||
    o.biclusterCount < 1 ||
    !Number.isFinite(o.deletionThreshold) ||
    o.deletionThreshold <= 1 ||
    !["allow", "none"].includes(o.inversion) ||
    !Number.isSafeInteger(o.seed)
  )
    throw new Error(
      "Cheng–Church: δ≥0, bicluster 탐색 수는 양의 정수, 삭제 배수 α>1, 유효한 inverse 옵션·시드가 필요합니다.",
    );
  const workingValues = values.map((row) => [...row]),
    rng = random(o.seed);
  let low = Infinity,
    high = -Infinity;
  values.forEach((row) =>
    row.forEach((v) => {
      low = Math.min(low, v);
      high = Math.max(high, v);
    }),
  );
  const range = high - low;
  if (!Number.isFinite(range))
    throw new Error(
      "수치 불안정: 마스킹 범위가 유한하지 않습니다. 원본 스케일을 조정하세요.",
    );
  const biclusters: Bicluster[] = [],
    seen = new Set<string>();
  let scoreSource: "original" | "working" = "original";
  let selectedRows = Array.from({ length: n }, (_, i) => i),
    selectedColumns = Array.from({ length: m }, (_, j) => j),
    rowSigns = Array(n).fill(1) as number[];
  let stats = meanSquaredResidue(
    values,
    selectedRows,
    selectedColumns,
    rowSigns,
  );
  const meta = (
    phase: string,
    extra: Partial<MatrixAnalysis> = {},
  ): MatrixAnalysis => {
    const membership = biclusterMemberships(n, m, biclusters);
    return {
      kind: "biclustering",
      method: "Cheng–Church Biclustering",
      phase,
      values,
      workingValues,
      scoreSource,
      selectedRows,
      selectedColumns,
      rowSigns,
      biclusters,
      rowMemberships: membership.rows,
      columnMemberships: membership.columns,
      ...stats,
      ...extra,
    };
  };
  const emitStats = (phase: string, description: string) =>
    r.emit(
      "residue",
      description,
      { analysis: meta(phase), focus: [] },
      {
        residue: stats.residue,
        rows: selectedRows.length,
        columns: selectedColumns.length,
      },
    );
  const singleDelete = (matrix: number[][], phase: string) => {
    stats = meanSquaredResidue(matrix, selectedRows, selectedColumns, rowSigns);
    while (stats.residue > o.residueThreshold) {
      let ri = -1,
        cj = -1;
      if (selectedRows.length > 1)
        stats.rowResidues.forEach((score, i) => {
          if (ri < 0 || score > stats.rowResidues[ri]) ri = i;
        });
      if (selectedColumns.length > 1)
        stats.columnResidues.forEach((score, j) => {
          if (cj < 0 || score > stats.columnResidues[cj]) cj = j;
        });
      if (ri < 0 && cj < 0)
        throw new Error(
          "잔차 허용오차를 만족할 수 없는 수치 상태입니다. 완료 결과가 아닙니다.",
        );
      const removeRow =
        ri >= 0 &&
        (cj < 0 || stats.rowResidues[ri] >= stats.columnResidues[cj]);
      const index = removeRow ? selectedRows[ri] : selectedColumns[cj],
        before = stats.residue;
      if (removeRow) selectedRows = selectedRows.filter((_, i) => i !== ri);
      else selectedColumns = selectedColumns.filter((_, j) => j !== cj);
      stats = meanSquaredResidue(
        matrix,
        selectedRows,
        selectedColumns,
        rowSigns,
      );
      r.emit(
        "prune",
        `실제 ${removeRow ? "행" : "열"} 잔차가 가장 큰 ${index + 1}번을 한 개 제거하고 전체 MSR을 다시 계산합니다.`,
        { analysis: meta(phase), focus: removeRow ? [index] : [] },
        {
          residue: stats.residue,
          before,
          index: index + 1,
          axis: removeRow ? "row" : "column",
        },
      );
    }
  };
  r.trace.recording!.policy =
    "실제 행·열 MSR, 원문 다중/단일 삭제와 원본 기반 양/음 행 추가, 시드 Uniform 마스킹. 최종 모든 bicluster는 원본 δ를 다시 검증; 반복 중 중복 해는 개수에 더하지 않음.";
  r.emit(
    "initialize",
    "실제 전체 행렬을 시작 후보로 사용합니다. 원본과 이전 bicluster 셀을 마스킹할 작업 행렬을 분리합니다.",
    { analysis: meta("initialize") },
    { threshold: o.residueThreshold, alpha: o.deletionThreshold },
  );
  for (let trial = 1; trial <= o.biclusterCount; trial++) {
    scoreSource = "working";
    selectedRows = Array.from({ length: n }, (_, i) => i);
    selectedColumns = Array.from({ length: m }, (_, j) => j);
    rowSigns = Array(n).fill(1);
    stats = meanSquaredResidue(
      workingValues,
      selectedRows,
      selectedColumns,
      rowSigns,
    );
    emitStats(
      "masked-search",
      "현재 작업 행렬에서 행 평균·열 평균·전체 평균·원소 잔차와 MSR을 실제 계산합니다.",
    );
    while (stats.residue > o.residueThreshold) {
      let changed = false;
      if (selectedRows.length >= 100) {
        const remove = new Set(
          stats.rowResidues
            .map((score, i) =>
              score > o.deletionThreshold * stats.residue
                ? selectedRows[i]
                : -1,
            )
            .filter((i) => i >= 0),
        );
        if (remove.size && remove.size < selectedRows.length) {
          selectedRows = selectedRows.filter((i) => !remove.has(i));
          changed = true;
          stats = meanSquaredResidue(
            workingValues,
            selectedRows,
            selectedColumns,
            rowSigns,
          );
          r.emit(
            "prune",
            "α배 MSR보다 큰 실제 행 잔차를 가진 행들을 동시에 제거합니다. 작은 축(<100)은 원문 실험 정책대로 단일 삭제로 넘깁니다.",
            { analysis: meta("multiple-row-deletion") },
            { removed: remove.size, residue: stats.residue },
          );
        }
      }
      if (selectedColumns.length >= 100 && stats.residue > o.residueThreshold) {
        const remove = new Set(
          stats.columnResidues
            .map((score, j) =>
              score > o.deletionThreshold * stats.residue
                ? selectedColumns[j]
                : -1,
            )
            .filter((j) => j >= 0),
        );
        if (remove.size && remove.size < selectedColumns.length) {
          selectedColumns = selectedColumns.filter((j) => !remove.has(j));
          changed = true;
          stats = meanSquaredResidue(
            workingValues,
            selectedRows,
            selectedColumns,
            rowSigns,
          );
          r.emit(
            "prune",
            "행 삭제 뒤 갱신한 MSR로 실제 열 잔차가 α배보다 큰 열들을 동시에 제거합니다.",
            { analysis: meta("multiple-column-deletion") },
            { removed: remove.size, residue: stats.residue },
          );
        }
      }
      if (!changed) break;
    }
    singleDelete(workingValues, "single-deletion");
    scoreSource = "original";
    stats = meanSquaredResidue(values, selectedRows, selectedColumns, rowSigns);
    emitStats(
      "original-check",
      "노드 추가는 마스킹되지 않은 원본에서 수행합니다. 무작위 마스크가 만든 후보의 원본 잔차도 다시 검증합니다.",
    );
    // Explicit safeguard: a low-residue pattern in a randomly masked matrix may not
    // satisfy the threshold on original cells. Never label that as a valid result.
    if (stats.residue > o.residueThreshold)
      singleDelete(values, "original-threshold-safeguard");
    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < m; j++) {
        if (selectedColumns.includes(j)) continue;
        const columnMean = selectedRows.reduce(
          (s, i) => s + (rowSigns[i] * values[i][j]) / selectedRows.length,
          0,
        );
        const candidate = selectedRows.reduce(
          (s, i, a) =>
            s +
            (rowSigns[i] * values[i][j] -
              stats.rowMeans[a] -
              columnMean +
              stats.grandMean) **
              2 /
              selectedRows.length,
          0,
        );
        if (candidate > stats.residue) continue;
        const columns = [...selectedColumns, j].sort((a, b) => a - b),
          next = meanSquaredResidue(values, selectedRows, columns, rowSigns);
        if (next.residue > stats.residue || next.residue > o.residueThreshold)
          continue;
        selectedColumns = columns;
        stats = next;
        changed = true;
        r.emit(
          "insert",
          "원래 노드 추가의 실제 열 잔차 기준을 만족하는 열을 더하고 MSR 비증가·δ를 재검증합니다.",
          { analysis: meta("column-addition") },
          {
            column: j + 1,
            candidateResidue: candidate,
            residue: stats.residue,
          },
        );
      }
      for (const sign of o.inversion === "allow" ? [1, -1] : [1])
        for (let i = 0; i < n; i++) {
          if (selectedRows.includes(i)) continue;
          const mean = selectedColumns.reduce(
            (s, j) => s + (sign * values[i][j]) / selectedColumns.length,
            0,
          );
          const candidate = selectedColumns.reduce(
            (s, j, b) =>
              s +
              (sign * values[i][j] -
                mean -
                stats.columnMeans[b] +
                stats.grandMean) **
                2 /
                selectedColumns.length,
            0,
          );
          if (candidate > stats.residue) continue;
          const rows = [...selectedRows, i].sort((a, b) => a - b),
            signs = [...rowSigns];
          signs[i] = sign;
          const next = meanSquaredResidue(values, rows, selectedColumns, signs);
          if (next.residue > stats.residue || next.residue > o.residueThreshold)
            continue;
          selectedRows = rows;
          rowSigns = signs;
          stats = next;
          changed = true;
          r.emit(
            "insert",
            sign === 1
              ? "원래 양의 행 추가 잔차 기준을 만족하는 실제 원본 행을 더합니다."
              : "원래 inverse-row 추가 기준을 만족하는 실제 원본 행을 부호 −1로 더합니다. 원본 셀 자체는 바꾸지 않습니다.",
            {
              analysis: meta(
                sign === 1 ? "row-addition" : "inverse-row-addition",
              ),
              focus: [i],
            },
            {
              row: i + 1,
              sign,
              candidateResidue: candidate,
              residue: stats.residue,
            },
          );
        }
    }
    if (stats.residue > o.residueThreshold)
      throw new Error(
        "원본 행렬에서 bicluster의 MSR이 δ를 초과했습니다. 완료 결과가 아닙니다.",
      );
    const originalResidue = meanSquaredResidue(
      values,
      selectedRows,
      selectedColumns,
    ).residue;
    const key = `${selectedRows.map((i) => `${i}:${rowSigns[i]}`)}|${selectedColumns}`;
    const duplicate = seen.has(key);
    if (!duplicate) {
      seen.add(key);
      biclusters.push({
        id: biclusters.length,
        rows: [...selectedRows],
        columns: [...selectedColumns],
        rowSigns: selectedRows.map((i) => rowSigns[i]),
        residue: stats.residue,
        originalResidue,
      });
    }
    const membership = biclusterMemberships(n, m, biclusters);
    r.emit(
      "extract",
      duplicate
        ? "같은 행·열·부호 해가 다시 발견되어 새 bicluster 개수에 추가하지 않습니다. 실제 탐색 결과를 숨기지 않습니다."
        : "원본의 실제 행·열·부호와 MSR≤δ를 만족하는 bicluster를 반환합니다. 최대 크기/전역 최적 보장은 없습니다.",
      {
        labels: membership.labels,
        analysis: meta("bicluster-result"),
        metric: [...r.state.metric, stats.residue],
        metricName: "Accepted bicluster MSR",
        focus: [],
      },
      {
        trial,
        residue: stats.residue,
        originalResidue,
        duplicate: String(duplicate),
        biclusters: biclusters.length,
      },
    );
    if (trial < o.biclusterCount) {
      const maskedCells = selectedRows.flatMap((i) =>
        selectedColumns.map((j) => {
          const before = workingValues[i][j],
            after = low + range * rng();
          workingValues[i][j] = after;
          return { row: i, column: j, before, after };
        }),
      );
      r.emit(
        "mask",
        "다음 탐색을 위해 발견한 셀만 원본 범위의 시드 Uniform 값으로 마스킹합니다. 추가 단계는 계속 원본을 사용합니다.",
        { analysis: meta("masking", { maskedCells }) },
        { maskedCells: maskedCells.length, trial },
      );
    }
  }
  const membership = biclusterMemberships(n, m, biclusters);
  r.emit(
    "finish",
    "요청한 탐색 횟수를 마쳤습니다. 실제 원본 행·열·inverse 부호를 포함한 고유 bicluster와 중첩 소속을 반환합니다. 찾은 고유 개수는 요청보다 적을 수 있습니다.",
    { labels: membership.labels, analysis: meta("finish"), focus: [] },
    { biclusters: biclusters.length, trials: o.biclusterCount },
  );
}
