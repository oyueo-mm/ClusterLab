import type { Algorithm } from "../engine/types";
export interface Guide {
  family: string;
  intro: string;
  steps: string[];
  formula: string;
  pros: string;
  cons: string;
  complexity: string;
  suitable: string;
  difference: string;
  source: string;
  sourceName: string;
}
export const guides: Record<Algorithm, Guide> = {
  "Mean Shift": {
    family: "밀도 모드 탐색",
    intro:
      "각 원본 점에서 시작한 중심 후보가 Bandwidth 안의 데이터 평균으로 이동합니다. 수렴 후보를 밀도순으로 정리해 가까운 모드를 통합하고 최근접 모드에 데이터를 할당합니다. K는 필요하지 않습니다.",
    steps: [
      "모든 원본 데이터를 고유 ID의 중심 후보로 사용",
      "Flat kernel 반경 안의 원본 데이터 탐색",
      "이웃 평균과 이동 거리 계산",
      "평균으로 이동하며 경로 기록",
      "이동 거리 ≤ 0.001 × Bandwidth 또는 반복 한도에서 종료",
      "밀도 내림차순·좌표 역순으로 정리하고 Bandwidth 이내 중복 모드 제거",
      "최근접 유지 모드에 모든 점 할당 (cluster_all=true)",
    ],
    formula: "m_h(y) = (1 / |N_h(y)|) Σ_{xᵢ∈N_h(y)} xᵢ − y;  y ← y + m_h(y)",
    pros: "K를 지정하지 않고 데이터의 밀도 봉우리를 찾습니다. 후보가 실제 이웃 평균으로 움직이는 과정을 관찰할 수 있습니다.",
    cons: "Bandwidth에 민감하며 모든 점을 초기 후보로 쓰면 계산·이벤트 기록량이 큽니다. 반복 한도 도달은 수렴과 다르게 표시합니다.",
    complexity:
      "이 앱의 전수 이웃 탐색 O(n² T), bin seeding과 공간 인덱스 없음",
    suitable: "Gaussian Blobs, Varying Density, Unequal Cluster Sizes",
    difference:
      "K-Means처럼 점을 중심에 할당해 그 군집 평균을 갱신하지 않습니다. 매번 고정된 원본 데이터의 반경 이웃을 사용합니다. 원과 평균 표식·경로를 함께 관찰하세요. DBSCAN의 밀도 연결 확장과도 다릅니다.",
    source:
      "https://scikit-learn.org/stable/modules/generated/sklearn.cluster.MeanShift.html",
    sourceName:
      "scikit-learn · MeanShift / Comaniciu & Meer (2002) 원문 참고 문헌",
  },
  "K-Means": {
    family: "중심 기반",
    intro:
      "가장 가까운 중심에 점을 할당하고 군집 평균으로 중심을 이동합니다. 두 계산을 반복해 거리 제곱합을 줄입니다.",
    steps: [
      "K-Means++ 또는 무작위 초기화",
      "거리 계산 및 최근접 할당",
      "군집 평균으로 중심 이동",
      "할당 수렴 또는 반복 한도에서 종료",
    ],
    formula: "J = Σᵢ ‖xᵢ−μ_{cᵢ}‖²; μₖ = Σ_{i∈Cₖ}xᵢ / |Cₖ|",
    pros: "빠르고 대표 중심을 이해하기 쉽습니다.",
    cons: "K를 지정해야 하고 이상치와 초기값에 민감합니다.",
    complexity: "O(n k T), 2D 입력",
    suitable: "Gaussian Blobs, Four Corners",
    difference: "PAM은 실제 점을 대표로 쓰고 K-Means는 군집 평균을 사용합니다.",
    source: "https://scikit-learn.org/stable/modules/clustering.html#k-means",
    sourceName: "scikit-learn · K-means",
  },
  DBSCAN: {
    family: "밀도 기반",
    intro:
      "ε 이웃이 MinPts 이상인 핵심점에서 밀도 도달 가능한 점으로 군집을 확장합니다. 자기 자신을 이웃 수에 포함합니다.",
    steps: [
      "ε 이웃 검색",
      "MinPts로 핵심점 판정",
      "큐로 이웃을 연속 확장",
      "핵심점에 연결되지 않은 점은 노이즈",
    ],
    formula: "Nε(p) = {q : d(p,q) ≤ ε}; core(p) ⇔ |Nε(p)| ≥ MinPts",
    pros: "군집 수 없이 비선형 군집과 노이즈를 찾습니다.",
    cons: "서로 다른 밀도에 하나의 ε를 적용하기 어렵습니다.",
    complexity: "현재 O(n²), 공간 인덱스 없음",
    suitable: "Two Moons, Noise and Outliers",
    difference:
      "HDBSCAN은 여러 밀도 수준의 계층을 만듭니다. 경계점 귀속은 방문 순서에 의존할 수 있습니다.",
    source:
      "https://www.dbs.ifi.lmu.de/Publikationen/Papers/KDD-96.final.frame.pdf",
    sourceName: "Ester et al. · DBSCAN",
  },
  HDBSCAN: {
    family: "계층적 밀도",
    intro:
      "Core distance와 mutual reachability MST에서 밀도 계층을 만든 뒤 안정적인 가지를 선택합니다.",
    steps: [
      "자기 자신 포함 min_samples번째 거리 계산",
      "Mutual reachability 및 Prim MST",
      "같은 가중치 연결을 함께 제거해 계층 생성",
      "min_cluster_size 미만 가지 축약",
      "안정도 기반 EOM 또는 leaf 선택",
    ],
    formula:
      "d_mr(a,b)=max(core(a),core(b),d(a,b)); stability(C)=Σ(λ_exit−λ_birth)",
    pros: "서로 다른 밀도와 노이즈를 함께 다룹니다.",
    cons: "루트 단일 군집을 선택하지 않습니다. 중복 좌표의 λ는 유한 상한을 사용합니다.",
    complexity: "O(n²) 공간, 교육용 계층 분해 최악 O(n³)",
    suitable: "Varying Density, Sparse Islands",
    difference:
      "실제 MST·condensed tree·안정도를 사용하며 DBSCAN으로 대체하지 않습니다.",
    source: "https://hdbscan.readthedocs.io/en/latest/how_hdbscan_works.html",
    sourceName: "HDBSCAN · How it works",
  },
  AGNES: {
    family: "상향식 계층",
    intro:
      "각 점에서 시작해 가장 가까운 두 군집을 병합하고 전체 계층에서 K개 군집을 추출합니다.",
    steps: [
      "단일 점 군집 생성",
      "Linkage로 군집 거리 비교",
      "최소 거리 쌍 병합 및 높이 기록",
      "전체 덴드로그램에서 K로 절단",
    ],
    formula:
      "single=min d; complete=max d; average=mean d; Ward=√(2nₐnᵦ/(nₐ+nᵦ))‖μₐ−μᵦ‖",
    pros: "여러 군집 수를 하나의 계층으로 설명합니다.",
    cons: "재계산 비용이 크며 Ward는 Euclidean 거리만 가능합니다.",
    complexity: "현재 직접 거리 재계산 O(n³) 수준",
    suitable: "Small Reference, Nested Clusters",
    difference: "DIANA는 큰 군집을 작은 군집으로 나누는 반대 방향입니다.",
    source:
      "https://scikit-learn.org/stable/modules/clustering.html#hierarchical-clustering",
    sourceName: "scikit-learn · Hierarchical clustering",
  },
  DIANA: {
    family: "하향식 계층",
    intro:
      "직경이 가장 큰 군집에서 가장 이질적인 점으로 splinter를 만들고 더 가까운 점들을 이동합니다.",
    steps: [
      "전체를 한 군집으로 시작",
      "최대 직경 군집 선택",
      "평균 비유사도 최대 점으로 splinter 생성",
      "평균 거리 차이가 양수인 점 이동",
      "목표 군집 수에서 종료",
    ],
    formula: "Δ(i)=mean_{j∈old ∖ {i}} d(i,j)−mean_{j∈splinter} d(i,j)",
    pros: "전체에서 세부 구조로 내려가는 해석이 쉽습니다.",
    cons: "직경과 평균 거리 계산이 비쌉니다.",
    complexity: "현재 최악 O(n³)",
    suitable: "Unequal Cluster Sizes, Four Corners",
    difference: "K-Means 분할 대신 원래 splinter 이동 규칙을 사용합니다.",
    source:
      "https://stat.ethz.ch/R-manual/R-devel/library/cluster/html/diana.html",
    sourceName: "R cluster · diana",
  },
  SOM: {
    family: "위상 학습",
    intro:
      "최근접 BMU와 격자 이웃 뉴런을 함께 이동시켜 데이터 위상을 학습합니다.",
    steps: [
      "2D 격자 가중치 초기화",
      "BMU 탐색",
      "Gaussian 격자 이웃 함수 계산",
      "학습률·반경 감소 및 가중치 갱신",
      "Quantization Error와 U-Matrix 확인",
    ],
    formula: "wⱼ ← wⱼ+α exp(−‖rⱼ−r_BMU‖²/(2σ²))(x−wⱼ)",
    pros: "그물 변형으로 연속적인 위상을 이해할 수 있습니다.",
    cons: "뉴런 번호가 곧바로 의미 있는 군집은 아닙니다.",
    complexity: "O(E n g²), 격자 한 변 g",
    suitable: "Uniform Random, Rings, Two Moons",
    difference:
      "최종 색상은 BMU 뉴런 인덱스이며 별도 군집 추출은 하지 않습니다.",
    source: "https://www.cis.hut.fi/somtoolbox/theory/somalgorithm.shtml",
    sourceName: "Aalto · SOM",
  },
  LVQ: {
    family: "지도 프로토타입",
    intro:
      "정답 클래스를 사용해 최근접 프로토타입을 학습합니다. 맞으면 당기고 틀리면 밀어냅니다.",
    steps: [
      "클래스별 프로토타입 초기화",
      "입력 및 승자 탐색",
      "정답 클래스 비교",
      "일치하면 당김, 불일치하면 밀어냄",
      "학습률 감소 및 훈련 정확도 측정",
    ],
    formula: "w ← w ± α(x−w); + if class(w)=y, − otherwise",
    pros: "프로토타입과 결정경계로 분류 동작을 설명합니다.",
    cons: "라벨이 필수입니다. 훈련 정확도는 일반화 성능을 뜻하지 않습니다.",
    complexity: "O(E n c p), 클래스 c, 클래스별 프로토타입 p",
    suitable: "Labeled Classification, Overlapping Classes",
    difference: "LVQ1은 비지도 군집화가 아닌 지도 분류 학습입니다.",
    source: "https://www.cis.hut.fi/research/som-research/algorithms/lvq.shtml",
    sourceName: "Aalto · LVQ",
  },
  OPTICS: {
    family: "밀도 순서",
    intro:
      "Core distance와 reachability 우선순위로 방문 순서를 만들고 도달 거리 그래프에서 밀도 구조를 읽습니다.",
    steps: [
      "max_eps 이웃과 core distance",
      "최소 reachability 점 우선 방문",
      "이웃 도달 거리 및 predecessor 갱신",
      "Ordering 및 Plot 기록",
      "ε-cut 또는 Xi steep-area 군집 추출",
    ],
    formula: "reachability(q←p)=max(core(p),d(p,q)); steep-up: r(i)/r(i+1)≤1−ξ",
    pros: "하나의 ε보다 많은 밀도 구조를 보존합니다.",
    cons: "Xi와 ε-cut은 다른 추출 방법입니다. Xi는 작은 골짜기에도 민감할 수 있습니다.",
    complexity: "현재 O(n²) 검색 및 우선순위 정렬",
    suitable: "Varying Density, Two Moons",
    difference:
      "Reachability가 다음 방문을 결정하고 Plot과 데이터 탐색이 동기화됩니다.",
    source: "https://scikit-learn.org/stable/modules/clustering.html#optics",
    sourceName: "scikit-learn · OPTICS",
  },
  PAM: {
    family: "대표점 기반",
    intro:
      "실제 데이터만 medoid로 사용합니다. BUILD 후 모든 medoid와 비medoid 교환을 평가합니다.",
    steps: [
      "BUILD 또는 무작위 medoid 선택",
      "최근접 medoid 할당",
      "모든 SWAP 후보 비용 평가",
      "가장 유리한 교환 수행",
      "개선이 없으면 종료",
    ],
    formula: "J=Σᵢ min_{m∈M}d(xᵢ,m); Δ=J(M−{m}+{h})−J(M)",
    pros: "평균보다 이상치에 강하고 실제 관측점을 대표로 보여줍니다.",
    cons: "정확한 SWAP 전수 탐색은 비싸며 기록량이 많습니다.",
    complexity: "현재 O(T k² n²)",
    suitable: "Noise and Outliers, Small Reference",
    difference: "Medoid는 반드시 실제 데이터 포인트입니다.",
    source: "https://cran.r-project.org/web/packages/cluster/cluster.pdf",
    sourceName: "R cluster · PAM",
  },
  ROCK: {
    family: "범주형 링크",
    intro:
      "범주형 Jaccard 이웃의 공통 이웃 Link로 goodness를 계산해 최대 점수 군집을 병합합니다.",
    steps: [
      "attribute=value 집합 Jaccard 계산",
      "θ 이상 이웃 그래프 생성",
      "공통 이웃 Link 계산",
      "크기 보정 goodness 최대 병합",
      "K 또는 양의 Link 소진 시 종료",
    ],
    formula:
      "f(θ)=(1−θ)/(1+θ); g=Link(A,B)/((|A|+|B|)^(1+2f)−|A|^(1+2f)−|B|^(1+2f))",
    pros: "수치 좌표로 표현하기 어려운 범주형 관계를 다룹니다.",
    cons: "θ에 민감합니다. 좌표는 표시용이며 features만 계산에 사용합니다.",
    complexity: "현재 Link 행렬 및 병합 O(n³)",
    suitable: "Categorical Groups, Noisy Categories",
    difference: "범주형 속성을 임의의 Euclidean 좌표로 바꾸지 않습니다.",
    source: "https://doi.org/10.1016/S0306-4379(00)00022-3",
    sourceName: "Guha et al. · ROCK",
  },
  GMM: {
    family: "확률 모델",
    intro:
      "Gaussian별 확률을 계산하는 E-step과 평균·공분산·혼합비를 갱신하는 M-step을 반복합니다.",
    steps: [
      "Gaussian 파라미터 초기화",
      "Log-sum-exp E-step",
      "평균·공분산·혼합계수 M-step",
      "로그우도 수렴 확인",
      "최종 파라미터로 확률 재계산",
    ],
    formula: "rᵢₖ=πₖN(xᵢ|μₖ,Σₖ)/ΣⱼπⱼN(xᵢ|μⱼ,Σⱼ)",
    pros: "타원형 모양과 경계의 불확실성을 표현합니다.",
    cons: "성분 수와 초기값에 민감하며 특이 공분산에 주의해야 합니다.",
    complexity: "2D에서 O(T n k)",
    suitable: "Anisotropic Clusters, Overlapping Clusters",
    difference:
      "확률 혼합 색상을 사용하고 공분산 대각에 10⁻⁶ 정규화를 적용합니다.",
    source: "https://scikit-learn.org/stable/modules/mixture.html",
    sourceName: "scikit-learn · Gaussian mixture",
  },
  BIRCH: {
    family: "CF-Tree",
    intro:
      "N·LS·SS 통계로 부분 군집을 요약해 균형 CF-Tree에 삽입합니다. 반경과 노드 용량을 별도로 검사합니다.",
    steps: [
      "최근접 CF를 따라 leaf 탐색",
      "흡수 후 반경 ≤ T면 통계 합산",
      "초과하면 새 CF 항목 생성",
      "용량 초과 시 가장 먼 CF 씨앗으로 분할",
      "선택적 CF 가중 Ward 최종 병합",
    ],
    formula: "CF=(N,LS,SS); μ=LS/N; R²=SS/N−‖LS/N‖²",
    pros: "원시 데이터보다 작은 통계 요약을 유지합니다.",
    cons: "입력 순서와 threshold에 민감하며 외부 메모리 재구축은 제공하지 않습니다.",
    complexity: "보통 O(n B h), 트리 높이 h",
    suitable: "Gaussian Blobs, Density Gradient",
    difference: "CF-Tree는 통계 요약 구조로 덴드로그램과 다릅니다.",
    source: "https://doi.org/10.1145/233269.233324",
    sourceName: "Zhang et al. · BIRCH",
  },
};
