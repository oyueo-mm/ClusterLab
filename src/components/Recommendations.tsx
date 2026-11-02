import { useMemo, useState } from "react";
import type { Algorithm, Params } from "../engine/types";
import type { Dataset } from "../engine/dataset";
import {
  datasetRegistry,
  generateForRecommendation,
  recommendations,
  recommendationParams,
} from "../data/recommendations";
import { estimateResources } from "../engine/resources";
import { DatasetPreview } from "./DatasetPreview";
import { readPreference, writePreference } from "../lab/storage";
export function Recommendations({
  algorithm,
  onApply,
}: {
  algorithm: Algorithm;
  onApply: (id: string, data: Dataset, params?: Params) => void;
}) {
  const [selected, setSelected] = useState(() =>
      readPreference(`recommendation:${algorithm}`, 0),
    ),
    [withParams, setWithParams] = useState(false);
  const entries = recommendations[algorithm],
    entry = entries[Math.min(selected, entries.length - 1)];
  const meta = datasetRegistry[entry.datasetId];
  const [count, setCount] = useState<number>();
  const [draft, setDraft] = useState("");
  const actualCount = count ?? entry.count;
  const generated = useMemo(() => {
    try {
      return {
        data: generateForRecommendation(algorithm, entry, {
          count: actualCount,
        }),
        error: "",
      };
    } catch (e) {
      return {
        data: undefined,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [algorithm, entry, actualCount]);
  const estimate = estimateResources(
    algorithm,
    actualCount,
    recommendationParams(algorithm, entry),
  );
  const { data } = generated;
  return (
    <section className="recommendations" aria-label="알고리즘 추천 데이터셋">
      <h3>추천 데이터셋</h3>
      <select
        aria-label="추천 데이터셋"
        value={Math.min(selected, entries.length - 1)}
        onChange={(e) => {
          setSelected(+e.target.value);
          setCount(undefined);
          setDraft("");
          writePreference(`recommendation:${algorithm}`, +e.target.value);
        }}
      >
        {entries.map((e, i) => (
          <option key={i} value={i}>
            {
              {
                default: "대표",
                additional: "비교",
                limit: "한계",
                boundary: "경계",
              }[e.role]
            }{" "}
            · {datasetRegistry[e.datasetId].name}
          </option>
        ))}
      </select>
      <div className="recommendation-count">
        <label>
          데이터 수{" "}
          <input
            aria-label="추천 데이터 수"
            type="number"
            min="2"
            step="1"
            value={draft || String(actualCount)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              const n = Number(draft);
              if (Number.isSafeInteger(n) && n >= 2) {
                setCount(n);
                setDraft("");
              }
            }}
          />
        </label>
        <div className="count-presets">
          {[50, 100, 200, 400, 1000].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setCount(n);
                setDraft("");
              }}
            >
              {n.toLocaleString()}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setCount(undefined);
              setDraft("");
            }}
          >
            추천 {entry.count}
          </button>
        </div>
        <p className="small">
          {actualCount.toLocaleString()}개 · 작업 메모리 추정{" "}
          {(estimate.workingBytes / 1048576).toFixed(1)} MiB · 연산량 지표{" "}
          {estimate.work.toExponential(1)} · Trace 예산 64 MiB. 행렬·계층 연산은
          데이터 수에 따라 제곱 이상으로 증가할 수 있습니다.
        </p>
      </div>
      {data && <DatasetPreview data={data} />}
      {generated.error && <p role="alert">{generated.error}</p>}
      <b>{entry.purpose}</b>
      <p>{entry.observe}</p>
      <p className="small">
        시드 {meta.seed} · {meta.description}
      </p>
      <label>
        <input
          type="checkbox"
          checked={withParams}
          onChange={(e) => setWithParams(e.target.checked)}
        />{" "}
        추천 파라미터도 적용
      </label>
      {withParams && (
        <p className="small">
          이 알고리즘의 기본 설정과 추천값을 적용합니다:{" "}
          {JSON.stringify(entry.params)}
        </p>
      )}
      <button
        className="primary"
        disabled={!data}
        onClick={() =>
          onApply(
            entry.datasetId,
            data!,
            withParams ? recommendationParams(algorithm, entry) : undefined,
          )
        }
      >
        이 데이터셋 적용
      </button>
    </section>
  );
}
