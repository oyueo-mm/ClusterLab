import type { Lesson } from "./types";
export const pcm: Lesson = {
  purpose:
    "원본 N차원에서 독립 전형성을 계산하는 1993 Possibilistic C-Means입니다. 전형성은 소속 확률이 아니며 행 합을 1로 정규화하지 않습니다.",
  analogy:
    "각 관측이 각 중심의 전형적인 사례인지 따로 평가합니다. 모든 중심에서 멀면 모두 낮을 수 있습니다.",
  operations: [
    {
      title: "ND FCM 초기화",
      input: "원본 수치 행렬·시드",
      calculation:
        "시드 K-Means++ 중심에서 실제 ND FCM 소속도와 가중 평균을 반복합니다.",
      output: "initialize / expectation / maximize: 실제 U와 중심",
    },
    {
      title: "양수 척도 고정",
      input: "FCM 기준 중심·U·κ",
      calculation:
        "Ω_j=κ Σu_ij^m d_ij² / Σu_ij^m을 한 번 추정합니다. 수동 모드에서는 양수 Ω를 지정합니다.",
      output: "initialize: 군집별 고정 척도",
    },
    {
      title: "독립 전형성",
      input: "원본 거리·Ω·η",
      calculation:
        "각 t_ij를 독립적으로 계산합니다. 행/열 합 정규화는 없습니다.",
      output: "typicality: 실제 T·거리·최대값·행 합",
    },
    {
      title: "중심과 종료",
      input: "t^η 가중치",
      calculation:
        "원본 ND 가중 평균과 J를 계산합니다. 중심 이동 허용오차 또는 반복 한도로 종료하고 반환 중심에서 T를 재평가합니다.",
      output: "move / finish: 실제 중심·J·고정점 잔차",
    },
  ],
  equations: [
    {
      title: "1993 PCM 목적함수",
      tex: String.raw`J=\sum_{ij}t_{ij}^{\eta}d_{ij}^2+\sum_j\Omega_j\sum_i(1-t_{ij})^{\eta}`,
      symbols: "η>1, Ω_j>0, d²는 원본 모든 특성의 제곱거리입니다.",
      meaning:
        "거리와 낮은 전형성 벌점을 함께 최소화합니다. 1996 entropy 변형이 아닙니다.",
      derivation: [
        "FCM의 표본별 합 1 제약을 적용하지 않습니다.",
        "Ω는 초기 추정 후 고정하며 반복마다 다시 추정하지 않습니다.",
      ],
    },
    {
      title: "독립 전형성 갱신",
      tex: String.raw`t_{ij}=\frac{1}{1+(d_{ij}^2/\Omega_j)^{1/(\eta-1)}}`,
      symbols: "t는 해당 군집에 대한 전형성입니다.",
      meaning: "모든 군집의 전형성이 동시에 낮거나 높을 수 있습니다.",
      derivation: [
        "각 t에 대한 목적함수 미분을 0으로 둡니다.",
        "d²=0이면 정확히 t=1입니다. 그 외는 로그/softplus로 평가하며 epsilon을 더하지 않습니다.",
      ],
    },
    {
      title: "중심과 척도",
      tex: String.raw`v_j=\frac{\sum_i t_{ij}^{\eta}x_i}{\sum_i t_{ij}^{\eta}},\quad\Omega_j=\kappa\frac{\sum_i u_{ij}^{m}\|x_i-v_j^{FCM}\|^2}{\sum_i u_{ij}^{m}}`,
      symbols: "κ는 양수 계수, Ω는 거리 제곱 단위의 군집별 척도입니다.",
      meaning:
        "FCM m과 PCM η는 별도 파라미터입니다. 중심은 원본 ND 가중 평균입니다.",
      derivation: [
        "공통 로그 배율을 제거해 매우 작은 가중치의 비율을 보존합니다.",
        "자동 Ω=0이면 오류로 안내합니다. 수동 양수 척도는 별도 정책이며 상수 데이터의 퇴화를 숨기지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "거리·전형성 손계산",
    steps: [
      "X=(0,1,4), v=(0.5,3), Ω=(1,2), η=2를 둡니다.",
      "x=1에서 d²=(0.25,4), t=(0.8,1/3)이며 합은 1.133333입니다.",
      "d²=4, Ω=1의 단일 항은 t=0.2, t²·4+(1−t)²=0.8입니다.",
      "아래 실제 미니 실험은 같은 원본의 ND FCM 기준 U와 PCM T를 전용 분석에서 비교합니다. 위 고정 중심 손계산과 초기화가 다른 실제 반복 실험입니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect: "독립 중심의 개수입니다.",
      experiment: "중복 중심과 argmax 개수 0을 유효 가중치 소실과 구분하세요.",
    },
    {
      key: "typicalityExponent",
      effect: "PCM η>1입니다.",
      experiment: "η를 바꾸고 실제 T의 행 합과 J를 비교하세요.",
    },
    {
      key: "fuzziness",
      effect: "초기화 FCM m>1입니다.",
      experiment: "PCM η를 고정한 채 초기 기준을 바꿔 보세요.",
    },
    {
      key: "scaleCoefficient",
      effect: "자동 Ω의 양수 배율 κ입니다.",
      experiment: "κ를 바꾸면 전형성 범위와 결과가 달라집니다.",
    },
    {
      key: "pcmScaleMode",
      effect: "FCM 추정 또는 수동 양수 Ω입니다.",
      experiment: "상수 데이터에서 자동 오류와 수동 퇴화 진단을 구분하세요.",
    },
    {
      key: "pcmScale",
      effect: "수동 모드의 모든 군집에 적용할 양수 Ω입니다.",
      experiment: "κ와 Ω의 단위가 다름을 확인하세요.",
    },
    {
      key: "warmIterations",
      effect: "실제 ND FCM 초기화 반복 한도입니다.",
      experiment: "초기화 수렴 여부와 PCM 종료 여부를 별도로 읽으세요.",
    },
    {
      key: "iterations",
      effect: "PCM 중심 갱신 반복 한도입니다.",
      experiment: "1회 종료는 고정점 수렴을 보장하지 않습니다.",
    },
  ],
  complexity: {
    theory: "FCM 초기화와 PCM 각각 O(iterations·nKd).",
    implementation:
      "큰 입력도 원본 전체를 계산하며 바이트 예산에 따라 중간 행렬만 요약합니다.",
    space: "작업 O(nd+nK+Kd), Trace 64MiB와 작업 256MiB를 별도 검사합니다.",
    cost: "중복 중심·국소해·초기 척도 민감성이 있습니다. 전형성을 확률로 해석하지 마세요.",
  },
  implementation: [
    "원본 전체 차원 계산과 표시 투영은 분리합니다. 저장된 정답 label은 사용하지 않습니다.",
    "K-Means++ 시드와 ND FCM 준비는 명시적 실행 정책입니다. 기존 2D FCM 엔진의 결과·초기화는 변경하지 않습니다.",
    "양수 Ω를 한 번 고정한 1993 목적을 사용합니다. 자동 척도 0, 비유한 거리, 실제 소실된 FCM 가중치는 오류로 구분합니다.",
    "로그 T와 로그 가중치를 보존합니다. 표시 수치가 0으로 반올림될 수 있으며 진단을 제공합니다. 최종 T는 반환 중심에서 재평가하며 고정점 잔차를 함께 표시합니다.",
    "원문 전체 인증과 실행 구현을 구분합니다. R ppclust는 실행하지 않았으며 독립 NumPy 직접 거듭제곱 검산을 사용했습니다.",
  ],
  comparison: [
    {
      other: "Fuzzy C-Means",
      difference:
        "FCM U는 행 합 1입니다. PCM T는 독립 전형성으로 모든 값이 함께 낮거나 높을 수 있습니다.",
    },
    {
      other: "GMM",
      difference:
        "GMM 사후확률의 행 합은 1입니다. PCM은 확률 모형 또는 공분산 추정이 아닙니다.",
    },
  ],
  references: [
    {
      title: "Krishnapuram & Keller (1993)",
      url: "https://doi.org/10.1109/91.227387",
      note: "대상 논문. 이번 세션에서 원문 전체는 접근하지 못했습니다.",
    },
    {
      title: "Pal et al. (2005), PCM 식 (8)–(11)",
      url: "https://www.comp.ita.br/~forster/CC-222/material/fuzzyclust/fuzzy01492404.pdf",
      note: "1993 목적·갱신·척도를 연구 문서에서 원문 대조합니다.",
    },
    {
      title: "ppclust PCM 공식 매뉴얼",
      url: "https://search.r-project.org/CRAN/refmans/ppclust/html/pcm.html",
      note: "oft=1과 1996 entropy 변형을 구분합니다. R 코드를 제품에 복사하지 않았습니다.",
    },
  ],
  preset: "blobs",
  events: ["initialize", "expectation", "typicality", "move", "finish"],
  advanced: [
    "중복 중심은 PCM의 알려진 한계이며 오류로 감추거나 가짜 분할을 만들지 않습니다.",
    "FPCM·MPCKMeans 등은 이번 구현에 포함하지 않습니다.",
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
    scaleCoefficient: 1,
    pcmScaleMode: "fcm",
    warmIterations: 30,
    iterations: 60,
    tolerance: 1e-9,
  },
};
