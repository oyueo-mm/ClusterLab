import type { Lesson } from "./types";

export const cure: Lesson = {
  purpose:
    "여러 축소 대표점 사이의 최소 거리를 기준으로 군집을 병합하는 계층 방법입니다. 전체 점을 사용하는 기본 절차를 구현하며 SSE 최소화를 목적함수로 주장하지 않습니다.",
  analogy:
    "길쭉한 지역을 주소 하나로 요약하는 대신 여러 외곽 표식을 정하고, 표식을 평균 쪽으로 조금 당긴 뒤 가까운 지역을 합칩니다.",
  operations: [
    {
      title: "단일점 초기화",
      input: "원본 2D 점 전체, K",
      calculation: "각 점을 하나의 군집과 대표점으로 만듭니다.",
      output: "initialize: 점별 군집과 트리",
    },
    {
      title: "가까운 군집 쌍",
      input: "현재 축소 대표점 집합",
      calculation:
        "서로 다른 군집 대표점 쌍의 최소 Euclidean 거리를 비교합니다.",
      output: "distance: 실제 병합 후보",
    },
    {
      title: "대표점 선택",
      input: "병합 후보의 모든 원본 멤버",
      calculation:
        "평균에서 가장 먼 점, 이후에는 기존 선택점까지의 최소 거리가 가장 큰 점을 차례로 선택합니다.",
      output: "representatives: 선택한 실제 원본 점",
    },
    {
      title: "축소와 병합",
      input: "선택점과 새 평균",
      calculation:
        "선택점을 평균 방향으로 α만큼 이동시키고 두 군집을 대체합니다. K개에서 종료합니다.",
      output: "merge: 실제 대표점 좌표, 멤버 분할, 트리",
    },
  ],
  equations: [
    {
      title: "대표점 축소와 군집 간 거리",
      tex: String.raw`q'=q+\alpha(\mu_C-q),\qquad d(A,B)=\min_{u\in R_A,v\in R_B}\|u-v\|_2`,
      symbols:
        "q: 선택한 원본 점, μ_C: 원본 멤버 평균, α∈[0,1]: 축소율, R_C: 축소한 대표점 집합.",
      meaning: "대표점 수와 축소율로 형상 반영 정도를 조절합니다.",
      derivation: [
        "α=0이면 선택점을 그대로 사용하고 α=1이면 모든 대표점이 군집 평균과 같습니다.",
        "군집마다 선택점을 여러 개 유지하므로 군집 사이 거리와 평균 사이 거리는 일반적으로 다릅니다. 병합 후 전체 원본 멤버에서 대표점을 다시 선택합니다.",
      ],
    },
    {
      title: "두 번째 이후 선택점",
      tex: String.raw`q_{t+1}=\arg\max_{x\in C\setminus Q_t}\min_{q\in Q_t}\|x-q\|_2^2`,
      symbols: "Q_t: 이미 고른 t개 원본 점, C: 병합 후보의 원본 멤버 집합.",
      meaning: "기존 표식으로 충분히 표현하지 못한 부분을 추가합니다.",
      derivation: [
        "최초 점은 평균에서 가장 먼 점으로 정합니다. 이후에는 선택점까지의 최소 거리를 최대화하는 maximin을 사용합니다.",
        "동률은 원본 인덱스가 작은 점을 선택해 재현성을 유지합니다.",
      ],
    },
  ],
  numerical: {
    title: "네 모서리 (0,0), (0,2), (4,0), (4,2)",
    steps: [
      "전체 평균은 (2,1)이며 최초 최원점은 동률 규칙으로 (0,0)입니다.",
      "다음 대표점은 (4,2), 그 다음은 (0,2)입니다. α=0.25이면 각각 (0.5,0.25), (3.5,1.75), (0.5,1.75)로 축소합니다.",
      "K=2 전체 절차는 수직 점 쌍을 각각 병합합니다. 두 병합 거리는 모두 2이며, 레이블 번호 대신 멤버 분할로 검산합니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect: "유지할 최종 군집 수입니다.",
      experiment: "같은 데이터에서 K=2와 3의 트리를 비교하세요.",
    },
    {
      key: "representatives",
      effect:
        "군집마다 유지할 대표점 수의 상한입니다. 군집 멤버보다 많게 주면 모든 멤버까지 선택합니다.",
      experiment: "길쭉한 군집에서 1개와 5개를 비교하세요.",
    },
    {
      key: "shrink",
      effect: "축소율 0~1입니다. 큰 값은 평균 쪽으로 대표점을 더 당깁니다.",
      experiment: "0, 0.3, 1에서 실제 대표점 이동을 관찰하세요.",
    },
  ],
  complexity: {
    theory:
      "원논문의 트리·heap 최적화와 전체 쌍을 다시 찾는 구현의 비용은 다릅니다.",
    implementation:
      "이 구현은 n−K번 병합마다 모든 군집 쌍과 대표점 쌍을 비교하여 보수적으로 O(n³c²).",
    space: "원본 멤버/대표점/트리 및 상세 Trace. 전체 기록은 별도 예산 적용.",
    cost: "교육용 정확한 전체 입력 버전이며 원논문의 sampling/partitioning 확장 모드는 아직 없습니다.",
  },
  implementation: [
    "기본 merge 절차처럼 모든 원본 멤버에서 대표점을 다시 선택합니다. 부모 대표점만 사용하는 개선 변형과 다릅니다.",
    "병합 높이는 대표점 최소 거리입니다. 대표점 linkage는 높이 역전이 생길 수 있어 단조 ultrametric을 보장하지 않습니다.",
    "데이터 일부를 조용히 추출하지 않습니다. 큰 데이터에서는 연산량이 빠르게 커지며 Worker 취소와 자원 예산을 사용합니다.",
  ],
  comparison: [
    {
      other: "AGNES",
      difference:
        "single/complete/average linkage는 원본 멤버 사이 거리를 집계하지만, CURE는 재선택하고 축소한 대표점 사이 최소 거리를 사용합니다.",
    },
    {
      other: "K-Means",
      difference:
        "CURE의 병합 기준은 SSE를 교대로 최소화하는 Lloyd 갱신과 다릅니다.",
    },
  ],
  references: [
    {
      title: "Guha, Rastogi & Shim (1998), CURE",
      url: "https://www2.cs.sfu.ca/CourseCentral/459/han/papers/guha98.pdf",
      note: "원문 §3의 대표점 선택·축소·병합을 확인했습니다. 코드 복사 없음.",
    },
    {
      title: "CURE publication record, Seoul National University",
      url: "https://snu.elsevierpure.com/en/publications/cure-an-efficient-clustering-algorithm-for-large-databases/",
      note: "저자·연도·발표 자료 서지 확인.",
    },
  ],
  preset: "elongated",
  events: ["representatives", "merge"],
  advanced: [
    "대표점 기반 강건성은 모든 이상치에서 안정성을 보장한다는 뜻이 아닙니다. 축소율·대표점 수와 병합 순서에 민감합니다.",
  ],
};

export const neuralgas: Lesson = {
  purpose:
    "거리 순위로 여러 뉴런을 동시에 적응시키는 비지도 벡터 양자화 방법입니다. 고정 격자는 없으며 표시 색은 최근접 뉴런 BMU입니다.",
  analogy:
    "입력 근처의 참가자들을 가까운 순서로 줄 세우고, 1등은 많이, 다음 순위는 조금씩 같은 입력 쪽으로 이동시킵니다.",
  operations: [
    {
      title: "초기화",
      input: "데이터 전체, 뉴런 수, seed",
      calculation:
        "관측점 인덱스를 시드로 섞고 중복 없이 초기 뉴런을 선택합니다.",
      output: "initialize: 실제 가중치 좌표",
    },
    {
      title: "거리 순위",
      input: "현재 입력과 모든 뉴런",
      calculation:
        "제곱거리를 정렬하고 0부터 시작하는 순위를 계산합니다. 동률은 뉴런 순서입니다.",
      output: "rank: 거리 순위와 승자",
    },
    {
      title: "가중치 적응",
      input: "학습률 ε와 순위 폭 λ",
      calculation: "모든 뉴런에 ε exp(−rank/λ)(x−w)를 적용합니다.",
      output: "prototype: 실제 뉴런 이동",
    },
    {
      title: "스케줄과 종료",
      input: "학습 단계와 epoch 한도",
      calculation:
        "학습률과 λ를 지수 스케줄로 줄이며 모든 데이터를 매 epoch 순회합니다.",
      output: "오차 곡선과 최종 BMU 레이블",
    },
  ],
  equations: [
    {
      title: "순위 기반 갱신",
      tex: String.raw`k_i(x)=\#\{j:\|x-w_j\|<\|x-w_i\|\},\quad \Delta w_i=\varepsilon(t)e^{-k_i(x)/\lambda(t)}(x-w_i)`,
      symbols:
        "w_i: 뉴런의 원형 벡터, k_i: 거리 순위, ε: 학습률, λ>0: 순위 이웃 폭. 동률은 일관된 인덱스 순서로 해소합니다.",
      meaning: "SOM의 고정 격자 거리가 아닌 현재 입력까지의 순위를 사용합니다.",
      derivation: [
        "가까운 순위에 더 큰 지수 가중치를 부여하므로 승자 이외 뉴런도 움직입니다.",
        "λ가 작으면 승자 이외의 가중치가 0에 가까워져 경쟁 학습에 가까워집니다. 각 온라인 갱신이 전체 양자화 오차를 항상 감소시키지는 않습니다.",
      ],
    },
    {
      title: "이 구현의 감소 스케줄",
      tex: String.raw`u=\frac{t}{\max(1,T-1)},\quad\varepsilon(t)=\varepsilon_0(0.01)^u,\quad\lambda(t)=\lambda_0\left(\frac{0.01}{\lambda_0}\right)^u`,
      symbols:
        "t=0,…,T−1: 전체 입력 갱신 인덱스, T=n×epoch, ε₀: 초기 학습률, λ₀: 초기 순위 폭.",
      meaning: "시작과 끝의 값을 명시한 지수 annealing입니다.",
      derivation: [
        "u=0이면 초기값이며 u=1이면 ε=0.01ε₀, λ=0.01입니다.",
        "스케줄 종점은 이 앱의 설정 정책이며 원논문의 모든 실험과 동일한 하이퍼파라미터를 뜻하지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "뉴런 0,1,2와 입력 0.25",
    steps: [
      "거리는 0.25,0.75,1.75이므로 순위는 0,1,2입니다.",
      "ε=0.2, λ=2이면 1등은 0+0.2×0.25=0.05로 이동합니다.",
      "다른 뉴런도 1+0.2e^(−1/2)(−0.75)≈0.9090204, 2+0.2e^(−1)(−1.75)≈1.8712422로 이동합니다. 이 세 좌표를 독립 NumPy 계산과 비교합니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "고정 뉴런 수입니다. 곧바로 의미론적 군집 수로 해석하지 않습니다.",
      experiment: "고리에서 6개와 12개 뉴런의 배치를 비교하세요.",
    },
    {
      key: "lambda",
      effect:
        "초기 순위 이웃 폭입니다. 큰 값은 더 많은 순위의 뉴런을 움직입니다.",
      experiment: "λ=0.5와 3의 초기 이동을 비교하세요.",
    },
    {
      key: "learningRate",
      effect: "초기 가중치 이동 비율입니다.",
      experiment: "같은 seed에서 0.1과 0.3을 비교하세요.",
    },
    {
      key: "epochs",
      effect:
        "전체 입력을 순회하는 횟수이며 매 epoch 시드 기반 shuffle을 합니다.",
      experiment: "1회와 8회의 평균 제곱 양자화 오차를 비교하세요.",
    },
  ],
  complexity: {
    theory: "입력마다 m개 뉴런 거리 계산과 정렬 O(md+m log m).",
    implementation:
      "2D에서 T=n×epoch 갱신으로 O(Tm log m), epoch별 전체 오차 O(nm).",
    space:
      "가중치 O(m), 입력 순서 O(n), 상세 가중치·순위 Trace는 O(Tm)이며 예산을 적용합니다.",
    cost: "순위 정렬과 입력별 상세 기록이 비용을 차지합니다.",
  },
  implementation: [
    "2D 원본 좌표에서 실제 온라인 학습합니다. CHL 연결을 추가하는 NG+CHL 변형은 이 엔진에 포함하지 않았습니다.",
    "최종 색은 BMU 양자화입니다. 별도의 뉴런 그래프 군집 추출이나 지도 분류가 아닙니다.",
  ],
  comparison: [
    {
      other: "SOM",
      difference:
        "SOM은 고정 격자의 이웃 거리, Neural Gas는 입력별 거리 순위를 사용합니다.",
    },
    {
      other: "Growing Neural Gas",
      difference:
        "GNG는 국소 오차와 Hebbian 간선으로 뉴런 수를 늘립니다. NG의 뉴런 수는 고정입니다.",
    },
  ],
  references: [
    {
      title:
        "Martinetz, Berkovich & Schulten (1993), Neural-gas vector quantization",
      url: "https://www.ks.uiuc.edu/Publications/Papers/paper.cgi?tbcode=MART93B",
      note: "저자 기관의 원문 서지와 초록. 최초 NG는 Martinetz–Schulten (1991)입니다.",
    },
    {
      title: "Fritzke (1997), Neural Gas algorithm",
      url: "https://www.demogng.de/JavaPaper/node16.html",
      note: "저자의 알고리즘 절차와 감소 스케줄 설명. 1993 PDF는 접근했으나 텍스트 추출 불가여서 완전한 원문 읽기로 표시하지 않습니다.",
    },
  ],
  preset: "rings",
  events: ["rank", "prototype"],
  advanced: [
    "양자화 오차와 군집 품질은 다릅니다. 많은 뉴런이 하나의 의미론적 군집을 함께 표현할 수 있습니다.",
  ],
};

export const growingneuralgas: Lesson = {
  purpose:
    "고정 크기 격자 없이 두 뉴런에서 시작해 국소 오차가 큰 영역에 뉴런을 삽입하는 경쟁 학습법입니다. 간선은 학습된 위상이며 입력 그래프를 군집화한 결과가 아닙니다.",
  analogy:
    "지도를 만들며 관측값에 가장 가까운 두 표식을 연결하고, 오래 쓰이지 않은 길을 지웁니다. 오차가 많이 쌓인 지역에는 새 표식을 중간에 놓습니다.",
  operations: [
    {
      title: "두 뉴런 초기화",
      input: "원본 관측점, seed",
      calculation: "두 관측점을 시드로 선택하고 간선과 누적 오차를 비웁니다.",
      output: "initialize: 두 실제 가중치",
    },
    {
      title: "승자와 적응",
      input: "입력 x와 현재 뉴런",
      calculation:
        "가장 가까운 두 뉴런을 찾고 기존 승자 간선을 aging합니다. 승자의 이동 전 제곱거리 오차를 누적하고 승자 및 기존 이웃을 이동합니다.",
      output: "rank → prototype",
    },
    {
      title: "연결 및 삭제",
      input: "승자와 2등",
      calculation:
        "두 뉴런의 간선을 생성하거나 나이를 0으로 갱신합니다. 최대 나이를 넘은 간선과 고립 뉴런을 삭제합니다.",
      output: "connect: 실제 간선 및 나이",
    },
    {
      title: "오차 기반 성장",
      input: "삽입 주기, 국소 오차",
      calculation:
        "최대 오차 뉴런 q와 최대 오차 이웃 f의 중점에 새 뉴런을 넣고 기존 q–f 간선을 대체합니다. 오차 감소 후 다음 입력으로 갑니다.",
      output: "insert 및 error-decay",
    },
  ],
  equations: [
    {
      title: "경쟁 학습과 국소 오차",
      tex: String.raw`E_{s_1}\leftarrow E_{s_1}+\|x-w_{s_1}\|^2,\quad\Delta w_{s_1}=\varepsilon_b(x-w_{s_1}),\quad\Delta w_j=\varepsilon_n(x-w_j)`,
      symbols:
        "s₁: 최근접 뉴런, j: 기존 간선으로 연결된 이웃, E: 누적 오차, ε_b: 승자 학습률, ε_n: 이웃 학습률.",
      meaning: "GNG는 승자와 위상 이웃만 갱신합니다.",
      derivation: [
        "오차는 이동 이전 거리로 누적해야 어느 영역의 표현이 부족한지 유지할 수 있습니다.",
        "이 구현은 ε_n=0.03ε_b를 사용합니다. 고정 격자나 모든 순위의 exponential 갱신과 다릅니다.",
      ],
    },
    {
      title: "새 뉴런과 오차 감소",
      tex: String.raw`w_r=\frac{w_q+w_f}{2},\quad E_q\leftarrow0.5E_q,\quad E_f\leftarrow0.5E_f,\quad E_r\leftarrow E_q,\quad E_i\leftarrow0.995E_i`,
      symbols:
        "q: 최대 누적 오차 뉴런, f: q의 최대 오차 이웃, r: 삽입 뉴런, E_i: 모든 뉴런의 국소 오차.",
      meaning: "현재 구조를 보간하고 최근 오차에 더 큰 비중을 둡니다.",
      derivation: [
        "가장 큰 오차 영역의 인접 두 뉴런 사이에 중점을 삽입합니다. q–f 간선을 제거하고 q–r, r–f를 연결합니다.",
        "새 오차를 감소 후 q의 값으로 정하는 것은 1995 원논문 절차입니다. 1997 웹 설명의 재정렬된 절차와 혼합하지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "초기 뉴런 0과 1, 입력 0.25 후 0.75",
    steps: [
      "ε_b=0.2에서 첫 승자 0은 0.05가 됩니다. 초기 간선이 없으므로 1은 그대로입니다. 오차 0.0625를 누적하고 0–1 간선을 생성합니다.",
      "0.995 감소 후 첫 오차는 0.0621875입니다. 두 번째 입력 0.75에서 승자 1은 0.95, 기존 이웃 0은 0.0542가 됩니다.",
      "삽입 주기가 2이면 이 단계에서 오차가 큰 뉴런 1과 이웃 0의 중점 0.5021에 새 뉴런을 넣습니다. 간선 0–1은 두 간선으로 대체됩니다.",
    ],
  },
  parameters: [
    {
      key: "maxNeurons",
      effect:
        "성장 가능한 최대 뉴런 수입니다. 학습은 epoch 한도까지 계속합니다.",
      experiment: "고리에서 최대 5개와 20개를 비교하세요.",
    },
    {
      key: "insertionInterval",
      effect: "새 뉴런 삽입을 시도하는 입력 갱신 주기입니다.",
      experiment: "10과 50에서 실제 insert 발생 시점을 비교하세요.",
    },
    {
      key: "maxAge",
      effect: "간선은 나이가 이 값보다 클 때 삭제합니다.",
      experiment: "작은 값에서 간선과 고립 뉴런 삭제를 관찰하세요.",
    },
    {
      key: "learningRate",
      effect: "승자 학습률입니다. 이웃 학습률은 그 0.03배로 고정합니다.",
      experiment: "0.1과 0.2에서 가중치 이동을 비교하세요.",
    },
    {
      key: "epochs",
      effect: "고정 데이터셋을 시드 shuffle로 반복 학습하는 횟수입니다.",
      experiment: "1회와 8회의 국소 오차와 뉴런 수를 비교하세요.",
    },
  ],
  complexity: {
    theory:
      "m개 뉴런, e개 간선에서 입력마다 거리 정렬과 그래프 갱신이 필요합니다.",
    implementation:
      "이 구현은 O(T(m log m+e))와 epoch별 전체 오차 O(nm). T=n×epoch.",
    space:
      "계산 O(n+m+e), 상세 Trace는 가중치·국소 오차·나이를 실제로 저장하며 별도 예산을 적용합니다.",
    cost: "뉴런 수와 epoch가 커질수록 실제 학습과 상세 기록량이 증가합니다.",
  },
  implementation: [
    "원본 1995 절차의 순서: 기존 간선 aging→이동 전 오차→기존 이웃 이동→간선 생성/갱신/삭제→삽입→전체 오차 감소입니다.",
    "초기 관측점 선택과 매 epoch 순서는 seed로 재현됩니다. 고정 데이터셋 학습이며 외부 실시간 스트림 API는 아직 없습니다.",
    "최종 색은 BMU입니다. 간선의 연결 성분을 자동으로 최종 군집이라고 주장하지 않습니다.",
  ],
  comparison: [
    {
      other: "Neural Gas",
      difference:
        "NG는 고정 뉴런 수와 순위 이웃 함수, GNG는 실제 가변 간선과 누적 오차로 성장합니다.",
    },
    {
      other: "SOM",
      difference:
        "SOM은 고정 격자를 사용하지만 GNG는 입력에 따라 간선과 뉴런을 생성·삭제합니다.",
    },
  ],
  references: [
    {
      title: "Fritzke (1995), A Growing Neural Gas Network Learns Topologies",
      url: "https://www.cs.swarthmore.edu/~meeden/DevelopmentalRobotics/fritzke95.pdf",
      note: "원문 §3 절차와 α=0.5, d=0.995를 확인했습니다. 독립 구현입니다.",
    },
    {
      title: "Fritzke (1997), Growing Neural Gas algorithm",
      url: "https://www.demogng.de/JavaPaper/node19.html",
      note: "저자 웹 설명의 순서 차이를 별도로 기록했습니다. 구현은 1995 절차를 따릅니다.",
    },
  ],
  preset: "rings",
  events: ["rank", "connect", "insert"],
  advanced: [
    "간선이 유한 데이터 표본의 모든 위상을 정확히 복원한다고 보장하지 않습니다. 오류 기반 삽입 한도와 학습 종료 기준은 서로 다른 제어입니다.",
  ],
};
