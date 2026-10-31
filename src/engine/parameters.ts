import type { Algorithm, Params } from "./types";
export interface Field {
  key: keyof Params;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  hint: string;
}
export const fields: Record<Algorithm, Field[]> = {
  "Fuzzy C-Means": [
    { key: "k", label: "군집 수 K", min: 1, max: 12, hint: "퍼지 중심 수" },
    {
      key: "fuzziness",
      label: "Fuzzifier m",
      min: 1.01,
      max: 10,
      step: 0.1,
      hint: "m > 1, 확률이 아닌 소속도의 퍼짐",
    },
    {
      key: "tolerance",
      label: "수렴 허용오차",
      min: 1e-12,
      max: 0.1,
      step: 0.00001,
      hint: "최대 소속도 변화",
    },
    {
      key: "iterations",
      label: "최대 반복",
      min: 1,
      max: 300,
      hint: "소속도·가중평균 갱신 한도",
    },
  ],
  "Bisecting K-Means": [
    {
      key: "k",
      label: "군집 수 K",
      min: 1,
      max: 12,
      hint: "SSE가 가장 큰 잎을 이분할",
    },
    {
      key: "iterations",
      label: "최대 반복",
      min: 1,
      max: 300,
      hint: "각 이분할의 Lloyd 반복 한도",
    },
  ],
  "Mean Shift": [
    {
      key: "bandwidth",
      label: "Bandwidth",
      min: 0.001,
      max: 2,
      step: 0.01,
      hint: "Flat kernel의 반경. 0보다 큰 유한한 값",
    },
    {
      key: "iterations",
      label: "최대 반복 횟수",
      min: 1,
      max: 300,
      hint: "sklearn과 같은 카운터: 최초 평균 갱신 후 최대 반복 수",
    },
  ],
  "K-Means": [
    { key: "k", label: "군집 수 K", min: 1, max: 12, hint: "찾을 중심점 수" },
    {
      key: "initialization",
      label: "초기화",
      options: ["kmeans++", "random"],
      hint: "거리 제곱 확률 또는 무작위",
    },
    {
      key: "iterations",
      label: "최대 반복",
      min: 1,
      max: 60,
      hint: "할당·평균 갱신 반복 한도",
    },
  ],
  DBSCAN: [
    {
      key: "epsilon",
      label: "이웃 반경 ε",
      min: 0.005,
      max: 1,
      step: 0.005,
      hint: "좌표 공간의 Euclidean 반경",
    },
    {
      key: "minPts",
      label: "MinPts",
      min: 2,
      max: 50,
      hint: "자기 자신을 포함한 최소 이웃 수",
    },
  ],
  HDBSCAN: [
    {
      key: "minSize",
      label: "min_cluster_size",
      min: 2,
      max: 100,
      hint: "축약 트리에 남길 최소 군집 크기",
    },
    {
      key: "minPts",
      label: "min_samples",
      min: 2,
      max: 50,
      hint: "자기 자신 포함 core distance 순위",
    },
    {
      key: "selection",
      label: "선택 방법",
      options: ["eom", "leaf"],
      hint: "안정도 EOM 또는 최하위 가지",
    },
  ],
  AGNES: [
    {
      key: "linkage",
      label: "Linkage",
      options: ["single", "complete", "average", "ward"],
      hint: "군집 간 비유사도 정의",
    },
    {
      key: "metric",
      label: "거리",
      options: ["euclidean", "manhattan"],
      hint: "Ward에서는 Euclidean만 지원",
    },
    {
      key: "k",
      label: "추출 군집 수",
      min: 1,
      max: 12,
      hint: "전체 계층 생성 후 K에서 절단",
    },
  ],
  DIANA: [
    {
      key: "k",
      label: "목표 군집 수",
      min: 1,
      max: 12,
      hint: "최대 직경 군집을 반복 분할",
    },
  ],
  SOM: [
    {
      key: "grid",
      label: "격자 한 변",
      min: 2,
      max: 10,
      hint: "g × g 뉴런 격자",
    },
    {
      key: "learningRate",
      label: "학습률",
      min: 0.01,
      max: 0.8,
      step: 0.01,
      hint: "초기 α, 학습과 함께 감소",
    },
    {
      key: "radius",
      label: "격자 이웃 반경",
      min: 0.2,
      max: 8,
      step: 0.2,
      hint: "데이터 거리가 아닌 격자 거리",
    },
    {
      key: "epochs",
      label: "Epoch",
      min: 1,
      max: 30,
      hint: "전체 표본 학습 횟수",
    },
  ],
  LVQ: [
    {
      key: "learningRate",
      label: "학습률",
      min: 0.01,
      max: 0.5,
      step: 0.01,
      hint: "당김과 밀어냄의 크기",
    },
    {
      key: "k",
      label: "클래스별 프로토타입",
      min: 1,
      max: 6,
      hint: "각 정답 클래스마다 생성할 수",
    },
    {
      key: "epochs",
      label: "Epoch",
      min: 1,
      max: 30,
      hint: "시드 기반 순서로 전체 데이터 순회",
    },
  ],
  OPTICS: [
    {
      key: "minPts",
      label: "min_samples",
      min: 2,
      max: 50,
      hint: "자기 자신 포함 핵심 이웃 수",
    },
    {
      key: "epsilon",
      label: "max_eps",
      min: 0.01,
      max: 2,
      step: 0.01,
      hint: "Ordering 구성의 최대 검색 반경",
    },
    {
      key: "extraction",
      label: "추출 방법",
      options: ["epsilon", "xi"],
      hint: "ε-cut 또는 Xi steep-area 및 predecessor 보정",
    },
    {
      key: "threshold",
      label: "추출 ε-cut",
      min: 0.005,
      max: 1,
      step: 0.005,
      hint: "epsilon 추출에서 사용",
    },
    {
      key: "xi",
      label: "Xi (ξ)",
      min: 0.01,
      max: 0.3,
      step: 0.01,
      hint: "Xi 추출에서 사용하는 최소 steepness",
    },
    {
      key: "minSize",
      label: "Xi 최소 군집 크기",
      min: 2,
      max: 100,
      hint: "Xi 구간에 필요한 최소 점 수",
    },
  ],
  PAM: [
    {
      key: "k",
      label: "Medoid 수 K",
      min: 1,
      max: 10,
      hint: "실제 데이터 대표점 수",
    },
    {
      key: "initialization",
      label: "초기화",
      options: ["build", "random"],
      hint: "BUILD는 총 거리 비용 감소 기준",
    },
    {
      key: "iterations",
      label: "최대 SWAP 반복",
      min: 1,
      max: 30,
      hint: "전수 교환 탐색 한도",
    },
  ],
  ROCK: [
    {
      key: "threshold",
      label: "Jaccard 임계값 θ",
      min: 0.05,
      max: 0.95,
      step: 0.05,
      hint: "범주형 token 집합 유사도 기준",
    },
    {
      key: "k",
      label: "목표 군집 수",
      min: 1,
      max: 12,
      hint: "양의 Link가 없으면 일찍 종료 가능",
    },
  ],
  GMM: [
    {
      key: "k",
      label: "Gaussian 성분 수",
      min: 1,
      max: 10,
      hint: "혼합 모델의 성분 수",
    },
    {
      key: "covariance",
      label: "공분산 형태",
      options: ["full", "diag", "spherical"],
      hint: "회전 타원 · 축 정렬 · 원형",
    },
    {
      key: "initialization",
      label: "평균 초기화",
      options: ["kmeans++", "random"],
      hint: "시드 기반 재현 가능 초기화",
    },
    {
      key: "iterations",
      label: "최대 EM 반복",
      min: 1,
      max: 80,
      hint: "로그우도 수렴 시 조기 종료",
    },
  ],
  BIRCH: [
    {
      key: "threshold",
      label: "Threshold (반경)",
      min: 0.005,
      max: 0.3,
      step: 0.005,
      hint: "새 점 흡수 후 CF 반경 상한",
    },
    {
      key: "branching",
      label: "Branching Factor",
      min: 2,
      max: 12,
      hint: "노드당 최대 CF 항목 수",
    },
    {
      key: "k",
      label: "최종 군집 수",
      min: 1,
      max: 12,
      hint: "최종 가중 Ward 선택 시에만 적용",
    },
  ],
};
