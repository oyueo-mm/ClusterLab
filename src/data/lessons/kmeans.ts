import type { Lesson } from "./types";
export const kmeans: Lesson = {
  purpose:
    "여러 관측값을 K개의 대표 위치로 요약하는 벡터 양자화 문제입니다. Lloyd의 교대 최적화는 중심과 할당을 한꺼번에 찾기 어려운 문제를 두 개의 쉬운 부분 문제로 나눕니다. 비슷한 분산의 볼록한 군집에 적합합니다.",
  analogy:
    "배송 지점을 K개의 창고로 나눈다고 생각하세요. 가까운 창고에 배송 지점을 배정한 뒤, 각 창고를 담당 지점의 평균 위치로 옮깁니다. 여기서 비용은 실제 배송 거리 대신 거리의 제곱입니다.",
  operations: [
    {
      title: "초기화",
      input: "좌표 x₁,…,xₙ, K, seed",
      calculation:
        "첫 점은 균일 추출하고 이후 중심은 최근접 중심까지의 거리 제곱 D²에 비례해 추출합니다.",
      output: "관측점에서 선택한 K개의 초기 중심; initialize 이벤트",
    },
    {
      title: "할당",
      input: "고정한 중심 μ₁,…,μK",
      calculation:
        "각 점의 K개 제곱거리를 비교하고 최소 인덱스를 저장합니다. 동률은 앞선 중심을 선택합니다.",
      output: "labels; distance → assign 이벤트",
    },
    {
      title: "평균 갱신",
      input: "현재 labels",
      calculation:
        "군집마다 좌표를 합산하고 점 개수로 나눕니다. 빈 군집은 이전 중심을 유지합니다.",
      output: "centers와 Inertia; move 이벤트",
    },
    {
      title: "종료",
      input: "이전 할당과 현재 할당",
      calculation:
        "할당이 같거나 최대 반복에 도달하면 종료하고 마지막 중심으로 재할당합니다.",
      output: "최종 최근접 할당; assign → finish",
    },
  ],
  equations: [
    {
      title: "WCSS 목적함수와 최근접 할당",
      tex: String.raw`J(c,\mu)=\sum_{i=1}^{n}\|x_i-\mu_{c_i}\|^2,\qquad c_i=\arg\min_{1\leq k\leq K}\|x_i-\mu_k\|^2`,
      symbols:
        "n: 표본 수, K: 군집 수, xᵢ∈ℝ²: 좌표, cᵢ: 소속 번호, μk: 중심. WCSS와 Inertia는 이 거리 제곱합입니다.",
      meaning:
        "중심이 고정되면 각 점의 항을 독립적으로 최소화할 수 있으므로 가장 가까운 중심을 고릅니다.",
      derivation: [
        "전체 합에서 cᵢ가 바꾸는 항은 i번째 항뿐입니다. 모든 i에 대해 최소 항을 선택하면 J가 증가하지 않습니다.",
        "각 군집의 영역은 Euclidean Voronoi 셀입니다. 그래서 두 초승달처럼 굽은 모양을 하나의 군집으로 표현하기 어렵습니다.",
      ],
    },
    {
      title: "평균이 최적인 이유",
      tex: String.raw`\nabla_\mu\sum_{i\in C}\|x_i-\mu\|^2=2|C|\mu-2\sum_{i\in C}x_i=0\quad\Rightarrow\quad\mu=\bar x_C`,
      symbols:
        "C: 비어 있지 않은 군집의 점 인덱스 집합, |C|: 크기, x̄C: 표본 평균.",
      meaning: "할당을 고정했을 때 평균은 제곱거리 비용의 유일한 최소점입니다.",
      derivation: [
        "제곱항을 전개해 미분합니다. Hessian은 2|C|I로 양의 정부호이므로 정류점이 전역 최소입니다.",
        "더 직접적으로 Σ‖xᵢ−μ‖²=Σ‖xᵢ−x̄C‖²+|C|‖μ−x̄C‖²입니다. 교차항은 Σ(xᵢ−x̄C)=0이어서 사라집니다.",
        "할당과 평균 갱신은 각각 J를 비증가시킵니다. 유한한 할당과 일관된 동률 처리 아래 고정점에 도달하지만, 전역 최소를 보장하지 않습니다. 반복 한도 종료는 수렴 보장과 다릅니다.",
      ],
    },
    {
      title: "K-Means++",
      tex: String.raw`P(x_i\text{ 선택})=\frac{D_i^2}{\sum_jD_j^2}`,
      symbols: "Dᵢ: 이미 선택한 중심 중 가장 가까운 중심까지의 거리.",
      meaning:
        "이미 대표된 영역에서 먼 점을 더 자주 뽑아 초기 중심의 중복을 줄입니다.",
      derivation: [
        "분모는 양의 가중치를 합이 1인 분포로 만듭니다. 모든 D가 0이면 아직 선택하지 않은 점으로 대체합니다.",
        "좋은 초기화가 모든 실행의 전역 최적성을 뜻하지는 않습니다. 앱은 여러 번 실행한 결과 중 최선을 자동 선택하지 않으므로 seed 실험이 필요합니다.",
      ],
    },
  ],
  numerical: {
    title: "(0,0), (0,2), (4,0), (4,2), K=2",
    steps: [
      "초기 중심 (0,0), (4,0). 점 (0,2)의 제곱거리는 4와 20이므로 첫 군집입니다.",
      "새 중심은 (0,1), (4,1). 각 군집 비용은 1+1=2, 총 J=4입니다. 초기 J=0+4+0+4=8에서 감소합니다.",
      "이 예제는 단위 정사각형 밖의 손계산 좌표입니다. 아래 미니 실험은 별도의 정규화된 프리셋에서 실제 엔진을 실행합니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "크게 하면 표현력이 늘고 최적 WCSS는 감소하지만 작은 군집으로 과분할할 수 있습니다. 작게 하면 다른 집단이 합쳐집니다.",
      experiment:
        "가우시안 군집에서 2→3→5. seed별 지역해 때문에 한 실행의 비용은 K에 대해 단조일 필요가 없습니다.",
    },
    {
      key: "initialization",
      effect:
        "random은 서로 다른 관측점을 균일 추출합니다. kmeans++는 D² 추출입니다.",
      experiment:
        "같은 K에서 seed와 초기화만 바꾸고 최종 Inertia를 비교하세요.",
    },
    {
      key: "iterations",
      effect:
        "한도가 작으면 중간에 종료하고, 크면 계산량만 늘거나 고정점에서 일찍 끝납니다.",
      experiment: "겹치는 군집에서 1회와 20회를 비교하세요.",
    },
  ],
  complexity: {
    theory:
      "Lloyd 한 반복 O(nKd); T회 O(TnKd). 전역 최적화 문제와 이 반복법의 비용은 다릅니다.",
    implementation:
      "d=2에서 O(TnK), K-Means++ 누적 중심 전수 비교 초기화 O(nK²).",
    space: "수치 상태 O(n+K). Trace는 점별 labels 복사 때문에 최악 O(Tn²+TK).",
    cost: "n, K, 반복 수 증가와 정밀 이벤트 저장이 비용을 키웁니다. Elkan 가속·mini-batch 없음.",
  },
  implementation: [
    "2D Euclidean 제곱거리만 사용합니다. 빈 군집 재추출 대신 이전 중심을 보존합니다.",
    "최종 재할당은 반복 한도 이후에도 수행합니다. 마지막 기록 Inertia는 그 직전 평균 갱신 시점의 값입니다.",
  ],
  comparison: [
    {
      other: "PAM",
      difference:
        "PAM은 관측점만 대표로 허용하고 비제곱 거리합을 줄입니다. 큰 이상치의 영향이 상대적으로 작습니다.",
    },
    {
      other: "GMM",
      difference:
        "GMM은 공분산과 소속 확률을 추정합니다. K-Means는 한 군집 번호와 중심만 추정합니다.",
    },
  ],
  references: [
    {
      title: "Lloyd (1982), Least squares quantization in PCM",
      url: "https://doi.org/10.1109/TIT.1982.1056489",
      note: "교대 할당·대표값 갱신의 원문.",
    },
    {
      title: "Arthur & Vassilvitskii (2007), K-Means++",
      url: "https://theory.stanford.edu/~sergei/papers/kMeansPP-soda.pdf",
      note: "D² 초기화와 기대 비용 보장의 가정.",
    },
  ],
  preset: "blobs",
  events: ["distance", "assign", "move"],
  advanced: [
    "단조 감소는 전역 최적의 증명이 아닙니다. 이상치 하나의 큰 제곱거리는 중심을 강하게 끌어당깁니다.",
    "각 좌표의 단위가 다르면 큰 단위가 할당을 지배합니다. 앱은 입력을 자동 표준화하지 않습니다.",
  ],
};
