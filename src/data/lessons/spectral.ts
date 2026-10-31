import type { Lesson } from "./types";

export const spectral: Lesson = {
  purpose:
    "수치형 원본 특성 또는 실제 무방향 가중 그래프에서 유사 관계를 만들고, 그래프 라플라시안의 고유벡터 공간에서 분할합니다. 정규화 옵션은 Ng–Jordan–Weiss 계열, 비정규화 옵션은 L=D−W를 사용하는 별도 변형입니다.",
  analogy:
    "종이에 가까이 그려졌는지보다, 도로망에서 어느 지역끼리 강하게 연결되어 있는지 조사합니다. 새 지도인 임베딩은 실제 고유분해로 계산하며, 화면의 원본 좌표는 도로의 가중치를 대신하지 않습니다.",
  operations: [
    {
      title: "원본 → 유사도 그래프",
      input: "모든 수치 특성 또는 실제 그래프의 가중 간선",
      calculation:
        "RBF는 exp(−γ‖xᵢ−xⱼ‖²), kNN은 자신을 제외한 가까운 이웃의 합집합을 무방향 0/1 간선으로 만듭니다. 제공된 그래프에서는 그 가중치를 직접 사용합니다.",
      output: "graph 이벤트의 W와 실제 간선",
    },
    {
      title: "차수와 라플라시안",
      input: "대칭 비음수 W, 대각 0",
      calculation:
        "행합 dᵢ와 D를 구한 뒤 L=D−W 또는 L_sym=I−D⁻¹ᐟ²WD⁻¹ᐟ²를 만듭니다. 정규화 모드의 고립 노드 행·열은 0으로 둡니다.",
      output: "laplacian 이벤트의 차수·행렬",
    },
    {
      title: "실제 고유분해",
      input: "실수 대칭 라플라시안",
      calculation:
        "Jacobi 회전으로 비대각 원소를 줄이고, 고유값 오름차순으로 벡터를 정렬합니다. 최종 상대 Frobenius 잔차를 검증합니다.",
      output: "eigen sweep의 실제 오차 지표 및 검증된 고유값·벡터",
    },
    {
      title: "스펙트럴 임베딩",
      input: "가장 작은 K개 고유값의 고유벡터",
      calculation:
        "벡터를 열로 모은 n×K 행렬을 만들고, 정규화 모드에서 각 행의 길이를 1로 만듭니다. 비정규화에서는 이 행 정규화를 하지 않습니다.",
      output: "embedding 이벤트의 전체 K차원 좌표",
    },
    {
      title: "임베딩 군집화",
      input: "전체 K차원 임베딩",
      calculation:
        "시드 K-Means++와 실제 Lloyd 할당·평균 갱신을 반복합니다. 마지막 중심으로 최근접 할당을 다시 계산합니다.",
      output: "assign/move 이벤트, 원본 점의 레이블, 임베딩 SSE",
    },
  ],
  equations: [
    {
      title: "유사도와 라플라시안",
      tex: String.raw`W_{ij}=\exp(-\gamma\|x_i-x_j\|^2)\ (i\ne j),\quad W_{ii}=0,\quad D_{ii}=\sum_jW_{ij},\quad L_{\rm sym}=I-D^{-1/2}WD^{-1/2}`,
      symbols:
        "xᵢ: 원본의 모든 수치 특성, γ>0: 유사도 폭의 역수에 해당하는 계수, D: 가중 차수 대각행렬. 고립 노드는 별도 0행·열 관례를 사용합니다.",
      meaning:
        "원본 특징의 거리로 그래프를 만들고, 차수 차이를 대칭적으로 조정합니다.",
      derivation: [
        "RBF는 가까운 점에 큰 가중치를 주지만 정확히 0이 되는 것은 부동소수점 underflow에서 가능합니다.",
        "정규화하지 않는 L=D−W에 대해 D⁻¹ᐟ²LD⁻¹ᐟ²를 계산하면, 차수가 양수인 부분에서 I−D⁻¹ᐟ²WD⁻¹ᐟ²가 됩니다. γ=1/(2σ²)이므로 σ를 키우는 것은 γ를 줄이는 것에 해당합니다.",
      ],
    },
    {
      title: "절단 비용의 연속 완화",
      tex: String.raw`\min_{U^TU=I}\operatorname{tr}(U^TL_{\rm sym}U),\qquad L_{\rm sym}u_j=\lambda_j u_j,\quad\lambda_1\le\cdots\le\lambda_n`,
      symbols:
        "U∈ℝⁿˣᴷ: 직교하는 K개 열벡터, λⱼ: 라플라시안 고유값. 정규화 절단의 이산 소속 제약을 완화한 문제를 나타냅니다.",
      meaning:
        "Rayleigh–Ritz 원리에 의해 가장 작은 K개 고유값에 대응하는 고유공간이 연속 문제를 풉니다.",
      derivation: [
        "fᵀLf=½ΣᵢⱼWᵢⱼ(fᵢ−fⱼ)²이므로 강한 간선의 양끝에서 값이 크게 달라지는 벡터에 큰 비용을 줍니다.",
        "직교 제약만 남기면 작은 고유값의 공간을 선택하게 됩니다. 이후 행 정규화와 K-Means는 이산 군집을 추출하는 별도 단계이며, 원래 Ncut의 전역 최적해를 보장하지 않습니다.",
      ],
    },
    {
      title: "행 정규화와 수치 검증",
      tex: String.raw`T_{ij}=\frac{U_{ij}}{\sqrt{\sum_{\ell=1}^K U_{i\ell}^2}},\qquad \eta=\frac{\|LV-V\Lambda\|_F}{\max(1,\|L\|_F)}`,
      symbols:
        "T: Ng–Jordan–Weiss 임베딩, V: 전체 고유벡터 행렬, Λ: 고유값 대각행렬, η: 상대 고유해 잔차입니다.",
      meaning:
        "클러스터링은 T의 전체 K차원에서 수행합니다. 고유분해가 수렴했다고 표시하기 전에 잔차를 확인합니다.",
      derivation: [
        "고유벡터 열의 부호를 바꾸거나 완전히 포함된 중복 고유공간의 기저를 회전해도 행 사이의 거리는 유지됩니다.",
        "중복 고유값의 공간을 K에서 부분적으로 자르면 임베딩 자체가 유일하지 않을 수 있습니다. 레퍼런스 검증은 좌표 부호 대신 UUᵀ 투영행렬과 잔차를 비교합니다.",
      ],
    },
  ],
  numerical: {
    title: "가중치 1인 두 개의 분리된 간선, K=2",
    steps: [
      "W의 간선은 (1,2)와 (3,4)뿐이며 네 점의 차수는 모두 1입니다. L_sym=I−W입니다.",
      "고유값은 0,0,2,2입니다. 영공간의 한 직교 기저는 (1,1,0,0)/√2와 (0,0,1,1)/√2입니다.",
      "두 고유벡터를 행 정규화하면 앞의 두 점은 (1,0), 뒤의 두 점은 (0,1)이 됩니다. 임베딩 K-Means는 두 간선을 서로 다른 군집으로 나누고 SSE=0입니다.",
      "영공간의 기저를 회전하거나 부호를 뒤집어도 같은 분할이 가능합니다. 레이블 숫자의 순서는 결과의 차이가 아닙니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "선택할 고유벡터 수와 목표 군집 수입니다. 현재 정책은 K가 연결 성분 수 이상이어야 합니다.",
      experiment: "고리가 있는 데이터에서 K와 고유값 간격을 함께 확인하세요.",
    },
    {
      key: "affinity",
      effect:
        "rbf는 전체 가중 그래프, knn은 이웃 합집합의 이진 대칭 그래프입니다. 실제 그래프 입력에서는 제공된 가중치를 사용합니다.",
      experiment:
        "같은 원본 특성에서 RBF와 kNN의 간선·차수·연결 성분 수를 비교하세요.",
    },
    {
      key: "gamma",
      effect: "RBF에서 증가하면 먼 점 사이의 가중치가 더 빨리 작아집니다.",
      experiment:
        "지나치게 큰 γ에서 underflow로 연결 성분이 늘어나는지 확인하세요.",
    },
    {
      key: "neighbors",
      effect:
        "kNN에서 각 점의 이웃 수입니다. 실제 사용 개수는 min(neighbors,n−1)입니다. 거리가 같은 이웃은 원본 인덱스로 순서를 정합니다.",
      experiment: "이웃 수를 줄여 연결 성분이 늘어나는 상황을 확인하세요.",
    },
    {
      key: "laplacian",
      effect:
        "normalized는 대칭 정규화 후 행 정규화, unnormalized는 D−W의 고유벡터를 그대로 사용합니다.",
      experiment: "차수 분포가 불균형한 그래프에서 두 결과를 비교하세요.",
    },
    {
      key: "iterations",
      effect:
        "고유해가 아닌 임베딩 Lloyd 반복의 한도입니다. Jacobi는 별도 수치 허용오차 1e−10, 최대 80 sweep을 사용합니다.",
      experiment: "1회와 충분한 반복의 임베딩 SSE·수렴 표시를 비교하세요.",
    },
  ],
  complexity: {
    theory:
      "밀집 그래프 구성 O(n²d), cyclic Jacobi는 sweep마다 O(n³), 임베딩 Lloyd는 O(TnK²).",
    implementation:
      "정확한 밀집 대칭 행렬, Float64Array Jacobi 작업 배열. kNN은 거리 전수 탐색과 행별 정렬을 사용하므로 희소 고속 엔진은 아닙니다.",
    space:
      "행렬과 고유벡터 O(n²), 임베딩 O(nK). Trace는 별도 바이트 예산을 검사합니다.",
    cost: "n이 늘면 고유분해와 행렬 기록이 지배합니다. 전체 데이터 계산을 유지하며 자동 표본 계산이나 근사 고유해로 바꾸지 않습니다.",
  },
  implementation: [
    "수치형 입력에서는 표시 좌표와 무관하게 원본 특성 전체를 계산합니다. 무방향 그래프 입력에서는 실제 비음수 간선 가중치를 사용하며 표시 배치는 계산에 영향을 주지 않습니다.",
    "연결 성분이 K보다 많으면 명시적 오류로 반환합니다. 고립 노드는 차수 0의 별도 연결 성분입니다. 방향 그래프·음수 가중치·자기 루프는 현재 지원하지 않습니다. 반복 간선의 가중치는 합산합니다.",
    "모든 고유해의 잔차를 확인합니다. 행 정규화가 불가능하거나 수렴하지 않으면 임의의 결과로 대체하지 않습니다.",
    "서로 다른 고유분해 구현의 벡터 부호·중복 기저는 다를 수 있습니다. 경계의 고유값 중복, 그래프 생성법, seed, K-Means 지역해도 분할에 영향을 줍니다.",
    "scikit-learn SpectralClustering은 일반적으로 여기의 NJW 행 정규화와 같은 임베딩 관례가 아닙니다. 선택한 검증 데이터에서 분할을 비교했으며 모든 입력에서 두 구현이 동일하다고 주장하지 않습니다.",
  ],
  comparison: [
    {
      other: "K-Means",
      difference:
        "원본 Euclidean 공간의 볼록 군집을 찾는 대신 실제 그래프의 고유공간에서 K-Means를 수행합니다. 고유분해 없이 원본 K-Means만 실행하는 래퍼가 아닙니다.",
    },
    {
      other: "DBSCAN",
      difference:
        "DBSCAN은 밀도 연결과 노이즈를 사용하고 K가 필요 없습니다. Spectral은 유사도 그래프와 지정 K를 사용합니다.",
    },
  ],
  references: [
    {
      title:
        "Ng, Jordan & Weiss, On Spectral Clustering: Analysis and an algorithm (NIPS14, 2001/2002)",
      url: "https://papers.nips.cc/paper/2092-on-spectral-clustering-analysis-and-an-algorithm",
      note: "원문 PDF의 Algorithm 절을 확인했습니다. 원문은 정규화 인접행렬의 큰 고유값을 사용하며 여기서는 동등한 I−정규화 인접행렬의 작은 고유값을 사용합니다.",
    },
    {
      title: "von Luxburg (2007), A Tutorial on Spectral Clustering",
      url: "https://arxiv.org/html/0711.0189v1",
      note: "유사도 그래프·라플라시안 종류·NJW 행 정규화·절단 완화의 정의.",
    },
    {
      title: "scikit-learn SpectralClustering",
      url: "https://scikit-learn.org/stable/modules/generated/sklearn.cluster.SpectralClustering.html",
      note: "검증 전용 scikit-learn 1.7.2와 NumPy 2.5.4의 실제 계산을 비교했습니다.",
    },
  ],
  preset: "moons",
  events: ["graph", "laplacian", "eigen", "embedding", "assign"],
  advanced: [
    "정규화 라플라시안의 영공간 차원은 연결 성분 수와 연결됩니다. kNN 대칭화는 합집합 방식이며 mutual-kNN이나 sklearn의 평균 대칭화와 구별해야 합니다.",
    "고유값 간격이 작으면 작은 데이터 변화에 선택 고유공간이 민감할 수 있습니다. 고유벡터 부호 하나가 바뀐 것을 다른 군집화 결과로 해석하면 안 됩니다.",
    "표시 임베딩이 두 축만 보여도 군집 할당은 전체 K축에서 계산합니다. 원본 그래프를 투영된 점 사이 거리로 다시 구성하지 않습니다.",
  ],
};
