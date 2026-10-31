import type { Algorithm } from "../engine/types";
/** Small metadata used by the lab; textbook and KaTeX stay in the guide chunk. */
export const algorithmFamilies: Record<Algorithm, string> = {
  "Fuzzy C-Means": "퍼지 중심 기반",
  "Bisecting K-Means": "하향식 중심 기반",
  "K-Means": "중심 기반",
  DBSCAN: "밀도 기반",
  HDBSCAN: "계층적 밀도",
  AGNES: "상향식 계층",
  DIANA: "하향식 계층",
  SOM: "위상 학습",
  LVQ: "지도 프로토타입",
  OPTICS: "밀도 순서",
  PAM: "대표점 기반",
  ROCK: "범주형 링크",
  GMM: "확률 모델",
  BIRCH: "CF-Tree",
  "Mean Shift": "밀도 모드 탐색",
};
