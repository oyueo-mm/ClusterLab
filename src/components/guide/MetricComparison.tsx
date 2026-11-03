import { useMemo, useState } from "react";
import type { ConstrainedDataset } from "../../engine/dataset";
import { displayPoints } from "../../engine/dataset";
import type { Params, Trace } from "../../engine/types";
import { stateAt } from "../../engine/trace";
import { useExperiment } from "../../animation/useExperiment";
import { NumericTable } from "../NumericTable";
function Run({
  data,
  params,
  trace,
}: {
  data: ConstrainedDataset;
  params: Params;
  trace: Trace | null;
}) {
  const points = useMemo(() => displayPoints(data), [data]),
    pck = useExperiment("PCKMeans", points, params, { dataset: data });
  const m = useMemo(
      () => (trace ? stateAt(trace, trace.steps.length).analysis : null),
      [trace],
    ),
    p = useMemo(
      () =>
        pck.trace ? stateAt(pck.trace, pck.trace.steps.length).analysis : null,
      [pck.trace],
    );
  return (
    <section aria-label="실제 PCK MPCK 비교">
      <p>
        같은 원본·ML/CL·시드·w로 각각 실제 Worker를 실행합니다. PCK의 고정 위반
        비용과 MPCK의 거리 가중 비용은 다르므로 J 숫자를 같은 척도로 비교하지
        않습니다. 두 군집의 ML 평균 초기화가 같은 예제입니다.
      </p>
      {m?.kind === "metric-pairwise" && (
        <>
          <h4>MPCKMeans · 대각 학습</h4>
          <p>
            J {m.objective.toPrecision(8)} · 거리{" "}
            {m.distanceCost.toPrecision(7)} · −logdet{" "}
            {m.logDetCost.toPrecision(7)} · ML {m.mustLinkCost.toPrecision(7)} ·
            CL {m.cannotLinkCost.toPrecision(7)}
          </p>
          <NumericTable title="비교 MPCK 학습 A" values={m.metrics} />
          <NumericTable title="비교 MPCK 중심" values={m.centroids} />
        </>
      )}
      {pck.error ? (
        <p role="alert">PCK 비교: {pck.error}</p>
      ) : p?.kind === "pairwise" ? (
        <>
          <h4>PCKMeans · 고정 Euclidean</h4>
          <p>
            J {p.objective.toPrecision(8)} · SSE {p.distanceCost.toPrecision(7)}{" "}
            · ML {p.mustLinkCost.toPrecision(7)} · CL{" "}
            {p.cannotLinkCost.toPrecision(7)}
          </p>
          <NumericTable title="비교 PCK 중심" values={p.centroids} />
        </>
      ) : (
        <p role="status">PCK 실제 계산 중</p>
      )}
      <p>
        위 파라미터의 w를 바꾸면 두 모형 모두 다시 계산합니다. 아래 이벤트
        보기와 실험실 이동은 MPCK의 실제 Trace를 사용합니다.
      </p>
    </section>
  );
}
export function MetricComparison(props: {
  data: ConstrainedDataset;
  params: Params;
  trace: Trace | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>같은 데이터의 실제 PCK·MPCK 비교</summary>
      {open && <Run {...props} />}
    </details>
  );
}
