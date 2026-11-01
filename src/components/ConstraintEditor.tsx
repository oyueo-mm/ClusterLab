import { useState } from "react";
import type { ConstrainedDataset } from "../engine/dataset";
import { DatasetEditor } from "./DatasetEditor";
export function ConstraintEditor({
  data,
  onChange,
  onError,
}: {
  data: ConstrainedDataset;
  onChange: (data: ConstrainedDataset) => void;
  onError: (message: string) => void;
}) {
  const [starts, setStarts] = useState({ mustLink: 0, cannotLink: 0 });
  const update = (value: ConstrainedDataset) => {
    try {
      onChange(value);
      return true;
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
      return false;
    }
  };
  const n = data.data.values.length;
  const addPair = (kind: "mustLink" | "cannotLink") => {
    if (data[kind].length) {
      update({ ...data, [kind]: [...data[kind], [...data[kind][0]]] });
      return;
    }
    if (kind === "mustLink") {
      update({ ...data, mustLink: [[0, 0]] });
      return;
    }
    const parents = Array.from({ length: n }, (_, i) => i),
      root = (i: number): number => {
        while (parents[i] !== i) {
          parents[i] = parents[parents[i]];
          i = parents[i];
        }
        return i;
      };
    for (const [a, b] of data.mustLink) parents[root(a)] = root(b);
    const other = parents.findIndex((_, i) => root(i) !== root(0));
    if (other < 0) {
      onError(
        "모든 행이 같은 Must-Link 성분이므로 유효한 Cannot-Link를 추가할 수 없습니다.",
      );
      return;
    }
    update({ ...data, cannotLink: [[0, other]] });
  };
  return (
    <section className="constraint-editor" aria-label="하드 제약 편집">
      <DatasetEditor
        data={data.data}
        onError={onError}
        onChange={(value) => {
          if (value.kind === "numeric") update({ ...data, data: value });
        }}
      />
      <p className="small">
        관계 표는 원본 행 번호를 1부터 입력합니다. JSON 인덱스는 0부터입니다.
        Must-Link는 같은 군집, Cannot-Link는 서로 다른 군집을 요구합니다.
      </p>
      {(["mustLink", "cannotLink"] as const).map((kind) => {
        const pairs = data[kind],
          name = kind === "mustLink" ? "Must-Link" : "Cannot-Link",
          start = Math.max(
            0,
            Math.min(starts[kind], Math.max(0, pairs.length - 1)),
          );
        return (
          <details open key={kind}>
            <summary>
              {name} · 전체 {pairs.length}개
            </summary>
            <label>
              시작 관계{" "}
              <input
                aria-label={`${name} 시작 관계`}
                type="number"
                min={1}
                max={Math.max(1, pairs.length)}
                value={start + 1}
                onChange={(e) =>
                  setStarts({
                    ...starts,
                    [kind]: Math.max(0, Math.trunc(+e.target.value || 1) - 1),
                  })
                }
              />
            </label>
            <div className="matrix-scroll">
              <table aria-label={`${name} 관계 편집`}>
                <thead>
                  <tr>
                    <th>시작 행</th>
                    <th>끝 행</th>
                    <th>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.slice(start, start + 16).map((pair, i) => (
                    <tr key={`${start + i}:${pair.join(",")}`}>
                      {pair.map((value, j) => (
                        <td key={j}>
                          <input
                            aria-label={`${name} ${start + i + 1} ${j === 0 ? "시작" : "끝"} 행`}
                            type="number"
                            min={1}
                            max={n}
                            defaultValue={value + 1}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            onBlur={(e) => {
                              const next = Number(e.currentTarget.value) - 1;
                              if (
                                !Number.isSafeInteger(next) ||
                                next < 0 ||
                                next >= n
                              ) {
                                onError(`관계 행은 1–${n}의 정수여야 합니다.`);
                                e.currentTarget.value = String(value + 1);
                                return;
                              }
                              if (
                                next !== value &&
                                !update({
                                  ...data,
                                  [kind]: pairs.map((p, k) =>
                                    k === start + i
                                      ? (p.map((v, c) =>
                                          c === j ? next : v,
                                        ) as [number, number])
                                      : p,
                                  ),
                                })
                              )
                                e.currentTarget.value = String(value + 1);
                            }}
                          />
                        </td>
                      ))}
                      <td>
                        <button
                          aria-label={`${name} ${start + i + 1} 삭제`}
                          onClick={() =>
                            update({
                              ...data,
                              [kind]: pairs.filter((_, j) => j !== start + i),
                            })
                          }
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => addPair(kind)}>{name} 추가</button>
          </details>
        );
      })}
    </section>
  );
}
