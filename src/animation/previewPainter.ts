import { displayPoints, type Dataset } from "../engine/dataset";
import type { PreviewFrame } from "../engine/preview";
import type { Point } from "../engine/types";
import { palette, interpolateCenters } from "./renderer";

const color = (label: number) =>
  label < 0 ? "#a3ada7" : palette[label % palette.length];
function membership(weights: number[] | undefined, label: number) {
  if (!weights?.length) return color(label);
  const rgb = [0, 0, 0];
  weights.forEach((weight, i) =>
    [1, 3, 5].forEach(
      (offset, j) =>
        (rgb[j] +=
          weight *
          parseInt(palette[i % palette.length].slice(offset, offset + 2), 16)),
    ),
  );
  return `rgb(${rgb.map(Math.round).join(",")})`;
}
export function previewPainter(canvas: HTMLCanvasElement, data: Dataset) {
  const ctx = canvas.getContext("2d")!;
  const points = displayPoints(data);
  const rows = data.kind === "numeric" ? data.values : undefined;
  const axes = [0, Math.min(1, (rows?.[0].length ?? 2) - 1)];
  const lows = axes.map((axis) =>
    rows ? Math.min(...rows.map((row) => row[axis])) : 0,
  );
  const highs = axes.map((axis) =>
    rows ? Math.max(...rows.map((row) => row[axis])) : 1,
  );
  const centersAt = (frame: PreviewFrame) =>
    frame.sequential
      ? frame.sequential.centroids.map((row, i) => ({
          id: i,
          label: i,
          x:
            data.kind === "numeric" && data.display
              ? row[axes[0]]
              : 0.1 +
                (0.8 * (row[axes[0]] - lows[0])) / (highs[0] - lows[0] || 1),
          y:
            data.kind === "numeric" && data.display
              ? row[axes[1]]
              : 0.1 +
                (0.8 * (row[axes[1]] - lows[1])) / (highs[1] - lows[1] || 1),
        }))
      : frame.centers;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = 300 * ratio;
  canvas.height = 150 * ratio;
  ctx.scale(ratio, ratio);
  const xy = (p: Point) => [12 + p.x * 276, 138 - p.y * 126];
  const line = (a: Point, b: Point, stroke: string, width = 1) => {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(...(xy(a) as [number, number]));
    ctx.lineTo(...(xy(b) as [number, number]));
    ctx.stroke();
  };
  const dot = (p: Point, radius: number, fill: string, outline = false) => {
    ctx.beginPath();
    ctx.arc(...(xy(p) as [number, number]), radius, 0, Math.PI * 2);
    if (outline) {
      ctx.strokeStyle = fill;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = fill;
      ctx.fill();
    }
  };
  return (from: PreviewFrame, frame: PreviewFrame, t: number) => {
    ctx.clearRect(0, 0, 300, 150);
    ctx.globalAlpha = 1;
    const fill = (i: number) =>
      membership(
        frame.responsibilities[i]?.map((v, j) => {
          const old = from.responsibilities[i]?.[j] ?? v;
          return old + (v - old) * t;
        }),
        frame.labels[i],
      );
    if (data.kind === "matrix" || data.kind === "categorical") {
      const rows = data.values,
        cols = rows[0].length;
      let max = 1;
      if (data.kind === "matrix")
        data.values.forEach((row) =>
          row.forEach((v) => (max = Math.max(max, Math.abs(v)))),
        );
      rows.forEach((row, i) =>
        row.forEach((v, j) => {
          const b = frame.biclusters?.find(
            (b) => b.rows.includes(i) && b.columns.includes(j),
          );
          ctx.fillStyle = b ? color(b.id) : fill(i);
          ctx.globalAlpha =
            typeof v === "number"
              ? 0.15 + (0.85 * Math.abs(v)) / max
              : 0.4 + (String(v).endsWith("0") ? 0.2 : 0.6);
          if (
            frame.selectedRows?.includes(i) &&
            frame.selectedColumns?.includes(j)
          ) {
            ctx.fillStyle = "#dbab65";
            ctx.globalAlpha = 1;
          }
          ctx.fillRect(
            12 + (j * 276) / cols,
            10 + (i * 128) / rows.length,
            Math.max(1, 276 / cols - 1),
            Math.max(1, 128 / rows.length - 0.5),
          );
        }),
      );
      ctx.globalAlpha = 1;
    } else if (data.kind === "timeseries") {
      const rows = frame.series ?? data.series.map((s) => s.values);
      const max = Math.max(
        1,
        ...rows.flat().map(Math.abs),
        ...(frame.centroids ?? []).flat().map(Math.abs),
      );
      const wave = (row: number[], stroke: string, width: number) => {
        ctx.beginPath();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        row.forEach((v, j) => {
          const x = 12 + (276 * j) / Math.max(1, row.length - 1),
            y = 75 - (v / max) * 60;
          if (j) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        });
        ctx.stroke();
      };
      ctx.globalAlpha = 0.35;
      rows.forEach((row, i) => wave(row, fill(i), 1));
      ctx.globalAlpha = 1;
      frame.centroids?.forEach((row, i) => wave(row, color(i), 2.5));
    } else {
      let positions = points;
      if (frame.embedding)
        positions = displayPoints({
          kind: "numeric",
          values: frame.embedding.map((p) => [p.x, p.y]),
        });
      const edges = frame.edges;
      const centers = interpolateCenters(
        centersAt(from),
        centersAt(frame),
        t,
        true,
      );
      const edgePoints = frame.neuronEdges ? centers : positions;
      edges.forEach((e) => {
        if (edgePoints[e.a] && edgePoints[e.b])
          line(edgePoints[e.a], edgePoints[e.b], "#b0c6b9", 0.7);
      });
      // The initial native graph is input, not an invented calculation state.
      if (data.kind === "graph" && !edges.length && frame.kind === "initial") {
        const ids = new Map(data.nodes.map((n, i) => [n.id, i]));
        data.edges.forEach((e) =>
          line(
            points[ids.get(e.source)!],
            points[ids.get(e.target)!],
            "#b0c6b9",
            0.7,
          ),
        );
      }
      const densityMax = Math.max(1, ...(frame.density ?? []));
      positions.forEach((p, i) => {
        const unseen = data.kind === "stream" && i >= (frame.processed ?? 0);
        ctx.globalAlpha = unseen ? 0.08 : 0.9;
        dot(
          p,
          frame.density
            ? 2 + (4 * frame.density[i]) / densityMax
            : data.kind === "graph"
              ? 3.5
              : 2.5,
          fill(i),
        );
        ctx.globalAlpha = 1;
        if (frame.focus.includes(i)) {
          dot(p, 5, frame.kind === "defer" ? "#db8ca9" : "#c08536", true);
          if (frame.radius > 0)
            dot(p, Math.min(90, frame.radius * 126), "#dbab65", true);
        }
        if (
          frame.roles[i]?.includes("defer") ||
          frame.roles[i]?.includes("pending")
        )
          dot(p, 4, "#db8ca9", true);
      });
      centers.forEach((c, i) => {
        if (c.cov) {
          const [xx, xyy, yy] = c.cov,
            disc = Math.sqrt((xx - yy) ** 2 + 4 * xyy ** 2);
          ctx.save();
          ctx.translate(...(xy(c) as [number, number]));
          ctx.scale(276, -126);
          ctx.rotate(Math.atan2(2 * xyy, xx - yy) / 2);
          ctx.strokeStyle = color(i);
          ctx.lineWidth = 0.005;
          ctx.beginPath();
          ctx.ellipse(
            0,
            0,
            2 * Math.sqrt(Math.max(0, (xx + yy + disc) / 2)),
            2 * Math.sqrt(Math.max(0, (xx + yy - disc) / 2)),
            0,
            0,
            2 * Math.PI,
          );
          ctx.stroke();
          ctx.restore();
        }
        dot(c, 5, color(c.label ?? i), true);
      });
      if (
        frame.aggregateMembers &&
        frame.aggregateMembers.length < points.length
      ) {
        const aggregate = frame.aggregateMembers.map((members) => ({
          x:
            0.72 +
            (0.25 * members.reduce((sum, i) => sum + points[i].x, 0)) /
              members.length,
          y:
            0.72 +
            (0.25 * members.reduce((sum, i) => sum + points[i].y, 0)) /
              members.length,
        }));
        frame.aggregateEdges?.forEach((e) => {
          if (aggregate[e.a] && aggregate[e.b])
            line(aggregate[e.a], aggregate[e.b], "#709ed0");
        });
        aggregate.forEach((p, i) => dot(p, 3, color(i)));
      }
      if (frame.sequential) {
        ctx.fillStyle = "#45614e";
        ctx.font = "9px sans-serif";
        ctx.fillText(
          `pass ${frame.sequential.pass} · 미할당 ${frame.sequential.unassigned}`,
          12,
          148,
        );
      }
      if (data.kind === "stream" && frame.micro) {
        const rows = data.samples.map((s) => s.values);
        const lo = [0, 1].map((j) => Math.min(...rows.map((r) => r[j] ?? 0)));
        const hi = [0, 1].map((j) => Math.max(...rows.map((r) => r[j] ?? 0)));
        frame.micro.forEach((c) =>
          dot(
            {
              x: 0.1 + (0.8 * (c.x - lo[0])) / (hi[0] - lo[0] || 1),
              y: 0.1 + (0.8 * (c.y - lo[1])) / (hi[1] - lo[1] || 1),
            },
            Math.min(18, 3 + Math.sqrt(c.weight)),
            c.potential ? "#57856a" : "#dbab65",
            true,
          ),
        );
        ctx.fillStyle = "#45614e";
        ctx.font = "10px sans-serif";
        ctx.fillText(
          `t=${frame.time?.toFixed(1) ?? 0} · ${frame.processed ?? 0}/${points.length}`,
          12,
          148,
        );
      }
      if (frame.hierarchy?.length) {
        // Small hierarchy inset uses actual parent relations and cluster sizes.
        const nodes = frame.hierarchy;
        const height = Math.max(
          1e-9,
          ...nodes.map((n) => (Number.isFinite(n.height) ? n.height : 0)),
        );
        const pos = (i: number) => ({
          x: 0.73 + (0.24 * i) / Math.max(1, nodes.length - 1),
          y:
            0.72 +
            0.23 *
              Math.min(
                1,
                (Number.isFinite(nodes[i].height) ? nodes[i].height : height) /
                  height,
              ),
        });
        nodes.forEach((n, i) => {
          const parent = nodes.findIndex((p) => p.id === n.parent);
          if (parent >= 0) line(pos(i), pos(parent), "#c08536");
          dot(
            pos(i),
            Math.min(4, 1 + Math.sqrt(n.size) / 3),
            n.selected ? "#db8ca9" : "#57856a",
          );
        });
      }
    }
    if (frame.panel) {
      const rows = frame.panel.values;
      const max = Math.max(1e-12, ...rows.flat().map(Math.abs));
      ctx.fillStyle = "#fffffff0";
      ctx.fillRect(8, 111, 284, 39);
      ctx.font = "8px sans-serif";
      ctx.fillStyle = "#45614e";
      ctx.fillText(frame.panel.title, 12, 120);
      rows.forEach((row, i) =>
        row.forEach((value, j) => {
          ctx.fillStyle = value < 0 ? "#db8ca9" : "#61ad95";
          ctx.globalAlpha = 0.12 + (0.88 * Math.abs(value)) / max;
          ctx.fillRect(
            12 + (j * 276) / row.length,
            124 + (i * 24) / rows.length,
            Math.max(1, 276 / row.length - 0.5),
            24 / rows.length - 1,
          );
        }),
      );
      ctx.globalAlpha = 1;
    }
  };
}
