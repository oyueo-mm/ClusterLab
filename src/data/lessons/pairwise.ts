import type { Lesson } from "./types";
export const pckmeans: Lesson = {
  purpose:
    "각 표본의 거리와 Must-Link·Cannot-Link 위반의 유한 비용을 함께 줄이는 PCKMeans입니다. 전체 원본 차원을 사용하며 위반을 감수한 배정도 정상 결과입니다.",
  analogy:
    "함께 또는 따로 앉기를 권하지만, 멀리 이동하는 비용보다 권고 위반의 비용이 작으면 권고를 어길 수 있는 좌석 배치입니다.",
  operations: [
    {
      title: "일관된 쌍별 관계 폐쇄",
      input: "원본 ND 수치·무방향 ML/CL",
      calculation:
        "ML 연결 성분을 만들고 성분 간 CL을 전파합니다. CL 자체는 전이시키지 않습니다. 각 무방향 쌍을 한 번만 셉니다.",
      output: "initialize: 원래 관계·성분·폐쇄 관계 수",
    },
    {
      title: "감독을 이용한 초기 중심",
      input: "ML 이웃집합과 시드",
      calculation:
        "큰 ML 성분 평균부터 선택합니다. 부족하면 모든 이웃집합과 CL인 행, 이어서 전체 평균의 시드 perturbation으로 채웁니다.",
      output: "initialize: 실제 ND 초기 중심",
    },
    {
      title: "실제 후보 비용 비교",
      input: "시드 순서의 표본·현재 모든 이웃 label",
      calculation:
        "후보마다 제곱거리+ML 위반 비용+CL 위반 비용을 계산합니다. 현재보다 엄격히 작을 때 즉시 배정합니다.",
      output: "test→assign: 실제 검사 행·후보·선택·전체 비용",
    },
    {
      title: "평균과 종료",
      input: "갱신된 전체 원본 분할",
      calculation:
        "각 군집의 원본 전체 차원 평균을 계산하고 실제 J를 다시 계산합니다. 빈 중심 유지와 종료 이유를 구분합니다.",
      output: "move→finish: 중심 이동·반복 목적·최종 위반",
    },
  ],
  equations: [
    {
      title: "유한 위반 비용의 목적함수",
      tex: String.raw`J=\sum_i\|x_i-\mu_{z_i}\|^2+w\sum_{(i,j)\in M}[z_i\ne z_j]+w\sum_{(i,j)\in C}[z_i=z_j]`,
      symbols:
        "M/C는 ML 폐쇄와 ML 성분 사이 CL 전파 후 무방향 관계 집합. w는 관계 하나당 비음수 유한 비용입니다.",
      meaning:
        "COP처럼 위반을 금지하지 않습니다. 거리 항과 두 벌점 항을 모두 실제로 최적화합니다.",
      derivation: [
        "CL은 전이 관계가 아닙니다. 입력 중복/역방향과 유도 중복을 한 쌍으로 계산합니다.",
        "SDM 원문의 ½SSE+w_p 표기와는 w=2w_p일 때 같은 문제입니다. 단위가 같은 숫자라고 해석하지 않습니다.",
      ],
    },
    {
      title: "현재 이웃에 따른 배정",
      tex: String.raw`q_i(h)=\|x_i-\mu_h\|^2+w\sum_{j:(i,j)\in M}[h\ne z_j]+w\sum_{j:(i,j)\in C}[h=z_j]`,
      symbols: "q_i(h): 현재 다른 행 label을 고정했을 때 i행의 후보 비용.",
      meaning:
        "실제 배정 즉시 이웃이 보게 되는 label을 갱신합니다. K-Means를 실행한 뒤 위반만 색칠하는 방법이 아닙니다.",
      derivation: [
        "전체 목적의 후보 label 치환 ΔJ는 incident 쌍의 Δq_i와 같습니다.",
        "동률은 현재 label 유지, 나머지 동률은 낮은 군집 index. 무작위 sweep 순서는 시드로 재현합니다.",
      ],
    },
    {
      title: "희소한 정확 폐쇄 비용",
      tex: String.raw`V_M={1\over2}\sum_g\left(s_g^2-\sum_h n_{gh}^2\right),\quad V_C=\sum_{(g,g')\in C_G}\sum_h n_{gh}n_{g'h}`,
      symbols: "s_g: ML 성분 크기, n_gh: 성분 g에서 h로 배정된 행 수.",
      meaning:
        "n² 제약 쌍을 만들지 않고도 모든 폐쇄 쌍의 위반을 정확히 셉니다.",
      derivation: [
        "각 ML 성분의 서로 다른 label 쌍 수와 CL 성분 사이 같은 label 쌍 수입니다.",
        "유한 비용 위반 수 V_M/V_C와 비용 wV_M/wV_C는 별도 값입니다.",
      ],
    },
  ],
  numerical: {
    title: "한 표본의 후보 거리·제약 비용 손계산",
    steps: [
      "현재 표본 x=0, 중심 μ₁=0, μ₂=4. ML 상대 x=4는 2군집, CL 상대 x=0.1은 1군집이라고 둡니다.",
      "후보1: 거리0 + ML 비용w + CL 비용w =2w. 후보2: 거리16+0+0=16입니다.",
      "w=0.01이면 후보1 비용0.02로 두 관계를 위반하는 것이 더 작습니다. w=30이면 후보2 비용16으로 선택합니다.",
      "미니 실험 원본은 [0,0.1,4,4.1], ML(1행,4행), CL(1행,2행)입니다. 위 손계산은 고정 후보 중심의 한 단계이고 전체 미니 실행과 구분합니다.",
      "seed42에서 w=.01의 최종 SSE=.01, ML=.01, CL=.01, J=.03입니다. w=30은 다른 국소 해이며 J=10.94입니다. 전역 최소 일치를 주장하지 않습니다.",
    ],
  },
  parameters: [
    {
      key: "constraintPenalty",
      effect:
        "폐쇄 ML/CL 한 쌍의 균일 유한 비용 w≥0입니다. w=0이면 제약 비용은0이지만 감독 초기화는 남습니다.",
      experiment:
        "같은 원본에서 .01과30을 비교하고 거리/위반수/비용을 함께 읽으세요.",
    },
    {
      key: "k",
      effect:
        "요구하는 중심 수, 1≤K≤n. 빈 군집은 이전 중심을 유지하며 실제 개수0을 표시합니다.",
      experiment: "K=1에서 CL 위반을 정상 비용으로 확인하세요.",
    },
    {
      key: "seed",
      effect: "전역 평균 perturbation과 매 sweep 무작위 순서를 정합니다.",
      experiment: "같은 시드·원본 순서의 재현성을 확인하세요.",
    },
    {
      key: "tolerance",
      effect: "반복 전체 J 변화의 절대 허용오차입니다.",
      experiment: "0과 큰 값을 비교해 실제 종료 이유를 읽으세요.",
    },
    {
      key: "iterations",
      effect: "실제 전체 sweep의 최대 횟수입니다.",
      experiment: "1회 한도는 고정점 수렴과 다릅니다.",
    },
  ],
  complexity: {
    theory:
      "희소 성분 histogram으로 sweep O(nK(d+최대 CL 성분 차수)), 전처리 O((n+E)α(n)+E log E).",
    implementation:
      "큰 입력은 실제 전체 계산 후 sweep 요약. 작은 입력의 상세 Trace용 전체 목적 재집계는 추가 비용이 있습니다.",
    space:
      "원본/성분/histogram O(nd+nK+E+Kd), 상세 Trace64MiB·작업256MiB 별도 바이트 정책.",
    cost: "제약을 만족시키는 전역 최적/하드 보장을 하지 않습니다. 일관된 감독과 유한 전역 균일 비용만 지원합니다.",
  },
  implementation: [
    "원본 ND와 표시 투영을 분리합니다. 저장한 정답 label은 계산 입력이 아닙니다.",
    "원문 Figure1의 ML 이웃 초기화·순차 벌점 최적화·평균을 사용합니다. 최초 전체 최근접 label 완성, ±5% perturbation, 동률 유지, 빈 중심 유지, 허용오차와 시드는 명시적 실행 정책입니다.",
    "ML 내부 CL 모순은 입력 오류입니다. 일관된 제약의 유한 비용 위반은 실패가 아닙니다.",
    "지역 최소·중복 중심·비어 있는 군집·순서 민감성이 남을 수 있습니다. 모순 soft 감독·관계별 가중치·active querying·MPCK metric 학습은 구현하지 않았습니다.",
  ],
  comparison: [
    {
      other: "COP-KMeans",
      difference:
        "COP는 허용하지 않는 hard 배정에서 실패할 수 있습니다. PCK는 모든 후보의 유한 위반 비용을 비교하며 위반을 감수할 수 있습니다.",
    },
    {
      other: "K-Means",
      difference:
        "거리뿐 아니라 ML/CL 항과 감독 초기화가 실제 계산에 들어갑니다.",
    },
  ],
  references: [
    {
      title: "Wagstaff et al. (ICML2001), Constrained K-Means",
      url: "https://www.wkiri.com/research/papers/wagstaff-kmeans-01.pdf",
      note: "COP-KMeans의 hard 관계 검사를 비교하는 원논문입니다. PCK의 유한 위반 비용 목적과 구분하세요.",
    },
    {
      title: "Basu, Banerjee & Mooney (SDM2004), §2–3/Figure1",
      url: "https://www.cs.utexas.edu/~ml/papers/semi-sdm-04.pdf",
      note: "직접 렌더링해 초기화 그림과 ½SSE 비용 규약 확인. 능동 질의는 이번 구현 밖입니다.",
    },
  ],
  preset: "blobs",
  events: ["initialize", "test", "assign", "move", "finish"],
  advanced: [
    "전체 label 열거는 작은 데이터의 독립 목적 검산용이며 실제 탐욕 엔진을 전역 solver로 바꾸지 않습니다.",
    "원문 완전 인증 수와 제한 범위 실행 엔진 수를 구분합니다.",
  ],
  experimentDataset: {
    kind: "constrained",
    data: { kind: "numeric", values: [[0], [0.1], [4], [4.1]] },
    mustLink: [[0, 3]],
    cannotLink: [[0, 1]],
  },
  experimentParams: {
    k: 2,
    constraintPenalty: 0.01,
    seed: 42,
    iterations: 20,
    tolerance: 1e-9,
  },
};
