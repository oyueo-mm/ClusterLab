import { useState } from "react";
import type { DataAnalysis } from "../engine/dataTypes";

function PagedRows({
  rows,
  headers,
}: {
  rows: (string | number)[][];
  headers: string[];
}) {
  const [page, setPage] = useState(0),
    pages = Math.max(1, Math.ceil(rows.length / 12)),
    index = Math.min(page, pages - 1);
  return (
    <div className="data-analysis-table">
      <div className="matrix-controls">
        <button disabled={!index} onClick={() => setPage(index - 1)}>
          이전 행
        </button>
        <span>
          {index + 1} / {pages} · 전체 {rows.length}행
        </span>
        <button
          disabled={index + 1 >= pages}
          onClick={() => setPage(index + 1)}
        >
          다음 행
        </button>
      </div>
      <div style={{ overflowX: "auto", maxWidth: "100%" }}>
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(index * 12, (index + 1) * 12).map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j}>
                    {typeof v === "number"
                      ? Number.isInteger(v)
                        ? v
                        : v.toPrecision(5)
                      : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function CliqueGrid({ analysis: a }: { analysis: DataAnalysis }) {
  const [selected, setSelected] = useState(""),
    [page, setPage] = useState(0);
  const groups = [...new Set(a.units?.map((u) => u.dimensions.join(",")))];
  const group = groups.includes(selected) ? selected : (groups.at(-1) ?? "");
  const units = (a.units ?? []).filter((u) => u.dimensions.join(",") === group),
    bins = a.gridBins ?? 1,
    shown = units.slice(page * 250, (page + 1) * 250),
    max = units.reduce((v, u) => Math.max(v, u.count), 1);
  return (
    <div className="chart">
      <h4>실제 부분공간 밀집 격자</h4>
      <label>
        표시할 원본 차원{" "}
        <select
          aria-label="CLIQUE 표시 부분공간"
          value={group}
          onChange={(e) => {
            setSelected(e.target.value);
            setPage(0);
          }}
        >
          {groups.map((d) => (
            <option key={d} value={d}>
              {d
                .split(",")
                .map((v) => `D${+v + 1}`)
                .join(" · ")}
            </option>
          ))}
        </select>
      </label>
      <svg
        role="img"
        aria-label="CLIQUE 실제 밀집 격자"
        viewBox="0 0 240 240"
        style={{ width: "100%", maxHeight: 260 }}
      >
        <rect
          x="20"
          y="20"
          width="200"
          height="200"
          fill="#f8faf9"
          stroke="#dce4df"
        />
        {shown.map((u, i) => (
          <rect
            key={i}
            x={20 + (200 * u.coordinates[0]) / bins}
            y={
              u.coordinates.length > 1
                ? 220 - (200 * (u.coordinates[1] + 1)) / bins
                : 120
            }
            width={200 / bins}
            height={u.coordinates.length > 1 ? 200 / bins : 100}
            fill="#34564D"
            fillOpacity={0.2 + (0.8 * u.count) / max}
            stroke="white"
            strokeWidth=".6"
          >
            <title>{`축 ${u.dimensions.map((d) => d + 1)} · 격자 ${u.coordinates} · 원본 ${u.count}개`}</title>
          </rect>
        ))}
        <text x="20" y="236" fontSize="9">
          첫 축 D{+(group.split(",")[0] ?? 0) + 1} · 진할수록 실제 점 수가 많음
        </text>
      </svg>
      <p className="small">
        계산 원본 {a.dimensions}차원 · 탐색 최대 {a.exploredDimensions}차원 ·
        selectivity &gt; {a.densityThreshold}. 3축 이상은 선택한 부분공간의 첫
        두 축만 도표에 투영합니다.
      </p>
      <div className="matrix-controls">
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>
          이전 격자
        </button>
        <span>
          도표 {shown.length} / {units.length}개 · 페이지 {page + 1}
        </span>
        <button
          disabled={(page + 1) * 250 >= units.length}
          onClick={() => setPage(page + 1)}
        >
          다음 격자
        </button>
      </div>
      <PagedRows
        headers={["군집", "선택 원본 축", "점 수", "DNF 최대 영역"]}
        rows={(a.subspaces ?? []).map((s) => [
          s.id + 1,
          s.dimensions.map((d) => `D${d + 1}`).join(" · "),
          s.members.length,
          s.regions
            .map((b) =>
              b.low
                .map((v, j) => {
                  const dim = s.dimensions[j],
                    low = a.bounds?.min[dim] ?? 0,
                    high = a.bounds?.max[dim] ?? 1,
                    width = (high - low) / bins;
                  const from = low + v * width,
                    to = low + (b.high[j] + 1) * width;
                  return `D${dim + 1}:[${from.toPrecision(5)},${to.toPrecision(5)}${width === 0 || b.high[j] === bins - 1 ? "]" : ")"}`;
                })
                .join(" ∧ "),
            )
            .join(" ∨ "),
        ])}
      />
      <p className="small">
        Canvas는 가장 높은 차원의 첫 소속만 표시합니다. 아래 모든 원본 소속 표와
        JSON에는 부분공간 간 중첩 결과를 모두 보존합니다.
      </p>
      <PagedRows
        headers={["원본 행", "모든 부분공간 군집"]}
        rows={(a.memberships ?? []).map((ids, i) => [
          i + 1,
          ids.length ? ids.map((v) => v + 1).join(", ") : "없음",
        ])}
      />
    </div>
  );
}
export default function DataClusteringAnalysis({
  analysis: a,
}: {
  analysis: DataAnalysis;
}) {
  return (
    <section
      className="data-clustering-analysis"
      aria-label={`${a.method} 원본 특성 분석`}
    >
      <h3>
        {a.method === "CLIQUE"
          ? "CLIQUE 부분공간·밀집 격자"
          : a.method === "PROCLUS"
            ? "PROCLUS 실제 선택 차원"
            : a.method === "K-Modes"
              ? "K-Modes 실제 범주 빈도·최빈값"
              : "K-Prototypes 실제 수치·범주 프로토타입"}
      </h3>
      <p className="small">
        실제 단계 {a.phase} · 원본 {a.dimensions}개 특성. 표시 좌표와 원본
        프로토타입을 구분합니다.
      </p>
      {a.objective !== undefined && (
        <p>
          실제 목적함수 <strong>{a.objective.toPrecision(7)}</strong>
          {a.converged !== undefined && (
            <span className="small">
              {" "}
              · {a.converged ? "할당 안정" : "고정점/전역 최적 미보장"}
            </span>
          )}
        </p>
      )}
      {a.numericCenters && (
        <details className="chart">
          <summary>실제 원본 수치 중심</summary>
          <PagedRows
            headers={[
              "군집",
              ...Array.from(
                { length: a.numericCenters[0]?.length ?? 0 },
                (_, j) => `N${j + 1}`,
              ),
            ]}
            rows={a.numericCenters.map((row, c) => [c + 1, ...row])}
          />
        </details>
      )}
      {a.categoricalCenters && (
        <div className="chart">
          <h4>범주형 최빈값 벡터</h4>
          <PagedRows
            headers={[
              "군집",
              ...Array.from(
                { length: a.categoricalCenters[0]?.length ?? 0 },
                (_, j) => `C${j + 1}`,
              ),
            ]}
            rows={a.categoricalCenters.map((row, c) => [c + 1, ...row])}
          />
          <p className="small">
            범주 값은 실제 문자열이며 임의 수치 거리로 바꾸지 않습니다.
          </p>
        </div>
      )}
      {a.frequencies && (
        <details className="chart">
          <summary>실제 군집·속성별 빈도</summary>
          <PagedRows
            headers={["군집", "속성", "범주 값", "횟수"]}
            rows={a.frequencies.map((f) => [
              f.cluster + 1,
              f.attribute + 1,
              f.value,
              f.count,
            ])}
          />
        </details>
      )}
      {a.method === "CLIQUE" && <CliqueGrid analysis={a} />}
      {a.dimensionsByCluster && (
        <div className="chart">
          <h4>군집마다 선택한 원본 차원</h4>
          <PagedRows
            headers={[
              "군집",
              "실제 medoid 행",
              "선택한 차원",
              "locality 점 수",
            ]}
            rows={a.dimensionsByCluster.map((dims, c) => [
              c + 1,
              (a.medoids?.[c] ?? -1) + 1,
              dims.map((d) => `D${d + 1}`).join(" · "),
              a.localities?.[c]?.length ?? 0,
            ])}
          />
          <p className="small">
            Σ |Dᵢ| ={" "}
            {(a.dimensionsByCluster ?? []).reduce((s, v) => s + v.length, 0)}.
            각 군집 최소 2차원. 할당은 선택 축 절대거리의 평균으로 계산합니다.
          </p>
        </div>
      )}
      {a.dimensionScores && (
        <details className="chart">
          <summary>실제 locality 차원 Z 점수</summary>
          <PagedRows
            headers={[
              "군집",
              ...Array.from(
                { length: a.dimensionScores[0]?.length ?? 0 },
                (_, j) => `D${j + 1}`,
              ),
            ]}
            rows={a.dimensionScores.map((row, c) => [c + 1, ...row])}
          />
        </details>
      )}
      {a.influence && (
        <p className="small">
          실제 influence:{" "}
          {a.influence
            .map((v) => (v === Number.MAX_VALUE ? "∞" : v.toPrecision(4)))
            .join(", ")}
          . 모든 범위를 벗어난 점만 outlier입니다. 전체 할당 비용은 outlier 태그
          이전이며 제외 후 비용은 {a.retainedCost?.toPrecision(6)}입니다.
        </p>
      )}
      {a.sample && (
        <details className="chart">
          <summary>실제 medoid 탐색 표본·greedy 후보</summary>
          <p className="small">
            표본 원본 행: {a.sample.map((i) => i + 1).join(", ")}
            <br />
            후보 원본 행: {a.candidates?.map((i) => i + 1).join(", ")}. 표본은
            medoid 후보 탐색용이며 각 후보 할당·평가는 전체 입력입니다.
          </p>
        </details>
      )}
    </section>
  );
}
