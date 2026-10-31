import type { Lesson } from "./types";

export const kmedians: Lesson = {
  purpose:
    "L1 거리합을 줄이는 Lloyd형 K-Medians입니다. 좌표별 중앙값을 갱신하며 산술평균이나 Euclidean 기하중앙값을 사용하지 않습니다.",
  analogy:
    "멀리 떨어진 한 점의 크기보다 양쪽에 놓인 점의 수를 기준으로 대표 위치를 정합니다.",
  operations: [
    {
      title: "초기화",
      input: "2D 점, K, seed",
      calculation:
        "시드로 관측 위치를 섞고 같은 위치의 중복 중심을 제외합니다.",
      output: "초기 관측 중심",
    },
    {
      title: "L1 할당",
      input: "현재 중심",
      calculation: "|x−cx|+|y−cy|가 가장 작은 중심을 선택합니다.",
      output: "전체 실제 할당",
    },
    {
      title: "중앙값 갱신",
      input: "군집별 점",
      calculation:
        "각 좌표를 정렬해 중앙값을 구합니다. 짝수 개면 가운데 두 값의 평균을 사용합니다.",
      output: "새 중심과 L1 목적함수",
    },
    {
      title: "종료",
      input: "이전·현재 할당",
      calculation:
        "할당이 같거나 반복 한도에 도달하면 최종 중심으로 다시 전체 할당합니다.",
      output: "분할, 중심, 실제 최종 L1 비용",
    },
  ],
  equations: [
    {
      title: "L1 목적함수와 중앙값",
      tex: String.raw`J=\sum_i\|x_i-c_{z_i}\|_1=\sum_{i,a}|x_{ia}-c_{z_i a}|,\quad c_{ja}\in\operatorname{median}\{x_{ia}:z_i=j\}`,
      symbols:
        "z_i: 군집 번호, a: 좌표, c_j: 군집 중심. 여기서는 a∈{x,y}입니다.",
      meaning: "좌표별 절댓값 손실의 합은 각 좌표 중앙값에서 최소가 됩니다.",
      derivation: [
        "한 좌표의 중심을 오른쪽으로 옮기면 왼쪽 점들의 비용은 늘고 오른쪽 점들의 비용은 줄어듭니다. 양쪽 점 수가 균형인 중앙값에서 정류 조건을 만족합니다.",
        "짝수 집합은 가운데 두 값 사이의 모든 위치가 최적일 수 있습니다. 앱은 재현성을 위해 그 중간값을 고릅니다.",
      ],
    },
  ],
  numerical: {
    title: "(0,0),(1,2),(2,1),(20,20), K=1",
    steps: [
      "두 좌표 모두 정렬하면 0,1,2,20이므로 중앙값은 1.5입니다.",
      "중심 (1.5,1.5)의 L1 비용은 3+1+1+37=42입니다.",
      "산술평균 (5.75,5.75)의 L1 비용은 11.5+8.5+8.5+28.5=57입니다. 이 목적함수에서는 평균보다 중앙값이 적합합니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect: "최대 중심 수이며 동일 위치의 초기 중복은 제외합니다.",
      experiment: "노이즈 프리셋에서 K=2와 3을 비교하세요.",
    },
    {
      key: "iterations",
      effect: "할당과 중앙값 갱신의 반복 한도입니다.",
      experiment: "1회와 20회의 L1 비용을 비교하세요.",
    },
  ],
  complexity: {
    theory: "T회 O(T(nK+n log n))의 좌표 정렬 구현.",
    implementation: "2D Manhattan 거리, 좌표별 정렬 중앙값. 계산 상태 O(n+K).",
    space: "입력/군집 임시 배열 O(n), 실제 Trace 별도 예산.",
    cost: "각 군집의 중앙값 정렬과 전체 L1 할당이 주요 비용입니다.",
  },
  implementation: [
    "고정 할당에서 중앙값 갱신, 고정 중심에서 최근접 할당은 각각 L1 비용을 증가시키지 않습니다. 전역 최적은 보장하지 않습니다.",
    "빈 군집은 이전 중심을 유지합니다. 초기 동일 위치는 중복 선택하지 않으며 모든 좌표가 같으면 한 중심으로 실행합니다.",
    "2D 전용이며 N차원 입력을 투영해서 계산하는 엔진으로 표시하지 않습니다.",
  ],
  comparison: [
    {
      other: "K-Means",
      difference:
        "K-Means는 제곱 Euclidean 비용과 산술평균, 여기서는 L1 비용과 좌표별 중앙값입니다.",
    },
  ],
  references: [
    {
      title: "ELKI KMediansLloyd 공식 문서",
      url: "https://elki-project.github.io/releases/current/doc/elki/clustering/kmeans/KMediansLloyd.html",
      note: "Lloyd형 K-Medians의 독립 정의 확인. 코드 복사 없음.",
    },
    {
      title:
        "Bradley, Mangasarian & Street (1996), Clustering via Concave Minimization",
      url: "https://papers.nips.cc/paper/1260-clustering-via-concave-minimization",
      note: "L1 군집화 참고 문헌. 논문의 전체 최적화 절차와 이 Lloyd형 반복을 동일시하지 않습니다.",
    },
  ],
  preset: "outliers",
  events: ["assign", "move"],
  advanced: [
    "좌표별 중앙값은 축 방향 L1 손실에 대응합니다. 회전에 불변인 Euclidean 기하중앙값 문제와 다릅니다.",
  ],
};

export const minibatch: Lesson = {
  purpose:
    "작은 배치에서 할당을 고정한 뒤 누적 방문수에 따른 학습률로 중심을 갱신하는 Mini-Batch K-Means입니다. 이 엔진은 재현 가능한 비복원 epoch 변형을 사용합니다.",
  analogy:
    "데이터를 작은 묶음으로 살펴보고, 지금까지 각 대표가 담당한 점 수에 맞춰 새 묶음의 영향을 조절합니다.",
  operations: [
    {
      title: "초기화",
      input: "K, seed, 2D 원본 점",
      calculation:
        "서로 다른 관측 위치를 중심으로 선택하고 방문수는 0으로 둡니다.",
      output: "초기 중심과 counts",
    },
    {
      title: "배치 선택",
      input: "epoch, batchSize",
      calculation:
        "매 epoch 전체 인덱스를 시드로 섞어 중복 없이 나눕니다. 모든 점을 한 번씩 방문합니다.",
      output: "실제 현재 batch 인덱스",
    },
    {
      title: "할당·갱신",
      input: "배치와 갱신 전 중심",
      calculation:
        "배치의 최근접 할당을 먼저 고정한 뒤 방문수를 누적하고 η=1/v로 갱신합니다.",
      output: "실제 batch-assignment → batch-update",
    },
    {
      title: "전체 평가",
      input: "epoch 후 중심",
      calculation: "모든 점의 최근접 할당과 전체 SSE를 다시 계산합니다.",
      output: "최종 전체 분할과 epoch별 SSE",
    },
  ],
  equations: [
    {
      title: "방문수와 누적 평균",
      tex: String.raw`v_j\leftarrow v_j+1,\quad \eta_j=1/v_j,\quad c_j\leftarrow(1-\eta_j)c_j+\eta_j x`,
      symbols:
        "v_j: 중심 j가 누적 처리한 방문수, η_j: 해당 방문의 학습률, x: 배치에서 고정 할당된 점.",
      meaning: "새 배치를 처리할 때마다 이전 방문 이력과 새 표본을 합칩니다.",
      derivation: [
        "방문수 v−1일 때 중심이 이전 방문들의 평균이면 ((v−1)c+x)/v가 새 평균입니다.",
        "같은 점도 다음 epoch에 다시 방문하므로 counts는 데이터의 고유 점 개수가 아니라 실제 학습 방문수입니다.",
      ],
    },
  ],
  numerical: {
    title: "중심 0과 10, 배치 점 4와 6",
    steps: [
      "갱신 전 중심으로 두 할당을 먼저 고정하면 4→첫 중심, 6→둘째 중심입니다.",
      "방문수 0에서 η=1로 각각 4와 6이 됩니다. 첫 점 갱신 뒤 6을 다시 할당하는 온라인 처리와 구분합니다.",
      "다른 예로 이전 두 방문의 평균이 3이고 새 점이 10이면 방문수 3, 새 중심은 (2×3+10)/3=16/3입니다.",
    ],
  },
  parameters: [
    {
      key: "batchSize",
      effect:
        "한 번에 할당을 고정하는 묶음 크기입니다. 전체 점 수를 제한하지 않습니다.",
      experiment: "1,16,64의 중심 경로와 counts를 비교하세요.",
    },
    {
      key: "epochs",
      effect: "전체 데이터를 섞어서 순회할 횟수입니다.",
      experiment: "1과 8의 전체 SSE를 비교하세요.",
    },
    {
      key: "k",
      effect: "최대 초기 중심 수입니다.",
      experiment: "같은 시드에서 2와 3을 비교하세요.",
    },
  ],
  complexity: {
    theory: "E epoch 전체 학습 및 평가 O(EnK), 한 배치 갱신 O(bK), d=2.",
    implementation:
      "모든 점을 epoch마다 방문합니다. 전체 SSE 평가는 epoch 끝에만 수행합니다.",
    space: "계산 O(n+K+b), 상세 batch/epoch Trace는 별도 바이트 예산.",
    cost: "작은 배치는 이벤트가 많아지므로 예상 기록량이 크면 첫 배치와 epoch 요약을 기록합니다.",
  },
  implementation: [
    "Sculley의 배치 내 고정 할당·누적 방문수 갱신을 사용하며, 무작위 반복 추출 대신 시드 섞기의 비복원 epoch를 사용합니다. sklearn의 재할당·조기 종료 옵션과 동일하지 않습니다.",
    "학습 갱신은 전체 Lloyd 갱신과 다릅니다. 전체 SSE가 매 배치나 epoch에서 단조 감소한다고 주장하지 않습니다.",
    "최종 SSE와 레이블은 전체 원본 점을 사용합니다. 2D 전용이며 sparse L1-ball projection은 제공하지 않습니다.",
  ],
  comparison: [
    {
      other: "K-Means",
      difference:
        "Lloyd는 현재 전체 할당의 평균으로 교체합니다. Mini-Batch는 배치 할당과 누적 방문 이력을 유지합니다.",
    },
  ],
  references: [
    {
      title: "Sculley (2010), Web-Scale K-Means Clustering",
      url: "https://www.ra.ethz.ch/cdstore/www2010/www/p1177.pdf",
      note: "원문 Algorithm 1의 고정 배치 할당·방문수·학습률을 확인했습니다. 제품 코드 복사 없음.",
    },
    {
      title: "scikit-learn MiniBatchKMeans",
      url: "https://scikit-learn.org/stable/modules/generated/sklearn.cluster.MiniBatchKMeans.html",
      note: "독립 구현의 옵션과 차이 확인. 같은 초기화/순서를 보장하지 않는 최종값 동등성은 주장하지 않습니다.",
    },
  ],
  preset: "blobs",
  events: ["assign", "move"],
  advanced: [
    "각 점의 반복 방문은 학습 절차입니다. 전체 데이터 결과를 계산했다는 사실과 각 갱신이 미니배치만 사용했다는 사실을 구분합니다.",
  ],
  experimentParams: { batchSize: 4, epochs: 4 },
};
