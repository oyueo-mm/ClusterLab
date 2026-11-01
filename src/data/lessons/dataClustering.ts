import type { Lesson } from "./types";

export const kmodes: Lesson = {
  purpose:
    "실제 범주형 문자열의 불일치 개수를 최소화하도록 군집 최빈값 벡터를 학습합니다. 범주를 순서 있는 수로 인코딩하지 않습니다.",
  analogy:
    "취향 설문에서 각 문항의 가장 흔한 답을 대표 답안으로 고르고, 대표와 다른 답의 개수로 사람들을 배정합니다.",
  operations: [
    {
      title: "실제 범주 초기화",
      input: "범주 원본, K, seed",
      calculation:
        "서로 다른 관측 행을 시드로 선택해 초기 최빈값 벡터를 만듭니다. 숫자 좌표를 범주로 추정하지 않습니다.",
      output: "initialize: 실제 범주 벡터",
    },
    {
      title: "범주 불일치 할당",
      input: "범주 행과 최빈값 벡터",
      calculation:
        "모든 범주 열에서 값이 다른 개수를 합해 최소 군집을 선택합니다. 동률이면 이전 할당을 유지합니다.",
      output: "assign: 전체 원본 레이블",
    },
    {
      title: "실제 빈도와 최빈값",
      input: "현재 군집과 범주 값",
      calculation:
        "군집·속성별 빈도를 세고 최빈값을 선택합니다. 같은 빈도면 이전 최빈값, 그마저 없으면 문자열 순서를 사용합니다.",
      output: "prototype: 빈도표·최빈값·목적함수",
    },
    {
      title: "안정 판정과 최종 평가",
      input: "새 레이블과 이전 레이블",
      calculation:
        "할당이 같아지거나 반복 한도에 도달하면 반환 벡터로 전체 최근접 할당과 실제 비용을 다시 계산합니다.",
      output: "finish: 실제 비용·수렴 여부",
    },
  ],
  equations: [
    {
      title: "단순 일치 비용",
      tex: String.raw`d(x_i,q_c)=\sum_{j=1}^{p}\mathbf1[x_{ij}\ne q_{cj}],\qquad J=\sum_i d(x_i,q_{z_i})`,
      symbols: "x_ij: 관측 i의 범주 속성 j, q_cj: 군집 c의 최빈값, z_i: 할당.",
      meaning:
        "문자열 값의 크기·정렬 순서가 아니라 같은지 다른지만 계산합니다.",
      derivation: [
        "고정된 최빈값에서 각 관측의 최소 불일치 군집을 선택하면 비용이 증가하지 않습니다.",
        "속성 j에서 값 v를 대표로 선택한 비용은 군집 크기 N_c에서 빈도 f_cj(v)를 뺀 값입니다. 따라서 가장 빈번한 값이 최적입니다.",
      ],
    },
    {
      title: "최빈값 갱신",
      tex: String.raw`q_{cj}\in\arg\max_v f_{cj}(v),\qquad J_{cj}=N_c-\max_v f_{cj}(v)`,
      symbols: "f_cj(v): 군집 c, 속성 j에서 실제 범주 v의 등장 횟수.",
      meaning:
        "각 군집·속성의 최빈값은 고정된 할당에서 정확한 비용 최소화입니다.",
      derivation: [
        "군집·속성 비용을 서로 독립적으로 최소화할 수 있습니다.",
        "할당과 최빈값 갱신을 번갈아 수행하지만 전역 최적해는 보장하지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "세 범주형 행의 한 군집",
    steps: [
      "(빨강,원), (빨강,네모), (파랑,네모)에서 최빈값은 (빨강,네모)입니다.",
      "세 행의 불일치 비용은 각각 1,0,1이므로 J=2입니다.",
      "화면 좌표를 모두 바꿔도 두 범주 열과 목적함수는 변하지 않습니다. 독립 fixture는 3개 범주 열의 K=2 분할 비용 1도 검산합니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "최대 초기 최빈값 벡터 수입니다. 서로 다른 관측 범주 패턴이 더 적으면 그 수로 줄어듭니다.",
      experiment: "같은 원본에서 K=1,2,3의 실제 비용과 벡터를 비교하세요.",
    },
    {
      key: "iterations",
      effect: "전체 batch 할당·최빈값 갱신의 최대 반복 수입니다.",
      experiment: "1회 종료와 안정 종료의 converged 표시를 비교하세요.",
    },
  ],
  complexity: {
    theory: "n개 행, p개 범주 열, K개 최빈값, T반복이면 O(TnKp).",
    implementation:
      "배치 전체 할당 후 빈도 기반 최빈값 갱신입니다. 초기화는 시드로 관측 패턴을 선택합니다.",
    space: "O(np+Kp+범주 빈도 수), Trace는 별도 바이트 예산.",
    cost: "고유 문자열/범주가 많으면 빈도표와 상세 Trace가 커집니다. 새 점 수 전역 상한은 없습니다.",
  },
  implementation: [
    "Huang의 범주 불일치/최빈값 목적을 batch 교대로 최적화합니다. klaR fast 모드와 같은 batch 구조이며 특정 원저자 초기화와 동일한 결과를 보장하지 않습니다.",
    "빈 군집은 이전 최빈값을 유지합니다. 한도 종료 시 마지막 할당은 반환 벡터의 최근접 결과지만 최빈값·할당 고정점 수렴은 미확인일 수 있습니다.",
    "Canvas 중심은 표시 좌표의 평균일 뿐 범주형 중심이 아닙니다. 실제 프로토타입은 분석 표와 결과 JSON의 문자열 벡터입니다.",
  ],
  comparison: [
    {
      other: "K-Means",
      difference:
        "K-Means의 수치 평균과 제곱거리 대신 범주 최빈값과 불일치 개수를 사용합니다.",
    },
    {
      other: "K-Prototypes",
      difference:
        "K-Prototypes는 수치형 평균과 범주형 최빈값의 결합 목적을 사용합니다.",
    },
  ],
  references: [
    {
      title:
        "Huang (1998), Extensions to the k-Means Algorithm for Clustering Large Data Sets with Categorical Values",
      url: "https://link.springer.com/article/10.1023/A:1009769707641",
      note: "서지·초록 확인. 본문은 구독 제한이며 완독으로 처리하지 않습니다.",
    },
    {
      title: "klaR 공식 kmodes 문서",
      url: "https://uligges.r-universe.dev/klaR/doc/manual.html",
      note: "단순 불일치·관측 행 초기화·fast batch 갱신을 확인했습니다. 제품 코드 복사 없음.",
    },
  ],
  preset: "categorical",
  events: ["assign", "prototype"],
  advanced: [
    "범주 이름을 다른 문자열로 바꿔도 불일치 관계는 같지만 초기 정렬/동률 정책에 따라 동등한 지역해가 달라질 수 있습니다.",
  ],
};

export const kprototypes: Lesson = {
  purpose:
    "원본의 모든 수치 열과 범주 열을 함께 사용해 실제 평균·최빈값 프로토타입을 학습합니다. 두 데이터 형식을 화면 좌표와 분리합니다.",
  analogy:
    "나이·소비액 차이는 수치로, 선호 상품군 차이는 불일치 횟수로 따로 계산한 뒤 가중치를 정해 합칩니다.",
  operations: [
    {
      title: "혼합 원본 초기화",
      input: "numeric 행렬, categorical 행렬, K, seed",
      calculation:
        "동일 행 수의 실제 수치·문자열 원본을 검증하고 서로 다른 혼합 관측 행을 초기 프로토타입으로 고릅니다.",
      output: "initialize: 분리된 평균·최빈값 벡터",
    },
    {
      title: "혼합 비용 할당",
      input: "현재 프로토타입, 범주 가중치 γ",
      calculation:
        "모든 수치 열의 제곱거리와 γ배 범주 불일치 개수를 합해 전체 관측을 최소 비용 군집에 배정합니다.",
      output: "assign: 전체 혼합 레이블",
    },
    {
      title: "두 종류의 중심 갱신",
      input: "현재 군집 구성원",
      calculation:
        "수치 열은 실제 산술평균, 범주 열은 실제 최빈값으로 갱신합니다. 범주 빈도도 함께 기록합니다.",
      output: "prototype: 실제 원본 프로토타입·비용",
    },
    {
      title: "수렴과 최종 원본 평가",
      input: "할당 변화·반복 한도",
      calculation:
        "할당이 안정되면 종료하며 한도 종료도 구분합니다. 최종 할당·목적함수는 전체 원본으로 다시 평가합니다.",
      output: "finish: 전체 결과와 안정 여부",
    },
  ],
  equations: [
    {
      title: "원본 혼합 목적함수",
      tex: String.raw`J=\sum_i\left[\sum_{j=1}^{q}(x_{ij}-\mu_{z_i j})^2+\gamma\sum_{j=1}^{p}\mathbf1[a_{ij}\ne m_{z_i j}]\right]`,
      symbols:
        "x: 수치 원본, a: 범주 원본, μ: 수치 평균, m: 범주 최빈값, γ≥0: 범주 불일치 가중치.",
      meaning:
        "수치 스케일과 범주의 영향이 γ로 연결되지만 두 종류의 계산은 섞이지 않습니다.",
      derivation: [
        "고정된 할당에서는 수치 제곱거리와 범주 불일치 항을 따로 최소화할 수 있습니다.",
        "수치 제곱거리 미분을 0으로 두면 평균, 범주 빈도 항을 최소화하면 최빈값입니다.",
      ],
    },
    {
      title: "원본 차원별 수치 평균",
      tex: String.raw`\mu_{cj}=\frac{1}{N_c}\sum_{i:z_i=c}x_{ij},\qquad m_{cj}\in\arg\max_v f_{cj}(v)`,
      symbols: "N_c: 실제 군집 구성원 수, j: 각 원본 열 인덱스.",
      meaning: "표시가 2D여도 갱신은 모든 원본 수치·범주 열에서 수행됩니다.",
      derivation: [
        "각 원본 열에 대해 정확한 고정 할당 최적값을 구합니다.",
        "batch 할당·프로토타입 갱신은 비용 비증가이지만 초기화에 따른 지역해와 한도 종료가 남습니다.",
      ],
    },
  ],
  numerical: {
    title: "수치 0,2,10,12와 범주 A,A,B,B",
    steps: [
      "K=2에서 프로토타입 (1,A), (11,B)를 선택합니다.",
      "각 관측의 수치 제곱거리는 1이며 같은 범주라 불일치 항은 0입니다. 전체 J=4입니다.",
      "범주를 섞은 분할은 추가 γ 비용이 생깁니다. γ=0이면 수치만 할당에 영향을 주며 범주 최빈값은 관찰용으로 계산됩니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect: "최대 혼합 프로토타입 수입니다.",
      experiment: "K와 실제 평균·최빈값을 함께 비교하세요.",
    },
    {
      key: "gamma",
      effect:
        "범주 불일치의 가중치입니다. 수치형 스케일을 바꾸면 상대 영향도 바뀝니다.",
      experiment: "0,1,10에서 할당·혼합 비용의 변화를 비교하세요.",
    },
    {
      key: "iterations",
      effect: "최대 batch 반복 수이며 조기 종료 수렴 여부를 별도 표시합니다.",
      experiment: "반복 한도 1과 20을 비교하세요.",
    },
  ],
  complexity: {
    theory: "수치 q·범주 p 열에서 O(TnK(q+p)).",
    implementation:
      "각 batch 전체 할당 뒤 수치 평균과 범주 빈도를 따로 갱신합니다.",
    space: "O(n(q+p)+K(q+p)+범주 빈도 수), 상세 Trace 별도.",
    cost: "큰 수치 스케일은 제곱거리 overflow를 일으킬 수 있어 명시적 수치 오류를 반환합니다.",
  },
  implementation: [
    "사용자 지정 단일 γ를 사용합니다. 자동 표준화·자동 γ 선택·결측값 대체·변수별 가중치는 아직 없습니다.",
    "원래 Huang 본문은 접근 제한이 있어, 공식 clustMixType 구현 논문의 제곱 수치/불일치 정의와 독립 NumPy 검산으로 확인했습니다.",
    "Canvas 평균은 표시 좌표의 요약입니다. 실제 수치·범주 프로토타입은 별도 분석 표/JSON에서 확인합니다.",
  ],
  comparison: [
    {
      other: "K-Modes",
      difference: "K-Modes는 범주 원본만 사용하며 수치 제곱거리 항이 없습니다.",
    },
    {
      other: "K-Means",
      difference:
        "K-Means에 범주를 임의 수치 인코딩하면 이 목적함수와 다릅니다.",
    },
  ],
  references: [
    {
      title: "Huang (1998), mixed-type extension",
      url: "https://link.springer.com/article/10.1023/A:1009769707641",
      note: "서지·초록 확인, 본문 구독 제한.",
    },
    {
      title: "Szepannek (2018), clustMixType",
      url: "https://journal.r-project.org/articles/RJ-2018-048/",
      note: "공식 구현 저자의 원문 수식: 수치 제곱거리·범주 불일치 가중합과 평균/최빈값 확인.",
    },
  ],
  preset: "categorical",
  events: ["assign", "prototype"],
  advanced: [
    "γ가 크면 범주가 우세해지고 작으면 수치가 우세합니다. 값의 단위와 비교 목적에 따라 명시적으로 정해야 합니다.",
  ],
};

export const clique: Lesson = {
  purpose:
    "고차원 원본의 서로 다른 부분공간에서 밀집 격자를 찾고, 면으로 연결된 격자를 실제 부분공간 군집으로 반환합니다. 한 관측은 여러 부분공간 군집에 속할 수 있습니다.",
  analogy:
    "전체 건물 도면 한 장만 보는 대신 서로 다른 층·방향의 단면을 조사하고, 사람이 많이 모인 인접 칸을 연결합니다.",
  operations: [
    {
      title: "모든 원본 축의 격자",
      input: "ND 원본, 구간 수 ξ",
      calculation:
        "각 원본 축의 관측 범위를 ξ개 같은 길이 구간으로 나눕니다. 최댓값은 마지막 칸에 포함하고 상수 축은 한 칸을 사용합니다.",
      output: "initialize: 원본 범위·격자 좌표",
    },
    {
      title: "Apriori 후보와 실제 계수",
      input: "이전 차원의 밀집 격자",
      calculation:
        "모든 투영이 밀집인 후보만 만들고 전체 원본을 다시 세어 count/n>τ인 칸을 유지합니다.",
      output: "grid: 차원별 실제 후보·밀집 unit",
    },
    {
      title: "부분공간 연결 성분",
      input: "동일 부분공간의 밀집 칸",
      calculation:
        "면을 공유하는 칸만 연결해 군집을 찾습니다. 대각선 접촉은 연결이 아닙니다.",
      output: "dimension: 실제 부분공간별 군집",
    },
    {
      title: "DNF cover와 전체 소속",
      input: "군집의 실제 격자 셀",
      calculation:
        "군집 안에서만 최대 직사각형을 성장시키고 중복 영역을 제거합니다. 모든 부분공간 소속을 보존합니다.",
      output: "finish: units·subspaces·regions·memberships",
    },
  ],
  equations: [
    {
      title: "밀집 격자",
      tex: String.raw`\operatorname{selectivity}(u)=\frac{|\{i:x_i\in u\}|}{n},\qquad u\text{ dense}\iff\operatorname{selectivity}(u)>\tau`,
      symbols: "u: 선택 원본 축의 격자, n: 전체 입력 행 수, τ: 밀도 비율.",
      meaning: "표본 수가 아니라 전체 원본의 비율로 밀집 여부를 결정합니다.",
      derivation: [
        "고차원 칸을 투영하면 포함 관측 수가 줄어들지 않습니다.",
        "따라서 밀집 고차원 칸의 모든 낮은 차원 투영은 밀집입니다. 이 단조성으로 불가능한 후보를 안전하게 제거합니다.",
      ],
    },
    {
      title: "부분공간별 DNF",
      tex: String.raw`C=\bigcup_{r\in\mathcal R}\left(\bigcap_{j\in D}[l_{rj},h_{rj})\right)`,
      symbols:
        "D: 원본 선택 축 집합, R: 최대 직사각형 cover. 관측 최댓값을 포함하는 마지막 구간은 닫힌 끝점을 사용합니다.",
      meaning:
        "군집 내부의 실제 격자만 덮는 직사각형 합으로 결과를 설명합니다.",
      derivation: [
        "단순한 전체 bounding box는 빈 칸을 포함할 수 있어 군집과 같지 않습니다.",
        "성장한 최대 영역의 중복을 제거해 비중복 cover를 반환합니다. 전역 최소 개수 직사각형 문제를 푼다는 뜻은 아닙니다.",
      ],
    },
  ],
  numerical: {
    title: "2×2 격자의 세 점",
    steps: [
      "점이 (0,0),(0,1),(1,0) 칸에 있고 τ<1/3이면 세 칸이 밀집입니다.",
      "면으로 연결돼 하나의 2D 군집이지만 (1,1)은 비어 있습니다.",
      "L자 군집의 DNF는 가로/세로 최대 직사각형 두 개로 설명할 수 있습니다. 전체 2×2 사각형 하나로 바꾸면 빈 칸을 군집에 잘못 포함합니다.",
    ],
  },
  parameters: [
    {
      key: "gridBins",
      effect: "원본 축마다 나누는 같은 길이 구간 수입니다.",
      experiment: "3과 8에서 실제 밀집 칸/군집이 어떻게 달라지는지 보세요.",
    },
    {
      key: "densityThreshold",
      effect: "전체 행 대비 밀집 비율이며 엄격한 > 조건을 사용합니다.",
      experiment: "count/n와 같은 값을 넣으면 해당 칸이 제외되는지 확인하세요.",
    },
    {
      key: "subspaceDimensions",
      effect:
        "탐색할 최대 부분공간 차원입니다. 모든 원본 축의 조합을 해당 차원까지 탐색합니다.",
      experiment: "최대 1과 2에서 중첩 소속과 DNF를 비교하세요.",
    },
  ],
  complexity: {
    theory:
      "조합 후보 수는 최대 밀집 부분공간 차원에 지수적으로 커질 수 있습니다.",
    implementation:
      "unpruned Apriori의 실제 후보 계수·격자 hash와 면 연결 성분을 계산합니다. 요청 최대 차원은 명시적 탐색 범위입니다.",
    space:
      "원본 격자 O(nd), 실제 후보·부분공간 소속·DNF에 비례. 바이트 예산을 넘으면 명시적 실패.",
    cost: "선택 차원을 늘리면 후보/Trace가 폭증할 수 있습니다. 원문 선택적 MDL pruning은 미구현입니다.",
  },
  implementation: [
    "원문 dense-unit/Apriori/연결 성분/최대 영역 성장·중복 제거를 구현합니다. MDL 가지치기를 쓰지 않는 명시적 변형입니다.",
    "결측값·사용자 지정 도메인 경계는 아직 지원하지 않습니다. 경계는 관측 min/max를 사용하며 최댓값 포함 정책을 밝힙니다.",
    "전체 실제 결과는 memberships/subspaces입니다. Canvas의 가장 높은 차원 첫 소속 label은 표시 전용 요약이며 전체 중첩 결과와 동일하지 않습니다.",
  ],
  comparison: [
    {
      other: "DBSCAN",
      difference:
        "단일 전체 거리 공간 대신 서로 다른 축 부분공간의 밀집 격자를 찾습니다.",
    },
    {
      other: "PROCLUS",
      difference:
        "PROCLUS는 medoid별 선택 축과 한 최종 할당을 학습하며, CLIQUE는 여러 부분공간의 중첩 군집을 반환합니다.",
    },
  ],
  references: [
    {
      title: "Agrawal et al. (1998), Automatic Subspace Clustering",
      url: "https://www2.cs.sfu.ca/CourseCentral/459/han/papers/agrawal98.pdf",
      note: "원문 §2–3: strict selectivity, projection 단조성, face 연결, DNF 성장/제거 확인.",
    },
    {
      title: "PyClustering CLIQUE 공식 API·소스 문서",
      url: "https://github.com/annoviko/pyclustering/blob/master/pyclustering/cluster/clique.py",
      note: "격자 구간과 밀도 임계값의 구현 계약 참고. 해당 API의 개수 임계값과 본 플랫폼의 비율 τ를 구분하며 전체 부분공간/DNF 결과 동등성을 주장하지 않습니다.",
    },
  ],
  preset: "blobs",
  events: ["grid", "dimension"],
  advanced: [
    "CLIQUE와 그래프 clique percolation은 다른 알고리즘입니다. 원본 축별 격자와 그래프의 완전 부분그래프를 혼동하지 않습니다.",
  ],
  experimentParams: {
    gridBins: 4,
    densityThreshold: 0.1,
    subspaceDimensions: 2,
  },
};

export const proclus: Lesson = {
  purpose:
    "실제 고차원 관측 medoid와 군집별 선택 축을 함께 탐색하고, 전체 입력의 segmental 거리로 할당한 뒤 차원을 정제하는 projected clustering입니다.",
  analogy:
    "각 관심 그룹마다 다른 설문 문항이 유용할 수 있으므로 대표 사람과 그 그룹에 중요한 문항을 함께 고릅니다.",
  operations: [
    {
      title: "표본과 greedy medoid 후보",
      input: "ND 원본, K, 표본/후보 배수, seed",
      calculation:
        "관측점 표본 S를 만들고 farthest-first 후보 M을 구성한 후 실제 K개 medoid를 선택합니다.",
      output: "initialize: 실제 표본·후보·medoid",
    },
    {
      title: "전체 원본 locality와 차원",
      input: "현재 medoid",
      calculation:
        "각 medoid의 최근접 다른 medoid 거리 안에 있는 전체 관측을 모아 차원 평균 편차·Z를 구합니다. 군집당 최소 2축, 전체 Kℓ축을 선택합니다.",
      output: "dimension: locality·Z·선택 원본 축",
    },
    {
      title: "실제 전체 할당과 후보 교환",
      input: "군집별 선택 축",
      calculation:
        "모든 원본을 Manhattan segmental 거리로 할당하고 실제 centroid 품질을 평가합니다. 최선 해의 작은 군집 medoid를 후보에서 교환합니다.",
      output: "assign: 실제 전체 비용과 수용 여부",
    },
    {
      title: "군집 기반 재차원화·outlier",
      input: "탐색의 최선 군집",
      calculation:
        "locality 대신 실제 군집 구성원으로 차원을 다시 고릅니다. 전체 최근접 할당 뒤 모든 medoid influence 범위를 벗어난 점을 outlier로 표시합니다.",
      output: "refine → finish: 실제 선택 축·전체 결과",
    },
  ],
  equations: [
    {
      title: "선택 축의 segmental 거리",
      tex: String.raw`d_{D_c}(x,m_c)=\frac{1}{|D_c|}\sum_{j\in D_c}|x_j-m_{cj}|,\qquad\sum_c|D_c|=K\ell,\quad|D_c|\ge2`,
      symbols:
        "m_c: 실제 관측 medoid, D_c: 군집 c의 원본 축 집합, ℓ: 평균 선택 차원 수.",
      meaning: "선택 축 수가 다른 군집끼리도 평균 절대거리로 비교합니다.",
      derivation: [
        "각 medoid의 locality에서 평균 절대 편차 X_cj를 구하고 그 행 평균·표준편차로 Z_cj를 표준화합니다.",
        "군집별 최소 두 Z값을 먼저 선택하고 남은 K(ℓ−2)개를 전체에서 작은 순서로 선택합니다. 0표준편차는 동일한 Z=0으로 처리합니다.",
      ],
    },
    {
      title: "전체 후보 품질과 influence",
      tex: String.raw`Q=\frac1n\sum_i d_{D_{z_i}}(x_i,\bar x_{z_i}),\qquad\Delta_c=\min_{b\ne c}d_{D_c}(m_c,m_b)`,
      symbols:
        "할당은 medoid, 후보 품질 Q는 실제 군집 centroid로 계산합니다. Δ_c: 선택 축의 influence 반경.",
      meaning: "medoid와 centroid는 서로 다른 계산 대상입니다.",
      derivation: [
        "표본은 탐색 후보만 제한하고 Q와 할당은 전체 원본으로 계산합니다.",
        "모든 c에 대해 d_Dc(x,m_c)>Δ_c이면 outlier입니다. 마지막 전체 비용과 제외 후 비용을 구분해 반환합니다.",
      ],
    },
  ],
  numerical: {
    title: "선택 축 [1,2]에서 (1,5,100)과 (3,1,−500)",
    steps: [
      "선택한 첫 두 원본 축의 절대 차이는 2와 4이므로 segmental 거리는 (2+4)/2=3입니다.",
      "세 번째 축을 선택하지 않았으므로 600의 차이는 이 군집 거리에는 포함하지 않습니다. 다른 군집은 세 번째 축을 선택할 수 있습니다.",
      "K=2, ℓ=3이면 전체 선택 축 개수는 6이지만 반드시 각 군집이 정확히 3축일 필요는 없습니다. 각 군집 최소 2축 제약을 지킵니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "최대 초기 medoid 수이며 서로 다른 원본 위치보다 많으면 줄어듭니다.",
      experiment: "K=2와 3의 실제 medoid 행/선택 축을 비교하세요.",
    },
    {
      key: "subspaceDimensions",
      effect: "평균 선택 차원 ℓ이며 2 이상 원본 차원 이하여야 합니다.",
      experiment: "4D 원본에서 ℓ=2와 3의 Z 선택을 비교하세요.",
    },
    {
      key: "samplingFactor",
      effect:
        "실제 관측 표본 크기 A×K입니다. 전체 평가는 표본으로 바꾸지 않습니다.",
      experiment: "표본·greedy 후보 표에서 원본 인덱스를 확인하세요.",
    },
    {
      key: "medoidFactor",
      effect: "greedy 후보 수 B×K이며 실제 표본 크기로 제한됩니다.",
      experiment: "B를 줄여 탐색 후보와 전체 비용의 관계를 확인하세요.",
    },
    {
      key: "iterations",
      effect:
        "연속 미개선 제안의 종료 한도입니다. 개선되면 카운터가 초기화되므로 전체 제안 수가 더 클 수 있습니다.",
      experiment: "같은 시드에서 한도 3과 20을 비교하세요.",
    },
  ],
  complexity: {
    theory:
      "실제 제안 P와 원본 d, K에 대해 locality/할당/평가 O(PnKd), 초기 greedy O(ABK²d), 차원 정렬 O(PKd log(Kd)).",
    implementation:
      "희소 멤버 인덱스 locality와 원본 전체 평가를 사용하며 n² 거리 행렬을 만들지 않습니다.",
    space: "O(nd+nK+Kd+AK), 상세 Trace 별도 예산.",
    cost: "높은 차원·많은 medoid·제안 수에 민감하며 샘플 탐색은 전역 최적을 보장하지 않습니다.",
  },
  implementation: [
    "원문의 실제 세 단계와 전체 평가를 구현합니다. 종료는 사용자 지정 연속 미개선 한도, 작은 군집 기준은 원문 예시 0.1×n/K입니다.",
    "동일 medoid 위치는 초기 중복 제거하며 locality의 0표준편차는 동률 축 인덱스 순서로 결정합니다. d≥2를 요구하고 자동 표준화는 하지 않습니다.",
    "최종 objective는 outlier 태그 전 전체 최근접 할당 품질입니다. retainedCost는 outlier 제외 후 centroid 비용을 전체 n으로 나눈 별도 값입니다. 한 군집일 때 influence는 무한이며 화면 표기만 ∞로 처리합니다.",
  ],
  comparison: [
    {
      other: "CLIQUE",
      difference:
        "CLIQUE는 격자의 여러 부분공간 중첩 군집을 찾고, PROCLUS는 medoid별 선택 축과 최종 할당을 탐색합니다.",
    },
    {
      other: "PAM",
      difference:
        "PAM은 같은 전체 거리로 medoid를 비교하지만 PROCLUS는 군집별 차원 학습·정제와 centroid 품질 평가를 수행합니다.",
    },
  ],
  references: [
    {
      title: "Aggarwal et al. (1999), Fast Algorithms for Projected Clustering",
      url: "https://sigmodrecord.org/?download_id=6956&smd_process_download=1",
      note: "원문 §2, Figures2–6의 표본/greedy/locality/Z/전체 품질/정제/outlier 확인.",
    },
    {
      title: "ELKI PROCLUS 공식 문서",
      url: "https://elki-project.github.io/releases/current/doc/elki/clustering/subspace/PROCLUS.html",
      note: "원문 서지와 독립 구현 계약 확인. 코드 복사 없음.",
    },
  ],
  preset: "blobs",
  events: ["dimension", "refine"],
  advanced: [
    "같은 두 표시 축에 보이더라도 원본의 다른 축들이 군집별로 선택될 수 있습니다. 결과의 dimensionsByCluster와 원본 인덱스를 함께 확인하세요.",
  ],
  experimentParams: {
    k: 2,
    subspaceDimensions: 2,
    iterations: 3,
    samplingFactor: 10,
    medoidFactor: 5,
  },
};
