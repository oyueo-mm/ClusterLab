import { useState } from "react";
import type { MatrixAnalysis } from "../engine/matrixTypes";

export default function BiclusterAnalysis({
  analysis: a,
}: {
  analysis: MatrixAnalysis;
}) {
  const [rowPage, setRowPage] = useState(0),
    [columnPage, setColumnPage] = useState(0),
    [bicPage, setBicPage] = useState(0),
    [showWorking, setShowWorking] = useState<boolean | null>(null);
  const wantsWorking = showWorking ?? a.scoreSource === "working";
  const values = wantsWorking && a.workingValues ? a.workingValues : a.values;
  const n = values.length,
    m = values[0]?.length ?? 0,
    rp = Math.min(rowPage, Math.max(0, Math.ceil(n / 10) - 1)),
    cp = Math.min(columnPage, Math.max(0, Math.ceil(m / 10) - 1));
  const rows = Array.from(
      { length: Math.min(10, n - rp * 10) },
      (_, i) => rp * 10 + i,
    ),
    columns = Array.from(
      { length: Math.min(10, m - cp * 10) },
      (_, j) => cp * 10 + j,
    ),
    rowSet = new Set(a.selectedRows),
    columnSet = new Set(a.selectedColumns);
  const signed = (i: number, j: number) =>
    values[i][j] * (a.rowSigns?.[i] ?? 1);
  let low = Infinity,
    high = -Infinity;
  rows.forEach((i) =>
    columns.forEach((j) => {
      const v = signed(i, j);
      low = Math.min(low, v);
      high = Math.max(high, v);
    }),
  );
  const color = (v: number) => {
    const t = (v - low) / (high - low || 1);
    return `rgb(${Math.round(239 - 187 * t)},${Math.round(247 - 161 * t)},${Math.round(244 - 167 * t)})`;
  };
  const statsSource =
    a.scoreSource === "working" ? "마스킹 작업 행렬" : "변경하지 않은 원본";
  const pages = Math.max(1, Math.ceil(a.biclusters.length / 10)),
    bp = Math.min(bicPage, pages - 1);
  return (
    <section
      className="bicluster-analysis"
      aria-label={`${a.method} 실제 행렬 분석`}
    >
      <style>{`.bicluster-analysis rect{transition:fill .18s ease}.bicluster-analysis td{overflow-wrap:anywhere}.bicluster-analysis .matrix-controls{flex-wrap:wrap}@media(prefers-reduced-motion:reduce){.bicluster-analysis rect{transition:none}}`}</style>
      <h3>
        {a.method === "Bimax"
          ? "Bimax 실제 행·열 최대 1-부분행렬"
          : "Cheng–Church 실제 평균 제곱 잔차"}
      </h3>
      <p className="small">
        실제 단계 {a.phase} · 원본 {n}행 × {m}열 · 현재 선택{" "}
        {a.selectedRows.length}행 × {a.selectedColumns.length}열. 점 Canvas 색은
        행의 첫 소속만 표시하며 실제 결과는 아래 행·열 이중군집입니다.
      </p>
      {a.residue !== undefined && (
        <p>
          실제 MSR <strong>{a.residue.toPrecision(7)}</strong> · 계산 기준{" "}
          {statsSource}
        </p>
      )}
      <div className="chart">
        <h4>원본 인덱스의 실제 행렬·선택 영역</h4>
        {a.workingValues && (
          <label>
            <input
              type="checkbox"
              aria-label="마스킹 작업 행렬 보기"
              checked={wantsWorking}
              onChange={(e) => setShowWorking(e.target.checked)}
            />{" "}
            작업 행렬 표시 (원본 보존)
          </label>
        )}
        <svg
          role="img"
          aria-label="실제 이중군집 행렬 히트맵"
          viewBox={`0 0 ${45 + columns.length * 28} ${35 + rows.length * 28}`}
          style={{ width: "100%", maxHeight: 350 }}
        >
          {columns.map((j, b) => (
            <text key={j} x={53 + b * 28} y="14" fontSize="10">
              C{j + 1}
            </text>
          ))}
          {rows.map((i, c) => (
            <g key={i}>
              <text x="1" y={41 + c * 28} fontSize="10">
                R{i + 1}
                {a.rowSigns?.[i] === -1 ? "−" : ""}
              </text>
              {columns.map((j, b) => (
                <rect
                  key={j}
                  x={45 + b * 28}
                  y={21 + c * 28}
                  width="27"
                  height="27"
                  fill={color(signed(i, j))}
                  stroke={
                    rowSet.has(i) && columnSet.has(j) ? "#172b24" : "#e7ece9"
                  }
                  strokeWidth={rowSet.has(i) && columnSet.has(j) ? 1.5 : 0.5}
                >
                  <title>{`원본 R${i + 1}, C${j + 1}: ${values[i][j]} · 부호 ${a.rowSigns?.[i] ?? 1} · 표시 ${signed(i, j)}`}</title>
                </rect>
              ))}
            </g>
          ))}
        </svg>
        <p className="small">
          페이지 셀 색 범위 {low.toPrecision(4)}~{high.toPrecision(4)}. 전체
          행렬 계산과 표시 페이지를 구분합니다. 굵은 테두리는 실제 선택
          행×열이며 −행은 원본 값을 바꾸지 않은 inverse 행입니다.
        </p>
        <div className="matrix-controls">
          <button disabled={!rp} onClick={() => setRowPage(rp - 1)}>
            이전 행
          </button>
          <span>
            행 {rp * 10 + 1}~{Math.min(n, (rp + 1) * 10)} / {n}
          </span>
          <button
            disabled={(rp + 1) * 10 >= n}
            onClick={() => setRowPage(rp + 1)}
          >
            다음 행
          </button>
        </div>
        <div className="matrix-controls">
          <button disabled={!cp} onClick={() => setColumnPage(cp - 1)}>
            이전 열
          </button>
          <span>
            열 {cp * 10 + 1}~{Math.min(m, (cp + 1) * 10)} / {m}
          </span>
          <button
            disabled={(cp + 1) * 10 >= m}
            onClick={() => setColumnPage(cp + 1)}
          >
            다음 열
          </button>
        </div>
      </div>
      {a.split && (
        <div className="chart">
          <h4>실제 Bimax 분할</h4>
          <p className="small">
            GU: {a.split.uRows.map((i) => i + 1).join(", ")}
            <br />
            GV: {a.split.vRows.map((i) => i + 1).join(", ")}
            <br />
            GW: {a.split.wRows.map((i) => i + 1).join(", ")}
            <br />
            CU: {a.split.uColumns.map((j) => j + 1).join(", ")}
            <br />
            CV: {a.split.vColumns.map((j) => j + 1).join(", ")}
          </p>
          <p className="small">
            Z 필수 교차 열 집합:{" "}
            {a.constraints
              ?.map((c) => `{${c.map((j) => j + 1)}}`)
              .join(" · ") || "없음"}
            . 실제 호출 수 {a.calls}.
          </p>
        </div>
      )}
      {(a.rowMeans || a.columnMeans) && (
        <details className="chart">
          <summary>실제 선택 행·열 평균과 잔차</summary>
          <p className="small">
            전체 평균 {a.grandMean?.toPrecision(6)} · 기준 {statsSource}
          </p>
          <div style={{ maxWidth: "100%", overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>축</th>
                  <th>원본 인덱스</th>
                  <th>평균</th>
                  <th>평균 제곱 잔차</th>
                </tr>
              </thead>
              <tbody>
                {a.selectedRows.slice(rp * 10, (rp + 1) * 10).map((i, k) => {
                  const p = rp * 10 + k;
                  return (
                    <tr key={`r${i}`}>
                      <td>행</td>
                      <td>{i + 1}</td>
                      <td>{a.rowMeans?.[p]?.toPrecision(6)}</td>
                      <td>{a.rowResidues?.[p]?.toPrecision(6)}</td>
                    </tr>
                  );
                })}
                {a.selectedColumns.slice(cp * 10, (cp + 1) * 10).map((j, k) => {
                  const p = cp * 10 + k;
                  return (
                    <tr key={`c${j}`}>
                      <td>열</td>
                      <td>{j + 1}</td>
                      <td>{a.columnMeans?.[p]?.toPrecision(6)}</td>
                      <td>{a.columnResidues?.[p]?.toPrecision(6)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}
      <div className="chart">
        <h4>실제 반환 이중군집 {a.biclusters.length}개</h4>
        <div className="matrix-controls">
          <button disabled={!bp} onClick={() => setBicPage(bp - 1)}>
            이전 이중군집
          </button>
          <span>
            {bp + 1} / {pages}
          </span>
          <button disabled={bp + 1 >= pages} onClick={() => setBicPage(bp + 1)}>
            다음 이중군집
          </button>
        </div>
        <div style={{ maxWidth: "100%", overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>실제 원본 행</th>
                <th>실제 원본 열</th>
                <th>MSR</th>
              </tr>
            </thead>
            <tbody>
              {a.biclusters.slice(bp * 10, (bp + 1) * 10).map((b) => (
                <tr key={b.id}>
                  <td>{b.id + 1}</td>
                  <td>
                    {b.rows
                      .map(
                        (i, k) =>
                          `${b.rowSigns?.[k] === -1 ? "−" : ""}R${i + 1}`,
                      )
                      .join(", ")}
                  </td>
                  <td>{b.columns.map((j) => `C${j + 1}`).join(", ")}</td>
                  <td>
                    {b.residue?.toPrecision(6)}
                    {b.originalResidue !== b.residue && (
                      <span className="small">
                        {" "}
                        (부호 미적용 {b.originalResidue?.toPrecision(6)})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <details className="chart">
        <summary>원본 행·열의 모든 중첩 소속</summary>
        <p className="small">
          행:{" "}
          {a.rowMemberships
            .slice(rp * 10, (rp + 1) * 10)
            .map(
              (ids, k) =>
                `R${rp * 10 + k + 1}→${ids.map((i) => i + 1).join(",") || "없음"}`,
            )
            .join(" · ")}
        </p>
        <p className="small">
          열:{" "}
          {a.columnMemberships
            .slice(cp * 10, (cp + 1) * 10)
            .map(
              (ids, k) =>
                `C${cp * 10 + k + 1}→${ids.map((i) => i + 1).join(",") || "없음"}`,
            )
            .join(" · ")}
        </p>
      </details>
      {!!a.maskedCells?.length && (
        <details className="chart">
          <summary>실제 시드 마스킹 셀 변화 ({a.maskedCells.length}개)</summary>
          <p className="small">
            현재 표시 페이지의 변경 셀:{" "}
            {a.maskedCells
              .filter((c) => rows.includes(c.row) && columns.includes(c.column))
              .map(
                (c) =>
                  `R${c.row + 1}C${c.column + 1}: ${c.before.toPrecision(4)}→${c.after.toPrecision(4)}`,
              )
              .join(" · ")}
            . 원본 전체 변화는 결과/Trace JSON에 보존됩니다.
          </p>
        </details>
      )}
    </section>
  );
}
