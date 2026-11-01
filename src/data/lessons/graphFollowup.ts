import type { Lesson } from "./types";

export const walktrap: Lesson = {
  purpose:
    "실제 짧은 무작위 보행의 도착 분포로 노드 유사도를 정의하고, 인접 군집의 Ward 증가가 최소인 쌍을 병합하는 계층적 Walktrap입니다. 전체 계층 중 원본 모듈성이 가장 높은 cut을 반환합니다.",
  analogy:
    "같은 동네의 두 출발점에서 짧게 걸으면 비슷한 장소들에 도착합니다. 도착 분포가 비슷한 이웃 동네를 먼저 합치고, 마지막에 전체 합친 기록에서 관계 구조를 잘 표현하는 수준을 고릅니다.",
  operations: [
    {
      title: "원본 그래프와 보행 loop",
      input: "가중 무방향 그래프 또는 명시적 전체 차원 union-kNN",
      calculation:
        "parallel 간선을 먼저 합산하고 각 노드에 incident 평균 가중치의 인공 loop를 추가합니다. 고립점 loop는1입니다. 원본 양의 loop·방향은 지원 오류입니다.",
      output: "graph와 실제 보행 전이 P, 원본 Q",
    },
    {
      title: "실제 t-step 분포",
      input: "행 정규화 전이 P와 보행 길이 t",
      calculation:
        "P⁰=I에서 희소 한 단계 전이를 실제 곱해 P¹…Pᵗ를 계산합니다. 일부 random walker를 뽑는 근사가 아닙니다.",
      output: "walk의 실제 전체 시작/도착 확률 행렬",
    },
    {
      title: "인접 Ward 후보",
      input: "현재 군집별 평균 도착 분포·원본 인접 관계",
      calculation:
        "도착 노드의 보행 차수로 보정한 거리와 군집 크기를 이용해 각 연결 쌍의 Δσ를 계산합니다. 최소 증가를 선택합니다.",
      output: "test의 모든 실제 거리·Ward 후보",
    },
    {
      title: "병합 계층",
      input: "선택한 군집 두 개",
      calculation:
        "군집 확률 벡터를 크기 가중 평균으로 합치고 실제 자식·부모·구성원·원본 Q를 덴드로그램에 기록합니다. 연결 성분 사이를 강제로 합치지 않습니다.",
      output: "merge와 전체 계층·병합 순서",
    },
    {
      title: "최고Q cut",
      input: "singleton부터 마지막 성분까지 방문한 전체 분할",
      calculation:
        "인공 보행 loop를 제외한 원본 가중 그래프의 Q가 가장 큰 수준을 선택합니다. 부동소수점 동률은 더 세분된 분할을 유지합니다.",
      output: "extract/finish의 실제 cut과 선택 수준",
    },
  ],
  equations: [
    {
      title: "행 확률과 보행 거리",
      tex: String.raw`P_{ij}=\frac{A_{ij}}{d_i},\quad P_{Cv}^{(t)}=\frac1{|C|}\sum_{i\in C}P_{iv}^{(t)},\quad r_{CD}^2=\sum_v\frac{(P_{Cv}^{(t)}-P_{Dv}^{(t)})^2}{d_v}`,
      symbols:
        "A는 인공 보행 loop를 포함한 대칭 가중 인접행렬, d_i=Σ_j A_ij, Pᵗ는 정확한 t단계 확률, C/D는 현재 원본 노드 집합입니다.",
      meaning:
        "인기 있는 높은 차수 도착점의 영향이 과도하지 않도록 보정한 확률 분포 거리입니다. 원본 좌표 거리가 아닙니다.",
      derivation: [
        "한 단계에서 간선 가중치를 행 전체 가중치로 나누면 행 합이1입니다. 행 확률을 반복 곱하면 모든 가능한 경로 확률을 합칩니다.",
        "군집에서 시작할 원본 노드를 균일하게 선택하므로 P_C는 소속 노드의 확률 벡터 평균입니다.",
        "확률 벡터를 좌표별 √d_v로 나누고 유클리드 제곱거리를 구하면 식의 r²가 됩니다.",
      ],
    },
    {
      title: "Ward 증가와 별도 cut 점수",
      tex: String.raw`\sigma=\frac1n\sum_C\sum_{i\in C}r_{iC}^2,\quad\Delta\sigma(C,D)=\frac{|C||D|}{n(|C|+|D|)}r_{CD}^2,\qquad Q=\sum_C\left[\frac{L_C}{m}-\left(\frac{K_C}{2m}\right)^2\right]`,
      symbols:
        "σ는 보행 공간의 평균 군집 내 제곱거리, n은 원본 노드 수입니다. Q의 m/L/K는 인공 loop를 넣기 전 원본 그래프 가중치/내부 가중치/차수합입니다.",
      meaning:
        "병합은 가장 작은 Δσ, 최종 수준 선택은 가장 큰 원본 Q입니다. Q가 가장 많이 오르는 쌍을 고르는 CNM과 다릅니다.",
      derivation: [
        "크기 s,t인 두 평균을 합칠 때 새 평균은 (sμ_C+tμ_D)/(s+t)입니다.",
        "제곱거리의 평균 분해에서 교차항이 사라져 합친 SSE 증가가 st/(s+t)×r²가 됩니다. 원본 n으로 나누면 Δσ입니다.",
        "모든 실제 병합 수준의 원본 Q를 별도로 측정해 최대 수준을 선택합니다. 이 계층 밖의 모든 분할까지 최적이라는 뜻은 아닙니다.",
      ],
    },
  ],
  numerical: {
    title: "0—1—2의 단위 가중치 path, t=1",
    steps: [
      "모든 인공 loop는1입니다. 보행 차수는 [2,3,2], P의 행은 [1/2,1/2,0], [1/3,1/3,1/3], [0,1/2,1/2]입니다.",
      "인접 singleton 0/1의 r²=(1/6)²/2+(1/6)²/3+(1/3)²/2=17/216입니다. Δσ=(1/(3×2))×17/216=17/1296입니다. 0/2는 원본 간선이 없어 후보가 아닙니다.",
      "원본 m=2에서 singleton Q=−3/8, {0,1}/{2}의 Q=−1/8, 전체 한 군집의 Q=0입니다. 따라서 최종 cut은 한 군집입니다. 보행 loop를 Q에 더하지 않습니다.",
    ],
  },
  parameters: [
    {
      key: "walkSteps",
      effect:
        "정확히 계산할 보행 길이 t≥1입니다. 너무 길면 정상분포에 가까워져 출발점 차이를 잃습니다.",
      experiment: "1,2,4에서 실제 Pᵗ와 Ward 후보·최고Q 수준을 비교하세요.",
    },
    {
      key: "neighbors",
      effect:
        "원본이 수치 데이터일 때 모든 차원의 이진 union-kNN을 구성하는 이웃 수입니다. raw graph에는 적용하지 않습니다.",
      experiment:
        "2와8에서 원본 그래프 변환/분포가 어떻게 바뀌는지 확인하세요.",
    },
  ],
  complexity: {
    theory:
      "원문은 덴드로그램 높이 H에서 O(mnH), 최악 O(mn²), 공간 O(n²)의 최적화 구현을 제시합니다.",
    implementation:
      "이 구현은 정확한 행 확률 전이 O(t n(n+m))와 모든 인접 쌍의 평균 벡터 거리 재계산·정렬을 사용합니다. 보수적으로 O(t n(n+m)+n²m+nm log m)이며 원문 heap 가속을 주장하지 않습니다.",
    space:
      "확률/중간 행렬·전체 수준/덴드로그램 O(n²), 그래프/후보 O(n+m), Trace 별도 바이트 예산입니다.",
    cost: "밀집 공간을 할당 전에 검사합니다. 큰 예상 Trace는 실제 첫 단계·2의 거듭제곱 단계·마지막 상태로 요약하며 모든 원본 계산과 전체 계층은 유지합니다.",
  },
  implementation: [
    "시드는 필요 없는 결정적 전수 계산입니다. 보행은 원본 좌표의 표본 random walker 재생이 아닙니다.",
    "가중 parallel은 합산한 뒤 incident 평균 인공 loop를 계산합니다. 원본 양의 self-loop와 방향·음수 가중치는 명시적으로 거부합니다. 고립점은 자기 상태를 보존합니다.",
    "Ward 최소값 동률은 계층 ID 오름차순, 최고Q가 64×machine-epsilon 범위에서 같으면 더 세분된 수준을 유지합니다. 극단적 보행 길이는 수치상 출발점 차이가 사라질 수 있습니다.",
    "최종 labels와 전체 덴드로그램/선택 수준은 실제 계산 결과이며 전역 최대Q 또는 참 군집 수를 보장하지 않습니다.",
  ],
  comparison: [
    {
      other: "Greedy Modularity (CNM)",
      difference:
        "CNM은 최대 ΔQ를 직접 선택하지만 Walktrap은 최소 보행 공간 Ward 증가로 계층을 만든 뒤 Q cut을 고릅니다.",
    },
    {
      other: "Markov Clustering (MCL)",
      difference:
        "MCL은 반복 expansion/inflation으로 흐름을 바꿉니다. Walktrap은 고정 P의 t단계 분포와 Ward 계층을 사용합니다.",
    },
  ],
  references: [
    {
      title:
        "Pons & Latapy (2005), Computing communities in large networks using random walks",
      url: "https://arxiv.org/html/physics/0512106v1",
      note: "§1–4의 보행 loop·차수 거리·인접 Ward·최고Q cut을 확인했습니다.",
    },
    {
      title: "igraph Walktrap (공식 C 문서)",
      url: "https://igraph.org/c/html/1.0.0/igraph-Community.html#igraph_community_walktrap",
      note: "igraph1.0.0 저자 구현의 가중 덴드로그램·cut/Q와 NumPy 전체 전이/독립 SSE를 비교했습니다. 원본 방향 무시는 제품에서 오류로 바꿉니다.",
    },
  ],
  preset: "tiny",
  events: ["graph", "walk", "test", "merge", "extract", "finish"],
  advanced: [
    "행 확률 Pᵗ와 MCL의 열 확률 행렬은 방향이 다릅니다. 보행 차수와 원본 Q 차수도 구분해야 합니다.",
    "연결 성분은 끝까지 분리된 forest입니다. 희소 입력이어도 모든 확률 벡터와 전체 계층은 n² 공간을 요구합니다.",
  ],
  experimentParams: { walkSteps: 1, neighbors: 2 },
  experimentDataset: {
    kind: "graph",
    directed: false,
    nodes: [{ id: "0" }, { id: "1" }, { id: "2" }],
    edges: [
      { source: "0", target: "1", weight: 1 },
      { source: "1", target: "2", weight: 1 },
    ],
  },
};

export const cliquepercolation: Lesson = {
  purpose:
    "실제로 존재하는 모든 k-clique를 찾고, k−1개 원본 노드를 공유하는 clique들의 연결 성분으로 겹치는 커뮤니티를 추출합니다. 군집 수를 미리 정하거나 점수를 최대화하는 알고리즘이 아닙니다.",
  analogy:
    "서로 모두 아는 k명짜리 소모임들을 생각해 보세요. 두 소모임이 k−1명을 공유하면 같은 더 큰 모임으로 이어집니다. 서로 다른 큰 모임은 일부 사람을 공유할 수 있습니다.",
  operations: [
    {
      title: "실제 단순 그래프 검사",
      input: "loop·중복·방향이 없는 단위 가중치 그래프",
      calculation:
        "원본 가중치를 버리지 않고 입력 조건을 검사합니다. 수치 입력은 명시적으로 전체 차원 이진 union-kNN을 생성합니다.",
      output: "graph의 원본 노드·간선",
    },
    {
      title: "모든 k-clique 열거",
      input: "순서 있는 노드 후보·이웃 교집합",
      calculation:
        "증가하는 원본 노드 순서와 교집합 frontier를 이용해 모든 쌍이 연결된 크기 k 집합을 중복 없이 찾습니다.",
      output: "clique의 실제 새 완전 부분그래프",
    },
    {
      title: "공유 face 연결",
      input: "실제 k-clique의 k개 (k−1)-face",
      calculation:
        "같은 face를 가진 clique를 대표와 연결하며 실제 union-find로 성분을 합칩니다. 모든 clique쌍을 저장하지 않아도 같은 연결 성분입니다.",
      output: "percolate의 실제 연결·성분 변화",
    },
    {
      title: "원본 중첩 cover",
      input: "clique 연결 성분",
      calculation:
        "성분 내 clique들의 원본 노드 합집합을 반환합니다. 여러 성분에 들어가는 노드의 모든 소속과 clique가 없는 노드를 보존합니다.",
      output: "extract/finish의 communities·memberships·미소속",
    },
  ],
  equations: [
    {
      title: "Clique 인접과 원본 cover",
      tex: String.raw`\mathcal K_k=\{S\subseteq V:|S|=k,\ \forall u\ne v\in S,\{u,v\}\in E\},\quad S\sim T\iff |S\cap T|=k-1,\qquad C_B=\bigcup_{S\in B}S`,
      symbols:
        "K_k는 실제 k-clique들의 집합입니다. B는 k-clique 인접 그래프의 한 연결 성분이며 C_B가 원본 노드 커뮤니티입니다.",
      meaning:
        "원본 커뮤니티는 서로 겹칠 수 있고 어떤 노드는 어느 커뮤니티에도 들어가지 않을 수 있습니다. 단일 label 배열로 전체 cover를 표현할 수 없습니다.",
      derivation: [
        "한 k-clique에서 노드 하나를 빼면 (k−1)-face입니다. 같은 face를 공유하는 두 k-clique의 교집합은 정확히 k−1입니다.",
        "같은 face에 여러 clique가 있으면 대표와 각각 연결하는 star도 완전한 pair 연결과 같은 연결 성분을 만듭니다.",
        "연결 성분마다 원본 노드 합집합을 취합니다. 다른 성분의 clique가 k−2개 이하만 공유해도 그 원본 노드는 두 커뮤니티에 함께 속할 수 있습니다.",
      ],
    },
  ],
  numerical: {
    title: "삼각형 두 개가 한 노드를 공유할 때, k=3",
    steps: [
      "간선이 만드는 삼각형이 {0,1,2}, {2,3,4}이고 노드5는 고립점이라고 합시다. 실제 3-clique는 두 개입니다.",
      "두 clique는 노드2 하나만 공유합니다. k−1=2보다 작으므로 서로 연결되지 않고 커뮤니티 {0,1,2}, {2,3,4}를 따로 반환합니다.",
      "노드2는 두 소속을 모두 갖고 노드5는 미소속입니다. 화면 label은 첫 소속만 나타냅니다. −1은 통계적으로 검정한 noise가 아닙니다.",
      "반대로 삼각형 {0,1,2}, {1,2,3}은 face {1,2}를 공유하므로 하나의 커뮤니티 {0,1,2,3}이 됩니다. k=4인데4-clique가 없으면 정당한 빈 결과입니다.",
    ],
  },
  parameters: [
    {
      key: "cliqueSize",
      effect:
        "완전 부분그래프의 크기 k≥2입니다. 요청 군집 수가 아닙니다. k>n이면 clique가 없는 빈 cover가 정상 결과입니다.",
      experiment:
        "같은 그래프에서2,3,4의 clique/공유 face/미소속을 비교하세요.",
    },
    {
      key: "neighbors",
      effect:
        "좌표/수치 입력을 실제 단위 union-kNN으로 변환할 때만 적용합니다.",
      experiment: "이웃 수가 늘 때 실제 삼각형이 생기는 순간을 관찰하세요.",
    },
  ],
  complexity: {
    theory:
      "완전 부분그래프와 결과 수가 지수적으로 증가할 수 있는 정확 열거 문제입니다. 모든 입력에서 선형/다항 시간을 보장하지 않습니다.",
    implementation:
      "작은 이웃/후보 집합을 실제 교집합으로 줄이는 명시적 스택 열거입니다. C개 clique의 공유face 키·union 처리는 O(Ck²) 수준이며 전체 비용에는 실제 부분 후보 탐색이 추가됩니다.",
    space:
      "희소 원본 O(n+m), 실제 C개의 clique/face/공유 연결·구성원과 열거 frontier를 바이트로 검사합니다. 조합 수 상계는 Trace 상세 선택에만 사용합니다.",
    cost: "임의 입력/결과 수 상한을 두지 않습니다. 실제 작업 공간 초과는 부분 출력 성공 대신 오류입니다. 큰 기록은 실제 첫·2의 거듭제곱·최종 요약이며 계산은 전부 수행합니다.",
  },
  implementation: [
    "기본 비가중 CPM입니다. 원본 weight≠1·self-loop·중복 간선·방향은 오류이며 CPMw/방향 확장으로 이름을 바꾸지 않습니다.",
    "모든 k-clique를 실제 열거하고 k−1 face의 대표 연결을 사용합니다. 최대 clique 몇 개만 찾고 나머지를 생략하는 근사가 아닙니다.",
    "native communities/memberships는 커뮤니티별 원본 노드 집합입니다. Canvas는 첫 소속만 표시하며 미소속 원본 행도 유지합니다.",
    "시드가 필요 없는 결정적 열거입니다. 목적함수/최적 군집 수/통계적 유의성을 출력하지 않습니다.",
  ],
  comparison: [
    {
      other: "Markov Clustering (MCL)",
      difference:
        "MCL 중첩은 실제 전이 attractor 지지에서 나오지만 CPM은 정확한 k-clique 연결 성분의 원본 합집합에서 나옵니다.",
    },
    {
      other: "Louvain",
      difference:
        "Louvain은 원본 Q를 개선하는 비중첩 분할입니다. CPM은 모듈성 최적화 없이 중첩 cover와 미소속을 반환합니다.",
    },
  ],
  references: [
    {
      title:
        "Palla et al. (2005), Uncovering the overlapping community structure of complex networks in nature and society",
      url: "https://arxiv.org/html/physics/0506133v1",
      note: "실제 k-clique·k−1 인접·중첩 원본 커뮤니티 정의를 확인했습니다.",
    },
    {
      title: "NetworkX k_clique_communities",
      url: "https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.kclique.k_clique_communities.html",
      note: "NetworkX3.6.1 및 독립 모든 노드 부분집합/공유쌍 검사로273개 실제 입력의 모든 clique·커뮤니티를 비교했습니다.",
    },
  ],
  preset: "tiny",
  events: ["graph", "clique", "percolate", "extract", "finish"],
  advanced: [
    "k=2에서는 간선이 있는 연결 성분과 같고 고립점은 포함되지 않습니다. k를 높이면 더 조밀한 core를 요구해 미소속이 늘 수 있습니다.",
    "고정된 원본 표본화를 허용하지 않습니다. 출력이 지수적으로 커지면 자원 오류를 알려야 하며 일부 clique cover를 전체 결과라고 부르면 안 됩니다.",
  ],
  experimentParams: { cliqueSize: 3, neighbors: 2 },
  experimentDataset: {
    kind: "graph",
    directed: false,
    nodes: Array.from({ length: 6 }, (_, i) => ({ id: String(i) })),
    edges: [
      [0, 1],
      [1, 2],
      [0, 2],
      [2, 3],
      [3, 4],
      [2, 4],
    ].map(([a, b]) => ({ source: String(a), target: String(b), weight: 1 })),
  },
};
