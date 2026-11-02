import type { PossibilisticAnalysis } from "../engine/possibilisticTypes";
import { NumericTable } from "./NumericTable";
export function PossibilisticAnalysisView({
  analysis: a,
}: {
  analysis: PossibilisticAnalysis;
}) {
  const ready = a.weightsBasis === "pcm" && a.maxima.length > 0;
  return (
    <section className="chart" aria-label="PCM 전용 분석">
      <h3>전형성 · 원본 ND PCM</h3>
      <p className="small">
        원본 {a.dimensions}차원 · {a.phase} · PCM {a.iteration}회 ·{" "}
        {a.stopReason ?? "계산 중"}
      </p>
      <p>전형성 t는 확률이 아닙니다. 표본별 합을1로 정규화하지 않습니다.</p>
      {ready ? (
        <>
          <dl className="metric-grid">
            <dt>전형성 가중 거리</dt>
            <dd>{a.distanceCost.toPrecision(8)}</dd>
            <dt>낮은 전형성 벌점</dt>
            <dd>{a.penaltyCost.toPrecision(8)}</dd>
            <dt>PCM 전체 목적함수</dt>
            <dd>{a.objective.toPrecision(8)}</dd>
            <dt>중심 이동</dt>
            <dd>{a.movement.toPrecision(6)}</dd>
            <dt>최종 평균 고정점 잔차</dt>
            <dd>{a.fixedPointResidual.toPrecision(6)}</dd>
          </dl>
          <p className="small">
            {a.converged ? "중심 허용오차 종료" : "수렴 미확정"} · 최대
            t&lt;0.1인 표본 {a.lowTypicalityCount}개. 표시용 진단이며 노이즈
            label로 강제하지 않습니다.
          </p>
          <NumericTable
            title="표본별 전형성 합·최대값"
            values={a.rowSums.map((sum, i) => [sum, a.maxima[i]])}
          />
          {!a.matricesRecorded && (
            <p className="small">
              계산은 전체 원본입니다. 이 단계의 전체 행렬 기록은 바이트 예산으로
              요약했으며, 최종 단계에서 모든 전형성을 확인할 수 있습니다.
            </p>
          )}
          <NumericTable title="PCM 전형성 (비정규화)" values={a.typicalities} />
          <NumericTable title="로그 전형성" values={a.logTypicalities} />
          <NumericTable title="원본 제곱거리" values={a.distancesSquared} />
        </>
      ) : (
        <p className="small">
          실제 ND FCM으로 중심과 척도를 준비합니다. PCM 목적값은 전형성을 계산한
          뒤 표시합니다.
        </p>
      )}
      <p className="small">
        자동 척도: Ω_j=κ·FCM 가중분산을 한 번 추정해 고정. 수동 모드는 지정한
        양수 Ω를 고정합니다. κ={a.scaleCoefficient}, FCM m={a.fuzziness}, PCM η=
        {a.exponent}.
      </p>
      <NumericTable
        title="군집별 고정 척도 Ω"
        values={a.scales.map((v) => [v])}
      />
      <NumericTable title="원본 ND PCM 중심" values={a.centroids} />
      <NumericTable
        title={`${ready ? "PCM t^η" : "FCM u^m"} 유효 가중치·로그`}
        values={a.effectiveWeights.map((v, i) => [v, a.logEffectiveWeights[i]])}
      />
      <NumericTable
        title="표시 argmax 개수"
        values={a.counts.map((v) => [v])}
      />
      <p className="small">
        argmax 개수0은 전형성 가중치 소실과 다릅니다. 중복 중심{" "}
        {a.coincidentCenters}쌍, 허용오차 이내 근접 {a.nearCenters}쌍 · 서로
        다른 원본점≥K {a.distinctAtLeastK ? "확인" : "부족 (퇴화)"}.
      </p>
      <p className="small">
        0/1로 표현 반올림된 전형성 {a.roundedTypicalities}개, 유효 가중치0
        반올림 {a.underflowWeights}군집. 로그 비율로 평균을 계산하며 epsilon을
        더하지 않습니다.
      </p>
      <details open>
        <summary>같은 원본의 실제 FCM 기준과 비교</summary>
        <p className="small">
          ND FCM {a.warmIteration}회 ·{" "}
          {a.warmConverged ? "초기화 허용오차 충족" : "초기화 한도/준비 중"} ·
          FCM J_m={a.warmObjective.toPrecision(8)}. 아래 U의 행 합은1이며, 같은
          원본에서 실행한 준비 FCM입니다. 기존2D FCM의 초기화 난수 정책과는
          다릅니다.
        </p>
        <NumericTable
          title="FCM 소속도 U (행 합 1)"
          values={a.warmMemberships}
        />
        <NumericTable title="FCM 기준 ND 중심" values={a.warmCenters} />
      </details>
      <p className="small">
        최종 T는 반환 중심에서 다시 평가했습니다. 잔차가0이 아니면 정확한
        고정점이 아닙니다. 반복 한도/허용오차 종료와 전역 최소 보장을
        구분하세요.
      </p>
    </section>
  );
}
