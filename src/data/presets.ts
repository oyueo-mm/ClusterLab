import type { Point } from "../engine/types";
import { random } from "../engine/math";
export const presets = [
  ["blobs", "Gaussian Blobs", "균형 잡힌 세 개의 구형 군집"],
  ["moons", "Two Moons", "굽은 두 개의 비선형 군집"],
  ["circles", "Concentric Circles", "중심이 같은 두 원"],
  ["anisotropic", "Anisotropic Clusters", "기울어진 타원형 군집"],
  ["density", "Varying Density", "서로 다른 밀도"],
  ["outliers", "Noise and Outliers", "군집 주변의 이상치"],
  ["overlap", "Overlapping Clusters", "경계가 겹치는 Gaussian"],
  ["unequal", "Unequal Cluster Sizes", "균형이 다른 표본 크기"],
  ["uniform", "Uniform Random", "구조 없는 균일 분포"],
  ["spiral", "Spiral", "맞물린 두 나선"],
  ["rings", "Rings", "세 개의 고리"],
  ["grid", "Grid", "규칙적인 격자"],
  ["bridge", "Bridge", "군집 사이 연결 다리"],
  ["nested", "Nested Clusters", "큰 군집 안의 작은 군집"],
  ["categorical", "Categorical Groups", "실제 범주형 attribute=value 토큰"],
  ["labeled", "Labeled Classification", "LVQ용 정답 라벨 데이터"],
  ["elongated", "Elongated Clouds", "가로로 길게 늘어난 군집"],
  ["diagonal", "Diagonal Bands", "대각선 띠"],
  ["four", "Four Corners", "네 모서리의 Gaussian"],
  ["five", "Five Islands", "다섯 개의 작은 섬"],
  ["tiny", "Small Reference", "손으로 검산할 작은 데이터"],
  ["line", "Line", "직선 위의 두 덩어리"],
  ["cross", "Cross", "교차하는 두 띠"],
  ["checker", "Checkerboard", "체커보드 패턴"],
  ["crescent", "Crescent & Blob", "초승달과 원형 군집"],
  ["satellite", "Satellite", "큰 군집 주변 작은 위성"],
  ["sparse", "Sparse Islands", "드문드문 떨어진 섬"],
  ["duplicates", "Duplicates", "동일 좌표가 중복된 데이터"],
  ["gradient", "Density Gradient", "연속적으로 변하는 밀도"],
  ["categorical-noisy", "Noisy Categories", "속성이 일부 섞인 범주형 데이터"],
  [
    "labeled-overlap",
    "Overlapping Classes",
    "정답은 있지만 경계가 겹친 클래스",
  ],
  ["three-rings", "Offset Rings", "중심이 다른 고리"],
] as const;
export type PresetId = (typeof presets)[number][0];
export interface DataOptions {
  count: number;
  noise: number;
  spread: number;
  separation: number;
  seed: number;
}
export const dataDefaults: DataOptions = {
  count: 120,
  noise: 0.015,
  spread: 0.065,
  separation: 0.25,
  seed: 42,
};
export function dataset(id: string, o: DataOptions): Point[] {
  const rng = random(o.seed),
    normal = () =>
      Math.sqrt(-2 * Math.log(Math.max(1e-10, rng()))) *
      Math.cos(2 * Math.PI * rng()),
    points: Point[] = [];
  const n = id === "tiny" ? 12 : o.count;
  for (let i = 0; i < n; i++) {
    let g = i % 3,
      x = 0.5,
      y = 0.5;
    const t = rng() * Math.PI * 2,
      s = o.spread,
      d = o.separation;
    let features: string[] | undefined, label: number | undefined;
    switch (id) {
      case "moons":
      case "crescent": {
        g = i % 2;
        const a = rng() * Math.PI;
        x = 0.5 + (0.28 * Math.cos(a) + (g ? 0.17 : -0.08));
        y = g ? 0.55 + 0.22 * Math.sin(a) : 0.48 - 0.22 * Math.sin(a);
        if (id === "crescent" && g) {
          x = 0.5 + normal() * s;
          y = 0.53 + normal() * s;
        }
        break;
      }
      case "circles":
      case "rings": {
        g = i % (id === "rings" ? 3 : 2);
        const radius = 0.13 + g * 0.12;
        x = 0.5 + radius * Math.cos(t);
        y = 0.5 + radius * Math.sin(t);
        break;
      }
      case "three-rings": {
        g = i % 3;
        x = 0.5 + d * Math.cos((g * 2 * Math.PI) / 3) + 0.12 * Math.cos(t);
        y = 0.5 + d * Math.sin((g * 2 * Math.PI) / 3) + 0.12 * Math.sin(t);
        break;
      }
      case "spiral": {
        g = i % 2;
        const a = rng() * Math.PI * 3,
          rr = 0.025 + a * 0.034;
        x = 0.5 + rr * Math.cos(a + g * Math.PI);
        y = 0.5 + rr * Math.sin(a + g * Math.PI);
        break;
      }
      case "uniform":
        x = 0.07 + rng() * 0.86;
        y = 0.07 + rng() * 0.86;
        break;
      case "grid": {
        const w = Math.ceil(Math.sqrt(n));
        x = 0.08 + ((i % w) * 0.84) / Math.max(1, w - 1);
        y = 0.08 + (Math.floor(i / w) * 0.84) / Math.max(1, w - 1);
        break;
      }
      case "checker": {
        const cell = i % 8,
          gx = cell % 4,
          gy = Math.floor(cell / 4) * 2 + (gx % 2);
        x = 0.1 + gx * 0.2 + rng() * 0.12;
        y = 0.1 + gy * 0.2 + rng() * 0.12;
        break;
      }
      case "diagonal":
        x = 0.1 + rng() * 0.65;
        y = x + (g - 1) * 0.17 + normal() * s * 0.2;
        break;
      case "line":
        g = i % 2;
        x = 0.5 + (g ? d : -d) + normal() * s;
        y = 0.5;
        break;
      case "cross":
        g = i % 2;
        x = 0.5 + (g ? normal() * s * 0.25 : (rng() - 0.5) * 0.75);
        y = 0.5 + (g ? (rng() - 0.5) * 0.75 : normal() * s * 0.25);
        break;
      case "gradient":
        x = 0.08 + Math.pow(rng(), 2) * 0.84;
        y = 0.08 + rng() * 0.84;
        break;
      default: {
        const groups =
          id === "four" ? 4 : id === "five" || id === "satellite" ? 5 : 3;
        if (id === "unequal") g = rng() < 0.7 ? 0 : rng() < 0.7 ? 1 : 2;
        else g = i % groups;
        let spread = s;
        if (id === "density") spread = s * (0.35 + g * 0.9);
        if (id === "overlap" || id === "labeled-overlap") spread = s * 2.5;
        if (id === "sparse") spread = s * 0.4;
        let cx = 0.5 + d * Math.cos((g * 2 * Math.PI) / groups - 0.4),
          cy = 0.5 + d * Math.sin((g * 2 * Math.PI) / groups - 0.4);
        if (id === "nested") {
          cx = 0.5;
          cy = 0.5;
          spread = g ? s * 0.3 : s * 3;
        }
        if (id === "satellite") {
          if (g === 0) spread = s * 2;
          else spread = s * 0.3;
        }
        x = cx + normal() * spread;
        y = cy + normal() * spread;
        if (id === "anisotropic") {
          const nx = normal() * s * 2.4;
          x = cx + nx;
          y = cy + nx * 0.65 + normal() * s * 0.3;
        }
        if (id === "elongated") {
          x = cx + normal() * s * 2.3;
          y = cy + normal() * s * 0.25;
        }
        if ((id === "outliers" || id === "bridge") && i % 7 === 0) {
          x = id === "bridge" ? 0.25 + rng() * 0.5 : rng();
          y = id === "bridge" ? 0.5 + normal() * 0.015 : rng();
        }
        if (id === "duplicates") {
          x = Math.round(x * 12) / 12;
          y = Math.round(y * 12) / 12;
        }
        if (id.startsWith("categorical")) {
          features = [
            `color=${["green", "pink", "blue"][g]}`,
            `shape=${["round", "square", "triangle"][g]}`,
            `material=${g % 2 ? "wood" : "metal"}`,
            `size=${i % 3 ? "small" : "large"}`,
          ];
          if (id === "categorical-noisy" && i % 5 === 0)
            features[0] = `color=${["green", "pink", "blue"][(g + 1) % 3]}`;
        }
        if (id.startsWith("labeled")) label = g;
        break;
      }
    }
    points.push({
      x: x + normal() * o.noise,
      y: y + normal() * o.noise,
      ...(label !== undefined ? { label } : {}),
      ...(features ? { features } : {}),
    });
  }
  return points;
}
export function exportData(points: Point[], format: "csv" | "json") {
  return format === "json"
    ? JSON.stringify({ version: 1, points }, null, 2)
    : "x,y,label,features\n" +
        points
          .map((p) =>
            [p.x, p.y, p.label ?? "", p.features?.join(";") ?? ""].join(","),
          )
          .join("\n");
}
export function importData(text: string): Point[] {
  let raw: unknown;
  if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
    const v = JSON.parse(text);
    raw = Array.isArray(v) ? v : v.points;
  } else {
    const rows = text.trim().split(/\r?\n/);
    if (
      rows[0].trim() !== "x,y,label,features" &&
      rows[0].trim() !== "x,y" &&
      rows[0].trim() !== "x,y,label"
    )
      throw new Error("CSV 헤더: x,y 또는 x,y,label,features");
    raw = rows.slice(1).map((row) => {
      const [x, y, label, features] = row.split(",");
      return {
        x: Number(x),
        y: Number(y),
        ...(label?.trim() ? { label: Number(label) } : {}),
        ...(features ? { features: features.split(";") } : {}),
      };
    });
  }
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 600)
    throw new Error("2~600개의 데이터가 필요합니다.");
  return raw.map((v: unknown) => {
    if (!v || typeof v !== "object")
      throw new Error("데이터 객체가 필요합니다.");
    const p = v as Point;
    if (
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y) ||
      (p.label !== undefined && (!Number.isInteger(p.label) || p.label < 0)) ||
      (p.features !== undefined &&
        (!Array.isArray(p.features) ||
          p.features.some((f) => typeof f !== "string")))
    )
      throw new Error(
        "올바른 숫자 좌표, 음수가 아닌 정수 label, 문자열 배열 features를 사용하세요.",
      );
    return { x: p.x, y: p.y, label: p.label, features: p.features };
  });
}
