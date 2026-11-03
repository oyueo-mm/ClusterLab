import type { Lesson } from "./types";
export const mpckmeans: Lesson = {
  purpose:
    "일관된 쌍별 감독과 원본 ND를 이용해 군집마다 양수 대각 메트릭을 실제 학습합니다. 거리·−logdet·ML/CL 비용을 함께 계산합니다.",
  analogy:
    "군집마다 자의 축 눈금을 다르게 조절하되, 자를 무한히 늘리거나 줄이는 비용도 함께 따집니다.",
  operations: [
    {
      title: "감독 폐쇄·초기화",
      input: "원본 ND·일관 ML/CL·시드",
      calculation:
        "ML 성분 폐쇄와 CL 성분 전파, 큰 ML 평균부터 size×최소 제곱거리 farthest-first. 부족한 중심은 전체 평균 ±5% 축 범위로 채우고 identity A로 시작합니다.",
      output: "initialize: 원래·폐쇄 관계와 초기 중심",
    },
    {
      title: "정확 전체 최대쌍",
      input: "현재 양수 대각 A",
      calculation:
        "모든 원본 i<j의 거리를 전수 검사합니다. 군집 내부나 표시 표본으로 대체하지 않습니다. 진행 중 부분 최대는 최종 비용에 쓰지 않습니다.",
      output: "distance: 검사 쌍 수·실제 최대 witness",
    },
    {
      title: "live 배정",
      input: "시드 순서·현재 이웃 label",
      calculation:
        "거리−logdet+incident ML/CL 비용을 비교해 엄격히 줄 때 즉시 갱신합니다. 동률은 현재 label을 유지합니다.",
      output: "test→assign: 실제 후보 항별 비용",
    },
    {
      title: "평균·대각 학습",
      input: "전체 배정·이전 최대쌍",
      calculation:
        "원본 평균과 Eq8 분모 S를 계산하고 a=n/S로 갱신합니다. 새 A에서 전체 최대쌍과 J를 다시 구합니다.",
      output: "move→maximization: 실제 S/A 전후·목적·수렴",
    },
  ],
  equations: [
    {
      title: "ICML2004 Eq6 목적함수",
      tex: String.raw`J=\sum_i[(x_i-\mu_{z_i})^TA_{z_i}(x_i-\mu_{z_i})-\log\det A_{z_i}]+w\sum_M f_M[z_i\ne z_j]+w\sum_C f_C[z_i=z_j]`,
      symbols: "A_h는 군집별 양수 대각, w≥0은 전역 균일 유한 비용입니다.",
      meaning:
        "PCK의 고정 위반 벌점과 다르게 실제 학습 metric이 거리와 두 제약 비용에 들어갑니다.",
      derivation: [
        "ML f_M=½δᵀ(A_zi+A_zj)δ, CL f_C=Dmax²(A_zi)−δᵀA_ziδ.",
        "Dmax²(A)=max_(p<q) (x_p−x_q)ᵀA(x_p−x_q), 원본 전체를 사용합니다.",
        "각 무방향 폐쇄 쌍을 한 번만 집계합니다. CL은 전이시키지 않습니다.",
      ],
    },
    {
      title: "Eq8 대각 갱신",
      tex: String.raw`a_{hq}=\frac{n_h}{S_{hq}},\quad S_{hq}=\sum_{i:z_i=h}(x_{iq}-\mu_{hq})^2+\frac w2\sum_{M_h^{viol}}\delta_{ijq}^2+w\sum_{C_h^{viol}}(\Delta_{hq}^{2}-\delta_{ijq}^{2})`,
      symbols:
        "Δ_h는 현재 전체 최대쌍 witness의 축 차이. ML은 각 끝 군집에½, CL은 같은 군집에 한 번입니다.",
      meaning: "고정된 최대 witness 구간에서 ∂J/∂a=S−n/a=0으로 얻습니다.",
      derivation: [
        "새 A에서 최대 witness가 바뀌면 동일 고정식의 정지점으로 해석하지 않습니다. 원문도 이 경우의 단조 수렴을 보장하지 않습니다.",
        "빈 군집은 이전 A/중심 유지. 음수 S는 명시적 갱신 실패이고 전역 불가능 증명이 아닙니다.",
        "기본 α=0. S≥0·일부0·trace(S)>0일 때만 선택 α trace(S)I를 더하며 정확 원래 stationary 갱신과 구분합니다.",
      ],
    },
  ],
  numerical: {
    title: "직접 분모·기울기 검산",
    steps: [
      "X=(-2,0),(2,1),(0,-3),(1,4), z=(0,1,1,0), ML(1,2), CL(1,4), w=.2.",
      "군집0 평균=(-.5,2), A0=diag(2,.6). 전체 최대쌍 (1,2)의 축 제곱차=(16,1).",
      "군집0 Sx=4.5+1.6+1.4=7.5, Sy=8+.1−3=5.1. a0=(2/7.5,2/5.1).",
      "갱신 후 최대쌍은 (3,4)로 바뀝니다. 고정 witness의 미분0을 새 최대쌍 목적의 미분0으로 잘못 부르면 안 됩니다.",
      "독립 NumPy 전수 목적과 SciPy 유한차분으로 S−n/a를 검산했습니다.",
    ],
  },
  parameters: [
    {
      key: "constraintPenalty",
      effect: "거리 가중 ML/CL 비용의 전역 계수입니다.",
      experiment:
        "같은 데이터에서 .001과 .01을 비교하고 위반 수와 비용을 따로 읽으세요.",
    },
    {
      key: "metricConditioning",
      effect: "비음수 특이 S에만 trace 조건화를 적용합니다. 기본0입니다.",
      experiment:
        "상수 축 추천에서0은 명시 오류,1e-6은 조건화 진단을 확인하세요.",
    },
    {
      key: "metricTolerance",
      effect:
        "대각 log 비율 변화 허용오차. 원본 중심 이동 허용오차와 별개입니다.",
      experiment: "반복 한도와 수렴 이유를 비교하세요.",
    },
    {
      key: "k",
      effect: "군집별 독립 대각 metric 개수입니다.",
      experiment:
        "빈 군집이 실제0개로 표시되고 이전 metric을 유지하는지 보세요.",
    },
  ],
  complexity: {
    theory: "반복 O(Kn²d+nK(d+폐쇄 incident 관계)).",
    implementation:
      "정확 최대쌍 스트리밍·같은 A 캐시. 큰 입력은 후보 Trace만 요약하고 모든 원본을 계산합니다.",
    space: "O(nd+E+nK+Kd), N² 거리/폐쇄 배열 없음. 작업256MiB·Trace64MiB.",
    cost: "원본 전체 최대쌍 탐색은 큰 n에서 비쌉니다. 단조 수렴·전역 최적·hard 제약 만족을 보장하지 않습니다.",
  },
  implementation: [
    "ICML2004 Eq6/8의 multiple diagonal 한정. Full SPD/single metric/모순 soft/관계별 가중치 확장은 제외합니다.",
    "원본 ND 계산과 표시 축 투영을 분리합니다. 타원은 선택 축의 대각 단면입니다.",
    "모든 동일 점의 S trace=0은 이 조건화로도 복구하지 않습니다. 임의 epsilon으로 유한 logdet를 만들지 않습니다.",
    "최대 witness 변화·목적 증가·조건화·빈 군집·수렴 종료 이유를 실제 Trace에 기록합니다.",
  ],
  comparison: [
    {
      other: "PCKMeans",
      difference:
        "PCK는 Euclidean SSE+고정 위반 비용, MPCK는 학습 대각 거리−logdet와 거리 가중 제약 비용. 동일 w 숫자도 목적이 다릅니다.",
    },
    {
      other: "COP-KMeans",
      difference:
        "COP는 hard 허용 검사, MPCK의 유한 위반은 성공 결과일 수 있습니다.",
    },
  ],
  references: [
    {
      title: "Bilenko, Basu, Mooney ICML2004, Eq4–8·Figure1",
      url: "https://bilenko.com/papers/04-semi-icml.pdf",
      note: "원저자 PDF를 렌더링해 목적·갱신·수렴 caveat를 대조했습니다. 실행 정책의 초기화 동률·조건화 제한은 문서에 명시합니다.",
    },
    {
      title: "원저자 RISC 안내",
      url: "https://www.cs.utexas.edu/~ml/risc/",
      note: "원저자 WekaUT 실행 비교는 미실시. 독립 NumPy/SciPy 검산과 구분합니다.",
    },
  ],
  preset: "blobs",
  events: [
    "initialize",
    "distance",
    "test",
    "assign",
    "move",
    "maximization",
    "finish",
  ],
  advanced: [
    "엄격 원문 완전 인증과 제한 범위 실행 엔진 수는 별도입니다.",
    "전체 label 열거는 독립 목적 검산이며 탐욕 solver를 전역 solver로 바꾸지 않습니다.",
  ],
  experimentDataset: {
    kind: "constrained",
    data: {
      kind: "numeric",
      values: [
        [-3, -1],
        [-2.8, -0.8],
        [-3.2, -1.1],
        [3, 1],
        [2.8, 0.8],
        [3.2, 1.1],
      ],
    },
    mustLink: [
      [0, 2],
      [3, 5],
    ],
    cannotLink: [[0, 1]],
  },
  experimentParams: {
    k: 2,
    iterations: 20,
    constraintPenalty: 0.005,
    metricConditioning: 0,
    tolerance: 1e-9,
    metricTolerance: 1e-9,
    seed: 42,
  },
};
