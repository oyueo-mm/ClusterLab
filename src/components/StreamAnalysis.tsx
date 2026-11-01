import { useState } from "react";
import type { StreamAnalysis as Analysis } from "../engine/streamTypes";
import type { State } from "../engine/types";
import { ease } from "../engine/trace";
import { palette } from "../animation/renderer";
export function StreamAnalysis({
  analysis: a,
  next,
  progress = 0,
}: {
  analysis: Analysis;
  next?: State;
  progress?: number;
}) {
  const [start, setStart] = useState(0);
  const target = next?.analysis?.kind === "stream" ? next.analysis : a;
  const t = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0
    : ease(progress);
  const max = Math.max(
    1,
    ...a.microClusters.map((c) => c.weight),
    ...target.microClusters.map((c) => c.weight),
  );
  return (
    <div className="algorithm-analysis">
      <h3>DenStream · 실제 시간 감쇠와 micro-cluster</h3>
      <p>
        시각 {a.time} · 처리 {a.processed}개 · 원본 {a.dimensions}차원 ·{" "}
        {a.phase}
      </p>
      <p className="small">
        CF 중심·반경은 전체 원본 특성으로 계산합니다. 과거 점 색상은 현재 살아
        있는 micro-cluster 소속의 표시이며, 전체 과거 데이터의 정적 재군집화와
        다릅니다.
      </p>
      <div className="chart">
        <div className="chart-title">Micro-cluster 가중치 · 시각적 보간</div>
        <svg
          viewBox="0 0 600 160"
          role="img"
          aria-label="스트림 micro-cluster 가중치"
        >
          {a.microClusters.slice(start, start + 12).map((c, i) => {
            const after = target.microClusters.find((x) => x.id === c.id),
              weight = c.weight + ((after?.weight ?? 0) - c.weight) * t;
            return (
              <g key={c.id}>
                <rect
                  x={25 + i * 47}
                  y={125 - (95 * weight) / max}
                  width="26"
                  height={(95 * weight) / max}
                  fill={
                    c.potential
                      ? palette[Math.max(0, c.label) % palette.length]
                      : "#a9b0b5"
                  }
                />
                <text x={25 + i * 47} y="145" fontSize="11">
                  {c.id}
                </text>
                <text
                  x={25 + i * 47}
                  y={120 - (95 * weight) / max}
                  fontSize="9"
                >
                  {weight.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <label>
        Micro-cluster 표시 시작{" "}
        <input
          aria-label="스트림 CF 표시 시작"
          type="number"
          min={1}
          max={Math.max(1, a.microClusters.length)}
          value={Math.min(start + 1, Math.max(1, a.microClusters.length))}
          onChange={(e) =>
            setStart(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
          }
        />
      </label>
      <div className="matrix-scroll">
        <table aria-label="현재 CF 통계">
          <thead>
            <tr>
              <th>ID</th>
              <th>유형</th>
              <th>가중치</th>
              <th>RMS 반경</th>
              <th>원본 중심</th>
              <th>Macro</th>
            </tr>
          </thead>
          <tbody>
            {a.microClusters.slice(start, start + 12).map((c) => (
              <tr key={c.id}>
                <th>{c.id}</th>
                <td>{c.potential ? "potential" : "outlier"}</td>
                <td>{c.weight.toPrecision(5)}</td>
                <td>{c.radius.toPrecision(5)}</td>
                <td>{c.center.map((v) => v.toPrecision(4)).join(", ")}</td>
                <td>{c.label < 0 ? "noise" : c.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        감쇠율 λ={a.decayRate} · pruning 주기 Tₚ={a.pruneInterval}
      </p>
      <p>
        누적 승격 {a.promotedCount ?? 0}회 · 제거 {a.removedCount ?? 0}개{" "}
        {a.detailedRoles === false
          ? "· 바이트 예산에 따른 체크포인트 요약 (점별 역할 생략)"
          : ""}
      </p>
      {a.promoted !== undefined && <p>실제 potential 승격: CF {a.promoted}</p>}
      {!!a.removed?.length && <p>실제 제거 CF: {a.removed.join(", ")}</p>}
      <details>
        <summary>중심 기준 CF 합계</summary>
        <p className="small">
          수치 안정성을 위해 anchor를 뺀 좌표로 CF1·CF2를 저장합니다. 실제
          중심은 anchor+CF1/w입니다.
        </p>
        {a.microClusters.slice(start, start + 12).map((c) => (
          <p key={c.id}>
            CF {c.id} · anchor [{c.anchor.join(", ")}] · CF1 [
            {c.linearSum.map((v) => v.toPrecision(5)).join(", ")}] · CF2 [
            {c.squaredSum.map((v) => v.toPrecision(5)).join(", ")}]
          </p>
        ))}
      </details>
    </div>
  );
}
