import { displayPoints, type Dataset } from "../engine/dataset";
import { palette } from "../animation/renderer";
import type { Center } from "../engine/types";
import type { Bicluster } from "../engine/matrixTypes";
export function DatasetPreview({
  data,
  labels,
  caption,
  centers,
  biclusters,
}: {
  data: Dataset;
  labels?: number[];
  caption?: string;
  centers?: Center[];
  biclusters?: Bicluster[];
}) {
  const color = (i: number) =>
    labels
      ? labels[i] < 0
        ? "#a3ada7"
        : palette[labels[i] % palette.length]
      : "#57856a";
  const points = ["matrix", "timeseries", "categorical"].includes(data.kind)
    ? []
    : displayPoints(data);
  const categoricalGroups =
    data.kind === "categorical" && labels
      ? [...new Set(labels.filter((label) => label >= 0))].slice(0, 4)
      : [];
  let view;
  if (data.kind === "matrix") {
    const rows = data.values.slice(0, 24).map((row) => row.slice(0, 32)),
      cols = rows[0].length;
    const max = Math.max(1, ...rows.flat().map(Math.abs));
    view = rows.flatMap((row, i) =>
      row
        .slice(0, 32)
        .map((v, j) => (
          <rect
            key={`${i}-${j}`}
            x={10 + (j * 280) / Math.min(cols, 32)}
            y={10 + (i * 130) / rows.length}
            width={280 / Math.min(cols, 32) - 1}
            height={130 / rows.length - 1}
            fill={
              biclusters?.some(
                (b) => b.rows.includes(i) && b.columns.includes(j),
              )
                ? palette[
                    biclusters.findIndex(
                      (b) => b.rows.includes(i) && b.columns.includes(j),
                    ) % palette.length
                  ]
                : color(i)
            }
            opacity={0.1 + (0.9 * Math.abs(v)) / max}
          />
        )),
    );
  } else if (data.kind === "timeseries") {
    const series = data.series.slice(0, 16),
      max = Math.max(1, ...series.flatMap((s) => s.values.map(Math.abs)));
    view = series.map((s, i) => (
      <polyline
        key={s.id}
        fill="none"
        stroke={color(i)}
        opacity=".65"
        strokeWidth="1.6"
        points={s.values
          .map(
            (v, j) =>
              `${10 + (280 * j) / Math.max(1, s.values.length - 1)},${75 - (v / max) * 60}`,
          )
          .join(" ")}
      />
    ));
  } else if (data.kind === "categorical") {
    const columns = data.values[0].length;
    const sample = data.values.slice(0, 1000);
    view = Array.from({ length: Math.min(6, columns) }, (_, j) => {
      const frequencies = new Map<string, number>();
      sample.forEach((row) =>
        frequencies.set(row[j], (frequencies.get(row[j]) ?? 0) + 1),
      );
      const entries = [...frequencies.entries()];
      const values =
        entries.length <= 12
          ? entries
          : [
              ...entries.slice(0, 11),
              [
                "나머지",
                entries.slice(11).reduce((sum, [, count]) => sum + count, 0),
              ] as [string, number],
            ];
      let y = 140;
      return values.map(([token, count], k) => {
        const h = (125 * count) / sample.length;
        y -= h;
        return (
          <rect
            key={`${j}-${token}`}
            x={15 + (j * 270) / Math.min(6, columns)}
            y={y}
            width={220 / Math.min(6, columns)}
            height={h - 1}
            fill={palette[k % palette.length]}
          />
        );
      });
    });
  } else if (data.kind === "stream") {
    const rows = data.samples,
      start = rows[0].time,
      duration = Math.max(1, rows.at(-1)!.time - start);
    const vals = rows.map((s) => s.values[0]),
      low = Math.min(...vals),
      span = Math.max(0.01, Math.max(...vals) - low);
    view = rows
      .slice(0, 120)
      .map((s, i) => (
        <circle
          key={i}
          cx={10 + ((s.time - start) / duration) * 280}
          cy={135 - ((s.values[0] - low) / span) * 120}
          r="2.8"
          fill={color(i)}
        />
      ));
  } else {
    view = (
      <>
        {data.kind === "graph" &&
          data.edges.slice(0, 240).map((e, i) => {
            const a = points[data.nodes.findIndex((n) => n.id === e.source)],
              b = points[data.nodes.findIndex((n) => n.id === e.target)];
            return (
              <line
                key={i}
                x1={10 + a.x * 280}
                y1={140 - a.y * 130}
                x2={10 + b.x * 280}
                y2={140 - b.y * 130}
                stroke="#a5b9ac"
                strokeWidth=".8"
              />
            );
          })}
        {points.slice(0, 160).map((p, i) => (
          <circle
            key={i}
            cx={10 + p.x * 280}
            cy={140 - p.y * 130}
            r={data.kind === "graph" ? 4 : 2.7}
            fill={color(i)}
            opacity=".85"
          />
        ))}
      </>
    );
  }
  const description =
    caption ??
    {
      numeric: "원본 첫 두 축의 2D 표시",
      mixed: "수치 특성의 첫 두 축",
      categorical: "범주별 속성 분포",
      graph: "실제 노드·간선",
      matrix: "원본 행렬 히트맵",
      timeseries: "원본 시계열 파형",
      stream: "시간에 따른 첫 번째 특성",
      constrained: "수치 특성과 제약 데이터",
    }[data.kind];
  return (
    <figure className="dataset-preview">
      <svg viewBox="0 0 300 150" role="img" aria-label={description}>
        {view}
        {categoricalGroups.map((label, i) => (
          <text
            key={label}
            x={10 + i * 72}
            y="10"
            fontSize="8"
            fill={palette[label % palette.length]}
          >
            군집 {label + 1}:{" "}
            {labels!.filter((value) => value === label).length}행
          </text>
        ))}
        {data.kind === "numeric" &&
          data.display &&
          centers
            ?.filter((c) => c.cov)
            .map((c, i) => {
              const [xx, xy, yy] = c.cov!,
                disc = Math.sqrt((xx - yy) ** 2 + 4 * xy ** 2);
              const a = Math.sqrt(Math.max(0, (xx + yy + disc) / 2)),
                b = Math.sqrt(Math.max(0, (xx + yy - disc) / 2));
              const angle = (Math.atan2(2 * xy, xx - yy) * 90) / Math.PI;
              return (
                <g
                  key={i}
                  transform={`translate(${10 + c.x * 280} ${140 - c.y * 130}) scale(280 -130) rotate(${angle})`}
                >
                  <ellipse
                    rx={a * 2}
                    ry={b * 2}
                    fill="none"
                    stroke={palette[i % palette.length]}
                    strokeWidth=".004"
                    opacity=".6"
                  />
                </g>
              );
            })}
      </svg>
      <figcaption>
        {description}
        {data.kind === "matrix"
          ? ` · 표시 ${Math.min(24, data.values.length)}행×${Math.min(32, data.values[0].length)}열`
          : data.kind === "timeseries"
            ? ` · 표시 ${Math.min(16, data.series.length)}개 파형`
            : data.kind === "categorical"
              ? ` · 표시 표본 ${Math.min(1000, data.values.length)}행`
              : ""}
      </figcaption>
    </figure>
  );
}
