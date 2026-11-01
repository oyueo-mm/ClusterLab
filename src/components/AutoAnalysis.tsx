import { useState } from "react";
import type { AutoAnalysis } from "../engine/autoTypes";

function EmpiricalCDF({ values, title }: { values: number[]; title: string }) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b),
    low = sorted[0],
    high = sorted.at(-1)!;
  const xs = (v: number) => 22 + (256 * (v - low)) / (high - low || 1),
    ys = (i: number) => 104 - (82 * i) / sorted.length;
  const path = sorted
    .map((v, i) => `${i ? "L" : "M"}${xs(v)},${ys(i)}L${xs(v)},${ys(i + 1)}`)
    .join("");
  return (
    <figure className="chart">
      <figcaption>
        {title} · 실제 {values.length}개
      </figcaption>
      <svg viewBox="0 0 300 130" role="img" aria-label={title}>
        <path d="M22 14V104H282" stroke="#b6c8c1" fill="none" />
        <path d={path} stroke="#34564D" strokeWidth="2" fill="none" />
        <text x="22" y="122" fontSize="9">
          {low.toPrecision(4)}
        </text>
        <text x="240" y="122" fontSize="9">
          {high.toPrecision(4)}
        </text>
        <text x="3" y="22" fontSize="9">
          1
        </text>
      </svg>
    </figure>
  );
}
/** Real model-selection state, including candidates that were rejected. */
export function AutoAnalysisView({
  analysis,
  next,
  progress = 0,
}: {
  analysis: AutoAnalysis;
  next?: AutoAnalysis;
  progress?: number;
}) {
  const [axis, setAxis] = useState(0);
  const d = analysis.dimensions,
    selected = Math.min(axis, d - 1);
  const target =
    next?.method === analysis.method &&
    next.centroids.length === analysis.centroids.length
      ? next.centroids
      : analysis.centroids;
  const t =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : Math.max(0, Math.min(1, progress));
  const centers = analysis.centroids.map((row, i) =>
    row.map((v, j) => v + (target[i][j] - v) * t),
  );
  const candidate = analysis.proposedCentroids ?? [];
  const candidateTarget =
    next?.method === analysis.method &&
    next.proposedCentroids?.length === candidate.length
      ? next.proposedCentroids
      : candidate;
  const proposed = candidate.map((row, i) =>
    row.map((v, j) => v + (candidateTarget[i][j] - v) * t),
  );
  const domain = [
    ...analysis.centroids,
    ...target,
    ...candidate,
    ...candidateTarget,
  ].map((row) => row[selected]);
  const lo = domain.reduce((a, b) => Math.min(a, b), Infinity),
    hi = domain.reduce((a, b) => Math.max(a, b), -Infinity);
  const project = (v: number) =>
    hi === lo ? 150 : 20 + (260 * (v - lo)) / (hi - lo);
  const values = centers.map((row) => row[selected]);
  return (
    <section className="structured-analysis">
      <h3>자동 군집 수 결정 · {analysis.method}</h3>
      <p className="small">
        실제 단계: {analysis.phase} · 원본 {d}차원 · 현재 중심 {centers.length}
        개
      </p>
      <p>
        SSE {analysis.sse.toPrecision(6)}
        {analysis.objective !== undefined
          ? ` · SSE+λK ${analysis.objective.toPrecision(6)}`
          : ""}
      </p>
      {analysis.method === "G-Means" && (
        <p className="small">
          원문 검정 α=0.0001 · A²* 임계값 1.8692 · 비기각은 정규성의 증명이
          아닙니다.
        </p>
      )}
      {analysis.method === "X-Means" && (
        <p className="small">
          원문 X-Means BIC 규약 · 일반 구형 Gaussian의 수정된 MLE 점수와
          구분합니다.
        </p>
      )}
      <div className="chart">
        <label>
          중심을 확인할 원본 차원{" "}
          <input
            type="number"
            aria-label="자동 K 중심 표시 차원"
            min={1}
            max={d}
            value={selected + 1}
            onChange={(e) =>
              setAxis(
                Math.max(
                  0,
                  Math.min(d - 1, Math.trunc(+e.target.value || 1) - 1),
                ),
              )
            }
          />
        </label>
        <svg
          viewBox="0 0 300 90"
          role="img"
          aria-label="실제 원본 차원의 중심 이동"
        >
          <path d="M20 44H280" stroke="#b6c8c1" />
          {proposed.map((row, i) => (
            <g key={`candidate-${i}`}>
              <circle
                cx={project(row[selected])}
                cy="18"
                r="5"
                stroke="#a06323"
                fill="none"
              />
              <text
                x={project(row[selected])}
                y="10"
                fontSize="8"
                textAnchor="middle"
              >
                후보{i + 1}
              </text>
            </g>
          ))}
          {values.map((v, i) => (
            <g key={i}>
              <circle
                cx={project(v)}
                cy={35 + (i % 2) * 18}
                r="4"
                fill="#34564D"
              />
              <text x={project(v)} y={74} fontSize="9" textAnchor="middle">
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
        <p className="small">
          축 {selected + 1}만 표시합니다. 중심 학습과 거리 계산은 원본 전체 {d}
          차원입니다. 보간은 시각 효과입니다.
        </p>
      </div>
      {!!analysis.decisions?.length && (
        <div className="matrix-scroll">
          <table aria-label="실제 분할 심사">
            <thead>
              <tr>
                <th>부모</th>
                <th>통계량/차이</th>
                <th>임계값</th>
                <th>판정</th>
                <th>근거</th>
              </tr>
            </thead>
            <tbody>
              {analysis.decisions.map((a, i) => (
                <tr key={`${a.cluster}-${i}`}>
                  <td>{a.cluster + 1}</td>
                  <td>{a.statistic.toPrecision(6)}</td>
                  <td>{a.threshold.toPrecision(5)}</td>
                  <td>{a.accepted ? "수용" : "유지"}</td>
                  <td>
                    {a.reason}
                    {a.viewerFraction !== undefined
                      ? ` · viewer ${(100 * a.viewerFraction).toFixed(1)}%`
                      : ""}
                    {a.before !== undefined && a.after !== undefined
                      ? ` · ${a.before.toPrecision(5)} → ${a.after.toPrecision(5)}`
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {analysis.projections && (
        <EmpiricalCDF
          values={analysis.projections}
          title={
            analysis.method === "G-Means"
              ? "실제 표준화 투영 empirical CDF"
              : "실제 viewer 거리 empirical CDF"
          }
        />
      )}
      {analysis.testValues && (
        <EmpiricalCDF
          values={analysis.testValues}
          title="실제 Uniform bootstrap dip 분포"
        />
      )}
      <details>
        <summary>원본 차원의 실제 중심 값</summary>
        <div className="matrix-scroll">
          <table aria-label="원본 ND 중심">
            <thead>
              <tr>
                <th>중심</th>
                {Array.from({ length: Math.min(d, 10) }, (_, j) => (
                  <th key={j}>차원{j + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysis.centroids.map((row, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  {row.slice(0, 10).map((v, j) => (
                    <td key={j}>{v.toPrecision(6)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d > 10 && (
          <p className="small">
            표는 첫 10차원입니다. 위 차원 선택기로 모든 차원을 확인할 수
            있습니다.
          </p>
        )}
      </details>
      {analysis.proposedCentroids && (
        <p className="small">
          실제로 평가한 후보 중심 {analysis.proposedCentroids.length}개. 거절
          후보도 최종 중심과 구분해 기록합니다.
        </p>
      )}
      {analysis.candidateLabels && (
        <p className="small">
          실제 국소 할당:{" "}
          {analysis.proposedCentroids
            ?.map(
              (_, j) =>
                `후보 ${j + 1}: ${analysis.candidateLabels!.filter((v) => v === j).length}개`,
            )
            .join(" · ")}
        </p>
      )}
      {analysis.converged !== undefined && (
        <p className="small">
          실제 상태의 수렴 표시:{" "}
          {analysis.converged ? "수렴" : "계산/검정·사용자 한도 상태 확인 필요"}
        </p>
      )}
    </section>
  );
}
