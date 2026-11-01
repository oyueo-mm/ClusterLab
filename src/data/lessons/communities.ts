import type { Lesson } from "./types";

const graphInput =
  "원본 가중 무방향 그래프를 사용합니다. 기존 좌표 실험에서는 전체 원본 벡터의 이진 union-kNN 그래프를 먼저 만들며, 좌표 거리 자체를 커뮤니티 관계라고 부르지 않습니다.";
const modularityEquation = {
  title: "가중 모듈성",
  tex: String.raw`Q=\sum_C\left[\frac{L_C}{m}-\gamma\left(\frac{K_C}{2m}\right)^2\right]`,
  symbols:
    "m: 무방향 간선 가중치 합, L_C: C 내부 간선 가중치 합, K_C: C의 차수합, γ: resolution. self-loop는 차수에 두 번 들어갑니다.",
  meaning:
    "관측된 내부 연결과 같은 차수합을 가진 무작위 연결 기준의 차이를 측정합니다.",
  derivation: [
    "각 내부 비루프 간선은 인접행렬 합에 두 번 들어가지만 전체 정규화도 2m이므로 L_C/m이 됩니다.",
    "같은 군집의 k_i k_j 합은 K_C²이므로 기대항은 γ(K_C/(2m))²입니다.",
    "Q가 커졌다는 사실은 정답 레이블이나 전역 최적을 증명하지 않습니다.",
  ],
};
const louvainReference = {
  title:
    "Blondel et al. (2008), Fast unfolding of communities in large networks",
  url: "https://arxiv.org/html/0803.0476v2",
  note: "§2의 가중 모듈성 노드 이동과 집약을 확인했습니다. 외부 구현 코드를 복사하지 않았습니다.",
};
const leidenReference = {
  title: "Traag, Waltman & van Eck (2019), From Louvain to Leiden",
  url: "https://arxiv.org/html/1810.08473v3",
  note: "Appendix A.2의 fast move/refinement/집약, degree 질량에 의한 modularity 변환을 확인했습니다.",
};

export const louvain: Lesson = {
  purpose:
    "실제 간선의 가중 모듈성을 높이는 노드 이동과 메타 그래프 집약을 반복해 커뮤니티를 찾습니다.",
  analogy:
    "구성원을 옮겨 내부 관계가 강해지게 한 다음, 형성된 모임을 하나의 구성원으로 묶고 더 큰 모임을 살펴봅니다.",
  operations: [
    {
      title: "원본 그래프",
      input: "노드·무방향 간선·가중치",
      calculation: "노드별 차수, 전체 2m과 singleton 분할을 실제 계산합니다.",
      output: "실제 graph 이벤트",
    },
    {
      title: "노드 이동",
      input: "현재 노드와 이웃 커뮤니티",
      calculation:
        "현재 군집에서 제거하고 후보 군집으로 넣는 실제 ΔQ를 계산합니다. 양의 개선만 수용합니다.",
      output: "move의 후보별 ΔQ와 원본 노드 레이블",
    },
    {
      title: "집약",
      input: "현재 커뮤니티 분할",
      calculation:
        "커뮤니티를 메타 노드로 바꾸고 같은 쌍의 가중치를 합칩니다. 내부 간선은 self-loop로 보존합니다.",
      output: "aggregate와 동일한 전후 Q",
    },
    {
      title: "정지",
      input: "다음 수준의 실제 이동 결과",
      calculation:
        "더 움직일 수 없는 singleton 메타 분할이면 현재 계층 iteration을 마칩니다. 반복 한도와 구분합니다.",
      output: "원본 노드 분할·수준별 매핑",
    },
  ],
  equations: [
    modularityEquation,
    {
      title: "실제 노드 교환의 변화량",
      tex: String.raw`\Delta Q=\frac{2(w_{i,B}-w_{i,A})}{2m}-\frac{2\gamma k_i(K_B-K_A+k_i)}{(2m)^2}`,
      symbols:
        "A: 이동 전 군집, B: 이동 후 군집, w_i,C: i에서 C의 다른 노드로 향하는 가중치, k_i: i의 차수.",
      meaning: "이동 전 제거 효과와 이동 후 삽입 효과를 함께 계산해야 합니다.",
      derivation: [
        "내부 인접행렬 합은 2(w_i,B−w_i,A)만큼 변합니다. i의 자기 루프는 어느 군집에서도 내부이므로 상쇄됩니다.",
        "제곱 차수합의 변화는 (K_A−k_i)²+(K_B+k_i)²−K_A²−K_B²이며 이를 전개하면 식의 두 번째 항이 됩니다.",
      ],
    },
  ],
  numerical: {
    title: "세 노드: loop와 중복 간선",
    steps: [
      "0의 자기 루프 가중치 2, 0–1 가중치 1+2, 1–2 가중치 1이면 차수는 7,4,1이고 2m=12입니다.",
      "분할 {0,1}/{2}의 내부 가중치는 5와 0, 차수합은 11과 1입니다.",
      "γ=1일 때 Q=5/6−(11/12)²−(1/12)²=−1/72입니다. {0,1}을 메타 노드로 집약해도 같은 Q를 얻습니다.",
    ],
  },
  parameters: [
    {
      key: "resolution",
      effect: "기대 연결 패널티 γ입니다. 크면 더 작은 커뮤니티를 선호합니다.",
      experiment: "0.5,1,2에서 실제 Q와 군집 수를 비교하세요.",
    },
    {
      key: "neighbors",
      effect:
        "좌표 입력을 그래프로 변환할 때의 k입니다. 원본 그래프 입력에는 적용하지 않습니다.",
      experiment: "2와 8에서 생성 간선·분할 차이를 보세요.",
    },
    {
      key: "iterations",
      effect: "각 이동 패스와 집약 수준의 계산 한도입니다.",
      experiment: "작은 한도에서 미수렴 표시를 확인하세요.",
    },
  ],
  complexity: {
    theory:
      "희소 그래프에서 이웃 커뮤니티의 이동 비용을 증분 계산합니다. 순서와 그래프 구조에 따라 반복 수가 달라집니다.",
    implementation:
      "이웃 스캔 외에 교육 Trace용 Q와 원본 레이블 매핑을 실제 수용 이동마다 계산하므로 O(n+m) 추가 비용이 있습니다. 최악 선형 시간을 보장하지 않습니다.",
    space: "희소 인접·원본 매핑 O(n+m), 수준/Trace는 별도 바이트 예산.",
    cost: "고밀도 입력·많은 이동·긴 계층은 Trace와 계산 비용이 커집니다.",
  },
  implementation: [
    graphInput,
    "자기 루프와 중복 간선의 가중치 합을 보존합니다. 방향/음수 가중치는 명시적으로 거부합니다.",
    "노드 순서는 seed로 재현합니다. 최적 모듈성·커뮤니티 연결성·참 군집 수를 보장하지 않습니다.",
  ],
  comparison: [
    {
      other: "Leiden",
      difference:
        "Leiden은 실제 제약 refinement와 refined 집약을 추가합니다. Louvain 뒤 연결 성분 분리만 하는 방법과 다릅니다.",
    },
  ],
  references: [
    louvainReference,
    {
      title: "NetworkX louvain_communities",
      url: "https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.louvain.louvain_communities.html",
      note: "검증 전용 NetworkX3.6.1 분할·가중 모듈성과 비교했습니다.",
    },
  ],
  preset: "tiny",
  events: ["graph", "move", "aggregate", "finish"],
  advanced: [
    "작은 군집이 합쳐지는 resolution limit과 이동 순서에 따른 지역해가 있습니다. 계층의 중간 수준도 분석 대상입니다.",
  ],
  experimentParams: { neighbors: 2, iterations: 100, resolution: 1 },
};

export const leiden: Lesson = {
  purpose:
    "노드 이동, 원래 커뮤니티 내부의 확률적 제약 refinement, refined 메타 그래프 집약을 실제 수행하는 Leiden입니다.",
  analogy:
    "모임을 통째로 합치기 전에 내부에서 잘 연결된 작은 모임을 다시 찾아야, 끊어진 집단을 하나의 원자로 고정하지 않을 수 있습니다.",
  operations: [
    {
      title: "Fast local move",
      input: "실제 그래프와 현재 분할",
      calculation:
        "양의 모듈성 개선 이동을 수행하고 이웃이 바뀐 노드를 큐에 다시 넣습니다.",
      output: "move와 실제 후보 개선량",
    },
    {
      title: "Refinement",
      input: "원래 커뮤니티와 singleton refined 분할",
      calculation:
        "degree 질량의 연결 조건을 만족한 노드/대상만 고려하고 비음수 개선 후보를 exp(gain/θ) 가중치로 선택합니다.",
      output: "refine와 원본 분할 내부의 새 하위 분할",
    },
    {
      title: "Refined 집약",
      input: "refined 분할 및 refinement 전 분할",
      calculation:
        "refined 군집으로 노드를 만들되 이전 커뮤니티 관계를 다음 수준 초기 분할로 유지합니다.",
      output: "aggregate의 실제 메타 간선·구성원·Q 보존",
    },
    {
      title: "Iteration 완료",
      input: "메타 노드의 이동 결과",
      calculation:
        "현재 분할이 singleton 메타 분할이 되면 원본 레이블로 펼칩니다. 한 번의 iteration과 점근 안정은 구분합니다.",
      output: "원본 커뮤니티와 실제 완료 상태",
    },
  ],
  equations: [
    modularityEquation,
    {
      title: "Refinement의 연결 조건과 확률",
      tex: String.raw`E(v,S\setminus v)\geq\frac{\gamma}{2m}k_v(K_S-k_v),\qquad P(C)\propto\exp(\Delta H(v\to C)/\theta),\quad\Delta H\geq0`,
      symbols:
        "S: refinement 전 커뮤니티, k_v: 메타 노드가 보존하는 원본 차수 질량, K_S: S의 총 질량, θ: refinement randomness.",
      meaning:
        "같은 커뮤니티 안에서도 충분히 연결된 대상만 확률적 병합 후보가 됩니다.",
      derivation: [
        "원문 CPM의 노드 크기를 degree 질량으로 바꾸고 resolution을 γ/(2m)로 바꾸면 modularity에 대응합니다.",
        "refinement는 아직 병합되지 않은 singleton 소스만 옮깁니다. 원래 S를 벗어나는 이동을 허용하지 않습니다.",
        "확률을 계산할 때 최대 gain을 빼도 같은 정규화 확률이며 overflow를 줄입니다.",
      ],
    },
  ],
  numerical: {
    title: "세 노드 완전 그래프의 refinement",
    steps: [
      "각 간선 가중치가 1이면 2m=6, 각 degree=2입니다.",
      "singleton 0에서 singleton 1로 병합할 ΔH는 1−(1/6)×2×2=1/3입니다.",
      "현재 singleton 유지 gain0과 가능한 병합 gain1/3의 exp(gain/θ)를 정규화해 실제 후보를 선택합니다. 원래 커뮤니티 밖 노드는 후보가 아닙니다.",
    ],
  },
  parameters: [
    {
      key: "resolution",
      effect: "모듈성의 기대 연결 패널티와 refinement 연결 조건을 바꿉니다.",
      experiment: "γ가 커질 때 허용되는 refined 병합을 비교하세요.",
    },
    {
      key: "refinementRandomness",
      effect:
        "양의 θ는 refinement 확률의 집중 정도를 바꿉니다. 0은 지원하지 않습니다.",
      experiment: "0.01과0.1에서 같은 seed의 refined 분할을 비교하세요.",
    },
    {
      key: "iterations",
      effect:
        "계산 패스/수준 예산이며 부족하면 완료 결과를 만들지 않고 오류를 반환합니다.",
      experiment: "한도1에서 실패와 완료를 구분하세요.",
    },
  ],
  complexity: {
    theory:
      "희소 fast local move와 실제 refinement·다수 집약 수준으로 구성되며 모든 입력에서 선형 시간을 보장하지 않습니다.",
    implementation:
      "교육 구현은 refinement 대상의 연결 조건을 직접 다시 계산하므로 일부 단계가 O(nm+n²)까지 커질 수 있습니다. 빠른 저자 런타임을 복사한 구현이 아닙니다.",
    space: "희소 그래프·큐·원본 매핑 O(n+m), 수준/Trace 별도.",
    cost: "입력/연산/Trace 예산을 확인하고, 반복 한도에서 수렴한 척하지 않습니다.",
  },
  implementation: [
    graphInput,
    "진짜 constrained random refinement와 refined aggregation을 수행합니다. Louvain에 연결 성분 후처리만 붙인 엔진이 아닙니다.",
    "이 제품은 modularity의 한 계층 iteration을 실행합니다. 논문의 점근 subset optimality나 전역 최적을 유한 반복 결과에 붙이지 않습니다.",
    "방향/음수 입력은 거부하며 0가중 간선은 연결을 만들지 않습니다. 고립 노드는 별도 singleton으로 남깁니다.",
  ],
  comparison: [
    {
      other: "Louvain",
      difference:
        "Louvain은 지역 이동 후 원래 커뮤니티 자체를 집약하지만 Leiden은 refinement의 작은 커뮤니티로 집약합니다.",
    },
  ],
  references: [
    leidenReference,
    {
      title: "leidenalg 원저자 구현",
      url: "https://leidenalg.readthedocs.io/en/stable/",
      note: "검증 전용 leidenalg0.12.0/igraph1.0.0의 RBConfiguration 분할·Q와 비교했습니다. 제품에 포함하지 않습니다.",
    },
  ],
  preset: "tiny",
  events: ["graph", "move", "refine", "aggregate", "finish"],
  advanced: [
    "원문 증명은 가중치/목적함수·연결 조건에 대한 가정을 필요로 합니다. 한 번 안정해 보인 iteration도 확률 refinement로 이후 개선될 수 있습니다.",
  ],
  experimentParams: {
    neighbors: 2,
    iterations: 100,
    resolution: 1,
    refinementRandomness: 0.01,
  },
};

export const labelpropagation: Lesson = {
  purpose:
    "각 노드가 이웃의 현재 레이블을 실제로 받아 가중 최다 레이블로 갱신하는 비동기 Label Propagation입니다.",
  analogy:
    "처음에는 각자가 다른 이름을 쓰지만, 연결이 잦은 이웃 사이에서 자주 쓰이는 이름이 퍼져 합의가 형성됩니다.",
  operations: [
    {
      title: "고유 레이블",
      input: "원본 가중 그래프",
      calculation: "모든 노드에 다른 레이블을 부여합니다.",
      output: "graph의 singleton 레이블",
    },
    {
      title: "가중 투표",
      input: "방문 노드의 실제 이웃",
      calculation:
        "이웃 레이블별 간선 가중치를 더합니다. 방문 순서는 시드로 섞습니다.",
      output: "messages의 실제 레이블별 표",
    },
    {
      title: "비동기 전파",
      input: "최다 레이블 후보",
      calculation:
        "현재 레이블이 최다이면 유지하고, 아니면 최다 후보를 시드 무작위로 고릅니다. 뒤 노드는 갱신된 값을 봅니다.",
      output: "assign의 실제 이동",
    },
    {
      title: "합의 검사",
      input: "전체 노드 현재 레이블",
      calculation:
        "모든 노드가 이웃 최다 레이블 중 하나를 갖는지 확인합니다. 고립점은 유지합니다.",
      output: "extract/finish와 수렴 여부",
    },
  ],
  equations: [
    {
      title: "레이블별 가중 이웃 투표",
      tex: String.raw`V_i(c)=\sum_{j\in N(i)}w_{ij}\mathbf1[\ell_j=c],\qquad\ell_i\in\arg\max_c V_i(c)`,
      symbols:
        "V_i(c): 노드 i가 받은 레이블 c의 가중 표, ℓ_j: 현재 이웃 레이블.",
      meaning: "소속 확률이나 모듈성 개선량을 계산하는 식이 아닙니다.",
      derivation: [
        "간선별 강도를 같은 레이블끼리 더하면 최다 이웃 레이블을 얻습니다.",
        "이미 현재 레이블이 최대일 때 유지하면 동률에 의한 불필요한 진동을 줄이고 원문의 합의 정지 조건을 만족할 수 있습니다.",
      ],
    },
  ],
  numerical: {
    title: "세 이웃의 표",
    steps: [
      "노드0의 이웃 레이블이 A,A,B이고 연결 가중치가1,2,4이면 V(A)=3,V(B)=4입니다.",
      "노드0은 B로 이동합니다. 단순 이웃 수만 세면 A가 되어 다른 알고리즘이 됩니다.",
      "가중치가1,2,3이면 A와B가 동률이며 현재 레이블이 둘 중 하나라면 유지합니다.",
    ],
  },
  parameters: [
    {
      key: "iterations",
      effect:
        "전체 비동기 패스 한도입니다. 한도 종료와 이웃 합의 수렴을 구분합니다.",
      experiment: "1과20에서 수렴 표시를 비교하세요.",
    },
    {
      key: "neighbors",
      effect: "좌표 입력의 union-kNN 변환에만 사용합니다.",
      experiment: "그래프 밀도가 커질 때 한 커뮤니티로 퍼지는지 확인하세요.",
    },
  ],
  complexity: {
    theory:
      "한 번의 희소 이웃 투표 패스는 O(n+m)입니다. 필요한 패스 수는 고정되지 않습니다.",
    implementation:
      "Trace 캡처와 전체 합의 검사를 수행하며 원본 ND kNN 생성은 별도 O(n²d+n² log n)입니다.",
    space: "그래프/레이블 O(n+m), Trace 별도 바이트 예산.",
    cost: "과밀 그래프나 동률 구조에서는 결과와 수렴이 시드/규약에 민감합니다.",
  },
  implementation: [
    graphInput,
    "실수 가중치의 weighted extension이며 현재 최다 레이블을 유지하는 tie 정책을 명시합니다.",
    "표시한 Q는 사후 관측 지표입니다. LPA가 모듈성을 최적화한다고 설명하지 않습니다.",
    "단일 분할이며 중첩/연결성/유일해는 보장하지 않습니다. 방향/음수 가중치는 거부합니다.",
  ],
  comparison: [
    {
      other: "Louvain",
      difference:
        "Louvain은 실제 ΔQ로 이동하지만 LPA는 이웃 레이블 투표로 이동합니다.",
    },
  ],
  references: [
    {
      title: "Raghavan, Albert & Kumara (2007), Near linear time algorithm...",
      url: "https://arxiv.org/html/0709.2938v1",
      note: "원문 비동기 전파·정지/동률 조건과 가중 확장의 차이를 확인했습니다.",
    },
    {
      title: "NetworkX asyn_lpa_communities",
      url: "https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.label_propagation.asyn_lpa_communities.html",
      note: "NetworkX3.6.1을 독립 참조로 사용합니다. 서로 다른 PRNG의 일반 분할 일치를 주장하지 않습니다.",
    },
  ],
  preset: "tiny",
  events: ["graph", "messages", "assign", "extract", "finish"],
  advanced: [
    "많은 작은 커뮤니티가 하나로 합쳐지거나, 동일한 그래프에 여러 합의 분할이 있을 수 있습니다.",
  ],
  experimentParams: { neighbors: 2, iterations: 100 },
};

export const girvannewman: Lesson = {
  purpose:
    "현재 그래프의 실제 edge betweenness가 가장 큰 간선을 제거하고 최단 경로를 다시 계산하는 분할형 커뮤니티 방법입니다.",
  analogy:
    "서로 다른 동네를 잇는 다리를 찾아 하나씩 끊고, 우회로가 달라질 때마다 어느 다리가 중요해졌는지 다시 셉니다.",
  operations: [
    {
      title: "최단 경로",
      input: "남은 실제 가중 간선",
      calculation:
        "모든 시작점에서 Dijkstra 최단 경로와 동률 경로 개수를 계산합니다. 이 엔진은 길이를1/연결강도로 정합니다.",
      output: "실제 predecessor·dependency 계산",
    },
    {
      title: "매개 중심성",
      input: "경로 개수와 역순 dependency",
      calculation:
        "모든 노드 쌍의 최단 경로가 각 간선을 얼마나 공유하는지 Brandes 방식으로 누적합니다.",
      output: "distance의 실제 간선별 betweenness",
    },
    {
      title: "제거와 분할",
      input: "최대 betweenness 간선",
      calculation:
        "동률은 원본 인덱스로 정하고 간선 하나를 제거합니다. 새 연결 성분과 이후 모든 betweenness를 재계산합니다.",
      output: "prune/split와 원본 노드 분할",
    },
    {
      title: "계층 추출",
      input: "요청 K와 현재 성분",
      calculation:
        "성분 수가 K에 도달하면 반환합니다. 원래 성분이 더 많으면 임의로 합치지 않습니다.",
      output: "수준별 실제 분할",
    },
  ],
  equations: [
    {
      title: "간선 매개 중심성",
      tex: String.raw`B(e)=\sum_{s<t}\frac{\sigma_{st}(e)}{\sigma_{st}}`,
      symbols:
        "σ_st: s,t 사이 최단 경로 개수, σ_st(e): 간선 e를 지나는 최단 경로 개수. 연결되지 않은 쌍은 기여0.",
      meaning: "한 쌍에 최단 경로가 여러 개면 기여를 경로 수에 맞게 나눕니다.",
      derivation: [
        "각 시작점에서 최단 경로 DAG를 구성한 뒤 역순으로 dependency를 누적하면 모든 경로를 직접 열거하지 않아도 됩니다.",
        "무방향 그래프에서 양쪽 시작점을 모두 누적한 값을2로 나눕니다. 간선 제거 후 DAG가 달라지므로 다시 계산해야 합니다.",
      ],
    },
  ],
  numerical: {
    title: "다리로 연결한 두 삼각형",
    steps: [
      "각 삼각형에3개 노드가 있고 두 삼각형을 하나의 다리로 잇습니다.",
      "삼각형 사이에는3×3=9개 노드 쌍이 있으며 모든 최단 경로가 다리를 지납니다. 다리의 비정규화 betweenness는9입니다.",
      "다리를 제거하면2개 연결 성분이 됩니다. K=3이면 다음 간선을 제거하기 전에 실제 새 경로와 점수를 다시 계산합니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "계층에서 추출할 연결 성분 수입니다. 최적 Q를 자동 고르는 옵션이 아닙니다.",
      experiment: "K=2와3에서 실제 제거 순서를 보세요.",
    },
    {
      key: "neighbors",
      effect: "좌표 실험의 원본 전체 차원 union-kNN 생성에만 적용합니다.",
      experiment: "다리가 생기도록 이웃 수를 바꿔 보세요.",
    },
  ],
  complexity: {
    theory:
      "각 간선 제거마다 모든 시작점 최단 경로를 다시 계산하므로 큰 그래프에서 비쌉니다.",
    implementation:
      "이 구현의 Dijkstra 최소값 추출은 선형 스캔이므로 한 betweenness 계산 O(n³+nm), 최대 m번 제거까지 이어질 수 있습니다.",
    space:
      "거리/경로 수/희소 predecessor·그래프 O(n+m), 전체 n² 거리 행렬은 저장하지 않습니다.",
    cost: "간선 수가 작아도 노드 수가 크면 오래 걸립니다. Worker에서 실행하고 취소할 수 있습니다.",
  },
  implementation: [
    graphInput,
    "가중치는 연결 강도이며 최단 경로 길이는1/weight라는 명시적 변형입니다. 방향/음수/self-loop를 거부하고0간선은 연결로 세지 않습니다.",
    "매 제거 후 재계산하며 제거 전 원본 그래프의 Q를 계층 지표로 표시합니다. Q 최적 컷을 자동 선택한 결과가 아닙니다.",
  ],
  comparison: [
    {
      other: "Louvain",
      difference:
        "Louvain은 커뮤니티를 이동·집약하고 GN은 실제 간선을 제거해 분할합니다.",
    },
  ],
  references: [
    {
      title:
        "Girvan & Newman (2002), Community structure in social and biological networks",
      url: "https://arxiv.org/html/cond-mat/0112110v1",
      note: "간선 betweenness의 반복 제거·재계산을 확인했습니다.",
    },
    {
      title: "Brandes (2001), A Faster Algorithm for Betweenness Centrality",
      url: "https://snap.stanford.edu/class/cs224w-readings/brandes01centrality.pdf",
      note: "dependency 누적 원리를 확인하고 NetworkX3.6.1의 가중 edge betweenness와 비교했습니다.",
    },
  ],
  preset: "tiny",
  events: ["graph", "distance", "split", "finish"],
  advanced: [
    "가중치가 거리인지 강도인지에 따라 최단 경로와 제거 순서가 달라집니다. 입력 의미를 먼저 확인해야 합니다.",
  ],
  experimentParams: { neighbors: 3, k: 4 },
};

export const mcl: Lesson = {
  purpose:
    "실제 확률 전이 행렬의 거듭제곱 expansion과 원소별 inflation·열 정규화를 반복해 흐름의 attractor 지지를 찾습니다.",
  analogy:
    "많은 보행자가 연결망을 여러 걸음 이동하게 한 뒤, 잘 유지되는 이동 경로의 상대적 비중을 강화해 흐름이 머무는 집단을 찾습니다.",
  operations: [
    {
      title: "확률 전이",
      input: "실제 가중 그래프",
      calculation: "입력 대각에 단위 self-loop를 더하고 열 합1로 정규화합니다.",
      output: "initialize의 실제 column-stochastic 행렬",
    },
    {
      title: "Expansion",
      input: "현재 전이 M와 정수 e",
      calculation: "행렬 곱으로 M^e를 계산해 여러 걸음의 실제 전이를 얻습니다.",
      output: "expand-matrix의 전체 행렬",
    },
    {
      title: "Inflation",
      input: "확장 행렬과 r>1",
      calculation:
        "원소를 r승하고 각 열을 다시 확률1로 정규화합니다. 전체 행렬을 계산하며 pruning하지 않습니다.",
      output: "inflate와 실제 최대 변화",
    },
    {
      title: "Attractor 추출",
      input: "수렴 행렬과 수치 tolerance",
      calculation:
        "양의 대각 attractor의 지지 집합을 계산하고 중복 지지를 합칩니다. 중첩 지지도 보존합니다.",
      output: "전체 memberships와 최대 흐름의 화면 색 레이블",
    },
  ],
  equations: [
    {
      title: "Expansion과 inflation",
      tex: String.raw`M\leftarrow M^e,\qquad (\Gamma_r M)_{ij}=\frac{M_{ij}^{r}}{\sum_k M_{kj}^{r}},\quad r>1`,
      symbols: "M_ij: j에서 i로 가는 전이, e: 정수 걸음 수, r: inflation 지수.",
      meaning: "행렬 곱과 원소별 거듭제곱은 다른 연산입니다.",
      derivation: [
        "(M²)_ij=Σ_k M_ik M_kj로 중간 노드를 거치는2단계 경로 확률을 더합니다.",
        "동일 열의 작은 확률을 r승하면 상대적으로 더 줄어들며 열 정규화로 확률합을 복원합니다.",
        "각 열을 최댓값으로 나눈 뒤 r승해도 정규화 후 같은 값이므로 전체 underflow를 피할 수 있습니다.",
      ],
    },
  ],
  numerical: {
    title: "한 열의 inflation",
    steps: [
      "확장 후 한 열이(0.8,0.2)이면 r=2에서 제곱은(0.64,0.04)입니다.",
      "정규화하면(16/17,1/17)≈(0.941176,0.058824)입니다. 큰 전이가 강화됩니다.",
      "독립 NumPy fixture는 실제 원본 그래프의 첫 expansion/inflation과 수렴 행렬의 모든 원소를 비교합니다.",
    ],
  },
  parameters: [
    {
      key: "expansion",
      effect: "정수 행렬 거듭제곱이며2이상입니다.",
      experiment: "2와3의 실제 확장 전이를 비교하세요.",
    },
    {
      key: "inflation",
      effect:
        "원소별 거듭제곱 지수 r>1입니다. 보통 높으면 더 세분된 결과를 선호합니다.",
      experiment: "1.5와2.5에서 attractor 지지를 보세요.",
    },
    {
      key: "tolerance",
      effect:
        "최대 행렬 변화의 수렴 기준이며 지지 추출의 수치 기준에도 사용합니다.",
      experiment: "1e-5와1e-8에서 잔차·지지 경계를 비교하세요.",
    },
    {
      key: "iterations",
      effect: "반복 한도에서 수렴하지 않으면 완료 결과를 반환하지 않습니다.",
      experiment: "한도1과100을 비교하세요.",
    },
  ],
  complexity: {
    theory: "밀집 곱은 expansion2일 때 반복당 O(n³), 메모리 O(n²)입니다.",
    implementation:
      "실제 전체 행렬을 계산하며0원소 곱만 생략합니다. 수치 pruning/희소 가속/외부 MCL 런타임은 미사용입니다.",
    space:
      "동시 전이·확장·팽창 배열 O(n²)와 Trace. 행렬 할당 전에 바이트 예산을 검사합니다.",
    cost: "큰 그래프에는 Louvain/LPA 같은 희소 그래프 엔진을 고려합니다.",
  },
  implementation: [
    graphInput,
    "원본 self-loop 가중치에1을 더하는 loop 정책입니다. 모든 MCL 라이브러리 기본값과 같다고 주장하지 않습니다.",
    "수치 tolerance로 정의한 중첩 지지를 보존합니다. Canvas 색은 최대 attractor 흐름의 지배 분할이며 전체 memberships와 구분합니다.",
    "목적함수 Q를 직접 최적화하지 않습니다. 행렬 미수렴/지지 미포함 노드는 오류로 알립니다.",
  ],
  comparison: [
    {
      other: "Label Propagation",
      difference:
        "LPA는 이웃 레이블을 전파하지만 MCL은 다단계 확률 전이와 비선형 inflation을 계산합니다.",
    },
  ],
  references: [
    {
      title: "van Dongen (1998), A New Cluster Algorithm for Graphs",
      url: "https://ir.cwi.nl/pub/4604/04604D.pdf",
      note: "공식 CWI 원문의 expansion/inflation을 확인했습니다. 저자 매뉴얼 일부 URL은403이어서 원문을 사용했습니다.",
    },
    {
      title: "van Dongen, Graph Clustering by Flow Simulation (2000)",
      url: "https://ir.cwi.nl/pub/18026",
      note: "학위논문 서지를 확인했습니다. 제품은 독립 밀집 구현이며 검증은 NumPy 행렬 연산입니다.",
    },
  ],
  preset: "tiny",
  events: ["initialize", "expand-matrix", "inflate", "extract", "finish"],
  advanced: [
    "유한 정밀도와 지지 tolerance는 경계 노드의 지지에 영향을 줍니다. 중첩 결과를 하나의 색으로 표시하는 것과 계산 결과를 구분해야 합니다.",
  ],
  experimentParams: {
    neighbors: 2,
    iterations: 100,
    expansion: 2,
    inflation: 2,
    tolerance: 1e-8,
  },
};
