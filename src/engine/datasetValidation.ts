import { DEFAULT_WORKING_BYTES } from "./resources";
import type { Dataset } from "./dataset";

function fail(message: string): never {
  throw new Error(`데이터 오류: ${message}`);
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("객체가 필요합니다.");
  return value as Record<string, unknown>;
}
function rows(
  value: unknown,
  numeric: boolean,
  name: string,
): (number | string)[][] {
  if (
    !Array.isArray(value) ||
    !value.length ||
    !Array.isArray(value[0]) ||
    !value[0].length
  )
    fail(`${name}: 비어 있지 않은 직사각형 배열이 필요합니다.`);
  const d = value[0].length;
  value.forEach((row, i) => {
    if (!Array.isArray(row) || row.length !== d)
      fail(`${name} ${i + 1}행: 열 수가 다릅니다.`);
    row.forEach((v, j) => {
      if (
        numeric
          ? typeof v !== "number" || !Number.isFinite(v)
          : typeof v !== "string"
      )
        fail(
          `${name} ${i + 1}행 ${j + 1}열: ${numeric ? "유한한 숫자" : "문자열"}가 필요합니다.`,
        );
    });
  });
  return value;
}
function names(value: unknown, count: number, label: string) {
  if (
    value !== undefined &&
    (!Array.isArray(value) ||
      value.length !== count ||
      value.some((s) => typeof s !== "string"))
  )
    fail(`${label}: 문자열 ${count}개가 필요합니다.`);
}
function display(value: unknown, count: number) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.length !== count)
    fail("표시 좌표 수가 원본 행 수와 다릅니다.");
  value.forEach((v, i) => {
    const p = object(v);
    if (
      typeof p.x !== "number" ||
      typeof p.y !== "number" ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y)
    )
      fail(`표시 좌표 ${i + 1}: 유한한 x, y가 필요합니다.`);
  });
}
/** Validates storage contracts; this is not a claim of an executable engine for every kind. */
export function validateDataset(value: unknown): asserts value is Dataset {
  const data = object(value);
  switch (data.kind) {
    case "numeric":
    case "categorical":
    case "matrix": {
      const a = rows(data.values, data.kind !== "categorical", "values");
      if (data.kind === "matrix") {
        names(data.rowNames, a.length, "행 이름");
        names(data.columnNames, a[0].length, "열 이름");
      } else {
        names(data.featureNames, a[0].length, "차원 이름");
        display(data.display, a.length);
      }
      if (
        data.kind === "numeric" &&
        data.labels !== undefined &&
        (!Array.isArray(data.labels) ||
          data.labels.length !== a.length ||
          data.labels.some((x) => typeof x !== "number" || !Number.isFinite(x)))
      )
        fail("정답 labels 수/값을 확인하세요.");
      break;
    }
    case "mixed": {
      const a = rows(data.numeric, true, "numeric"),
        b = rows(data.categorical, false, "categorical");
      if (a.length !== b.length) fail("수치·범주형 행 수가 다릅니다.");
      display(data.display, a.length);
      break;
    }
    case "graph": {
      if (
        !Array.isArray(data.nodes) ||
        !data.nodes.length ||
        !Array.isArray(data.edges) ||
        typeof data.directed !== "boolean"
      )
        fail("graph에는 nodes, edges, directed가 필요합니다.");
      const ids = new Set<string>();
      data.nodes.forEach((v, i) => {
        const node = object(v);
        if (typeof node.id !== "string" || !node.id || ids.has(node.id))
          fail(`노드 ${i + 1}: 중복 없는 문자열 id가 필요합니다.`);
        ids.add(node.id);
        if (node.position !== undefined) display([node.position], 1);
      });
      data.edges.forEach((v, i) => {
        const edge = object(v);
        if (
          typeof edge.source !== "string" ||
          typeof edge.target !== "string" ||
          !ids.has(edge.source) ||
          !ids.has(edge.target)
        )
          fail(`간선 ${i + 1}: 존재하지 않는 노드를 참조합니다.`);
        if (typeof edge.weight !== "number" || !Number.isFinite(edge.weight))
          fail(`간선 ${i + 1}: 유한한 weight가 필요합니다.`);
      });
      break;
    }
    case "timeseries": {
      if (!Array.isArray(data.series) || !data.series.length)
        fail("series가 필요합니다.");
      const ids = new Set<string>();
      data.series.forEach((v) => {
        const s = object(v);
        if (typeof s.id !== "string" || ids.has(s.id))
          fail("시계열 id는 중복할 수 없습니다.");
        ids.add(s.id);
        if (
          !Array.isArray(s.times) ||
          !Array.isArray(s.values) ||
          s.times.length !== s.values.length ||
          s.times.length < 2
        )
          fail("시계열 times/values 길이를 확인하세요.");
        s.times.forEach((t, i, ts) => {
          if (
            typeof t !== "number" ||
            !Number.isFinite(t) ||
            (i > 0 && t <= ts[i - 1])
          )
            fail("시간축은 유한하고 엄격히 증가해야 합니다.");
        });
        if (s.values.some((x) => typeof x !== "number" || !Number.isFinite(x)))
          fail("시계열 값은 유한해야 합니다.");
      });
      break;
    }
    case "stream": {
      if (!Array.isArray(data.samples) || !data.samples.length)
        fail("samples가 필요합니다.");
      let previous = -Infinity,
        dimensions = -1;
      data.samples.forEach((v) => {
        const s = object(v);
        if (
          typeof s.time !== "number" ||
          !Number.isFinite(s.time) ||
          s.time < previous
        )
          fail("스트림 시간은 비감소 순서여야 합니다.");
        previous = s.time;
        const a = rows([s.values], true, "samples.values");
        if (dimensions < 0) dimensions = a[0].length;
        if (dimensions !== a[0].length) fail("스트림 차원 수가 다릅니다.");
      });
      break;
    }
    case "constrained": {
      validateDataset(data.data);
      if (data.data.kind !== "numeric")
        fail("제약 데이터의 원본은 numeric이어야 합니다.");
      const n = data.data.values.length;
      const parent = Array.from({ length: n }, (_, i) => i);
      const root = (i: number): number => {
        while (parent[i] !== i) {
          parent[i] = parent[parent[i]];
          i = parent[i];
        }
        return i;
      };
      const pairs = (v: unknown, name: string): [number, number][] => {
        if (!Array.isArray(v)) fail(`${name} 배열이 필요합니다.`);
        v.forEach((pair) => {
          if (
            !Array.isArray(pair) ||
            pair.length !== 2 ||
            pair.some((i) => !Number.isSafeInteger(i) || i < 0 || i >= n)
          )
            fail(`${name}: 유효한 인덱스 쌍이 필요합니다.`);
        });
        return v;
      };
      pairs(data.mustLink, "mustLink").forEach(([a, b]) => {
        parent[root(a)] = root(b);
      });
      pairs(data.cannotLink, "cannotLink").forEach(([a, b]) => {
        if (root(a) === root(b)) fail("Must-Link와 Cannot-Link가 모순됩니다.");
      });
      break;
    }
    default:
      fail("지원하지 않는 kind입니다.");
  }
}

export function importDataset(text: string): Dataset {
  if (text.length * 6 > DEFAULT_WORKING_BYTES)
    fail("JSON 파싱의 추정 메모리 예산을 초과합니다.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail("올바른 JSON이 아닙니다.");
  }
  const obj = object(raw);
  if (obj.schema !== undefined) {
    if (obj.schema !== "clusterlab.dataset/v1")
      fail("지원하지 않는 schema 버전입니다.");
    raw = obj.data;
  }
  validateDataset(raw);
  return raw;
}
export function exportDataset(data: Dataset) {
  return JSON.stringify({ schema: "clusterlab.dataset/v1", data }, null, 2);
}
