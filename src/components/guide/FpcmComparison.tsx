import { useMemo, useState } from "react";
import type { NumericDataset } from "../../engine/dataset";
import { displayPoints } from "../../engine/dataset";
import { algorithmDefaults, type Params, type Trace } from "../../engine/types";
import { stateAt } from "../../engine/trace";
import { useExperiment } from "../../animation/useExperiment";
import { NumericTable } from "../NumericTable";
function ComparisonRun({
  data,
  params,
  trace,
}: {
  data: NumericDataset;
  params: Params;
  trace: Trace | null;
}) {
  const points = useMemo(() => displayPoints(data), [data]),
    pcmParams = useMemo(
      () => ({
        ...algorithmDefaults("Possibilistic C-Means"),
        ...params,
        pcmScaleMode: "fcm",
        scaleCoefficient: 1,
      }),
      [params],
    ),
    pcm = useExperiment("Possibilistic C-Means", points, pcmParams, {
      dataset: data,
    });
  const a = useMemo(
      () => (trace ? stateAt(trace, trace.steps.length).analysis : null),
      [trace],
    ),
    p = useMemo(
      () =>
        pcm.trace ? stateAt(pcm.trace, pcm.trace.steps.length).analysis : null,
      [pcm.trace],
    );
  return (
    <section aria-label="실제 FCM PCM FPCM 비교">
      <p className="small">
        같은 원본 {data.values.length}행·{data.values[0].length}차원·시드에서
        실행한 각 모형의 최종 값입니다. FCM은 원본 ND 준비 계산이며 기존2D FCM의
        초기화와 구분합니다. PCM은 Ω=FCM 가중분산, κ=1입니다. 목적함수 정의가
        서로 다릅니다.
      </p>
      {a?.kind === "fuzzy-possibilistic" && (
        <>
          <h4>FCM 기준 · U 행 합1</h4>
          <p>FCM 목적 {a.warmObjective.toPrecision(8)}</p>
          <NumericTable title="비교 FCM U" values={a.warmMemberships} />
          <h4>FPCM1997 · U 행 / T 열 합1</h4>
          <p>FPCM 목적 {a.objective.toPrecision(8)}</p>
          <NumericTable title="비교 FPCM U" values={a.memberships} />
          <NumericTable title="비교 FPCM T" values={a.typicalities} />
          <NumericTable
            title="비교 FPCM T 열 합"
            values={a.tColumnSums.map((v) => [v])}
          />
        </>
      )}
      {pcm.error ? (
        <p role="alert">PCM 비교: {pcm.error}</p>
      ) : p?.kind === "possibilistic" ? (
        <>
          <h4>PCM1993 · 독립 T</h4>
          <p>
            PCM 목적 {p.objective.toPrecision(8)} · 행/열 합을 정규화하지
            않습니다.
          </p>
          <NumericTable title="비교 PCM T" values={p.typicalities} />
          <NumericTable
            title="비교 PCM T 행 합"
            values={p.rowSums.map((v) => [v])}
          />
        </>
      ) : (
        <p role="status">같은 원본의 실제 PCM Worker 계산 중</p>
      )}
    </section>
  );
}
export function FpcmComparison(props: {
  data: NumericDataset;
  params: Params;
  trace: Trace | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="fpcm-comparison"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>같은 원본의 실제 FCM·PCM·FPCM 비교</summary>
      {open && <ComparisonRun {...props} />}
    </details>
  );
}
