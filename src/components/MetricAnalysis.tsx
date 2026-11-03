import type { MetricAnalysis } from "../engine/metricTypes";
import { NumericTable } from "./NumericTable";
export function MetricAnalysisView({
  analysis: a,
}: {
  analysis: MetricAnalysis;
}) {
  return (
    <section className="chart" aria-label="MPCKMeans 전용 분석">
      <h3>MPCKMeans · 다중 대각 메트릭</h3>
      {!a.objectiveReady && (
        <p>
          최대쌍/초기화 미완료: 아래 비용은 직전 완료 계산이며 현재 metric의 새
          목적이 아닙니다.
        </p>
      )}
      <p>
        {a.phase} · 반복 {a.iteration} ·{" "}
        {a.converged ? "허용오차 수렴" : (a.stopReason ?? "계산 중")}
      </p>
      <p>
        거리 {a.distanceCost.toPrecision(7)} · −logdet{" "}
        {a.logDetCost.toPrecision(7)} · ML {a.mustLinkCost.toPrecision(7)} · CL{" "}
        {a.cannotLinkCost.toPrecision(7)} · J {a.objective.toPrecision(9)}
      </p>
      <p>
        폐쇄 ML {a.closureMustCount}개 중 위반 {a.mustViolations} · CL{" "}
        {a.closureCannotCount}개 중 위반 {a.cannotViolations}. 원본 위반 ML{" "}
        {a.originalMustViolations} / CL {a.originalCannotViolations}
      </p>
      <p>
        중심 이동 {a.movement.toPrecision(5)} · log metric 변화{" "}
        {a.metricMovement.toPrecision(5)} · 최대쌍 변경 {a.witnessChanges} ·
        metric 단계 목적 증가 {a.objectiveIncreases}
      </p>
      <p>
        이번 갱신 조건화 군집{" "}
        {a.conditioned.map((h) => h + 1).join(", ") || "없음"}. 조건화/최대쌍
        변경 시 단조 감소를 보장하지 않습니다. 빈 군집은 이전 중심·metric을
        유지합니다.
      </p>
      {a.search && !a.search.complete && (
        <p role="status">
          전체 최대쌍 탐색 {a.search.checked}/{a.search.total} · 미완료 부분
          최대 {a.search.maximum}
        </p>
      )}
      <NumericTable title="학습 대각 A" values={a.metrics} />
      <NumericTable title="원본 ND 중심" values={a.centroids} />
      <NumericTable
        title="군집별 개수·−logdet"
        values={a.counts.map((n, h) => [
          n,
          -(a.metrics[h] ?? []).reduce((s, v) => s + Math.log(v), 0),
        ])}
      />
      <NumericTable title="Eq8 실제 분모 S" values={a.denominators} />
      <NumericTable title="이전 대각 A" values={a.previousMetrics} />
      <NumericTable
        title="전체 원본 최대쌍·제곱거리"
        values={a.diameters.map((v) => [v.pair[0] + 1, v.pair[1] + 1, v.value])}
      />
      {a.candidates && (
        <NumericTable
          title={`행 ${(a.current ?? 0) + 1} 후보: 거리·−logdet·ML·CL·합`}
          values={a.candidates.map((v) => [
            v.distanceSquared,
            v.logDetCost,
            v.mustLinkCost,
            v.cannotLinkCost,
            v.total,
          ])}
        />
      )}
      <p className="small">
        타원은 선택한 두 원본 축에서 d²_A=1인 대각 단면입니다. 계산은 전체{" "}
        {a.dimensions}차원입니다. Full SPD·회전 타원이 아닙니다. 위반 수와
        비용은 다르며 최대쌍 CL 위반 비용은0일 수도 있습니다.
      </p>
    </section>
  );
}
