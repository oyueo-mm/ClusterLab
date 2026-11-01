import { algorithms, type Algorithm } from "../engine/types";
import candidates from "../data/candidates.json";

export const categories = [
  {
    id: "centroid",
    name: "중심·대표점 기반",
    description: "거리와 대표점으로 군집을 나눕니다.",
  },
  {
    id: "density",
    name: "밀도 기반",
    description: "밀도가 높은 영역과 노이즈를 구분합니다.",
  },
  {
    id: "hierarchy",
    name: "계층적 군집화",
    description: "병합과 분할로 군집의 계층을 탐색합니다.",
  },
  {
    id: "graph",
    name: "그래프·네트워크 기반",
    description: "연결과 흐름에서 커뮤니티를 찾습니다.",
  },
  {
    id: "fuzzy",
    name: "퍼지·제약 기반",
    description: "모호한 소속과 사전 지식을 반영합니다.",
  },
  {
    id: "subspace",
    name: "격자·고차원 부분공간",
    description: "관련 차원과 블록 구조를 발견합니다.",
  },
  {
    id: "mixture",
    name: "확률·혼합모델",
    description: "잠재 분포와 관측의 소속 확률을 추정합니다.",
  },
  {
    id: "neural",
    name: "신경망·학습 기반",
    description: "경쟁 학습으로 데이터의 위상과 대표를 학습합니다.",
  },
  {
    id: "special",
    name: "시계열·스트림·특수 기법",
    description: "시간, 순서, 변화하는 관측을 다룹니다.",
  },
] as const;
export type CategoryId = (typeof categories)[number]["id"];
// Use the master taxonomy for candidates; the original 13 have explicit assignments.
const masterCategory: Record<string, CategoryId> = {
  A: "centroid",
  B: "fuzzy",
  C: "density",
  D: "hierarchy",
  E: "graph",
  F: "subspace",
  G: "mixture",
  H: "neural",
  I: "special",
};
const original: Partial<Record<Algorithm, CategoryId>> = {
  "K-Means": "centroid",
  PAM: "centroid",
  DBSCAN: "density",
  HDBSCAN: "density",
  OPTICS: "density",
  "Mean Shift": "density",
  AGNES: "hierarchy",
  DIANA: "hierarchy",
  BIRCH: "hierarchy",
  ROCK: "hierarchy",
  GMM: "mixture",
  SOM: "neural",
  LVQ: "neural",
};
export function categoryOf(name: string): CategoryId {
  const candidate = candidates.find(
    (c) => c.engine === name || c.name === name,
  );
  return (
    original[name as Algorithm] ??
    masterCategory[candidate?.family[0] ?? ""] ??
    "special"
  );
}
export const categoryCount = (id: CategoryId) =>
  algorithms.filter((a) => categoryOf(a) === id).length;
