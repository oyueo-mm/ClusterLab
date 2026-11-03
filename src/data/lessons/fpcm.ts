import type { Lesson } from "./types";
export const fpcm: Lesson = {
  purpose:
    "원본 ND에서 퍼지 소속도 U의 행 합1과 전형성 T의 열 합1을 함께 만족시키는 FPCM1997입니다. PCM의 독립 전형성, PFCM2005와 구분합니다.",
  analogy:
    "각 표본은 군집 사이에서 U를 나누고, 각 군집은 전체 표본 사이에서 T를 나눕니다. 서로 다른 두 경쟁을 함께 관찰합니다.",
  operations: [
    {
      title: "ND FCM 준비",
      input: "원본 수치·시드",
      calculation:
        "K-Means++와 실제 ND FCM으로 초기 중심과 비교 U를 계산합니다.",
      output: "initialize/expectation/maximization: 실제 준비 기준",
    },
    {
      title: "U 행 정규화",
      input: "원본 모든 중심까지 제곱거리",
      calculation: "표본별 역거리 지수를 모든 군집에 대해 정규화합니다.",
      output: "expectation: 실제 U·행 합",
    },
    {
      title: "T 열 정규화",
      input: "각 군집에서 모든 원본 표본의 거리",
      calculation:
        "군집별 역거리 지수를 전체 표본에 대해 정규화합니다. 표시 표본만 쓰지 않습니다.",
      output: "typicality: 실제 T·열 합",
    },
    {
      title: "중심과 종료",
      input: "U^m+T^η",
      calculation:
        "원본 ND 가중 평균·두 목적 항을 계산하고 종료 시 U/T와 고정점 잔차를 재평가합니다.",
      output: "move/finish: 실제 평균·목적·잔차",
    },
  ],
  equations: [
    {
      title: "1997 목적과 두 정규화",
      tex: String.raw`J=\sum_{ij}(u_{ij}^{m}+t_{ij}^{\eta})D_{ij}^2,\quad\sum_j u_{ij}=1,\quad\sum_i t_{ij}=1`,
      symbols: "표본×군집 행렬. m>1, η>1, D²는 전체 원본 ND 제곱거리.",
      meaning: "U 행과 T 열의 합이1이며 T 행 합은 강제하지 않습니다.",
      derivation: [
        "고정 중심에서 두 독립 단체 제약 문제로 나뉩니다.",
        "PCM의 Ω penalty나 PFCM2005 a/b 혼합을 더하지 않습니다.",
      ],
    },
    {
      title: "U/T 갱신",
      tex: String.raw`u_{ij}=\frac{(D_{ij}^2)^{-1/(m-1)}}{\sum_h(D_{ih}^2)^{-1/(m-1)}},\quad t_{ij}=\frac{(D_{ij}^2)^{-1/(\eta-1)}}{\sum_l(D_{lj}^2)^{-1/(\eta-1)}}`,
      symbols: "첫 분모는 군집 h, 두 번째는 모든 표본 l입니다.",
      meaning: "T는 전체 표본 수와 표본 복제의 영향을 받습니다.",
      derivation: [
        "Lagrange 승수로 각 행/열의 합 제약을 적용합니다.",
        "영거리 행/열은 영거리 원소에만 균등 배분합니다. epsilon 없이 로그 정규화를 사용합니다.",
      ],
    },
    {
      title: "두 항의 실제 중심",
      tex: String.raw`v_j=\frac{\sum_i(u_{ij}^m+t_{ij}^{\eta})x_i}{\sum_i(u_{ij}^m+t_{ij}^{\eta})}`,
      symbols: "표시 좌표가 아닌 원본 x_i 전체 차원 평균.",
      meaning: "U와 T가 모두 중심에 영향을 줍니다.",
      derivation: [
        "두 행렬을 고정하고 원본 중심으로 미분합니다.",
        "로그 가중치 비율을 사용하며 반환 중심에서 두 행렬을 재평가합니다.",
      ],
    },
  ],
  numerical: {
    title: "손계산과3배 복제",
    steps: [
      "X=(0,1,4), 고정 V=(0.5,3), m=η=2: D²=((.25,9),(.25,4),(12.25,1)).",
      "U=((36/37,1/37),(16/17,1/17),(4/53,49/53)). T의 두 열=(49/99,49/99,1/99),(4/49,9/49,36/49).",
      "J=2.2614969141, 실제 다음 중심=(.4956453748,3.9019080877), 이동 후 J=1.0908190675입니다.",
      "각 표본3번 복제 시 T는1/3로 줄고 다음 중심=(.4944754135,3.9702086912)로 달라집니다. 아래 미니는 다른 실제 초기화에서 전체 AO를 실행합니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect: "군집 중심 개수",
      experiment: "중복 중심과 점 다양성 진단을 읽으세요.",
    },
    {
      key: "fuzziness",
      effect: "U 지수 m",
      experiment: "같은 데이터에서 U와 T가 다르게 변하는지 확인하세요.",
    },
    {
      key: "typicalityExponent",
      effect: "T 지수 η",
      experiment: "열 합1과 목적의 두 항을 비교하세요.",
    },
    {
      key: "warmIterations",
      effect: "ND FCM 초기화 한도",
      experiment: "준비 FCM과 FPCM 종료를 구분하세요.",
    },
    {
      key: "iterations",
      effect: "FPCM AO 반복 한도",
      experiment: "한도 종료와 정확 고정점은 다릅니다.",
    },
  ],
  complexity: {
    theory: "O((T_FCM+T_FPCM)nKd)",
    implementation:
      "전체 원본 행/열을 정규화하며 큰 입력은 중간 Trace만 요약합니다.",
    space: "O(nd+nK+Kd), 작업256MiB·Trace64MiB 별도",
    cost: "표본 수·복제 민감성, 중복 중심, 국소해가 남습니다.",
  },
  implementation: [
    "원본 ND와 표시 투영을 분리합니다. U/T는 확률 모형의 Bayes 사후분포가 아닙니다.",
    "시드 K-Means++와 별도 ND FCM 준비를 명시적 초기화 정책으로 사용합니다. 기존2D FCM/PCM 계산은 수정하지 않습니다.",
    "영거리 최적해 정책과 표현 underflow/거리 overflow를 구분합니다. 상수/중복 점은 별도 퇴화 진단으로 공개합니다.",
    "1997 전체 본문과 R 실행은 미검증입니다. 원저자2005 재서술 Eq15–18 및 공식 매뉴얼 대조·독립 NumPy를 사용했습니다.",
  ],
  comparison: [
    {
      other: "Fuzzy C-Means",
      difference:
        "FCM은 U 행 합1만 사용합니다. FPCM은 T 열 제약과 T^η 가중치도 사용합니다.",
    },
    {
      other: "Possibilistic C-Means",
      difference:
        "PCM1993의 독립 T와 Ω penalty는 FPCM1997에 없습니다. 미니에서 같은 원본의 실제 계산을 비교합니다.",
    },
  ],
  references: [
    {
      title: "Pal, Pal & Bezdek,1997",
      url: "https://doi.org/10.1109/FUZZY.1997.616338",
      note: "대상 원문. 이번 세션 본문 접근 불가.",
    },
    {
      title: "Pal et al.2005 원저자 재서술",
      url: "https://www.comp.ita.br/~forster/CC-222/material/fuzzyclust/fuzzy01492404.pdf",
      note: "인쇄522쪽 Eq15–18을 실제 렌더링해 확인했습니다. 새로운 PFCM2005와 구분합니다.",
    },
    {
      title: "ppclust FPCM 공식 문서",
      url: "https://search.r-project.org/CRAN/refmans/ppclust/html/fpcm.html",
      note: "행/열 제약 대조. 일부 첨자·기본값 오류를 그대로 옮기지 않습니다. R 미실행.",
    },
  ],
  preset: "blobs",
  events: ["initialize", "expectation", "typicality", "move", "finish"],
  advanced: [
    "복제 시 U항의 합은 r배, T항의 합은 r^(1−η)배입니다. 실제 T를 보기 좋게 재정규화해 계산에 쓰지 않습니다.",
    "FPCM1997을 PFCM2005 구현으로 중복 집계하지 않습니다.",
  ],
  experimentDataset: {
    kind: "numeric",
    values: [
      [0, 0, 0],
      [1, 0, 0],
      [4, 0, 0],
    ],
  },
  experimentParams: {
    k: 2,
    seed: 42,
    fuzziness: 2,
    typicalityExponent: 2,
    warmIterations: 30,
    iterations: 60,
    tolerance: 1e-9,
  },
};
