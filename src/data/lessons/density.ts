import type { Lesson } from "./types";
export const dbscan: Lesson = {
  purpose:
    "구형 중심 하나로 설명할 수 없는 연결된 밀집 영역을 찾습니다. Ester 등의 DBSCAN은 군집 수 K 대신 국소 이웃 수로 밀도를 정의하고 희박한 점을 노이즈로 남깁니다.",
  analogy:
    "사람이 충분히 모인 장소에서만 다음 장소로 연결을 이어 갑니다. 사람이 적은 가장자리 장소도 군집에 붙지만, 그 장소를 발판으로 군집을 더 확장하지는 않습니다.",
  operations: [
    {
      title: "이웃 탐색",
      input: "방문하지 않은 점 p",
      calculation:
        "모든 좌표와 Euclidean 거리를 비교해 ε 이하인 점을 찾습니다. 자기 자신도 포함합니다.",
      output: "이웃 인덱스, radius; neighbors",
    },
    {
      title: "핵심점 판정",
      input: "Nε(p), MinPts",
      calculation:
        "개수가 MinPts 이상이면 core입니다. 아니면 아직 노이즈 후보로 둡니다.",
      output: "roles; core 및 assign",
    },
    {
      title: "군집 확장",
      input: "핵심점의 이웃 큐",
      calculation:
        "새 점을 방문하고 핵심점이면 그 이웃을 큐에 추가합니다. 이미 방문한 노이즈도 경계점으로 귀속될 수 있습니다.",
      output: "labels, roles; expand",
    },
    {
      title: "종료",
      input: "방문 집합",
      calculation:
        "아직 방문하지 않은 점에서 다시 시작하고 모두 방문하면 끝납니다.",
      output: "밀도 연결 성분과 남은 노이즈; finish",
    },
  ],
  equations: [
    {
      title: "ε 이웃과 핵심점",
      tex: String.raw`N_\varepsilon(p)=\{q:d(p,q)\leq\varepsilon\},\qquad p\text{ core}\iff |N_\varepsilon(p)|\geq m`,
      symbols:
        "d: Euclidean 거리, ε: 반경, m=MinPts: 자기 자신을 포함한 이웃 수 기준.",
      meaning:
        "반경이 고정되어 있을 때 많은 점이 들어갈수록 국소 밀도가 높다고 봅니다.",
      derivation: [
        "직접 밀도 도달가능: q∈Nε(p)이고 p가 핵심점일 때 q는 p에서 직접 도달 가능합니다. q가 비핵심이면 역방향은 성립하지 않을 수 있습니다.",
        "밀도 도달가능: p=p₁,…,pₗ=q인 사슬에서 매 다음 점이 이전 점에서 직접 도달 가능해야 합니다. 마지막 점을 제외한 발판은 모두 핵심점입니다.",
        "밀도 연결: 어떤 o에서 p와 q 모두 밀도 도달 가능하면 연결되었다고 합니다. 핵심점 연결 성분은 안정적이지만 두 성분에 닿는 경계점은 먼저 방문한 군집에 붙을 수 있습니다.",
      ],
    },
  ],
  numerical: {
    title: "핵심점과 경계점의 차이",
    steps: [
      "1D를 2D의 y=0에 놓습니다: x=0, 0.05, 0.10, 0.19, 0.8. ε=0.11, MinPts=3.",
      "이웃 수는 순서대로 3,3,4,2,1입니다. 앞 세 점은 core입니다. 0.19는 자기 자신과 0.10만 포함해 비핵심이지만 core 0.10에 연결되어 border입니다.",
      "0.8은 어떤 core에도 연결되지 않아 noise입니다. 경계점에서 반경 안에 다른 비핵심점이 있다는 이유만으로 그 점까지 확장하지 않습니다.",
    ],
  },
  parameters: [
    {
      key: "epsilon",
      effect:
        "크면 이웃과 연결이 늘어 다른 군집까지 합쳐질 수 있습니다. 작으면 군집이 끊기거나 노이즈가 많아집니다.",
      experiment: "두 개의 초승달에서 0.05→0.11→0.2로 올려 보세요.",
    },
    {
      key: "minPts",
      effect:
        "크면 core 조건이 엄격해져 잡음을 더 배제하지만 작은 집단을 잃습니다. 작으면 희박한 다리에도 연결됩니다.",
      experiment:
        "같은 ε에서 3과 8을 비교하고 표본 수를 바꿀 때도 함께 조정하세요.",
    },
  ],
  complexity: {
    theory:
      "효율적인 공간 인덱스와 적절한 저차원 분포에서는 평균 O(n log n)이 가능하지만 최악 O(n²).",
    implementation: "공간 인덱스 없는 전수 이웃 검색 O(n²).",
    space:
      "엔진 작업 상태 O(n); 큐와 집합 포함. Trace는 labels·roles 패치로 O(n²)까지 증가.",
    cost: "n이 클수록 모든 거리 비교가 늘며, 고차원에서는 거리 대비와 인덱스 효과도 약해집니다.",
  },
  implementation: [
    "앱은 2D Euclidean, 닫힌 반경 ≤ε, 자기 자신 포함 MinPts를 사용합니다. 입력 순서가 방문 순서입니다.",
    "노이즈 후보가 나중에 경계점으로 바뀔 수 있습니다. 중간 roles의 비핵심 판정만 보고 최종 노이즈를 단정하지 마세요.",
  ],
  comparison: [
    {
      other: "HDBSCAN",
      difference:
        "여러 밀도 수준의 계층과 안정도로 군집을 선택합니다. 전역 ε 한 개의 한계를 줄이지만 모든 밀도 문제를 해결하는 것은 아닙니다.",
    },
    {
      other: "OPTICS",
      difference:
        "결과 하나보다 밀도 탐색 순서와 reachability plot을 먼저 만듭니다.",
    },
  ],
  references: [
    {
      title: "Ester et al. (1996), DBSCAN",
      url: "https://cdn.aaai.org/KDD/1996/KDD96-037.pdf",
      note: "핵심·경계·밀도 도달과 연결 정의의 원문.",
    },
    {
      title: "scikit-learn · DBSCAN",
      url: "https://scikit-learn.org/stable/modules/clustering.html#dbscan",
      note: "경계점 순서 의존성과 파라미터 선택의 실용적 주의점.",
    },
  ],
  preset: "moons",
  events: ["neighbors", "core", "expand"],
  advanced: [
    "밀도가 다른 데이터에 단일 ε를 쓰면 희박한 군집을 찾기 전에 조밀한 두 집단이 연결될 수 있습니다.",
    "범주형 토큰을 좌표로 바꾼 뒤 Euclidean 거리로 해석하는 것은 이 앱의 DBSCAN 입력 모델이 아닙니다.",
  ],
};
export const hdbscan: Lesson = {
  purpose:
    "하나의 반경을 고르지 않고 밀도 수준을 변화시켜 지속되는 집단을 찾습니다. HDBSCAN*의 핵심은 DBSCAN을 여러 번 임의 실행하는 대신 거리 변환·MST·축약 계층·안정도 선택을 연결하는 것입니다.",
  analogy:
    "수위가 달라질 때 섬이 언제 생기고 얼마나 오래 유지되는지 기록합니다. 잠깐 보인 작은 조각보다 오랫동안 많은 점을 유지한 섬을 선택합니다.",
  operations: [
    {
      title: "밀도 보정 거리",
      input: "모든 점과 min_samples",
      calculation:
        "각 점의 core distance를 계산하고 두 core 거리와 원래 거리의 최대값으로 mutual reachability를 만듭니다.",
      output: "core, 거리 행렬; core → distance",
    },
    {
      title: "MST와 single linkage",
      input: "mutual reachability 완전 그래프",
      calculation:
        "Prim MST를 만들고 큰 가중치 연결부터 같은 높이를 함께 제거합니다. MST는 모든 threshold에서 연결 성분을 보존합니다.",
      output: "edges와 밀도 계층; mst",
    },
    {
      title: "Condensed tree",
      input: "연결 성분 분할, min_cluster_size",
      calculation:
        "작은 가지는 탈락으로 처리합니다. 큰 자식이 하나면 부모의 정체성을 유지하고, 둘 이상이면 새 가지로 태어납니다.",
      output: "tree와 점의 λ 탈락 시점; condense",
    },
    {
      title: "선택",
      input: "각 가지의 안정도",
      calculation:
        "EOM은 부모 안정도와 자식들의 선택 점수 합을 비교합니다. leaf는 최하위 가지를 택합니다. 루트는 제외합니다.",
      output: "선택 tree와 labels; stability → extract",
    },
  ],
  equations: [
    {
      title: "Core 및 mutual reachability",
      tex: String.raw`c_m(x)=d(x,x_{(m)}),\qquad d_{\rm mr}(a,b)=\max\{c_m(a),c_m(b),d(a,b)\}`,
      symbols:
        "x(m): 자기 자신을 포함해 m번째 가까운 점, m=min_samples, d: Euclidean 거리.",
      meaning:
        "희박한 점의 작은 우연한 연결을 core distance만큼 늘려 조밀한 구조가 우선 연결되도록 합니다.",
      derivation: [
        "a,b가 반경 ε에서 모두 core이고 서로 이웃이려면 c(a)≤ε, c(b)≤ε, d(a,b)≤ε가 동시에 필요합니다. 세 값의 최대가 ε 이하여야 한다는 조건과 같습니다.",
        "MST의 경로 위 최대 간선은 완전 그래프의 minimax 연결 높이를 보존합니다. 따라서 모든 쌍의 간선을 계층에 저장할 필요가 없습니다.",
      ],
    },
    {
      title: "안정도와 EOM",
      tex: String.raw`\lambda=1/\varepsilon,\qquad S(C)=\sum_{x\in C}\big(\lambda_{\rm exit}(x,C)-\lambda_{\rm birth}(C)\big)`,
      symbols:
        "λbirth: 가지 탄생 밀도, λexit: 점이 탈락하거나 자식 가지로 분리된 시점, S: 안정도.",
      meaning:
        "점 개수에 대한 밀도 지속시간의 합, 즉 λ 축에서 군집 크기 아래 면적입니다.",
      derivation: [
        "크기가 일정한 구간의 면적은 크기×λ 구간 길이입니다. 점별 지속시간을 합하는 식과 같은 값입니다.",
        "부모 선택과 그 자손 선택은 동시에 하지 않습니다. EOM은 부모의 S와 최적으로 선택한 자식 점수 합 중 큰 쪽을 고릅니다. leaf는 안정도 합 비교 대신 말단을 선택합니다.",
      ],
    },
  ],
  numerical: {
    title: "축약 가지의 안정도 손계산",
    steps: [
      "군집 C가 λ=2에서 4개 점으로 태어나고 min_cluster_size=3이라고 합시다.",
      "λ=3에서 한 점이 탈락하면 세 점의 가지는 같은 C로 계속됩니다. λ=5에서 나머지가 탈락하면 S=(3−2)+3(5−2)=10입니다.",
      "면적으로도 4×(3−2)+3×(5−3)=10입니다. 별도로 부모 S=10과 선택 가능한 두 자식 점수 합 6+7=13을 비교하면 EOM은 자식을 선택합니다.",
    ],
  },
  parameters: [
    {
      key: "minPts",
      effect:
        "크면 core 거리가 증가하고 희박한 연결에 보수적이 됩니다. 작으면 작은 국소 구조에 민감합니다.",
      experiment:
        "같은 minSize에서 3→8. min_samples는 표본 수 이하여야 합니다.",
    },
    {
      key: "minSize",
      effect:
        "크면 작은 가지를 축약해 작은 집단을 잃을 수 있습니다. 작으면 세부 가지가 늘어납니다.",
      experiment: "서로 다른 밀도의 군집에서 3과 10 비교.",
    },
    {
      key: "selection",
      effect:
        "eom은 크고 지속적인 부모를 선호할 수 있고 leaf는 더 세분된 말단을 고릅니다.",
      experiment: "같은 계층에서 eom과 leaf의 선택 tree를 비교하세요.",
    },
  ],
  complexity: {
    theory:
      "공간 인덱스·빠른 MST가 가능한 저차원 구현은 더 효율적일 수 있습니다. 밀집 그래프의 단순 MST는 O(n²).",
    implementation:
      "거리 정렬 O(n² log n), Prim O(n²). 교육용 축약의 반복 간선 탐색·includes는 보수적으로 최악 O(n⁴) 상한; 균형·희소 분할에서 더 작습니다.",
    space:
      "거리·mutual 행렬 O(n²), 계층 members O(n²). Trace는 이벤트마다 tree와 core를 보존해 추가 증가.",
    cost: "불균형한 계층과 큰 n이 재귀 분해 비용을 키웁니다. 라이브러리의 고성능 HDBSCAN 복잡도를 그대로 적용하면 안 됩니다.",
  },
  implementation: [
    "Euclidean, α=1, 루트 단일 군집 제외. core distance는 자기 자신을 포함합니다. 다른 라이브러리의 m 정의와 대조해야 합니다.",
    "중복 좌표의 무한 λ는 10¹² 상한입니다. 선택된 가지의 members를 hard label로 표시하고 확률 membership·outlier score는 계산하지 않습니다.",
  ],
  comparison: [
    {
      other: "DBSCAN",
      difference:
        "DBSCAN은 한 ε에서 확장합니다. HDBSCAN* 계층은 core 연결과 안정도를 사용하므로 경계점 규칙까지 동일한 결과를 약속하지 않습니다.",
    },
    {
      other: "OPTICS",
      difference:
        "HDBSCAN은 축약 트리 선택, OPTICS는 순서·reachability 및 ε/Xi 추출을 중심으로 합니다.",
    },
  ],
  references: [
    {
      title: "HDBSCAN 저자 구현 · How it works",
      url: "https://hdbscan.readthedocs.io/en/latest/how_hdbscan_works.html",
      note: "거리 변환, MST, 축약, 안정도와 선택 설명.",
    },
    {
      title: "Campello et al. (2013)",
      url: "https://doi.org/10.1007/978-3-642-37456-2_14",
      note: "밀도 기반 계층에서 군집을 추출하는 원논문.",
    },
  ],
  preset: "density",
  events: ["core", "mst", "condense", "stability", "extract"],
  advanced: [
    "밀도와 의미적 정답은 다릅니다. 매우 많은 노이즈나 서로 닿는 밀도 봉우리는 계층 선택만으로 해결되지 않습니다.",
    "앱의 10¹² 상한은 중복점에서 안정도 크기와 선택에 영향을 줄 수 있는 수치 규칙입니다.",
  ],
};
export const optics: Lesson = {
  purpose:
    "여러 밀도의 군집을 한 번의 탐색 순서에 담기 위해 Ankerst 등이 제안한 방법입니다. 점의 순서와 도달 거리 곡선을 보존한 다음 원하는 수준에서 군집을 추출합니다.",
  analogy:
    "밀집 지역 내부를 먼저 걷되 지금까지 발견한 가장 쉬운 연결을 다음 발걸음으로 고릅니다. 걸음의 순서를 가로축, 연결 난도를 세로축으로 그리면 밀집 집단이 낮은 골짜기가 됩니다.",
  operations: [
    {
      title: "Core 거리",
      input: "max_eps, min_samples",
      calculation:
        "max_eps 이웃 중 m번째 거리를 구합니다. 이웃 수가 모자라면 ∞입니다.",
      output: "core 배열; core",
    },
    {
      title: "우선 방문",
      input: "미방문 후보와 reachability",
      calculation:
        "최소 도달 거리 후보를 방문합니다. core이면 이웃 q에 max(core(p),d(p,q))를 제안합니다.",
      output: "order, reach, 내부 predecessor; visit → distance",
    },
    {
      title: "추출",
      input: "완료된 ordering",
      calculation:
        "ε-cut은 도달 거리와 core 거리로 경계를 정합니다. Xi는 상대적인 steep-down/up 구간과 predecessor 보정을 사용합니다.",
      output: "labels; extract",
    },
    {
      title: "종료",
      input: "모든 점의 순서·추출 labels",
      calculation: "각 연결 성분의 시작은 도달할 선행점이 없어 ∞로 남습니다.",
      output: "Reachability Plot과 최종 labels; finish",
    },
  ],
  equations: [
    {
      title: "방향성 도달 거리",
      tex: String.raw`\operatorname{reach}(q\leftarrow p)=\max\{\operatorname{core}(p),d(p,q)\}`,
      symbols:
        "p: 처리된 core 점, q: 미처리 이웃. reach(q)는 지금까지 제안받은 값의 최소.",
      meaning: "p가 core가 될 반경과 q까지 도달할 반경을 모두 만족해야 합니다.",
      derivation: [
        "후보 p가 바뀌면 더 작은 값으로 갱신하고 그 p를 predecessor로 저장합니다. core(q)를 최대값에 넣는 HDBSCAN mutual reachability와 다릅니다.",
        "Xi의 steep-up은 rᵢ/rᵢ₊₁≤1−ξ 같은 상대 증가 기준을 씁니다. 단순히 낮은 막대를 모두 같은 색으로 만드는 ε-cut과 다른 추출 규칙입니다.",
      ],
    },
  ],
  numerical: {
    title: "도달 거리 갱신과 골짜기",
    steps: [
      "core(p)=0.10, d(p,q)=0.08이면 후보 reach(q)=0.10입니다. 다른 방문점 s에서 core(s)=0.05, d(s,q)=0.06이면 0.06으로 개선됩니다.",
      "순서의 도달 거리 [∞, 0.08, 0.07, 0.45, 0.06, 0.05]는 두 개의 낮은 영역과 그 사이 높은 진입 장벽을 보입니다. 이것만으로 정답 군집 수가 자동 확정되지는 않습니다.",
      "ε-cut=0.1에서 r=0.45인 점의 core가 0.06이면 새 군집 시작이고, core도 0.1보다 크면 노이즈입니다. r만으로 판정할 수 없습니다.",
    ],
  },
  parameters: [
    {
      key: "epsilon",
      effect:
        "max_eps를 크게 하면 더 먼 연결까지 기록하지만 이웃 갱신량이 늘어납니다. 작으면 먼 밀도 구조가 분리됩니다.",
      experiment: "두 개의 초승달에서 0.2와 0.8 비교.",
    },
    {
      key: "minPts",
      effect:
        "core의 순위입니다. 크면 잡음에 보수적이고 작은 군집을 놓칠 수 있습니다.",
      experiment: "3과 8의 plot 높이를 비교하세요.",
    },
    {
      key: "threshold",
      effect:
        "ε-cut은 max_eps 이내에서 해석해야 합니다. 크게 하면 골짜기가 합쳐지고 작으면 노이즈가 증가합니다.",
      experiment: "extraction=epsilon에서 0.05→0.15.",
    },
    {
      key: "xi",
      effect:
        "큰 ξ는 더 가파른 상대 변화를 요구하고 작은 ξ는 작은 요철에도 민감합니다.",
      experiment: "extraction=xi에서 minSize도 함께 비교하세요.",
    },
    {
      key: "minSize",
      effect:
        "Xi 추출 구간의 최소 점 수입니다. 커지면 짧은 골짜기가 탈락합니다.",
      experiment: "epsilon 추출에서는 쓰이지 않습니다.",
    },
    {
      key: "extraction",
      effect: "epsilon과 xi는 다른 기준으로 같은 순서를 해석합니다.",
      experiment: "같은 max_eps·minPts에서 두 추출 결과를 비교하세요.",
    },
  ],
  complexity: {
    theory:
      "공간 인덱스와 적절한 우선순위 큐를 쓴 저차원 평균 O(n log n), 최악 O(n²).",
    implementation:
      "core 정렬 O(n² log n). 매번 Set을 정렬하는 후보 선택도 합쳐 O(n² log n) 상한. heap 미사용.",
    space:
      "작업 배열·후보 O(n). Xi 구간 저장은 최악 O(n²). Trace는 O(n²) 이벤트에 reach 배열을 복사해 O(n³) 상한.",
    cost: "큰 max_eps·n에서 후보 갱신과 정밀 이벤트가 많습니다.",
  },
  implementation: [
    "Euclidean, 자기 자신 포함 min_samples. predecessor는 Xi 함수에 전달되며 별도의 UI 표로 노출하지 않습니다.",
    "Plot의 ∞는 그래프 위쪽으로 표시합니다. 이는 유한한 큰 거리 측정값이 아니라 도달 경로가 없는 시작점입니다.",
  ],
  comparison: [
    {
      other: "DBSCAN",
      difference:
        "ε-cut은 DBSCAN과 유사한 밀도 해석이지만 경계점 귀속은 방문 순서와 추출 규칙에 따라 달라질 수 있습니다.",
    },
    {
      other: "HDBSCAN",
      difference:
        "MST 안정도 선택 대신 ordering을 유지합니다. 낮은 골짜기 안에도 더 작은 골짜기가 들어갈 수 있습니다.",
    },
  ],
  references: [
    {
      title: "Ankerst et al. (1999), OPTICS",
      url: "https://doi.org/10.1145/304182.304187",
      note: "Ordering과 reachability plot의 원논문.",
    },
    {
      title: "scikit-learn · OPTICS",
      url: "https://scikit-learn.org/stable/modules/clustering.html#optics",
      note: "ε와 Xi 추출, 파라미터와 구현 비용의 차이.",
    },
  ],
  preset: "density",
  events: ["core", "visit", "distance", "extract"],
  advanced: [
    "수평축은 원래 x좌표가 아닌 처리 순서입니다. 막대 하나가 관측점 하나이며 높이는 그 점의 도달 거리입니다.",
    "Xi는 단일 점의 높이가 아닌 가파른 구간과 최소 크기를 해석합니다. 모든 눈에 띄는 골짜기가 선택 군집이 되지는 않습니다.",
  ],
};
