import type { FpcmAnalysis } from "../engine/fpcmTypes";
import { useState } from "react";
import { NumericTable } from "./NumericTable";
function MembershipInspector({ a }: { a: FpcmAnalysis }) {
  const [row, setRow] = useState(0),
    [column, setColumn] = useState(0);
  if (!a.memberships.length || !a.typicalities.length) return null;
  const r = Math.min(row, a.memberships.length - 1),
    c = Math.min(column, a.memberships[0].length - 1);
  return (
    <section aria-label="FPCM U T 표본 검사">
      <h4>표본별 실제 U / T</h4>
      <label>
        원본 행
        <input
          aria-label="FPCM 검사 원본 행"
          type="number"
          min="1"
          max={a.memberships.length}
          value={r + 1}
          onChange={(e) =>
            setRow(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
          }
        />
      </label>
      <label>
        첫 군집
        <input
          aria-label="FPCM 검사 첫 군집"
          type="number"
          min="1"
          max={a.memberships[0].length}
          value={c + 1}
          onChange={(e) =>
            setColumn(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
          }
        />
      </label>
      <p className="small">
        각 막대는 실제 [0,1] 값입니다. T를 행 정규화하거나 확대해 계산 값처럼
        표시하지 않습니다.
      </p>
      {a.memberships[r].slice(c, c + 8).map((u, j) => (
        <div key={c + j}>
          <b>군집 {c + j + 1}</b>
          <label>
            U{" "}
            <meter
              min="0"
              max="1"
              value={u}
              aria-label={`FPCM 표본${r + 1} 군집${c + j + 1} U`}
            />
            {u.toPrecision(6)}
          </label>
          <label>
            T{" "}
            <meter
              min="0"
              max="1"
              value={a.typicalities[r][c + j]}
              aria-label={`FPCM 표본${r + 1} 군집${c + j + 1} T`}
            />
            {a.typicalities[r][c + j].toPrecision(6)}
          </label>
        </div>
      ))}
    </section>
  );
}
export function FpcmAnalysisView({ analysis: a }: { analysis: FpcmAnalysis }) {
  return (
    <section className="chart" aria-label="FPCM 전용 분석">
      <h3>FPCM · U 행 / T 열 정규화</h3>
      <MembershipInspector a={a} />
      <p>
        원본 {a.dimensions}차원 · {a.phase} · {a.iteration}회 ·{" "}
        {a.stopReason ?? "계산 중"}. U/T는 Bayes 확률이 아닙니다.
      </p>
      {a.weightsReady ? (
        <>
          <dl className="metric-grid">
            <dt>U^m 거리 비용</dt>
            <dd>{a.fuzzyCost.toPrecision(8)}</dd>
            <dt>T^η 거리 비용</dt>
            <dd>{a.typicalityCost.toPrecision(8)}</dd>
            <dt>전체 FPCM 목적</dt>
            <dd>{a.objective.toPrecision(8)}</dd>
            <dt>중심 이동</dt>
            <dd>{a.movement.toPrecision(6)}</dd>
            <dt>최종 평균 고정점 잔차</dt>
            <dd>{a.fixedPointResidual.toPrecision(6)}</dd>
          </dl>
          <NumericTable
            title="U 각 행 합 (1)"
            values={a.uRowSums.map((v) => [v])}
          />
          <NumericTable
            title="T 각 열 합 (1)"
            values={a.tColumnSums.map((v) => [v])}
          />
          <NumericTable
            title="T 행 합 (정규화하지 않음)"
            values={a.tRowSums.map((v) => [v])}
          />
          <NumericTable title="FPCM 소속도 U" values={a.memberships} />
          <NumericTable
            title="FPCM 전형성 T (열 정규화)"
            values={a.typicalities}
          />
          <NumericTable title="원본 ND 제곱거리" values={a.distancesSquared} />
        </>
      ) : (
        <p>
          실제 ND FCM으로 초기 중심을 준비합니다. FPCM 목적은 U/T를 모두 계산한
          뒤 표시합니다.
        </p>
      )}
      {!a.matricesRecorded && (
        <p className="small">
          모든 원본 표본으로 U/T 정규화를 계산했습니다. 중간 행렬만 바이트
          예산으로 요약하며 최종 전체 행렬을 보존합니다.
        </p>
      )}
      <NumericTable title="FPCM 원본 ND 중심" values={a.centroids} />
      <NumericTable
        title="U^m+T^η 유효 가중치·로그"
        values={a.effectiveWeights.map((v, j) => [v, a.logEffectiveWeights[j]])}
      />
      <NumericTable
        title="U argmax 표시 개수"
        values={a.counts.map((v) => [v])}
      />
      <p className="small">
        m={a.fuzziness}, η={a.exponent}. 중복 중심 {a.coincidentCenters}쌍 ·
        서로 다른 점≥K {a.distinctAtLeastK ? "확인" : "부족 (퇴화)"} · 유효
        가중치0 반올림 {a.roundedWeights}군집. 전역 최적 또는 정확한 고정점을
        보장하지 않습니다.
      </p>
      <details>
        <summary>같은 원본의 실제 ND FCM 기준</summary>
        <p>
          FCM {a.warmIteration}회 ·{" "}
          {a.warmConverged ? "허용오차" : "초기화 한도"} · FCM 목적{" "}
          {a.warmObjective.toPrecision(8)}. FPCM 목적과 다른 정의입니다.
        </p>
        <NumericTable title="준비 FCM U" values={a.warmMemberships} />
        <NumericTable title="준비 FCM 중심" values={a.warmCenters} />
      </details>
      <p className="small">
        r배 표본 복제 시 T는 1/r로 줄고 U는 반복됩니다. 두 가중 항의 상대 영향이
        바뀌는 FPCM1997의 한계이며 PCM/PFCM2005와 구분합니다.
      </p>
    </section>
  );
}
