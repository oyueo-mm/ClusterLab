import { useState } from "react";
import type { Dataset } from "../engine/dataset";
interface Props {
  data: Dataset;
  onChange: (data: Dataset) => void;
  onError: (message: string) => void;
}
/** Fixed visible window, not a cap on stored/computed rows or columns. */
export function DatasetEditor({ data, onChange, onError }: Props) {
  const [start, setStart] = useState(0),
    [column, setColumn] = useState(0),
    [edgeStart, setEdgeStart] = useState(0);
  const numeric = (text: string) => {
    if (!text.trim() || !Number.isFinite(+text))
      throw new Error("셀에는 유한한 숫자가 필요합니다.");
    return +text;
  };
  const update = (fn: () => Dataset) => {
    try {
      onChange(fn());
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };
  let count = 0,
    width = 0,
    read: (row: number, col: number) => string | number | undefined,
    header: (col: number) => string,
    write: (row: number, col: number, value: string) => Dataset;
  if (
    data.kind === "numeric" ||
    data.kind === "categorical" ||
    data.kind === "matrix"
  ) {
    count = data.values.length;
    width = data.values[0].length;
    read = (r, c) => data.values[r][c];
    header = (c) =>
      (data.kind === "matrix"
        ? data.columnNames?.[c]
        : data.featureNames?.[c]) ?? `특성 ${c + 1}`;
    write = (r, c, text) =>
      ({
        ...data,
        values: data.values.map((row, i) =>
          i === r
            ? row.map((v, j) =>
                j === c
                  ? data.kind === "categorical"
                    ? text
                    : numeric(text)
                  : v,
              )
            : row,
        ),
      }) as Dataset;
  } else if (data.kind === "mixed") {
    const d = data.numeric[0].length;
    count = data.numeric.length;
    width = d + data.categorical[0].length;
    read = (r, c) => (c < d ? data.numeric[r][c] : data.categorical[r][c - d]);
    header = (j) => `${j < d ? "수치" : "범주"} ${j < d ? j + 1 : j - d + 1}`;
    write = (r, c, text) =>
      c < d
        ? {
            ...data,
            numeric: data.numeric.map((row, i) =>
              i === r ? row.map((v, j) => (j === c ? numeric(text) : v)) : row,
            ),
          }
        : {
            ...data,
            categorical: data.categorical.map((row, i) =>
              i === r ? row.map((v, j) => (j === c - d ? text : v)) : row,
            ),
          };
  } else if (data.kind === "stream") {
    count = data.samples.length;
    width = 1 + data.samples[0].values.length;
    read = (r, c) =>
      c === 0 ? data.samples[r].time : data.samples[r].values[c - 1];
    header = (c) => (c === 0 ? "시각" : `특성 ${c}`);
    write = (r, c, text) => ({
      ...data,
      samples: data.samples.map((s, i) =>
        i !== r
          ? s
          : c === 0
            ? { ...s, time: numeric(text) }
            : {
                ...s,
                values: s.values.map((v, j) =>
                  j === c - 1 ? numeric(text) : v,
                ),
              },
      ),
    });
  } else if (data.kind === "graph") {
    const position = (i: number) =>
      data.nodes[i].position ?? {
        x: 0.5 + 0.35 * Math.cos((2 * Math.PI * i) / data.nodes.length),
        y: 0.5 + 0.35 * Math.sin((2 * Math.PI * i) / data.nodes.length),
      };
    count = data.nodes.length;
    width = 3;
    read = (r, c) =>
      c === 0 ? data.nodes[r].id : c === 1 ? position(r).x : position(r).y;
    header = (c) => ["노드 ID", "표시 X", "표시 Y"][c];
    write = (r, c, text) => {
      const old = data.nodes[r].id;
      return {
        ...data,
        nodes: data.nodes.map((n, i) =>
          i !== r
            ? n
            : c === 0
              ? { ...n, id: text }
              : {
                  ...n,
                  position: {
                    ...position(i),
                    [c === 1 ? "x" : "y"]: numeric(text),
                  },
                },
        ),
        edges:
          c !== 0
            ? data.edges
            : data.edges.map((e) =>
                e.source !== old && e.target !== old
                  ? e
                  : {
                      ...e,
                      source: e.source === old ? text : e.source,
                      target: e.target === old ? text : e.target,
                    },
              ),
      };
    };
  } else if (data.kind === "timeseries") {
    count = data.series.length;
    width = 1 + data.series.reduce((m, s) => Math.max(m, s.values.length), 0);
    read = (r, c) =>
      c === 0 ? data.series[r].id : data.series[r].values[c - 1];
    header = (c) => (c === 0 ? "시계열 ID" : `값 ${c}`);
    write = (r, c, text) => ({
      ...data,
      series: data.series.map((s, i) =>
        i !== r
          ? s
          : c === 0
            ? { ...s, id: text }
            : {
                ...s,
                values: s.values.map((v, j) =>
                  j === c - 1 ? numeric(text) : v,
                ),
              },
      ),
    });
  } else return <p className="small">제약 관계는 JSON 원본에서 편집합니다.</p>;
  const first = Math.min(start, Math.max(0, count - 1)),
    left = Math.min(column, Math.max(0, width - 1));
  const edgeFirst =
    data.kind === "graph"
      ? Math.min(edgeStart, Math.max(0, data.edges.length - 1))
      : 0;
  const cell = (
    value: string | number | undefined,
    row: number,
    col: number,
    label: string,
    save: (value: string) => void,
  ) =>
    value === undefined ? (
      <span title="이 행에는 해당 시각의 표본이 없습니다. 새 시각·값은 JSON에서 함께 편집하세요.">
        표본 없음
      </span>
    ) : (
      <input
        key={`${row}-${col}-${value}`}
        aria-label={label}
        defaultValue={String(value)}
        onBlur={(e) => {
          if (e.target.value !== String(value)) save(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    );
  return (
    <details className="dataset-table-editor" open>
      <summary>
        {data.kind === "graph" ? "노드 편집" : "속성 표 편집"} · 전체 {count}행
      </summary>
      <p className="small">
        표시 창만 16행×8열로 나눕니다. 전체 원본으로 계산하며 셀 편집은 포커스를
        옮기거나 Enter로 적용합니다.
      </p>
      <div className="matrix-controls">
        <label>
          시작 행{" "}
          <input
            aria-label="원본 표 시작 행"
            type="number"
            min={1}
            max={count}
            value={first + 1}
            onChange={(e) =>
              setStart(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
            }
          />
        </label>
        <label>
          시작 열{" "}
          <input
            aria-label="원본 표 시작 열"
            type="number"
            min={1}
            max={width}
            value={left + 1}
            onChange={(e) =>
              setColumn(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
            }
          />
        </label>
      </div>
      <div className="matrix-scroll">
        <table aria-label="원본 속성 편집">
          <thead>
            <tr>
              <th>행</th>
              {Array.from({ length: Math.min(8, width - left) }, (_, j) => (
                <th key={j}>{header(left + j)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.min(16, count - first) }, (_, i) => (
              <tr key={first + i}>
                <th>{first + i + 1}</th>
                {Array.from({ length: Math.min(8, width - left) }, (_, j) => (
                  <td key={left + j}>
                    {cell(
                      read(first + i, left + j),
                      first + i,
                      left + j,
                      `원본 ${first + i + 1}행 ${left + j + 1}열`,
                      (text) => update(() => write(first + i, left + j, text)),
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.kind === "graph" && (
        <>
          <h3>실제 간선 편집</h3>
          <label>
            간선 시작{" "}
            <input
              aria-label="간선 시작 행"
              type="number"
              min={1}
              max={Math.max(1, data.edges.length)}
              value={edgeFirst + 1}
              onChange={(e) =>
                setEdgeStart(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
              }
            />
          </label>
          <div className="matrix-scroll">
            <table aria-label="원본 간선 편집">
              <thead>
                <tr>
                  <th>출발 ID</th>
                  <th>도착 ID</th>
                  <th>가중치</th>
                  <th>삭제</th>
                </tr>
              </thead>
              <tbody>
                {data.edges.slice(edgeFirst, edgeFirst + 16).map((edge, i) => (
                  <tr key={`${edgeFirst + i}-${edge.source}-${edge.target}`}>
                    {[edge.source, edge.target, edge.weight].map((v, j) => (
                      <td key={j}>
                        {cell(
                          v,
                          edgeFirst + i,
                          j,
                          `간선 ${edgeFirst + i + 1} ${["출발", "도착", "가중치"][j]}`,
                          (text) =>
                            update(() => ({
                              ...data,
                              edges: data.edges.map((e, k) =>
                                k !== edgeFirst + i
                                  ? e
                                  : {
                                      ...e,
                                      [j === 0
                                        ? "source"
                                        : j === 1
                                          ? "target"
                                          : "weight"]:
                                        j === 2 ? numeric(text) : text,
                                    },
                              ),
                            })),
                        )}
                      </td>
                    ))}
                    <td>
                      <button
                        aria-label={`간선 ${edgeFirst + i + 1} 삭제`}
                        onClick={() =>
                          update(() => ({
                            ...data,
                            edges: data.edges.filter(
                              (_, j) => j !== edgeFirst + i,
                            ),
                          }))
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
          <button
            onClick={() =>
              update(() => ({
                ...data,
                edges: [
                  ...data.edges,
                  {
                    source: data.nodes[0].id,
                    target: data.nodes[Math.min(1, data.nodes.length - 1)].id,
                    weight: 1,
                  },
                ],
              }))
            }
          >
            간선 추가
          </button>
          <button
            onClick={() =>
              update(() => {
                let id = `v${data.nodes.length}`;
                while (data.nodes.some((n) => n.id === id)) id += "_";
                return { ...data, nodes: [...data.nodes, { id }] };
              })
            }
          >
            노드 추가
          </button>
        </>
      )}
      {data.kind === "stream" && (
        <button
          onClick={() =>
            update(() => {
              const last = data.samples.at(-1)!;
              return {
                ...data,
                samples: [
                  ...data.samples,
                  { time: last.time + 1, values: [...last.values] },
                ],
              };
            })
          }
        >
          관측 1개 유입
        </button>
      )}
    </details>
  );
}
