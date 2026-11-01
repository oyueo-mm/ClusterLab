import { useState } from "react";
import type { TimeSeriesAnalysis } from "../engine/timeseriesTypes";

function Wave({
  lines,
  times,
  title,
}: {
  lines: { values: number[]; color: string; label: string; dash?: boolean }[];
  times: number[];
  title: string;
}) {
  const m = times.length,
    all = lines.flatMap((line) => line.values),
    lo = all.reduce((a, b) => Math.min(a, b), Infinity),
    hi = all.reduce((a, b) => Math.max(a, b), -Infinity);
  const t0 = times[0],
    t1 = times.at(-1)!,
    x = (i: number) => 24 + (252 * (times[i] - t0)) / (t1 - t0 || 1),
    y = (v: number) => (hi === lo ? 65 : 108 - (84 * (v - lo)) / (hi - lo));
  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <svg viewBox="0 0 300 140" role="img" aria-label={title}>
        <path d="M24 16V112H280" fill="none" stroke="#b6c8c1" />
        {lines.map((line) => (
          <path
            key={line.label}
            d={line.values
              .slice(0, m)
              .map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`)
              .join("")}
            stroke={line.color}
            strokeWidth="2"
            strokeDasharray={line.dash ? "4 3" : undefined}
            fill="none"
          />
        ))}
        <text x="24" y="132" fontSize="9">
          {t0.toPrecision(4)}
        </text>
        <text x="244" y="132" fontSize="9">
          {t1.toPrecision(4)}
        </text>
      </svg>
      <p className="small">
        {lines.map((line) => (
          <span key={line.label} style={{ color: line.color, marginRight: 10 }}>
            {line.label}
          </span>
        ))}
      </p>
    </figure>
  );
}
export function TimeSeriesAnalysisView({
  analysis,
  next,
  progress = 0,
}: {
  analysis: TimeSeriesAnalysis;
  next?: TimeSeriesAnalysis;
  progress?: number;
}) {
  const [follow, setFollow] = useState(true),
    [chosenSeries, setChosenSeries] = useState(0),
    [chosenCluster, setChosenCluster] = useState(0);
  const n = analysis.series.length,
    k = analysis.centroids.length,
    m = analysis.times.length;
  const selectedSeries = Math.min(
    n - 1,
    Math.max(
      0,
      follow
        ? (analysis.activeSeries ??
            analysis.clusterMembers?.[0] ??
            chosenSeries)
        : chosenSeries,
    ),
  );
  const selectedCluster = Math.min(
    k - 1,
    Math.max(
      0,
      follow ? (analysis.activeCluster ?? chosenCluster) : chosenCluster,
    ),
  );
  const reduce =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t = reduce ? 0 : Math.max(0, Math.min(1, progress));
  const center = analysis.centroids[selectedCluster],
    target =
      next?.centroids.length === k ? next.centroids[selectedCluster] : center;
  const interpolated = center.map((v, j) => v + (target[j] - v) * t);
  const memberIndex = analysis.clusterMembers?.indexOf(selectedSeries) ?? -1;
  const alignmentIndex =
    memberIndex >= 0
      ? memberIndex
      : analysis.activeSeries === selectedSeries
        ? 0
        : -1;
  const aligned =
    alignmentIndex >= 0 ? analysis.aligned?.[alignmentIndex] : undefined;
  const shift =
    alignmentIndex >= 0 ? analysis.shifts?.[alignmentIndex] : undefined;
  const lines = [
    {
      values: analysis.series[selectedSeries],
      color: "#46755F",
      label: `시계열 ${selectedSeries + 1} (정규화)`,
    },
    {
      values: interpolated,
      color: "#151c19",
      label: `실제 형태 중심 ${selectedCluster + 1}`,
    },
  ];
  if (aligned)
    lines.push({
      values: aligned,
      color: "#ae732d",
      label: `실제 정렬 · shift ${shift ?? 0}`,
    });
  const correlationTimes = Array.from(
    { length: 2 * m - 1 },
    (_, i) => i - m + 1,
  );
  return (
    <section className="structured-analysis">
      <h3>실제 시계열 정렬·형태 추출</h3>
      <p className="small">
        K-Shape · {analysis.phase} · 전체 {n}개 × 길이 {m} · ΣSBD²{" "}
        {analysis.objective.toPrecision(6)}
      </p>
      <label>
        <input
          type="checkbox"
          checked={follow}
          onChange={(e) => setFollow(e.target.checked)}
        />{" "}
        현재 연산 대상을 따라가기
      </label>
      <div className="matrix-controls">
        <label>
          시계열{" "}
          <input
            aria-label="형태 분석 시계열 선택"
            type="number"
            min={1}
            max={n}
            value={selectedSeries + 1}
            onChange={(e) => {
              setFollow(false);
              setChosenSeries(
                Math.max(
                  0,
                  Math.min(n - 1, Math.trunc(+e.target.value || 1) - 1),
                ),
              );
            }}
          />
        </label>
        <label>
          형태 중심{" "}
          <input
            aria-label="형태 분석 군집 선택"
            type="number"
            min={1}
            max={k}
            value={selectedCluster + 1}
            onChange={(e) => {
              setFollow(false);
              setChosenCluster(
                Math.max(
                  0,
                  Math.min(k - 1, Math.trunc(+e.target.value || 1) - 1),
                ),
              );
            }}
          />
        </label>
      </div>
      <Wave
        title="실제 시간축의 시계열·형태 중심"
        lines={lines}
        times={analysis.times}
      />
      <p className="small">
        모든 원본 시계열/시각으로 계산합니다. 현재 곡선 {selectedSeries + 1}만
        표시하며 선택기로 전체 {n}개를 확인합니다. 정렬은 zero-padding이며 순환
        이동이 아닙니다. 중심 보간은 시각 효과입니다.
      </p>
      {analysis.correlation && (
        <Wave
          title={`실제 NCC 지연 곡선 · 시계열 ${(analysis.activeSeries ?? 0) + 1} / 중심 ${(analysis.activeCluster ?? 0) + 1}`}
          lines={[
            {
              values: analysis.correlation,
              color: "#34564D",
              label: `최적 shift ${analysis.shifts?.[0] ?? 0}`,
            },
          ]}
          times={correlationTimes}
        />
      )}
      {!!analysis.eigenvalues?.length && (
        <p className="small">
          실제 최대 고유값 {analysis.eigenvalues.at(-1)!.toPrecision(6)} · 상대
          잔차 {(analysis.eigenResidual ?? 0).toExponential(2)} · 선택 방향{" "}
          {analysis.orientation === -1 ? "−v" : "+v"}
        </p>
      )}
      {!!analysis.emptyClusters?.length && (
        <p className="small">
          비어 있는 요청 군집:{" "}
          {analysis.emptyClusters.map((j) => j + 1).join(", ")}. 이전 형태를
          유지하며 가짜 소속을 만들지 않습니다.
        </p>
      )}
      <p className="small">
        수렴은 실제 소속 변화 없음으로 판정합니다. 현재{" "}
        {analysis.converged ? "수렴" : "진행 중 또는 반복 한도"}. 형태 고유해는
        squared NCC surrogate이며 ΣSBD²의 보편적 단조 감소를 보장하지 않습니다.
      </p>
    </section>
  );
}
