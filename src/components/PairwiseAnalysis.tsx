import type { PairwiseAnalysis } from "../engine/pairwiseTypes";
import { NumericTable } from "./NumericTable";
export function PairwiseAnalysisView({
  analysis: a,
}: {
  analysis: PairwiseAnalysis;
}) {
  const assigned = a.counts.reduce((sum, n) => sum + n, 0),
    rows = a.componentSizes.reduce((sum, n) => sum + n, 0);
  return (
    <section className="chart" aria-label="PCKMeans 전용 분석">
      <h3>쌍별 유한 제약 · 실제 원본 연산</h3>
      <p className="small">
        원본 {a.dimensions}차원 · {a.iteration}회 · {a.phase} ·{" "}
        {a.stopReason ?? "계산 중"} ·{" "}
        {a.converged ? "종료 조건 충족" : "수렴 미확정"} · 할당 {assigned}/
        {rows}행
      </p>
      {assigned === rows ? (
        <dl className="metric-grid">
          <dt>거리 비용</dt>
          <dd>{a.distanceCost.toPrecision(8)}</dd>
          <dt>ML 위반 비용</dt>
          <dd>{a.mustLinkCost.toPrecision(8)}</dd>
          <dt>CL 위반 비용</dt>
          <dd>{a.cannotLinkCost.toPrecision(8)}</dd>
          <dt>전체 목적함수 J</dt>
          <dd>{a.objective.toPrecision(8)}</dd>
        </dl>
      ) : (
        <p className="small">
          초기 중심 구성 중입니다. 전체 배정이 만들어지면 실제 목적함수를
          표시합니다.
        </p>
      )}
      <p>
        폐쇄 ML 위반 {a.mustViolations}/{a.closureMustCount}개 · CL 위반{" "}
        {a.cannotViolations}/{a.closureCannotCount}개
      </p>
      <p className="small">
        원래 관계 위반 ML {a.originalMustViolations}/{a.mustLink.length}개 · CL{" "}
        {a.originalCannotViolations}/{a.cannotLink.length}개. 폐쇄 쌍은 중복
        집계하지 않습니다. 한 쌍의 비용 w={a.penalty}. 위반은 계산 실패가
        아닙니다.
      </p>
      <p className="small">
        빈 군집 {a.counts.filter((v) => v === 0).length}개는 이전 중심을
        유지합니다. SDM의 ½SSE 표기에서는 w_p=w/2입니다.
      </p>
      <NumericTable
        title="군집별 데이터 개수"
        values={a.counts.map((v) => [v])}
      />
      <NumericTable title="원본 ND 중심" values={a.centroids} />
      {a.candidates && (
        <>
          <h4>
            {(a.current ?? 0) + 1}행의 실제 후보 비용 · 선택{" "}
            {(a.chosen ?? 0) + 1}군집
          </h4>
          <p className="small">
            열: 제곱거리 / ML 비용 / CL 비용 / 합계. 현재 다른 행 label로
            계산하며 유한 비용 위반을 허용합니다.
          </p>
          <NumericTable
            title="후보 거리·제약 비용"
            values={a.candidates.map((v) => [
              v.distanceSquared,
              v.mustLinkCost,
              v.cannotLinkCost,
              v.total,
            ])}
          />
        </>
      )}
      <NumericTable title="원래 ML 관계 (0기반)" values={a.mustLink} />
      <NumericTable title="원래 CL 관계 (0기반)" values={a.cannotLink} />
      <NumericTable
        title="행별 ML 성분 (0기반)"
        values={a.componentIds.map((v) => [v])}
      />
      <NumericTable
        title="유도 CL 성분 관계 (0기반)"
        values={a.componentCannotLink}
      />
      <p className="small">
        반복별 실제 J는 위 목적함수 차트에서 확인합니다. 세부 수치와
        전진/되감기는 같은 실제 Trace를 사용합니다.
      </p>
    </section>
  );
}
