import type { Lesson } from "./types";

export const cnm: Lesson = {
  purpose:
    "각 노드를 하나의 커뮤니티로 시작해 실제 모듈성 증가가 가장 큰 군집 쌍을 순서대로 병합하는 greedy modularity 방법입니다.",
  analogy:
    "처음에는 각자가 작은 모임을 만들고, 두 모임을 합쳤을 때 관계 밀도의 기준 점수가 가장 많이 좋아지는 쌍부터 합칩니다.",
  operations: [
    {
      title: "Singleton과 Q",
      input: "실제 가중 무방향 그래프",
      calculation:
        "노드별 차수와 전체 가중치·초기 모듈성을 계산합니다. 입력 self-loop도 보존합니다.",
      output: "graph의 실제 분할과 Q",
    },
    {
      title: "연결 군집 쌍",
      input: "현재 분할·실제 간선",
      calculation:
        "군집 사이 가중치 합과 차수합으로 모든 연결 군집 쌍의 ΔQ를 계산합니다.",
      output: "test의 실제 쌍별 ΔQ",
    },
    {
      title: "최대 개선 병합",
      input: "평가된 모든 연결 쌍",
      calculation:
        "가장 큰 양의 ΔQ 쌍을 병합합니다. 점수 동률은 원래 군집 ID 순서로 정합니다.",
      output: "merge와 실제 전후 Q",
    },
    {
      title: "정지와 결과",
      input: "다음 최대 병합 개선량",
      calculation:
        "더 큰 Q를 만드는 병합이 없으면 현재 분할을 반환합니다. 0gain은 더 세분된 분할을 유지합니다.",
      output: "extract/finish와 실제 원본 레이블",
    },
  ],
  equations: [
    {
      title: "군집 쌍의 실제 모듈성 변화",
      tex: String.raw`Q=\sum_C\left[\frac{L_C}{m}-\gamma\left(\frac{K_C}{2m}\right)^2\right],\qquad\Delta Q_{A,B}=\frac{W_{A,B}}{m}-2\gamma\frac{K_AK_B}{(2m)^2}`,
      symbols:
        "m: 무방향 간선 가중치 합, L_C: 내부 가중치, K_C: 군집 차수합, W_A,B: 두 군집 사이 가중치, γ: resolution.",
      meaning:
        "병합으로 내부가 되는 실제 연결 이득과 기대 연결 패널티를 함께 평가합니다.",
      derivation: [
        "A와B를 합치면 내부 가중치가 L_A+L_B+W_A,B가 되므로 실제항은 W_A,B/m만큼 늘어납니다.",
        "기대항의 제곱 차이는 (K_A+K_B)²−K_A²−K_B²=2K_AK_B입니다.",
        "고립된 양의 질량 군집 쌍은 이득이 양수가 될 수 없으므로 연결 쌍만 저장할 수 있습니다.",
      ],
    },
  ],
  numerical: {
    title: "가중치1인 두 노드",
    steps: [
      "m=1, 각 차수는1입니다. singleton 분할 Q=−(1/2)²−(1/2)²=−1/2입니다.",
      "두 군집을 병합하면 Q=1−1=0이므로 실제 ΔQ=1/2입니다.",
      "resolution γ=2이면 병합 전 Q=−1, 병합 후 Q=−1로 ΔQ=0입니다. 이 엔진은0gain에서 세분된 두 군집을 유지합니다.",
    ],
  },
  parameters: [
    {
      key: "resolution",
      effect:
        "기대 연결 패널티 γ입니다. 높을수록 작은 커뮤니티를 더 선호합니다.",
      experiment: "γ=0.5,1,2에서 실제 후보 ΔQ를 비교하세요.",
    },
    {
      key: "neighbors",
      effect:
        "좌표/수치 입력을 이진 union-kNN 그래프로 변환할 때만 적용합니다.",
      experiment: "같은 원본 모든 차원에서 이웃2와8의 간선을 비교하세요.",
    },
  ],
  complexity: {
    theory:
      "원래 CNM의 heap/희소 ΔQ 갱신 구현은 O(md log n)이며 d는 병합 트리 깊이입니다.",
    implementation:
      "이 교육 구현은 같은 greedy 최대 개선 규칙을 희소 전체 스캔으로 계산합니다. 최대 n−1번 병합과 각 O(n+m) 스캔으로 O(n(n+m))이며 원래 heap 복잡도를 주장하지 않습니다.",
    space:
      "희소 그래프·차수·현재 연결 쌍 O(n+m), 수준과 Trace 별도 바이트 예산.",
    cost: "큰 입력에서는 실제 전체 탐색을 유지하고 기록만 첫 병합·2의 거듭제곱 병합 수·최종 상태로 요약합니다.",
  },
  implementation: [
    "원본 그래프의 실제 간선으로 계산하며 방향/음수 가중치는 거부합니다. 수치 입력은 모든 원본 차원으로 만든 명시적 union-kNN입니다.",
    "self-loop·중복 간선 합과 원본 노드 소속을 보존합니다. 양의 개선 문턱은1e−14이며 부동소수점 한계를 명시합니다.",
    "CNM의 greedy 목적함수와 노드 쌍 선택을 구현한 전체 스캔 변형입니다. 임의의 계층 병합이나 Louvain 이름 변경이 아닙니다.",
    "전역 최대 모듈성·참 군집 수를 보장하지 않습니다. 전체 음수 병합까지 만든 덴드로그램이 아니라 greedy 최대 지점에서 종료합니다.",
  ],
  comparison: [
    {
      other: "Louvain",
      difference:
        "Louvain은 개별 노드를 다른 군집으로 옮길 수 있지만 CNM은 현재 군집 두 개를 통째로 병합합니다.",
    },
    {
      other: "Girvan–Newman",
      difference:
        "GN은 간선을 제거해 하향 분할하고 CNM은 모듈성 기준으로 상향 병합합니다.",
    },
  ],
  references: [
    {
      title:
        "Clauset, Newman & Moore (2004), Finding community structure in very large networks",
      url: "https://arxiv.org/html/cond-mat/0408187v2",
      note: "§II의 greedy 병합·ΔQ·단일 최대점과 heap 가속의 관계를 확인했습니다. 구현의 전체 스캔 차이를 명시합니다.",
    },
    {
      title: "NetworkX greedy_modularity_communities",
      url: "https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.modularity_max.greedy_modularity_communities.html",
      note: "NetworkX3.6.1의 분할/Q와 독립 실제 Q 재계산의 모든 병합을 비교했습니다.",
    },
  ],
  preset: "tiny",
  events: ["graph", "test", "merge", "extract", "finish"],
  advanced: [
    "지역적 최대 개선을 선택하는 것과 전역 최적 분할은 다릅니다. 모듈성의 resolution limit도 남습니다.",
  ],
  experimentParams: { neighbors: 2, resolution: 1 },
};

export const fluid: Lesson = {
  purpose:
    "미리 지정한 K개의 유체가 크기에 반비례하는 밀도로 자신과 이웃에 영향을 주는 실제 비동기 Fluid Communities입니다.",
  analogy:
    "각 물질이 항상 같은 총량1을 유지한다고 생각해 보세요. 넓게 퍼질수록 각 위치의 밀도는 낮아지고, 작게 압축되면 밀도가 높아져 마지막 한 위치를 방어합니다.",
  operations: [
    {
      title: "서로 다른 K개 시드",
      input: "연결된 비가중 단순 무방향 그래프",
      calculation:
        "서로 다른 K개 노드를 시드로 선택하고 각각 크기1·밀도1의 유체를 배정합니다. 나머지는 미할당입니다.",
      output: "initialize의 실제 seeds/counts/densities",
    },
    {
      title: "Ego-network 밀도 합",
      input: "현재 노드·자신과 이웃의 소속",
      calculation:
        "같은 유체의1/크기를 자신과 이웃에서 모두 더해 실제 최대 후보를 찾습니다.",
      output: "messages의 실제 유체별 밀도 합",
    },
    {
      title: "비동기 이동",
      input: "최대 밀도 후보",
      calculation:
        "현재 소속이 최대면 유지하고 아니면 시드 선택합니다. 이동한 두 유체의 크기/밀도를 즉시 갱신합니다.",
      output: "assign과 실제1/|C|변화",
    },
    {
      title: "완료 패스",
      input: "전체 노드 순회 결과",
      calculation:
        "이동이 없는 전체 패스이면 수렴입니다. 반복 한도와 일부 미할당 오류를 구분합니다.",
      output: "extract/finish 및 K개 비어 있지 않은 소속",
    },
  ],
  equations: [
    {
      title: "유체 밀도와 실제 갱신 규칙",
      tex: String.raw`d(c)=\frac{1}{|c|},\qquad S_v(c)=\sum_{w\in\{v\}\cup N(v)}d(c)\mathbf1[\ell_w=c],\qquad\ell'_v\in\arg\max_c S_v(c)`,
      symbols:
        "d(c): 유체c가 한 노드에 갖는 밀도, S_v(c): 자신·이웃에서 받은 실제 밀도 합, ℓ: 현재 비동기 레이블.",
      meaning: "각 유체의 전체 밀도는 항상1이며 이것은 소속 확률이 아닙니다.",
      derivation: [
        "유체 크기가s이면 각 노드 밀도1/s이므로 총량은s×1/s=1입니다.",
        "한 노드 이동 직후 이전 유체는s−1, 새 유체는t+1이 되어 밀도를 즉시 바꿉니다. 한 패스가 끝날 때까지 미루는 동기 갱신은 같은 알고리즘이 아닙니다.",
        "singleton 유체는 자기 노드에서 밀도1을 받습니다. 다른 유체가 줄 수 있는 합은 최대1이므로 현재 최대 유지 규칙이 마지막 노드를 방어합니다.",
      ],
    },
  ],
  numerical: {
    title: "두 유체의 밀도 합",
    steps: [
      "유체A에2개 노드, B에3개가 있으면 밀도는1/2와1/3입니다.",
      "어떤 노드의 자신·이웃 범위에 A1개와 B2개가 있으면 실제 합은A=1/2, B=2/3입니다. B가 최대입니다.",
      "그 노드가A에서B로 이동하면 크기는A1개/B4개, 밀도는1과1/4로 즉시 바뀝니다. 두 유체 총량은 각각1입니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "실제로 유지할 비어 있지 않은 유체 수입니다.1≤K≤노드 수여야 합니다.",
      experiment: "같은 연결 그래프의 K=1,2,3을 비교하세요.",
    },
    {
      key: "iterations",
      effect:
        "전체 비동기 패스 한도입니다. 전체 소속이 생겼어도 수렴은 별도 표시합니다.",
      experiment: "1과100에서 미할당 오류·미수렴·안정 결과를 구분하세요.",
    },
    {
      key: "neighbors",
      effect:
        "좌표 입력의 명시적 union-kNN 변환에만 적용합니다. 생성 그래프도 연결이어야 합니다.",
      experiment: "이웃 수가 작아 그래프가 끊기면 실패 이유를 확인하세요.",
    },
  ],
  complexity: {
    theory:
      "한 패스는 실제 노드/간선 방문 O(n+m)입니다. 수렴까지 패스 수는 입력과 시드에 따라 달라집니다.",
    implementation:
      "교육용 후보·크기·밀도와 Trace를 추가 기록합니다. 수치 kNN 생성은 별도 전수 거리/정렬 비용입니다.",
    space: "희소 그래프·레이블 O(n+m), 유체 크기/밀도 O(K), Trace 별도.",
    cost: "큰 예상 기록량에서는 첫 판단/이동과 각 실제 전체 패스만 기록하며 모든 노드를 계산합니다.",
  },
  implementation: [
    "연결·비가중·단순·무방향 그래프를 요구합니다. 가중치≠1, self-loop, 중복 간선, 비연결·방향 입력을 명시적으로 거부하며 속성을 버리지 않습니다.",
    "원문의 argmax 규칙에 상대 machine-epsilon 동률 검사를 사용합니다. NetworkX의1e−4동률 문턱과 일반 입력에서 항상 같은 분할이라고 주장하지 않습니다.",
    "시드·방문 순서를 재현합니다. 자기 레이블이 최대면 유지하고 밀도를 즉시 갱신해 K개 유체를 보존합니다.",
    "모듈성은 사후 관측이며 목적함수가 아닙니다. 전체 분할의 한도 종료는 converged=false, 일부 미할당은 완료 결과 없이 오류입니다.",
  ],
  comparison: [
    {
      other: "Label Propagation",
      difference:
        "LPA는 이웃의 가중 표를 세지만 Fluid는 자신·이웃의 유체별1/크기 밀도를 더하고 K개를 유지합니다.",
    },
    {
      other: "Louvain",
      difference:
        "Fluid는 Q를 최적화하지 않으며 군집 수K를 사용자가 지정합니다.",
    },
  ],
  references: [
    {
      title:
        "Parés et al. (2017), Fluid Communities: A Competitive, Scalable and Diverse Community Detection Algorithm",
      url: "https://arxiv.org/pdf/1703.09307",
      note: "§3의 density·비동기 ego-rule·singleton 방어와 입력 도메인을 확인했습니다.",
    },
    {
      title: "NetworkX asyn_fluidc",
      url: "https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.asyn_fluid.asyn_fluidc.html",
      note: "NetworkX3.6.1과 K=1/K=n 분할을 비교하고 독립 NumPy ego-dot/전체 재계산으로 모든 실제 갱신을 검증합니다.",
    },
  ],
  preset: "tiny",
  events: ["initialize", "messages", "assign", "extract", "finish"],
  advanced: [
    "K는 보존하지만 전역 최적·유일 분할·정답 군집을 보장하지 않습니다. 미할당 초기 상태에 모듈성 점수를 적용하지 않습니다.",
  ],
  experimentParams: { k: 2, iterations: 100 },
  experimentDataset: {
    kind: "graph",
    directed: false,
    nodes: Array.from({ length: 6 }, (_, i) => ({ id: String(i) })),
    edges: [
      [0, 1],
      [1, 2],
      [0, 2],
      [3, 4],
      [4, 5],
      [3, 5],
      [2, 3],
    ].map(([a, b]) => ({ source: String(a), target: String(b), weight: 1 })),
  },
};
