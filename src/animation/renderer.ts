import { ease } from "../engine/trace";
import type { Point, State, Algorithm, Center } from "../engine/types";
export function interpolateCenters(
  from: Center[],
  to: Center[],
  progress: number,
  stableIds = false,
): Center[] {
  const t = ease(progress);
  return to.map((c, i) => {
    const a =
      (stableIds && c.id !== undefined
        ? from.find((old) => old.id === c.id)
        : from[i]) ?? c;
    return {
      ...c,
      x: a.x + (c.x - a.x) * t,
      y: a.y + (c.y - a.y) * t,
      cov: c.cov?.map(
        (v, j) => (a.cov?.[j] ?? v) + (v - (a.cov?.[j] ?? v)) * t,
      ) as [number, number, number] | undefined,
    };
  });
}
export const palette = [
  "#61ad95",
  "#db8ca9",
  "#a491cf",
  "#709ed0",
  "#dbab65",
  "#74b9bb",
  "#bd9982",
  "#a9b66c",
];
const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const blend = (a: string, b: string, t: number) => {
  const aa = rgb(a),
    bb = rgb(b);
  return `rgb(${aa.map((v, i) => Math.round(v + (bb[i] - v) * t)).join(",")})`;
};
const color = (label: number) =>
  label === -1
    ? "#a9b0b5"
    : label < 0
      ? "#c7d1ce"
      : palette[label % palette.length];
export interface View {
  zoom: number;
  panX: number;
  panY: number;
}
export interface DrawOptions {
  algorithm: Algorithm;
  view: View;
  selected: number[];
  time: number;
  decision: boolean;
  minimal?: boolean;
}
export function draw(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  points: Point[],
  from: State,
  to: State,
  t: number,
  options: DrawOptions,
) {
  // Collapsed/hidden canvases have no drawable coordinate area.
  if (w <= 70 || h <= 60) return;
  const e = ease(t),
    { zoom, panX, panY } = options.view;
  const scale = Math.min(w - 70, h - 60) * zoom,
    ox = w / 2 + panX - scale / 2,
    oy = h / 2 + panY - scale / 2;
  const xy = (p: Point) => [ox + p.x * scale, oy + (1 - p.y) * scale];
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 1;
  ctx.font = "11px Pretendard, sans-serif";
  for (let i = -10; !options.minimal && i <= 20; i++) {
    const v = i / 10,
      x = ox + v * scale,
      y = oy + v * scale;
    if (x >= 0 && x <= w) {
      ctx.strokeStyle = "#edf1ef";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.fillStyle = "#a4afaa";
      ctx.fillText(v.toFixed(1), x + 4, h - 10);
    }
    if (y >= 0 && y <= h) {
      ctx.strokeStyle = "#edf1ef";
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.fillStyle = "#a4afaa";
      ctx.fillText((1 - v).toFixed(1), 8, y - 5);
    }
  }
  const centers = interpolateCenters(
    from.centers,
    to.centers,
    t,
    options.algorithm === "Mean Shift",
  );
  if (options.algorithm === "LVQ" && options.decision && centers.length) {
    for (let x = 0; x < w; x += 12)
      for (let y = 0; y < h; y += 12) {
        const px = (x - ox) / scale,
          py = 1 - (y - oy) / scale;
        const winner = centers.reduce(
          (b, c, i) =>
            (c.x - px) ** 2 + (c.y - py) ** 2 <
            (centers[b].x - px) ** 2 + (centers[b].y - py) ** 2
              ? i
              : b,
          0,
        );
        ctx.fillStyle = color(centers[winner].label ?? winner);
        ctx.globalAlpha = 0.06;
        ctx.fillRect(x, y, 12, 12);
      }
    ctx.globalAlpha = 1;
  }
  const focus = to.focus[0];
  if (
    options.algorithm !== "Mean Shift" &&
    focus !== undefined &&
    points[focus]
  ) {
    const origin = points[from.focus[0]] ?? points[focus];
    const target = points[focus];
    const [x, y] = xy({
        x: origin.x + (target.x - origin.x) * e,
        y: origin.y + (target.y - origin.y) * e,
      }),
      radius = (from.radius + (to.radius - from.radius) * e) * scale;
    if (radius > 0) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#77b59c10";
      ctx.fill();
      ctx.strokeStyle = "#7bae9b";
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.arc(x, y, 10 + 2 * Math.sin(options.time / 240), 0, Math.PI * 2);
    ctx.strokeStyle = "#344b43";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  const neuron = options.algorithm === "SOM";
  if (options.algorithm === "Mean Shift") {
    for (const c of centers) {
      const old = from.centers.find((a) => a.id === c.id) ?? c,
        path = old.path ?? [];
      if (path.length > 1) {
        ctx.beginPath();
        path.forEach((p, j) => {
          const [x, y] = xy(p);
          if (j) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        });
        const [x, y] = xy(c);
        ctx.lineTo(x, y);
        ctx.strokeStyle = "#719e8b55";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    const c = centers.find((c) => c.id === to.activeCenter);
    if (c) {
      const [x, y] = xy(c),
        radius = (from.radius + (to.radius - from.radius) * e) * scale;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#78b2970c";
      ctx.fill();
      ctx.strokeStyle = "#75a48c";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      if (to.meanTarget) {
        const [mx, my] = xy(to.meanTarget);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (mx - x) * t, y + (my - y) * t);
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeRect(mx - 4, my - 4, 8, 8);
      }
    }
  }
  if (
    (neuron || options.algorithm === "LVQ") &&
    focus !== undefined &&
    centers[to.learning.winner]
  ) {
    const winner = to.learning.winner,
      [x, y] = xy(points[focus]),
      [cx, cy] = xy(centers[winner]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (cx - x) * t, y + (cy - y) * t);
    ctx.strokeStyle = to.learning.match === false ? "#ca829e" : "#79a58d";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (neuron) {
      const g = Math.round(Math.sqrt(centers.length));
      centers.forEach((c, j) => {
        const gd =
            ((j % g) - (winner % g)) ** 2 +
            (Math.floor(j / g) - Math.floor(winner / g)) ** 2,
          h = Math.exp(-gd / (2 * to.learning.radius ** 2)),
          [px, py] = xy(c);
        ctx.beginPath();
        ctx.arc(px, py, 5 + 10 * h, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(85,148,112,${h * 0.65})`;
        ctx.stroke();
      });
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.strokeStyle = "#446f55";
    ctx.stroke();
  }
  for (const edge of to.edges) {
    const a = neuron ? centers[edge.a] : points[edge.a],
      b = neuron ? centers[edge.b] : points[edge.b];
    if (!a || !b) continue;
    const [x, y] = xy(a),
      [bx, by] = xy(b);
    const existed = from.edges.some((f) => f.a === edge.a && f.b === edge.b),
      progress = existed ? 1 : t;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (bx - x) * progress, y + (by - y) * progress);
    ctx.strokeStyle = neuron
      ? "#649b88"
      : options.algorithm === "HDBSCAN"
        ? "#90a89b"
        : "#b6cbbf";
    ctx.lineWidth = neuron ? 1.8 : 1.2;
    ctx.globalAlpha = options.algorithm === "ROCK" ? 0.3 : 0.7;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (
    options.algorithm === "K-Means" &&
    centers.length &&
    focus !== undefined &&
    points[focus]
  ) {
    const [x, y] = xy(points[focus]);
    centers.forEach((c, j) => {
      const [cx, cy] = xy(c);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (cx - x) * t, y + (cy - y) * t);
      ctx.strokeStyle = palette[j % palette.length] + "55";
      ctx.stroke();
    });
  }
  if (options.algorithm === "GMM")
    centers.forEach((c, j) => {
      if (!c.cov) return;
      const [a, b, d] = c.cov,
        delta = Math.sqrt((a - d) ** 2 + 4 * b * b),
        l1 = Math.max(1e-9, (a + d + delta) / 2),
        l2 = Math.max(1e-9, (a + d - delta) / 2),
        angle = 0.5 * Math.atan2(2 * b, a - d);
      const [x, y] = xy(c);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-angle);
      ctx.lineWidth = options.minimal ? 1.6 : 1.2;
      for (let level = 2; level >= 1; level--) {
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          Math.sqrt(l1) * scale * level,
          Math.sqrt(l2) * scale * level,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = palette[j % palette.length] + "0b";
        ctx.strokeStyle =
          palette[j % palette.length] + (level === 1 ? "ff" : "a0");
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });
  // Display sampling depends on viewport pixel density, not engine input size.
  const stride = Math.max(
    1,
    Math.ceil(points.length / Math.max(1, Math.floor((w * h) / 32))),
  );
  const focusedPoints = new Set(to.focus),
    selectedPoints = new Set(options.selected);
  for (let i = 0; i < points.length; i += stride) {
    const [x, y] = xy(points[i]);
    if (x < -8 || x > w + 8 || y < -8 || y > h + 8) continue;
    let a = color(from.labels[i]),
      b = color(to.labels[i]);
    if (to.responsibilities[i]?.length) {
      const mix = (row: number[]) => {
        const c = [0, 0, 0];
        row.forEach((weight, k) =>
          rgb(palette[k % palette.length]).forEach(
            (v, j) => (c[j] += v * weight),
          ),
        );
        return (
          "#" +
          c
            .map((v) =>
              Math.min(255, Math.max(0, Math.round(v)))
                .toString(16)
                .padStart(2, "0"),
            )
            .join("")
        );
      };
      a = from.responsibilities[i] ? mix(from.responsibilities[i]) : a;
      b = mix(to.responsibilities[i]);
    }
    ctx.fillStyle = blend(a, b, e);
    const highlighted = focusedPoints.has(i),
      r = highlighted ? 4.5 + Math.sin(t * Math.PI) * 1.5 : 3.7;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    if (to.roles[i] === "core") {
      ctx.beginPath();
      ctx.arc(x, y, r + 2.2, 0, Math.PI * 2);
      ctx.strokeStyle = blend(a, b, e);
      ctx.stroke();
    }
    if (to.labels[i] === -1) {
      ctx.strokeStyle = "#7c8782";
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 2);
      ctx.lineTo(x + 2, y + 2);
      ctx.moveTo(x + 2, y - 2);
      ctx.lineTo(x - 2, y + 2);
      ctx.stroke();
    }
    if (selectedPoints.has(i)) {
      ctx.strokeStyle = "#1d4435";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 8, y - 8, 16, 16);
    }
    if (points[i].label !== undefined && options.algorithm === "LVQ") {
      ctx.fillStyle = "#3d4e46";
      ctx.font = "11px Pretendard, sans-serif";
      ctx.fillText(String(points[i].label), x + 6, y - 5);
    }
  }
  if (stride > 1) {
    ctx.fillStyle = "#34564D";
    ctx.fillText(
      `화면 표본 표시 1/${stride} · 계산 입력 ${points.length}개 (전체)`,
      14,
      20,
    );
  }
  centers.forEach((c, i) => {
    const previous =
      options.algorithm === "Mean Shift"
        ? from.centers.find((a) => a.id === c.id)
        : from.centers[i];
    ctx.globalAlpha = previous ? 1 : e;
    if (c.mergedInto !== undefined)
      ctx.globalAlpha = previous?.mergedInto === undefined ? 1 - e : 0;
    const [x, y] = xy(c);
    if (from.centers[i] && options.algorithm === "K-Means") {
      const [px, py] = xy(from.centers[i]);
      ctx.strokeStyle = palette[i % palette.length] + "90";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle =
      options.algorithm === "Mean Shift"
        ? blend(
            previous?.label !== undefined
              ? color(previous.label)
              : previous?.id === from.activeCenter
                ? "#6b9e85"
                : "#b8cbbf",
            c.label !== undefined
              ? color(c.label)
              : c.id === to.activeCenter
                ? "#6b9e85"
                : "#b8cbbf",
            e,
          )
        : color(c.label ?? i);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (options.algorithm === "Mean Shift")
      ctx.arc(
        x,
        y,
        c.id === to.activeCenter
          ? 6
          : c.label !== undefined
            ? 7
            : c.converged
              ? 3.5
              : 2.8,
        0,
        Math.PI * 2,
      );
    else if (neuron) ctx.arc(x, y, 5, 0, Math.PI * 2);
    else {
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x + 9, y);
      ctx.lineTo(x, y + 9);
      ctx.lineTo(x - 9, y);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    if (
      !neuron &&
      !options.minimal &&
      (options.algorithm !== "Mean Shift" ||
        c.id === to.activeCenter ||
        (to.activeCenter < 0 && centers.length < 15))
    ) {
      ctx.fillStyle = "#3f5148";
      ctx.font = "11px Pretendard, sans-serif";
      ctx.fillText(
        `${options.algorithm === "Mean Shift" ? "M" : "C"}${(options.algorithm === "Mean Shift" ? (c.id ?? i) : i) + 1}`,
        x + 11,
        y + 3,
      );
    }
    ctx.globalAlpha = 1;
  });
  ctx.globalAlpha = 1;
}
export function unproject(
  x: number,
  y: number,
  w: number,
  h: number,
  view: View,
): Point {
  const scale = Math.min(w - 70, h - 60) * view.zoom;
  return {
    x: (x - w / 2 - view.panX + scale / 2) / scale,
    y: 1 - (y - h / 2 - view.panY + scale / 2) / scale,
  };
}
