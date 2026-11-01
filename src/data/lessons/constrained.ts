import type { Lesson } from "./types";

export const copkmeans: Lesson = {
  purpose:
    "원본 수치 데이터에서 Must-Link·Cannot-Link를 반드시 만족하는 분할을 순차적으로 찾는 COP-KMeans입니다. 가까운 중심이 관계를 위반하면 다음 후보를 실제로 검사합니다.",
  analogy:
    "함께 앉아야 하는 사람과 따로 앉아야 하는 사람이 있는 좌석 배치입니다. 순서대로 가장 가까운 자리를 고르다가 막힐 수 있으며, 다른 배치가 존재하지 않는다는 뜻은 아닙니다.",
  operations: [
    {
      title: "원본과 hard 관계",
      input: "ConstrainedDataset의 모든 수치 차원·ML/CL·K",
      calculation:
        "ML 연결 성분과 그 사이 CL을 희소하게 보존합니다. CL은 전이시키지 않으며 ML 내부 CL 모순은 오류입니다.",
      output: "initialize: 실제 성분·원래/유도 관계·시드 K-Means++ 중심",
    },
    {
      title: "거리와 실제 허용 후보",
      input: "원본 행 순서·이미 처리된 성분 label",
      calculation:
        "중심까지 제곱거리순으로 검사합니다. ML 성분에 앞서 배치된 행이 있으면 같은 label만 허용하고, CL 이웃 성분의 현재 label을 피합니다.",
      output: "test: 실제 검사 prefix·거리·거부 witness",
    },
    {
      title: "할당 또는 실패",
      input: "첫 허용 후보 또는 후보 없음",
      calculation:
        "허용 후보에 실제 할당합니다. 후보가 없으면 실제 부분 상태를 기록하고 실패 오류를 냅니다. 빈 성공 결과로 바꾸지 않습니다.",
      output: "assign 또는 test/greedy-failure",
    },
    {
      title: "전체 원본 평균",
      input: "모든 행의 실제 hard-feasible label",
      calculation:
        "모든 원본 차원 평균과 그 할당의 SSE를 계산합니다. 빈 군집 중심은 유지하며 실제 활성 수를 따로 표시합니다.",
      output: "move → 반복 또는 finish; 원본 ND 중심·SSE·종료 이유",
    },
  ],
  equations: [
    {
      title: "Hard 제약 아래 제곱오차",
      tex: String.raw`J=\sum_i\lVert x_i-\mu_{z_i}\rVert_2^2,\quad z_i=z_j\ ((i,j)\in M),\quad z_i\ne z_j\ ((i,j)\in C)`,
      symbols:
        "x_i: 실제 원본 전체 차원, μ_h: 수치 평균, z_i: 군집, M/C: ML/CL.",
      meaning:
        "제약은 거리 대신 soft 벌점을 더하는 항이 아니라 허용되는 분할의 조건입니다.",
      derivation: [
        "가까운 중심이 있어도 hard 관계 위반이면 할당할 수 없습니다.",
        "최종 SSE는 실제 제약 분할로 계산합니다. 마지막에 무제약 최근접 재할당하면 결과를 망가뜨릴 수 있습니다.",
      ],
    },
    {
      title: "원래 pointwise greedy 선택",
      tex: String.raw`z_i=\arg\min_{h\in\mathcal F_i}\lVert x_i-\mu_h\rVert_2^2`,
      symbols:
        "F_i: 이 pass에서 이미 처리된 ML/CL 관계를 위반하지 않는 군집 후보.",
      meaning:
        "현재 행에 허용되는 후보 중 가장 가깝게 배치합니다. 전체 제약 목적의 전역 최적 선택이 아닙니다.",
      derivation: [
        "거리순으로 실제 후보를 검사하며 동률은 중심 인덱스순입니다.",
        "F_i가 비면 현재 greedy 실행은 실패합니다. 그래프 K-색칠 불가능성 증명이 아닙니다.",
      ],
    },
    {
      title: "실제 평균 갱신",
      tex: String.raw`\mu_h={1\over n_h}\sum_{i:z_i=h}x_i`,
      symbols: "n_h: 해당 군집의 실제 원본 행 수.",
      meaning:
        "ML 성분을 단순한 한 점으로 축약하지 않고 실제 원본 행마다 같은 가중치로 평균을 계산합니다.",
      derivation: [
        "고정된 feasible label에서 평균은 그 군집 SSE를 최소화합니다.",
        "빈 군집은 평균이 정의되지 않아 이전 중심을 보존합니다. pointwise 재할당의 전체 반복 SSE 단조성·전역 최적은 주장하지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "같은 중심 좌표여도 hard 관계는 서로 다른 군집을 요구할 수 있습니다",
    steps: [
      "원본 [0,2,3,5], K=2, ML=(1행,4행), CL=(1행,2행),(1행,3행)를 둡니다.",
      "관계를 만족하는 분할은 {0,5}와 {2,3}입니다. 두 평균은 모두 2.5입니다.",
      "실제 SSE=(0−2.5)²+(5−2.5)²+(2−2.5)²+(3−2.5)²=13입니다.",
      "마지막 무제약 tie 재할당으로 네 점을 모두 한 군집에 넣으면 CL 위반입니다. 반환 label은 실제 hard 할당을 그대로 유지합니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "허용되는 군집 중심 수 K입니다. 정수1≤K≤원본 행 수이며 빈 군집이 있으면 실제 활성 수는 더 작습니다.",
      experiment: "K를 줄여 현재 순서에서 실패하는 경우를 확인하세요.",
    },
    {
      key: "seed",
      effect:
        "실제 관측 행의 K-Means++ 초기 선택을 정합니다. 원본 처리 순서를 섞지 않습니다.",
      experiment:
        "seed를 바꾸어 feasible 결과 또는 greedy 실패가 달라지는지 보세요.",
    },
    {
      key: "iterations",
      effect: "실제 전체 pass의 최대 횟수입니다.",
      experiment: "1회 한도와 안정 할당 종료를 구별하세요.",
    },
    {
      key: "tolerance",
      effect:
        "원본 차원의 최대 중심 이동 허용오차입니다. label 안정과 별도 종료 이유로 기록합니다.",
      experiment: "0과 큰 값에서 종료 이유를 비교하세요.",
    },
  ],
  complexity: {
    theory:
      "각 pass 거리·후보 정렬 O(nKd+nK log K), 제약 검사는 ML 성분 크기 s_c와 CL 차수 q_c에 대해 O(KΣ_c s_c q_c)의 상한. 희소 UF 전처리 O((n+E)α(n)) 외 canonical 정렬 O(E log E).",
    implementation:
      "전체 원본 행 순서 pointwise greedy입니다. 전역 feasible/최적 partition을 전수 탐색하지 않습니다. 같은 성분을 평균 한 점으로 대체하지 않습니다.",
    space:
      "원본·중심 O(nd+Kd), UF·성분·관계 O(n+E), 상세 Trace 별도 byte 예산. closure n² 행렬 없음.",
    cost: "최종 실제 SSE와 활성 K, 빈 중심, 반복·종료 이유를 기록합니다. 대형 입력도 전체 계산하고 pass 기록임을 명시합니다.",
  },
  implementation: [
    "매 pass는 새 미할당 label로 시작하며 이미 처리된 행의 관계를 검사합니다. 원문 prose의 already assigned를 따르는 명시적 실행 정책입니다.",
    "K개의 서로 다른 원본 행 인덱스를 고릅니다. 중복 좌표의 D²가 모두0이면 남은 행 인덱스순으로 채웁니다. hard CL이 같은 좌표를 구분할 수 있습니다.",
    "원본 순서·초기화에 의존합니다. greedy 실패는 실제 오류이며 Worker의 실패 부분 Trace 전달은 아직 지원하지 않습니다.",
    "원문 pointwise hard 제약 절차에 시드 K-Means++·중심 이동 tolerance·빈 중심 유지·유한 반복 한도를 명시적으로 적용했습니다. 모든 조합의 원저자 구현과 같다고 하지 않습니다.",
  ],
  comparison: [
    {
      other: "K-Means",
      difference:
        "K-Means는 관계를 무시해 가까운 중심에 배치합니다. COP는 실제 허용 후보만 선택하고 배치 실패할 수 있습니다.",
    },
    {
      other: "DP-Means",
      difference:
        "DP-Means는 제곱거리와 λ로 중심을 새로 만듭니다. COP는 지정 K 안에서 hard 관계를 지키며 새 중심으로 실패를 숨기지 않습니다.",
    },
  ],
  references: [
    {
      title:
        "Wagstaff et al. (2001), Constrained K-means Clustering with Background Knowledge",
      url: "https://wkiri.com/research/papers/wagstaff-kmeans-01.pdf",
      note: "원저자 PDF §3.1–3.2/Table1, ML 전이·CL 유도·이미 처리된 관계·실패 정의 확인. 코드 복사 없음.",
    },
    {
      title: "원저자 COP 저장소",
      url: "https://github.com/wkiri/cop-kmeans",
      note: "확인 시 README와 라이선스만 존재하는 예정 저장소입니다. 실행 가능한 원저자 oracle로 사용하지 않았습니다.",
    },
  ],
  preset: "tiny",
  events: ["test", "assign", "move", "finish"],
  experimentParams: { k: 2, seed: 42, iterations: 10, tolerance: 1e-9 },
  experimentDataset: {
    kind: "constrained",
    data: {
      kind: "numeric",
      featureNames: ["겹치는 X", "겹치는 Y", "실제 구분 Z"],
      values: [
        [0.2, 0.3, 0],
        [0.3, 0.3, 0.2],
        [0.4, 0.3, 0.4],
        [0.2, 0.3, 3],
        [0.3, 0.3, 3.2],
        [0.4, 0.3, 3.4],
      ],
    },
    mustLink: [
      [0, 1],
      [1, 2],
      [3, 4],
    ],
    cannotLink: [[2, 3]],
  },
  advanced: [
    "ML 전이 폐쇄와 CL의 ML 성분 간 전파를 구별합니다. CL을 전이시키면 잘못된 제약을 만듭니다.",
    "초기화·tie·원본 순서를 고정해야 재현할 수 있습니다. feasible 해가 있어도 greedy 배치는 막힐 수 있습니다.",
    "기초 수치 예제는 같은 평균을 갖는 4행 데이터이고 미니 실험은 실제3D 데이터6행입니다. 서로 다른 목적의 예제입니다.",
  ],
};
