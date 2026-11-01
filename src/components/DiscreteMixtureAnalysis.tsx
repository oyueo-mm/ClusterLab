import { useState } from "react";
import type { State } from "../engine/types";
import type { DiscreteMixtureAnalysis } from "../engine/mixtureTypes";
import "./discrete-mixture.css";

export function DiscreteMixtureAnalysisView({
  analysis: a,
  responsibilities,
  next,
  progress = 0,
}: {
  analysis: DiscreteMixtureAnalysis;
  responsibilities: number[][];
  next?: State;
  progress?: number;
}) {
  const [dimension, setDimension] = useState(0),
    [component, setComponent] = useState(0),
    [row, setRow] = useState(0),
    [countStart, setCountStart] = useState(0);
  const d = Math.min(dimension, a.dimensions - 1),
    start = Math.min(component, a.parameters.length - 1),
    first = Math.min(row, a.sourceValues.length - 1);
  const nextA =
    next?.analysis?.kind === "discrete-mixture" &&
    next.analysis.method === a.method
      ? next.analysis
      : a;
  const t = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : Math.max(0, Math.min(1, progress));
  const visible = a.parameters.slice(start, start + 8),
    maximum =
      a.method === "Poisson Mixture"
        ? Math.max(
            1,
            ...visible.map((c) => c[d]),
            ...nextA.parameters.slice(start, start + 8).map((c) => c[d]),
          )
        : 1;
  const histogram = Array(16).fill(0) as number[];
  let outside = 0;
  for (const observation of a.sourceValues) {
    const index = observation[d] - countStart;
    if (index >= 0 && index < 16) histogram[index]++;
    else outside++;
  }
  const maxCount = Math.max(1, ...histogram);
  return (
    <section
      className="discrete-mixture-analysis"
      aria-label={`${a.method} 실제 확률 혼합 분석`}
    >
      <h3>{a.method} · 실제 이산 확률 EM</h3>
      <p>
        실제 {a.phase} · 전체 {a.sourceValues.length}행 × {a.dimensions}차원 ·
        갱신 {a.iterations}회 ·{" "}
        {a.converged ? "우도 허용오차 종료" : "수렴 미확인"}
      </p>
      <p>
        관측 로그우도 <strong>{a.logLikelihood.toPrecision(10)}</strong> (모든
        행의 합·정규화 상수 포함)
      </p>
      <p className="small">
        {a.support}. 소속은 Bayes 사후확률이며 퍼지 소속도가 아닙니다. 막대 사이
        보간은 시각 효과이고 아래 수치는 실제 연산 상태입니다.
      </p>
      {a.warnings.map((w) => (
        <p className="small" key={w}>
          {w}
        </p>
      ))}
      {!!a.emptyComponents.length && (
        <p>
          가중치0 성분: {a.emptyComponents.map((c) => c + 1).join(", ")} · 유효
          모수 유지, 재시드·가상 관측 없음
        </p>
      )}
      <div className="matrix-controls">
        <label>
          원본 특성{" "}
          <input
            aria-label="이산 혼합 표시 차원"
            type="number"
            min={1}
            max={a.dimensions}
            value={d + 1}
            onChange={(e) =>
              setDimension(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
            }
          />
        </label>
        <label>
          성분 시작{" "}
          <input
            aria-label="이산 혼합 성분 시작"
            type="number"
            min={1}
            max={a.parameters.length}
            value={start + 1}
            onChange={(e) =>
              setComponent(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
            }
          />
        </label>
      </div>
      <figure className="chart">
        <figcaption>
          {a.method === "Bernoulli Mixture"
            ? "실제 P(X=1)와 P(X=0)"
            : a.method === "Poisson Mixture"
              ? "실제 성분별 count 강도 λ"
              : "실제 count-profile 범주 확률 θ"}{" "}
          · 원본 특성 {d + 1}
        </figcaption>
        <svg
          role="img"
          aria-label="이산 분포별 실제 모수"
          viewBox="0 0 540 210"
        >
          {visible.map((p, i) => {
            const after = nextA.parameters[start + i]?.[d] ?? p[d],
              visual = p[d] + (after - p[d]) * t;
            return (
              <g key={start + i}>
                <text x={10 + i * 66} y="17" fontSize="10">
                  성분{start + i + 1}
                </text>
                {a.method === "Bernoulli Mixture" && (
                  <rect
                    x={14 + i * 66}
                    y="35"
                    width="28"
                    height="130"
                    fill="#e3eae7"
                  />
                )}
                <rect
                  x={14 + i * 66}
                  y={165 - (130 * visual) / maximum}
                  width="28"
                  height={(130 * visual) / maximum}
                  fill="#34564d"
                />
                <text x={8 + i * 66} y="184" fontSize="10">
                  {p[d].toPrecision(4)}
                </text>
                <text x={8 + i * 66} y="201" fontSize="9">
                  π={a.weights[start + i].toPrecision(3)}
                </text>
              </g>
            );
          })}
        </svg>
        {a.method === "Poisson Mixture" && (
          <p className="small">
            막대 공통 최대 λ={maximum.toPrecision(5)}. λ는 비음수 강도이며 [0,1]
            확률이 아닙니다.
          </p>
        )}
        {a.method === "Multinomial Mixture" && (
          <p className="small">
            각 성분의 전체 {a.dimensions}개 θ 합은1입니다. 행마다 실제 총 count
            mᵢ가 다를 수 있습니다.
          </p>
        )}
      </figure>
      <figure className="chart">
        <figcaption>
          원본 특성의 실제 count 빈도 · 전체 {a.sourceValues.length}행
        </figcaption>
        <label>
          표시 count 시작{" "}
          <input
            aria-label="이산 혼합 count 시작"
            type="number"
            min={0}
            value={countStart}
            onChange={(e) =>
              setCountStart(Math.max(0, Math.trunc(+e.target.value || 0)))
            }
          />
        </label>
        <svg viewBox="0 0 540 150" role="img" aria-label="전체 원본 count 빈도">
          {histogram.map((v, i) => (
            <g key={i}>
              <rect
                x={8 + i * 33}
                y={110 - (85 * v) / maxCount}
                width="23"
                height={(85 * v) / maxCount}
                fill="#789a8e"
              />
              <text x={8 + i * 33} y="127" fontSize="8">
                {countStart + i}
              </text>
              <text x={8 + i * 33} y={105 - (85 * v) / maxCount} fontSize="8">
                {v}
              </text>
            </g>
          ))}
        </svg>
        <p className="small">
          보이는16개 정수 값 밖의 관측 {outside}개도 모두 계산했습니다. 이
          그래프는 관측 빈도이며 모델의 PMF와 구분합니다.
        </p>
      </figure>
      <div className="matrix-scroll">
        <table aria-label="실제 이산 혼합 모수와 충분통계">
          <thead>
            <tr>
              <th>성분</th>
              <th>π</th>
              <th>현재 사후 Nₖ</th>
              <th>표시 특성 모수</th>
              <th>가중 count 합</th>
              <th>첫 원본의 log-PMF</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p, i) => {
              const c = start + i;
              return (
                <tr key={c}>
                  <th>{c + 1}</th>
                  <td>{a.weights[c].toPrecision(6)}</td>
                  <td>{a.effectiveCounts[c].toPrecision(6)}</td>
                  <td>{p[d].toPrecision(7)}</td>
                  <td>{a.weightedSums[c][d].toPrecision(7)}</td>
                  <td>{a.logMassFirstRow[c].toPrecision(7)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {a.maximizationCounts && (
        <details>
          <summary>이 M-step에서 실제 사용한 직전 E 통계</summary>
          <p className="small">
            표시 사후확률은 새 모수로 이미 재평가했습니다. 다음은 M 갱신에
            사용한 이전 E 통계입니다.
          </p>
          {visible.map((_, i) => {
            const c = start + i;
            return (
              <p key={c}>
                성분{c + 1} · Nₖ={a.maximizationCounts![c].toPrecision(7)} ·
                특성{d + 1} 가중합={a.maximizationSums![c][d].toPrecision(7)}
              </p>
            );
          })}
        </details>
      )}
      <label>
        사후확률 행 시작{" "}
        <input
          aria-label="이산 혼합 사후확률 행 시작"
          type="number"
          min={1}
          max={a.sourceValues.length}
          value={first + 1}
          onChange={(e) =>
            setRow(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
          }
        />
      </label>
      <p className="small">
        실제 Bayes 사후확률 {responsibilities.length}행 × {a.parameters.length}
        성분. 표는16행×8성분 표시 창이며 원본 계산을 잘라낸 것이 아닙니다.
      </p>
      <div className="matrix-scroll">
        <table aria-label="실제 이산 혼합 사후확률">
          <thead>
            <tr>
              <th>원본 행</th>
              {visible.map((_, i) => (
                <th key={i}>성분{start + i + 1}</th>
              ))}
              <th>전체 성분 확률합</th>
            </tr>
          </thead>
          <tbody>
            {responsibilities.slice(first, first + 16).map((values, i) => (
              <tr key={first + i}>
                <th>{first + i + 1}</th>
                {values.slice(start, start + 8).map((v, j) => (
                  <td
                    key={j}
                    style={{ background: `rgba(52,86,77,${v * 0.22})` }}
                  >
                    {v.toPrecision(6)}
                  </td>
                ))}
                <td>{values.reduce((s, v) => s + v, 0).toPrecision(6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small">
        아래 원본·행합은 display 좌표를 사용하지 않습니다.
      </p>
      <div className="matrix-scroll">
        <table aria-label="이산 혼합 실제 원본 count">
          <thead>
            <tr>
              <th>원본 행</th>
              <th>선택 특성</th>
              <th>행 count 합</th>
            </tr>
          </thead>
          <tbody>
            {a.sourceValues.slice(first, first + 16).map((values, i) => (
              <tr key={first + i}>
                <th>{first + i + 1}</th>
                <td>{values[d]}</td>
                <td>{a.totals[first + i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
