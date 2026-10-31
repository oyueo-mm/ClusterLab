import type { Lesson } from "./types";
export const fuzzy: Lesson = {
  purpose: "고정 K에서 퍼지 목적함수 J_m을 교대 최소화합니다.",
  analogy:
    "경계의 점을 한 색으로 단정하기보다 여러 군집의 색으로 섞어 표현합니다. 색의 비율은 확률 모델에서 나온 값이 아닙니다.",
  operations: [
    {
      title: "초기화",
      input: "점, K, m>1, seed",
      calculation: "양의 시드 난수로 행을 만들고 행합으로 정규화합니다.",
      output: "초기 소속도 U",
    },
    {
      title: "중심",
      input: "고정한 U",
      calculation: "u_ij^m을 가중치로 각 좌표의 평균을 계산합니다.",
      output: "move 이벤트의 중심",
    },
    {
      title: "소속도",
      input: "고정한 중심",
      calculation:
        "거리 제곱의 -1/(m-1)승을 정규화합니다. 거리가 0인 중심끼리는 균등 배분합니다.",
      output: "assign 이벤트의 U, argmax 레이블, J_m",
    },
    {
      title: "종료",
      input: "이전 U와 새 U",
      calculation: "최대 절댓값 변화가 tolerance 이하인지 확인합니다.",
      output: "수렴 또는 반복 한도 표시",
    },
  ],
  equations: [
    {
      title: "목적함수와 교대 최적화",
      tex: String.raw`J_m=\sum_{i,j}u_{ij}^m\|x_i-v_j\|^2,\quad v_j=\frac{\sum_i u_{ij}^m x_i}{\sum_i u_{ij}^m},\quad u_{ij}=\frac{d_{ij}^{-2/(m-1)}}{\sum_l d_{il}^{-2/(m-1)}}`,
      symbols: "m>1: fuzzifier, u_ij: 소속도, d_ij: Euclidean 거리, v_j: 중심.",
      meaning: "행합 1 제약하에서 두 변수 집합을 교대로 최적화합니다.",
      derivation: [
        "고정한 U에서 중심으로 미분하면 가중평균을 얻습니다.",
        "행합 1의 Lagrange 승수를 도입하면 m u^(m-1) d²가 군집마다 같아야 하므로 역거리 거듭제곱 정규화를 얻습니다.",
      ],
    },
  ],
  numerical: {
    title: "중심 0, 2와 점 0.5, m=2",
    steps: [
      "제곱거리는 0.25와 2.25입니다.",
      "역제곱거리 가중치는 4와 4/9입니다. 정규화 소속도는 0.9와 0.1입니다.",
      "목적함수 기여는 0.9²×0.25+0.1²×2.25=0.225입니다. 양쪽 중심과 거리가 0이면 각각 0.5로 둡니다.",
    ],
  },
  parameters: [
    {
      key: "fuzziness",
      effect:
        "1에 가까우면 날카로운 할당, 커지면 균등한 소속도에 가까워집니다.",
      experiment: "겹치는 군집에서 1.2와 3을 비교하세요.",
    },
    {
      key: "k",
      effect: "소속도 열 수를 결정합니다.",
      experiment: "K=2와 3을 비교하세요.",
    },
    {
      key: "tolerance",
      effect: "최대 소속도 변화의 종료 기준입니다.",
      experiment: "반복 한도와 별개로 수렴 여부를 확인하세요.",
    },
  ],
  complexity: {
    theory: "O(TnKd)",
    implementation: "2D의 모든 점을 사용하며 O(TnK)",
    space: "계산 O(nK), 상세 Trace O(TnK), 별도 메모리 예산 적용",
    cost: "소속도 행렬이 지배적입니다.",
  },
  implementation: [
    "행렬 저장소 이름 responsibilities는 기존 렌더러 호환용입니다. 여기의 값은 퍼지 소속도이며 확률이 아닙니다.",
    "로그 정규화로 m이 1에 가까울 때 overflow를 줄입니다. 가중치 소실 시 수치 오류로 보고합니다.",
  ],
  comparison: [
    {
      other: "GMM",
      difference:
        "GMM은 생성 분포와 사후확률을 추정합니다. FCM은 거리 목적함수와 퍼지 제약을 사용합니다.",
    },
  ],
  references: [
    {
      title:
        "Bezdek, Ehrlich & Full (1984), FCM: The fuzzy c-means clustering algorithm",
      url: "https://doi.org/10.1016/0098-3004(84)90020-7",
      note: "수식 출처. DOI 원문 열람은 이번 환경에서 403으로 제한됨.",
    },
    {
      title: "scikit-fuzzy cmeans equations",
      url: "https://scikit-fuzzy.readthedocs.io/en/latest/_modules/skfuzzy/cluster/_cmeans.html",
      note: "독립 구현의 가중평균·소속도 갱신 수식 확인. 제품 코드 복사 없음.",
    },
  ],
  preset: "overlap",
  events: ["move", "assign"],
  advanced: [
    "전역 최소 보장은 없으며 초기 소속도에 민감합니다. 경계의 모호함이 통계적 불확실성과 같지는 않습니다.",
  ],
};
export const bisecting: Lesson = {
  purpose: "큰 SSE를 갖는 잎을 반복 이분할하는 K-Means 변형입니다.",
  analogy:
    "한 지역을 두 담당 지역으로 나누고, 아직 비용이 큰 지역을 다시 둘로 나눕니다.",
  operations: [
    {
      title: "루트",
      input: "전체 데이터",
      calculation: "전체 평균과 SSE를 계산합니다.",
      output: "하나의 루트와 중심",
    },
    {
      title: "후보 선택",
      input: "현재 잎",
      calculation: "양의 SSE가 가장 큰 잎을 선택합니다.",
      output: "split 이벤트",
    },
    {
      title: "2-Means",
      input: "선택한 잎의 원본 점",
      calculation:
        "K-Means++ 초기화 후 최근접 할당과 두 평균 갱신을 반복합니다.",
      output: "assign, move 이벤트",
    },
    {
      title: "분할 확정",
      input: "두 자식",
      calculation: "부모를 자식으로 대체하고 SSE와 트리를 기록합니다.",
      output: "K개 잎 또는 분할 가능한 좌표 소진",
    },
  ],
  equations: [
    {
      title: "분할 후보와 SSE",
      tex: String.raw`S(C)=\sum_{i\in C}\|x_i-\bar x_C\|^2,\quad C^*=\arg\max_{C\in\mathcal L}S(C)`,
      symbols: "L: 현재 잎 집합, C: 잎의 인덱스 집합, x̄_C: 표본 평균.",
      meaning: "현재 오차가 큰 잎에 분할 계산을 배정합니다.",
      derivation: [
        "평균은 고정된 군집의 제곱거리합을 최소화합니다.",
        "자식을 각각 평균으로 표현한 SSE 합은 부모 평균으로 표현한 SSE보다 클 수 없습니다. 전역 최적 분할 보장은 없습니다.",
      ],
    },
  ],
  numerical: {
    title: "직선상의 0, 1, 9, 10",
    steps: [
      "루트 평균은 5, SSE는 25+16+16+25=82입니다.",
      "두 자식 {0,1}, {9,10}의 평균은 0.5와 9.5입니다.",
      "자식 SSE의 합은 0.5+0.5=1입니다. 마지막 레이블은 트리 잎 소속을 유지하며 전체 중심에 재할당하지 않습니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect: "목표 잎 수입니다. 동일 좌표만 남으면 일찍 종료합니다.",
      experiment: "K=1,2,3의 분할 트리를 비교하세요.",
    },
    {
      key: "iterations",
      effect: "각 잎 내부의 Lloyd 반복 한도입니다.",
      experiment: "1회와 20회의 SSE와 innerConverged를 비교하세요.",
    },
  ],
  complexity: {
    theory: "균형 트리 O(Tnd log K), 불균형 최악 O(TndK)",
    implementation: "잎 선택은 largest inertia, 이분할마다 시드 단일 시도",
    space: "계산 O(n+K), 상세 Trace 및 체크포인트 별도 예산",
    cost: "분할마다 해당 잎의 모든 점을 계산합니다.",
  },
  implementation: [
    "sklearn의 n_init 다중 시도와 같은 결과를 일반적으로 보장하지 않습니다. 이 엔진은 단일 시도입니다.",
    "트리 높이는 각 잎 RMS 반경이며 병합 거리 덴드로그램이 아닙니다. 내부 노드의 높이를 원래 분할 시점의 값으로 보존합니다.",
  ],
  comparison: [
    {
      other: "K-Means",
      difference:
        "Lloyd는 모든 중심을 함께 갱신하고, 이 방법은 기존 분할을 유지하며 한 잎만 갱신합니다.",
    },
  ],
  references: [
    {
      title:
        "Steinbach, Karypis & Kumar (2000), A Comparison of Document Clustering Techniques",
      url: "https://www-users.cse.umn.edu/~kumar001/papers/doccluster.pdf",
      note: "대표적인 이분할 K-Means 기술 보고서.",
    },
    {
      title: "scikit-learn BisectingKMeans",
      url: "https://scikit-learn.org/stable/modules/generated/sklearn.cluster.BisectingKMeans.html",
      note: "독립 구현의 분할 전략 문서.",
    },
  ],
  preset: "blobs",
  events: ["split", "assign", "move"],
  advanced: [
    "트리 분할에 대한 결정은 되돌리지 않습니다. 초기값과 선택 전략에 민감하며 비볼록 군집에 부적합합니다.",
  ],
};
