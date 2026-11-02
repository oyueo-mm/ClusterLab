import { useState } from "react";
/** Bounded presentation window; all original rows/columns remain selectable. */
export function NumericTable({
  title,
  values,
}: {
  title: string;
  values: number[][];
}) {
  const [row, setRow] = useState(0),
    [column, setColumn] = useState(0);
  if (!values.length) return null;
  const r = Math.max(0, Math.min(row, values.length - 1)),
    columns = values[0].length,
    c = Math.max(0, Math.min(column, columns - 1));
  return (
    <section className="chart">
      <h4>{title}</h4>
      <p className="small">
        전체 {values.length}행 × {columns}열 중 최대 12×8 표시
      </p>
      <div className="matrix-controls">
        <label>
          시작 행
          <input
            aria-label={`${title} 시작 행`}
            type="number"
            min={1}
            max={values.length}
            value={r + 1}
            onChange={(e) =>
              setRow(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
            }
          />
        </label>
        <label>
          시작 열
          <input
            aria-label={`${title} 시작 열`}
            type="number"
            min={1}
            max={columns}
            value={c + 1}
            onChange={(e) =>
              setColumn(Math.max(0, Math.trunc(+e.target.value || 1) - 1))
            }
          />
        </label>
      </div>
      <div className="matrix-scroll">
        <table aria-label={title}>
          <thead>
            <tr>
              <th>행/열</th>
              {values[0].slice(c, c + 8).map((_, j) => (
                <th key={j}>{c + j + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {values.slice(r, r + 12).map((v, i) => (
              <tr key={r + i}>
                <th>{r + i + 1}</th>
                {v.slice(c, c + 8).map((number, j) => (
                  <td key={j} title={String(number)}>
                    {number.toPrecision(6)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
