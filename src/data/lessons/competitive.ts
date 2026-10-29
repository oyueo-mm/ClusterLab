import type { Lesson } from "./types";
export const som: Lesson = {
  purpose:
    "Kohonen의 Self-Organizing Map은 고정 격자 뉴런의 가중치를 데이터 공간에 배치해 이웃 관계를 학습합니다. 직접 K개의 일반 군집을 추출하는 알고리즘보다는 위상과 대표값을 시각화하는 경쟁학습입니다.",
  analogy:
    "연결된 그물을 점 구름 위에 놓습니다. 한 점이 당기면 가장 가까운 매듭 BMU와 주변 매듭이 함께 움직입니다. 처음에는 넓게, 나중에는 국소적으로 적응합니다.",
  operations: [
    {
      title: "격자 초기화",
      input: "g×g 격자, seed",
      calculation:
        "각 뉴런의 2D 가중치를 초기화하고 격자 상하좌우 연결을 만듭니다.",
      output: "centers, edges; initialize",
    },
    {
      title: "경쟁",
      input: "시드로 섞은 입력 x",
      calculation: "데이터 공간 거리 제곱이 최소인 뉴런을 BMU로 고릅니다.",
      output: "winner·학습률·반경; distance",
    },
    {
      title: "협력 갱신",
      input: "BMU의 격자 위치",
      calculation:
        "격자 Gaussian 함수로 모든 뉴런에 다른 강도의 이동을 적용합니다. 시간에 따라 α,σ를 줄입니다.",
      output: "centers; prototype",
    },
    {
      title: "평가·종료",
      input: "epoch가 끝난 가중치",
      calculation:
        "평균 최근접 거리를 QE로 기록합니다. 정해진 epoch가 끝나면 각 점을 BMU 인덱스로 색칠합니다.",
      output: "QE metric, BMU labels; prototype → finish",
    },
  ],
  equations: [
    {
      title: "BMU와 이웃 학습",
      tex: String.raw`b=\arg\min_j\|x-w_j\|^2,\quad h_{jb}=e^{-\|r_j-r_b\|^2/(2\sigma^2)},\quad w_j\leftarrow w_j+\alpha h_{jb}(x-w_j)`,
      symbols:
        "wⱼ∈ℝ²: 데이터 공간 가중치, rⱼ: 격자 좌표, b: BMU, α: 학습률, σ: 격자 반경.",
      meaning:
        "승자뿐 아니라 격자에서 가까운 뉴런도 비슷한 입력을 학습해 정돈된 배치를 유도합니다.",
      derivation: [
        "h는 데이터 거리 ‖x−wⱼ‖가 아닌 격자 거리 ‖rⱼ−rᵦ‖로 결정됩니다. BMU는 h=1입니다.",
        "0≤αh≤1이면 갱신은 현재 가중치와 x의 볼록 결합입니다. 이 성질은 한 번의 갱신이 두 위치 사이에 놓임을 뜻하며 전체 위상 보존의 보장은 아닙니다.",
        "앱은 학습 진행비 u에서 α=α₀e⁻³ᵘ, σ=max(0.1,σ₀e⁻³ᵘ)입니다. epoch 종료 조건이며 QE 수렴을 자동 판정하지 않습니다.",
      ],
    },
    {
      title: "QE와 U-Matrix",
      tex: String.raw`\mathrm{QE}=\frac1n\sum_i\min_j\|x_i-w_j\|,\quad U_j=\frac1{|A_j|}\sum_{l\in A_j}\|w_j-w_l\|`,
      symbols:
        "Aⱼ: 격자에서 상하좌우로 인접한 뉴런 집합. QE는 제곱거리가 아닌 거리 평균.",
      meaning:
        "QE는 데이터 표현 오차, U는 인접 가중치 간 벌어짐입니다. 큰 U 영역은 경계 후보를 보여줍니다.",
      derivation: [
        "QE가 작아도 뉴런 수를 늘린 효과일 수 있습니다. topology 품질과 일반 군집 품질을 모두 뜻하지 않습니다.",
        "U-Matrix의 큰 셀을 군집 경계로 읽는 것은 해석이며 앱은 이를 자동 분할로 변환하지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "한 이웃 뉴런의 갱신",
    steps: [
      "x=(0.8,0.2), BMU 가중치=(0.6,0.4), α=0.5. 승자는 (0.7,0.3)으로 이동합니다.",
      "격자 거리 1인 이웃 w=(0.2,0.2), σ=1이면 h=e⁻⁰·⁵≈0.60653066. 새 w=(0.38195920,0.2)입니다.",
      "이웃이 데이터 공간에서 입력에 가까워서가 아니라 격자에서 승자에 가까워서 갱신되었다는 점을 확인하세요.",
    ],
  },
  parameters: [
    {
      key: "grid",
      effect:
        "크면 표현력이 늘지만 뉴런이 과다해지고 학습 비용이 g²에 비례합니다. 작으면 세부 구조를 잃습니다.",
      experiment: "고리형 군집에서 3×3과 6×6 비교.",
    },
    {
      key: "learningRate",
      effect:
        "크면 빠르게 움직이나 흔들릴 수 있고 작으면 고정 epoch 안에서 적응이 느립니다.",
      experiment: "같은 seed·epoch에서 0.05와 0.4 비교.",
    },
    {
      key: "radius",
      effect:
        "크면 전역 격자 질서가 강해지고 작으면 거의 독립적인 승자 학습이 됩니다.",
      experiment: "데이터 반경과 혼동하지 말고 0.5와 3 비교.",
    },
    {
      key: "epochs",
      effect:
        "반복을 늘리면 계산이 늘고 감소 스케줄 전체도 길어집니다. 품질 개선이 단조라는 보장은 없습니다.",
      experiment: "QE와 그물 접힘을 함께 확인하세요.",
    },
  ],
  complexity: {
    theory: "M개 뉴런의 online SOM은 O(EnMd), E는 epoch 수.",
    implementation: "d=2, M=g²이므로 O(Eng²). QE도 epoch마다 같은 차수.",
    space: "수치 상태 O(g²+n). 모든 갱신의 centers를 복사하는 Trace는 O(Eng⁴).",
    cost: "grid를 두 배로 하면 뉴런은 네 배이고 정밀 기록은 더 빠르게 증가합니다.",
  },
  implementation: [
    "직사각 2D 격자, online Gaussian neighborhood, Euclidean BMU입니다. toroidal 격자·batch SOM 없음.",
    "최종 색은 BMU 번호이며 독립적인 의미 군집이 아닙니다. 팔레트가 반복되어 다른 뉴런이 같은 색으로 보일 수 있습니다.",
  ],
  comparison: [
    {
      other: "LVQ",
      difference:
        "SOM은 라벨 없이 격자 이웃을 함께 학습합니다. LVQ1은 정답 라벨에 따라 승자만 당기거나 밀어냅니다.",
    },
    {
      other: "K-Means",
      difference:
        "K-Means 중심 사이에는 격자 관계가 없으며 할당 평균을 일괄 갱신합니다.",
    },
  ],
  references: [
    {
      title: "Kohonen & Honkela (2007), Kohonen network",
      url: "https://www.scholarpedia.org/article/Kohonen_networks",
      note: "저자가 설명하는 BMU·격자 이웃과 위상 학습.",
    },
    {
      title:
        "Kohonen (1982), Self-organized formation of topologically correct feature maps",
      url: "https://doi.org/10.1007/BF00337288",
      note: "자기조직화 지도의 원논문.",
    },
  ],
  preset: "rings",
  events: ["distance", "prototype", "finish"],
  advanced: [
    "위상 보존은 학습의 목표이며 항상 보장되는 불변량이 아닙니다. 초기화·반경·데이터 모양에 따라 격자가 접히거나 찢어진 듯 보일 수 있습니다.",
  ],
};
export const lvq: Lesson = {
  purpose:
    "Learning Vector Quantization은 정답 클래스가 있는 지도 분류 알고리즘입니다. 비지도 클러스터링과 달리 좋은 그룹을 스스로 정의하는 것이 아니라 클래스 경계를 학습합니다. 이 앱은 가장 기본적인 LVQ1을 사용합니다.",
  analogy:
    "각 클래스의 대표 선수가 입력을 맞힙니다. 정답 클래스의 선수가 이기면 입력 쪽으로 당기고, 오답 선수가 이기면 멀리 밀어 결정영역을 수정합니다.",
  operations: [
    {
      title: "클래스별 초기화",
      input: "모든 점의 label, 클래스별 K",
      calculation:
        "각 클래스에서 seed 난수로 K개 프로토타입을 추출합니다. 같은 관측점이 중복 추출될 수 있습니다.",
      output: "클래스가 붙은 centers; initialize",
    },
    {
      title: "최근접 승자",
      input: "섞인 순서의 점 x와 정답 y",
      calculation:
        "모든 프로토타입 중 거리 제곱이 최소인 승자를 찾고 승자 클래스와 y를 비교합니다.",
      output: "winner, match; distance",
    },
    {
      title: "당김·밀어냄",
      input: "승자와 학습률",
      calculation:
        "일치하면 +α(x−w), 불일치하면 −α(x−w)를 승자에만 적용합니다.",
      output: "centers; prototype",
    },
    {
      title: "평가",
      input: "epoch의 전체 프로토타입",
      calculation:
        "최근접 프로토타입의 클래스로 훈련 정확도를 기록하고 정해진 epoch에서 종료합니다.",
      output: "훈련 정확도 metric; prototype → finish",
    },
  ],
  equations: [
    {
      title: "LVQ1 승자 업데이트",
      tex: String.raw`b=\arg\min_j\|x-w_j\|^2,\quad w_b\leftarrow w_b+s\alpha(x-w_b),\quad s=\begin{cases}+1&c_b=y\\-1&c_b\ne y\end{cases}`,
      symbols:
        "cᵦ: 승자의 클래스, y: 정답 클래스, α>0: 학습률. 다른 프로토타입은 유지.",
      meaning:
        "같은 클래스의 대표는 그 관측을 더 잘 대표하고, 오답 대표는 그 영역을 정답 쪽에 양보하도록 움직입니다.",
      derivation: [
        "정답 승자의 입력 거리 벡터는 (1−α)(x−w), 오답 승자의 거리는 (1+α)(x−w)가 됩니다. 즉 한 번의 업데이트는 의도한 방향으로 거리를 바꿉니다.",
        "승자가 바뀌는 비연속성과 클래스 간 경쟁 때문에 이것만으로 분류 손실 전체가 매번 감소한다고 결론 낼 수 없습니다. LVQ1을 GLVQ의 명시적 비용 최적화와 혼동하지 마세요.",
        "서로 다른 클래스 프로토타입의 Euclidean Voronoi 경계가 분류 경계를 만듭니다. 프로토타입 수가 많으면 더 복잡한 경계가 가능합니다.",
      ],
    },
  ],
  numerical: {
    title: "같은 좌표에서 정답 여부가 바꾸는 이동",
    steps: [
      "x=(0.8,0.2), w=(0.6,0.4), α=0.25이면 차이는 (0.2,−0.2).",
      "정답 승자는 (0.65,0.35), 오답 승자는 (0.55,0.45)입니다.",
      "입력까지의 제곱거리는 초기 0.08, 정답 갱신 후 0.045, 오답 갱신 후 0.125입니다. 이 국소 변화는 전체 훈련 정확도의 증가를 보장하지 않습니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "클래스별 수입니다. 전체 프로토타입은 클래스 수 c×K. 늘리면 경계가 세밀해지나 과적합·중복 대표가 생깁니다.",
      experiment: "겹치는 클래스에서 1개와 3개 비교.",
    },
    {
      key: "learningRate",
      effect:
        "크면 당김·밀어냄이 강해 불안정할 수 있고 작으면 적응이 느립니다.",
      experiment: "0.05와 0.3. 잘못 라벨된 점의 영향도 관찰하세요.",
    },
    {
      key: "epochs",
      effect:
        "epoch마다 α=α₀(1−e/E)를 사용합니다. 늘려도 일반화가 보장되지는 않습니다.",
      experiment:
        "훈련 정확도와 별도 검증 데이터 정확도는 다른 값임을 구분하세요.",
    },
  ],
  complexity: {
    theory: "프로토타입 M=cK, d차원에서 O(EnMd).",
    implementation: "2D에서 O(EncK), 훈련 정확도 계산도 epoch마다 O(ncK).",
    space: "엔진 O(n+cK). centers를 매 입력마다 저장하는 Trace는 O(En(cK)²).",
    cost: "클래스 수·클래스별 K·epoch 증가로 비용이 커집니다.",
  },
  implementation: [
    "모든 점에 정답 label이 필요합니다. 범주형 features는 LVQ 계산에 사용하지 않습니다.",
    "Canvas 점 색은 정답 클래스입니다. 배경의 최근접 프로토타입 결정영역과 다를 수 있습니다. 테스트 분할·교차검증·LVQ2/GLVQ는 지원하지 않습니다.",
  ],
  comparison: [
    {
      other: "SOM",
      difference:
        "SOM은 라벨 없이 격자 이웃까지 움직입니다. LVQ1은 승자 하나를 라벨에 따라 반대 방향으로도 움직입니다.",
    },
  ],
  references: [
    {
      title: "Kohonen et al. (1996), LVQ_PAK · Report A30",
      url: "https://research.aalto.fi/en/publications/lvqpak-the-learning-vector-quantization-program-package/",
      note: "저자 프로그램 패키지 보고서의 공식 서지 정보. 업데이트 분석은 아래 JMLR 원문을 보세요.",
    },
    {
      title:
        "Biehl et al. (2007), Dynamics and Generalization Ability of LVQ Algorithms",
      url: "https://jmlr.org/papers/v8/biehl07a.html",
      note: "LVQ1 변형·학습 동역학과 일반화의 차이.",
    },
  ],
  preset: "labeled",
  events: ["distance", "prototype", "finish"],
  advanced: [
    "클래스 불균형에서는 전체 정확도가 큰 클래스만 반영할 수 있습니다. 클래스별 성능과 별도 검증 데이터가 필요합니다.",
    "라벨 잡음은 오답 프로토타입을 잘못 밀어낼 수 있습니다. 훈련 정확도가 높아도 새로운 데이터의 성능은 별도 문제입니다.",
  ],
};
