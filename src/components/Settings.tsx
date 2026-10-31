import type { Algorithm, Params } from "../engine/types";
import { fields } from "../engine/parameters";
export function Settings({
  algorithm,
  value,
  onChange,
}: {
  algorithm: Algorithm;
  value: Params;
  onChange: (o: Params) => void;
}) {
  return (
    <>
      {fields[algorithm].map((f) => (
        <label className="field" key={f.key}>
          <span>{f.label}</span>
          {f.options ? (
            <select
              aria-label={f.label}
              value={String(value[f.key])}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
            >
              {f.options.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          ) : (
            <input
              aria-label={f.label}
              type="number"
              min={f.min}
              max={f.max}
              step={f.step ?? 1}
              value={
                Number.isFinite(Number(value[f.key]))
                  ? Number(value[f.key])
                  : ""
              }
              onChange={(e) => {
                if (e.target.value === "") {
                  if (f.key === "bandwidth")
                    onChange({ ...value, bandwidth: NaN });
                  return;
                }
                const n = +e.target.value;
                if (
                  f.key === "bandwidth" ||
                  (n >= (f.min ?? 0) && n <= (f.max ?? Infinity))
                )
                  onChange({ ...value, [f.key]: n });
              }}
            />
          )}
          <small>{f.hint}</small>
        </label>
      ))}
      {algorithm === "BIRCH" && (
        <label className="check">
          <input
            type="checkbox"
            checked={value.finalClustering}
            onChange={(e) =>
              onChange({ ...value, finalClustering: e.target.checked })
            }
          />
          최종 CF 가중 Ward 병합
        </label>
      )}
      {algorithm !== "Mean Shift" && (
        <details>
          <summary>재현성 설정</summary>
          <label className="field">
            <span>알고리즘 난수 시드</span>
            <input
              type="number"
              value={value.seed}
              onChange={(e) => onChange({ ...value, seed: +e.target.value })}
            />
          </label>
        </details>
      )}
    </>
  );
}
