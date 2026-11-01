import { useState } from "react";
import type { Algorithm, Params } from "../engine/types";
import type { Dataset } from "../engine/dataset";
import {
  datasetRegistry,
  generateRecommended,
  recommendations,
  recommendationParams,
} from "../data/recommendations";
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
  const data = generateRecommended(entry.datasetId);
  return (
    <section className="recommendations" aria-label="알고리즘 추천 데이터셋">
      <h3>추천 데이터셋</h3>
      <select
        aria-label="추천 데이터셋"
        value={Math.min(selected, entries.length - 1)}
        onChange={(e) => {
          setSelected(+e.target.value);
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
      <DatasetPreview data={data} />
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
        onClick={() =>
          onApply(
            entry.datasetId,
            data,
            withParams ? recommendationParams(algorithm, entry) : undefined,
          )
        }
      >
        이 데이터셋 적용
      </button>
    </section>
  );
}
