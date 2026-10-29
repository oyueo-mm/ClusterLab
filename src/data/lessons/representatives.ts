import type { Lesson } from "./types";
export const pam: Lesson = {
  purpose:
    "평균이 실제 관측을 대표하기 어렵거나 이상치의 제곱거리 영향을 줄이고 싶을 때 K개의 실제 관측점 medoid를 고릅니다. PAM은 K-medoids 문제를 BUILD와 SWAP으로 탐욕 최적화하는 방법입니다.",
  analogy:
    "지도 위 임의의 새 위치에 대표를 만들지 않고 실제 지점 중 대표를 고릅니다. 현재 대표 하나를 일반 지점 하나와 바꿨을 때 전체 접근 거리가 얼마나 줄어드는지 모두 따집니다.",
  operations: [
    {
      title: "거리 행렬과 BUILD",
      input: "2D 좌표, K",
      calculation:
        "모든 점 쌍 거리를 저장합니다. 전체 최근접 거리합을 가장 줄이는 관측점을 하나씩 추가합니다.",
      output: "실제 점 ID를 갖는 medoids; initialize",
    },
    {
      title: "할당",
      input: "선택한 medoid 집합 M",
      calculation: "모든 점을 최근접 medoid에 배정하고 거리합을 계산합니다.",
      output: "labels, 총 거리 비용; assign",
    },
    {
      title: "전수 SWAP",
      input: "각 medoid m과 비medoid h",
      calculation:
        "M에서 m을 빼고 h를 넣은 비용을 모두 계산합니다. 가장 큰 감소를 주는 교환 하나를 적용합니다.",
      output: "후보별 delta; swap, 채택 시 move",
    },
    {
      title: "종료",
      input: "최선 교환의 개선량",
      calculation: "10⁻¹⁰보다 큰 개선이 없거나 반복 한도이면 멈춥니다.",
      output:
        "최종 medoid와 labels; finish. 반복 한도이면 교환 최적성을 보장하지 않습니다.",
    },
  ],
  equations: [
    {
      title: "Medoid 목적함수와 교환 비용",
      tex: String.raw`J(M)=\sum_i\min_{m\in M}d(x_i,x_m),\quad |M|=K,\quad\Delta(m,h)=J((M\setminus\{m\})\cup\{h\})-J(M)`,
      symbols:
        "M: 관측점 인덱스 집합, m∈M, h∉M. d는 앱에서 Euclidean 거리이며 제곱하지 않습니다.",
      meaning:
        "대표는 반드시 데이터 중 하나입니다. Δ<0인 교환만 비용을 개선합니다.",
      derivation: [
        "한 군집에서 medoid는 실제 관측점 후보마다 거리합을 비교해 고릅니다. 평균처럼 미분으로 임의 좌표를 구할 수 없습니다.",
        "모든 단일 교환의 Δ≥0이면 1-swap 국소 최적점입니다. 여러 대표를 동시에 바꾸는 전역 최적이나 다른 K의 최적을 보장하지 않습니다.",
        "비제곱 거리는 멀리 있는 점의 비용이 선형으로 커집니다. 그래서 제곱거리 평균보다 강건하지만 이상치에 완전히 면역인 것은 아닙니다.",
      ],
    },
  ],
  numerical: {
    title: "Centroid와 medoid 비교",
    steps: [
      "y=0의 관측 x={0,1,10}, K=1. 대표 후보 0의 거리합=11, 1의 거리합=10, 10의 거리합=19. medoid는 관측점 1입니다.",
      "평균 centroid는 11/3≈3.6667로 데이터에 없는 위치입니다. 이는 제곱거리합을 최소화하지만 PAM의 후보가 아닙니다.",
      "현재 M={0}에서 1로 교환하면 Δ=10−11=−1. 10으로 교환하면 Δ=19−11=8이므로 첫 교환만 유리합니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "늘리면 대표가 늘지만 비용과 해석 복잡도가 커집니다. 작으면 서로 다른 집단을 하나의 실제 점으로 대표합니다.",
      experiment: "노이즈와 이상치에서 K=2와 3 비교.",
    },
    {
      key: "initialization",
      effect: "build는 탐욕 비용 감소, random은 중복 없는 추출입니다.",
      experiment: "같은 K·seed에서 초기 비용과 SWAP 수 비교.",
    },
    {
      key: "iterations",
      effect: "한도가 낮으면 개선 가능한 교환을 남기고 끝날 수 있습니다.",
      experiment:
        "겹치는 군집에서 1회와 20회. 후보 Δ와 채택한 move를 구분하세요.",
    },
  ],
  complexity: {
    theory:
      "원형 PAM SWAP은 최근접·차선 거리 캐시를 이용해 반복당 O(K(n−K)²) 수준. FastPAM은 다른 최적화입니다.",
    implementation:
      "K(n−K) 후보마다 O(nK) 비용 재계산: O(TK²n(n−K)), BUILD O(n²K²) 상한.",
    space:
      "거리 행렬 O(n²). SWAP의 상수 크기 패치와 move labels를 기록하며 이벤트 수 O(TKn).",
    cost: "K와 n이 커지면 전수 교환 비용이 급증합니다. FastPAM·CLARA sampling 없음.",
  },
  implementation: [
    "앱은 Euclidean 거리만 사용합니다. 일반 PAM의 임의 비유사도 행렬 입력은 제공하지 않습니다.",
    "중심 ID는 관측점 ID입니다. 보간 중 표식은 움직이지만 최종 medoid는 반드시 원본 관측점입니다.",
  ],
  comparison: [
    {
      other: "K-Means",
      difference:
        "K-Means는 제곱거리와 임의 평균, PAM은 비제곱 거리와 실제 관측 대표를 씁니다.",
    },
  ],
  references: [
    {
      title: "R cluster · pam",
      url: "https://stat.ethz.ch/R-manual/R-devel/library/cluster/html/pam.html",
      note: "BUILD·SWAP과 원형 및 가속 변형 구분.",
    },
    {
      title: "Kaufman & Rousseeuw (1990), PAM",
      url: "https://doi.org/10.1002/9780470316801",
      note: "medoid와 강건한 분할의 원전 교재.",
    },
  ],
  preset: "outliers",
  events: ["initialize", "swap", "move"],
  advanced: [
    "거리 기반 강건성은 선택한 거리와 데이터 스케일에 의존합니다. 큰 이상치 집단이 별도 medoid를 차지할 수도 있습니다.",
  ],
};
export const rock: Lesson = {
  purpose:
    "범주형 값에는 자연스러운 Euclidean 평균이 없으므로, ROCK은 값이 겹치는 정도와 공통 이웃 연결로 집단을 만듭니다. 2D 좌표는 시각화용이며 실제 계산에는 attribute=value 토큰이 들어갑니다.",
  analogy:
    "취향 태그가 비슷한 사람끼리 이웃으로 연결한 뒤, 같은 친구를 많이 공유하는 두 집단을 합칩니다. 직접 닮음뿐 아니라 공통 이웃을 통해 집단의 결속을 측정합니다.",
  operations: [
    {
      title: "범주형 이웃",
      input: "features 토큰 집합, θ",
      calculation: "서로 다른 점의 Jaccard가 θ 이상이면 이웃으로 등록합니다.",
      output: "범주형 이웃 그래프; neighbors",
    },
    {
      title: "Link",
      input: "각 점의 이웃 집합",
      calculation: "모든 쌍에 대해 이웃 교집합 크기를 셉니다.",
      output: "links 행렬; distance",
    },
    {
      title: "Goodness 병합",
      input: "군집 간 Link 합과 크기",
      calculation:
        "크기 보정 분모로 나눈 goodness가 최대인 양수 쌍을 병합합니다.",
      output: "labels와 goodness metric; distance → merge",
    },
    {
      title: "종료",
      input: "군집 수와 최대 goodness",
      calculation: "K에 도달하거나 양수 Link가 없으면 종료합니다.",
      output: "최종 labels; finish. K보다 많은 군집이 남을 수 있습니다.",
    },
  ],
  equations: [
    {
      title: "Jaccard와 공통 이웃",
      tex: String.raw`J(A,B)=\frac{|A\cap B|}{|A\cup B|},\quad N_i=\{j\ne i:J(F_i,F_j)\geq\theta\},\quad\operatorname{link}(i,j)=|N_i\cap N_j|`,
      symbols:
        "Fᵢ: i번째 점의 attribute=value 토큰 집합. A,B는 이 식에서 토큰 집합입니다.",
      meaning:
        "자기 자신은 이웃에서 제외하고 같은 값을 가진 같은 속성을 하나의 일치 토큰으로 셉니다.",
      derivation: [
        "속성이 q개이고 두 레코드가 s개 속성에서 일치하면 J=s/(2q−s)입니다. 예를 들어 두 속성 중 하나가 같으면 J=1/3이지 1/2가 아닙니다.",
        "직접 이웃인 두 점도 공통 이웃이 없으면 Link=0일 수 있습니다. Link는 거리나 Jaccard 그 자체가 아닙니다.",
      ],
    },
    {
      title: "ROCK goodness",
      tex: String.raw`f(\theta)=\frac{1-\theta}{1+\theta},\quad g(C,D)=\frac{\sum_{i\in C,j\in D}\operatorname{link}(i,j)}{(|C|+|D|)^{1+2f}-|C|^{1+2f}-|D|^{1+2f}}`,
      symbols: "C,D: 관측점 군집. f=f(θ), 분자는 군집 사이 모든 Link의 합.",
      meaning:
        "큰 군집은 우연히 많은 링크를 가지므로 크기 효과를 보정해 병합을 비교합니다.",
      derivation: [
        "동일한 Link라도 군집 크기가 다르면 점수가 달라집니다. 분모는 합친 군집에서 기대하는 연결 증가량 형태로 크기 편향을 보정합니다.",
        "이 앱은 원래 θ 기반 f 규약을 사용합니다. 임의의 다른 유사도에 같은 보정식이 통계적으로 최적인 것은 아닙니다.",
      ],
    },
  ],
  numerical: {
    title: "범주형 세 레코드와 Link",
    steps: [
      "A={색=초록,모양=원}, B={색=초록,모양=사각}, C={색=초록,모양=원}, θ=0.3.",
      "J(A,B)=1/3, J(A,C)=1, J(B,C)=1/3. 모두 이웃이고 N_A={B,C}, N_B={A,C}이므로 Link(A,B)=1입니다.",
      "θ=0.5이면 A와 C만 이웃입니다. 공통 이웃은 없어서 모든 Link가 0이고 목표 K까지 병합하지 못할 수 있습니다.",
      "별도 goodness 검산: θ=0.5이면 지수=5/3. 크기 1인 두 군집 사이 Link=1이면 g=1/(2^(5/3)−2)≈0.851207입니다.",
    ],
  },
  parameters: [
    {
      key: "threshold",
      effect:
        "큰 θ는 엄격한 이웃을 만들고 Link를 없앨 수 있습니다. 작은 θ는 다른 범주형 집단도 연결합니다. f도 함께 바뀝니다.",
      experiment:
        "범주형 군집에서 0.3→0.5→0.8. 단순 이웃 수뿐 아니라 goodness 보정도 달라집니다.",
    },
    {
      key: "k",
      effect: "목표 하한이며 양수 링크가 소진되면 도달하지 못합니다.",
      experiment: "노이즈가 있는 범주형 데이터에서 K=2와 5 비교.",
    },
  ],
  complexity: {
    theory:
      "ROCK은 이웃 그래프와 링크의 밀도, 표본 추출·heap 구현에 따라 비용이 다릅니다.",
    implementation:
      "q개 토큰일 때 Jaccard O(n²q), Link O(n³), 병합 단계 전체 O(n³) 상한.",
    space:
      "이웃·Link 행렬 O(n²), 입력 토큰 O(nq). Trace의 누적 metric 복사는 O(n²).",
    cost: "밀집한 이웃 그래프·큰 n·긴 features가 비용을 키웁니다. 원논문의 대규모 sampling 단계는 미지원.",
  },
  implementation: [
    "features가 비어 있으면 오류를 냅니다. 숫자 좌표를 바꾸어도 features가 같으면 군집 결과는 같습니다.",
    "θ 범위는 0.05~0.95입니다. θ=1에서 goodness 분모가 0이 되는 특이 경계는 설정 UI에서 제외합니다.",
  ],
  comparison: [
    {
      other: "PAM",
      difference:
        "PAM의 이 앱 구현은 수치 Euclidean 거리, ROCK은 범주형 토큰 Link를 사용합니다. 좌표가 가까운지로 ROCK 정답을 판단하면 안 됩니다.",
    },
  ],
  references: [
    {
      title: "Guha, Rastogi & Shim (2000), ROCK",
      url: "https://doi.org/10.1016/S0306-4379(00)00022-3",
      note: "범주형 Jaccard·Link·크기 보정 goodness의 원문.",
    },
    {
      title: "저자 원고 · Categorical clustering",
      url: "https://theory.stanford.edu/~sudipto/mypapers/categorical.pdf",
      note: "ROCK의 이웃과 링크, 목적 및 표본 추출 논의.",
    },
  ],
  preset: "categorical",
  events: ["neighbors", "distance", "merge"],
  advanced: [
    "범주형 결측·속성 가중치·연속형 전처리를 자동 처리하지 않습니다. 토큰 스키마는 사용자가 일관되게 유지해야 합니다.",
  ],
};
