import type { Lesson } from "./types";

export const clara: Lesson = {
  purpose:
    "작은 표본에서 PAM으로 실제 관측점 medoid를 찾고, 모든 입력에서 계산한 거리 비용으로 표본 해들을 비교하는 방법입니다. 탐색은 표본 기반이며 전체 PAM의 전수 탐색과 같지 않습니다.",
  analogy:
    "대표 후보를 뽑을 때는 여러 소규모 위원회에서 토론하지만, 최종 선택에는 전체 구성원의 실제 거리를 모두 합산합니다.",
  operations: [
    {
      title: "표본 선택",
      input: "원본 전체 n개, 표본 크기 s, seed",
      calculation:
        "중복 없는 reservoir 표본을 만들고 두 번째부터는 이전 최선 medoid를 반드시 포함합니다.",
      output: "initialize: 실제 표본 인덱스",
    },
    {
      title: "표본 PAM BUILD",
      input: "표본 내 거리",
      calculation:
        "표본 거리 비용의 감소가 가장 큰 관측점을 차례로 medoid에 추가합니다.",
      output: "initialize: 표본 medoid와 비용",
    },
    {
      title: "표본 SWAP",
      input: "현재 표본 medoid",
      calculation:
        "표본 안의 모든 단일 교환을 평가해 가장 큰 실제 감소를 수용합니다. 반복 한도와 교환 없음은 구분합니다.",
      output: "swap → move: 실제 교환과 후보 수",
    },
    {
      title: "전체 평가와 선택",
      input: "각 표본에서 얻은 medoid",
      calculation:
        "n개 모든 점을 최근접 medoid에 할당하고 비제곱 Euclidean 거리합을 계산합니다. 전체 비용이 가장 낮은 표본 해를 유지합니다.",
      output: "assign → finish: 전체 레이블과 실제 전체 비용",
    },
  ],
  equations: [
    {
      title: "표본 탐색과 전체 평가를 분리",
      tex: String.raw`M_t\subseteq S_t,\quad |M_t|=K,\qquad J_X(M)=\sum_{x_i\in X}\min_{m\in M}\|x_i-x_m\|_2,\quad M^*=\arg\min_tJ_X(M_t)`,
      symbols:
        "X: 전체 입력, S_t: t번째 표본, M_t: 표본 PAM이 찾은 medoid 인덱스, K: 대표점 수.",
      meaning:
        "표본에서의 탐색과 전체 입력에서의 점수 계산은 서로 다른 단계입니다.",
      derivation: [
        "medoid는 실제 관측점이어야 하며 목적함수는 제곱거리합이 아닌 거리합입니다.",
        "표본에 없는 관측점도 최종 비용과 할당 계산에 포함하지만, 해당 표본 탐색의 medoid 후보에는 들어가지 않습니다. 따라서 전체 최적해를 보장하지 않습니다.",
      ],
    },
    {
      title: "다음 표본의 필수 관측점",
      tex: String.raw`M_{\mathrm{best}}\subseteq S_{t+1},\qquad |S_{t+1}|=\min(n,s)`,
      symbols:
        "M_best: 현재까지 전체 입력 비용이 가장 낮은 medoid 집합, s: 요청 표본 크기, n: 전체 관측점 수.",
      meaning: "이미 찾은 좋은 해가 다음 표본에서 사라지지 않게 합니다.",
      derivation: [
        "필수 medoid를 제외한 원본 인덱스에서 reservoir 표본을 추가해 요청 크기를 채웁니다.",
        "s<K이면 입력 오류입니다. s≥n이면 전체 데이터를 표본으로 사용하는 PAM 탐색이며, 이 경우에도 반복 한도 종료는 전역 최적성 보장이 아닙니다.",
      ],
    },
  ],
  numerical: {
    title: "직선상의 0,0.1,0.2,0.8,0.9,1, K=2",
    steps: [
      "medoid가 0.1과 0.9이면 첫 세 점 거리합은 0.1+0+0.1=0.2입니다.",
      "나머지 세 점도 0.1+0+0.1=0.2이므로 전체 J=0.4입니다. 제곱거리 SSE와 혼동하지 않습니다.",
      "검증 fixture는 가능한 15개 medoid 쌍을 독립 NumPy로 전수 계산합니다. 6점 전체 표본의 CLARA와 실제 Trace 비용을 이 최적값에 비교합니다. 일반 표본 실행의 전역 최적성을 뜻하지 않습니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "실제 관측점 medoid 수입니다. 중복 좌표에서는 서로 다른 인덱스 medoid가 같은 위치일 수 있습니다.",
      experiment: "K=2와 3에서 대표 관측점을 확인하세요.",
    },
    {
      key: "sampleSize",
      effect:
        "각 탐색 표본의 크기이며 K 이상이어야 합니다. 전체 입력 수가 더 작으면 전체를 사용합니다.",
      experiment:
        "표본 10과 40에서 실제 sample 인덱스와 전체 비용을 비교하세요.",
    },
    {
      key: "numLocal",
      effect:
        "독립 표본 탐색의 횟수입니다. 후속 표본은 이전 최선 medoid를 포함합니다.",
      experiment: "같은 seed로 1회와 5회의 최선 전체 비용을 비교하세요.",
    },
    {
      key: "iterations",
      effect: "각 표본 PAM의 최대 SWAP 반복 수입니다.",
      experiment: "반복 1회와 20회에서 sampleLocalOptimal 결과를 비교하세요.",
    },
  ],
  complexity: {
    theory: "표본 크기 s와 전체 데이터 수 n을 분리해서 봐야 합니다.",
    implementation:
      "이 구현은 R개 표본에서 O(R(s²K+TK²s²+nK)), T는 표본 SWAP 한도입니다. SWAP 후보 비용을 직접 계산합니다.",
    space:
      "원본/최종 레이블 O(n), 표본 거리 O(s²), 표본 인덱스 O(s). 상세 Trace는 별도 예산 적용.",
    cost: "s를 크게 하면 표본 PAM이 빠르게 비싸집니다. 매 표본의 전체 n점 점수 계산도 생략하지 않습니다.",
  },
  implementation: [
    "2D Euclidean, PAM BUILD 및 best single SWAP입니다. R cluster의 pamLike=FALSE 역사적 변형과 같은 결과라고 주장하지 않습니다.",
    "표본 크기 기본값 40과 표본 수 기본값 3은 앱 정책이며 원저서/R 기본값을 그대로 복제한 것이 아닙니다.",
    "동률은 정렬한 원본 인덱스, 최종 할당 동률은 medoid 순서로 해소합니다. 표본 해를 전체 데이터의 최적해로 표시하지 않습니다.",
  ],
  comparison: [
    {
      other: "PAM",
      difference:
        "PAM은 전체 medoid 후보 교환을 탐색합니다. CLARA는 고정 표본마다 PAM을 수행하고 전체 입력으로 해를 평가합니다.",
    },
    {
      other: "CLARANS",
      difference:
        "CLARANS는 전체 medoid 집합에서 매 교환마다 무작위 이웃을 뽑으므로 고정 표본 안에 탐색을 가두지 않습니다.",
    },
  ],
  references: [
    {
      title:
        "Kaufman & Rousseeuw (1990), Clustering Large Applications, Chapter 3",
      url: "https://onlinelibrary.wiley.com/doi/10.1002/9780470316801.ch3",
      note: "원저서 서지·목차를 확인했습니다. 전체 유료 장 내용을 열람했다고 표시하지 않습니다.",
    },
    {
      title: "R cluster 2.1.8.1, clara official manual",
      url: "https://stat.ethz.ch/R-manual/R-devel/library/cluster/html/clara.html",
      note: "표본 PAM, 전체 비용 평가, 이전 최선 medoid 포함 및 pamLike 차이를 확인했습니다. 제품 코드 복사 없음.",
    },
  ],
  preset: "blobs",
  events: ["initialize", "swap", "assign"],
  advanced: [
    "어떤 군집이 모든 표본에서 빠지면 좋은 대표점을 놓칠 수 있습니다. 표본 수 증가가 개별 실행의 전역 최적성을 보장하지는 않습니다.",
  ],
};

export const clarans: Lesson = {
  purpose:
    "전체 medoid 집합 공간에서 무작위 단일 교환 이웃을 탐색하는 방법입니다. 각 이웃의 비용은 전체 데이터로 정확히 계산하지만 모든 이웃을 조사하지는 않습니다.",
  analogy:
    "대표자 한 명을 무작위 후보로 교체해 전체 구성원의 이동 비용을 다시 계산합니다. 개선되면 이동하고, 연속된 실패가 충분히 쌓이면 다른 출발점에서 다시 시작합니다.",
  operations: [
    {
      title: "무작위 재시작",
      input: "원본 n개, K, seed",
      calculation:
        "관측점에서 중복 없는 K개 medoid를 선택하고 전체 거리 비용을 계산합니다.",
      output: "initialize: 실제 시작 집합과 전체 비용",
    },
    {
      title: "무작위 이웃 제안",
      input: "현재 medoid와 비medoid 집합",
      calculation:
        "medoid 한 자리와 비medoid 하나를 균일하게 뽑아 교환 후보를 만듭니다.",
      output: "swap: 실제 교환 후보와 전체 비용 차이",
    },
    {
      title: "수용 또는 거절",
      input: "두 집합의 전체 비용",
      calculation:
        "엄격하게 감소하면 교환하고 연속 거절 수를 0으로 초기화합니다. 그 외에는 현재 집합을 유지하고 거절 수를 늘립니다.",
      output: "move 또는 visit: 실제 상태 변화",
    },
    {
      title: "탐색 종료 및 최선 해",
      input: "maxNeighbors, numLocal",
      calculation:
        "연속 거절 한도에서 현재 탐색을 마치고 재시작합니다. 모든 시작 중 가장 낮은 전체 비용의 해를 반환합니다.",
      output: "extract → finish: 최선 전체 분할",
    },
  ],
  equations: [
    {
      title: "한 교환 이웃과 실제 비용",
      tex: String.raw`M'=(M\setminus\{m\})\cup\{h\},\quad m\in M,\ h\notin M,\qquad\Delta J=J_X(M')-J_X(M)`,
      symbols:
        "M: 현재 K개 medoid, h: 비medoid 관측점, J_X: 모든 입력의 최근접 medoid 비제곱 거리합.",
      meaning:
        "후보 선택은 무작위지만 후보 비용 계산에서 데이터를 버리지 않습니다.",
      derivation: [
        "서로 다른 단일 교환 이웃은 K(n−K)개입니다. 이 구현은 그중 하나를 매 제안마다 균일 추출하며 같은 후보를 다시 볼 수 있습니다.",
        "ΔJ<0일 때만 이동하므로 한 로컬 탐색의 수용 비용은 엄격히 감소합니다. 재시작 비용은 다시 커질 수 있습니다.",
      ],
    },
    {
      title: "연속 거절 수",
      tex: String.raw`j\leftarrow\begin{cases}0,&\Delta J<0,\\j+1,&\Delta J\geq0.\end{cases}\qquad j\geq\mathrm{maxNeighbors}\ \Rightarrow\ \text{restart}`,
      symbols:
        "j: 현재 위치에서 연속 거절한 제안 수, maxNeighbors: 로컬 탐색 종료 한도.",
      meaning: "개선한 뒤 새 위치에서는 탐색 기회를 다시 부여합니다.",
      derivation: [
        "j는 전체 실행의 누적 제안 수와 다릅니다. 수용하면 0이 되며 실제 누적 proposals는 별도로 기록합니다.",
        "한도 도달은 모든 단일 교환이 나쁘다는 증명이 아닙니다. 가장 낮았던 여러 시작 해를 비교해도 전역 최적성은 보장하지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "0,0.1,0.2,0.8,0.9,1의 실제 medoid 교환",
    steps: [
      "현재 medoid 0과 1의 전체 거리합은 0+0.1+0.2+0.2+0.1+0=0.6입니다.",
      "0을 0.1로 바꾸면 전체 비용은 0.1+0+0.1+0.2+0.1+0=0.5이므로 ΔJ=−0.1, 교환을 수용하고 j=0입니다.",
      "이어서 1을 0.9로 바꾸면 전체 비용 0.4가 됩니다. 이 작은 예제에서 모든 15쌍의 비용을 독립 NumPy로 열거해 각 실제 제안과 최종 해를 검산합니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "대표 관측점 수입니다. K=n이면 비medoid가 없어 교환 없이 정확한 거리 비용 0을 얻습니다.",
      experiment: "K=2와 3에서 실제 관측점 medoid를 확인하세요.",
    },
    {
      key: "numLocal",
      effect: "서로 다른 시드 스트림으로 시작하는 로컬 탐색의 수입니다.",
      experiment: "1회와 5회에서 최종 최선 비용을 비교하세요.",
    },
    {
      key: "maxNeighbors",
      effect:
        "한 위치의 연속 거절 한도입니다. 수용한 교환은 카운터를 초기화합니다.",
      experiment: "5와 40에서 실제 제안·거절·재시작을 비교하세요.",
    },
  ],
  complexity: {
    theory: "실제로 평가한 제안 수 P와 n,K에 의해 비용이 결정됩니다.",
    implementation:
      "이 구현은 제안마다 O(nK) 전체 비용을 직접 계산하므로 총 O(PnK). 수용 후 카운터가 재설정되어 P는 numLocal×maxNeighbors보다 커질 수 있습니다.",
    space:
      "현재/후보 레이블 및 비medoid 목록 O(n), medoid O(K). 전체 n² 거리 행렬을 저장하지 않으며 Trace는 별도 예산 적용.",
    cost: "큰 데이터에서 제안마다 전체 데이터 거리를 계산합니다. FastCLARANS 거리 캐시 최적화는 구현하지 않았습니다.",
  },
  implementation: [
    "2D Euclidean의 전체 입력 목적함수를 사용합니다. 무작위 제안 선택과 seed를 Trace로 재현합니다.",
    "마지막 상태는 마지막 로컬 탐색이 아니라 전체 재시작 중 최선 해입니다. 비용 그래프의 재시작 상승을 오해하지 않도록 표시합니다.",
    "논문의 조합 공간 그래프는 검색 공간이며 사용자 입력 네트워크를 의미하지 않습니다. polygon 객체 거리와 외부 그래프 입력은 지원하지 않습니다.",
  ],
  comparison: [
    {
      other: "PAM",
      difference:
        "PAM은 현재 위치의 교환을 전수 조사합니다. CLARANS는 무작위 이웃 제안을 조사하고 연속 거절 한도로 이동합니다.",
    },
    {
      other: "CLARA",
      difference:
        "CLARA의 표본 밖 관측점은 해당 표본의 medoid 후보가 되지 못하지만 CLARANS는 매 제안에서 모든 비medoid에 후보 기회를 줍니다.",
    },
  ],
  references: [
    {
      title:
        "Ng & Han (1994), Efficient and Effective Clustering Methods for Spatial Data Mining",
      url: "https://www.vldb.org/conf/1994/P144.PDF",
      note: "원문 §3.2의 randomized search·수용 후 카운터 초기화·numlocal/maxneighbor 확인.",
    },
    {
      title:
        "Ng & Han (2002), CLARANS: A Method for Clustering Objects for Spatial Data Mining",
      url: "https://cs.ecu.edu/dingq/CSCI6905/readings/CLARANS.pdf",
      note: "저자 후속 논문의 §3.2 확인. 소스 코드 복사 없음.",
    },
  ],
  preset: "blobs",
  events: ["swap", "move", "extract"],
  advanced: [
    "반복된 후보가 다시 뽑힐 수 있습니다. 큰 maxNeighbors는 많은 실제 평가를 의미하지만 모든 이웃을 봤다는 증명은 아닙니다.",
  ],
};
