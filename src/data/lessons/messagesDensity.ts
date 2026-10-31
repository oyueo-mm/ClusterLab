import type { Lesson } from "./types";

export const affinity: Lesson = {
  purpose:
    "유사도 행렬에서 대표 관측점 exemplar를 찾는 메시지 전달 군집화입니다. 군집 수 대신 각 점의 preference를 지정합니다.",
  analogy:
    "각 점이 여러 대표 후보를 비교하고, 후보는 다른 점들의 지지를 합쳐 자신을 대표로 선택해도 되는지 답합니다.",
  operations: [
    {
      title: "유사도",
      input: "원본 수치 벡터, preference",
      calculation:
        "비대각에는 음의 제곱거리, 대각에는 preference를 저장합니다.",
      output: "실제 유사도 S 행렬",
    },
    {
      title: "Responsibility",
      input: "S와 이전 availability",
      calculation: "다른 후보의 최고 점수를 빼고 damping합니다.",
      output: "부호 있는 R 메시지 행렬",
    },
    {
      title: "Availability",
      input: "새 R",
      calculation:
        "다른 점의 양의 지지를 더합니다. 대각은 별도 식을 사용합니다.",
      output: "부호 있는 A 메시지 행렬",
    },
    {
      title: "추출·종료",
      input: "diag(R+A)",
      calculation:
        "양의 자기 증거로 exemplar를 판정하고, 상태가 수렴 창 동안 유지되었는지 검사합니다. 관측 대표점 정제 후 할당합니다.",
      output: "관측 exemplar, 레이블, 수렴 여부",
    },
  ],
  equations: [
    {
      title: "경쟁 후보와 지지 메시지",
      tex: String.raw`r(i,k)=s(i,k)-\max_{l\ne k}\{a(i,l)+s(i,l)\},\quad a(i,k)=\min\!\left(0,r(k,k)+\sum_{j\notin\{i,k\}}\max(0,r(j,k))\right)`,
      symbols:
        "i: 대상 점, k: 대표 후보, s: 유사도, r/a: 실수 메시지. 두 번째 식은 i≠k입니다.",
      meaning: "거리, 확률, 퍼지 소속도와 구분되는 경쟁·지지 점수입니다.",
      derivation: [
        "responsibility는 현재 후보와 최선의 대체 후보의 점수 차이입니다.",
        "availability는 후보 자신의 증거에 다른 점들의 양의 지지만 더하며 비대각을 0 이하로 제한합니다.",
      ],
    },
    {
      title: "대각과 damping",
      tex: String.raw`a(k,k)=\sum_{i\ne k}\max(0,r(i,k)),\qquad m_{new}=\lambda m_{old}+(1-\lambda)\widehat m`,
      symbols:
        "m: R 또는 A 메시지, λ: damping. 대각 availability는 비대각과 달리 양수일 수 있습니다.",
      meaning: "이전 메시지와 새 값을 섞어 진동을 줄입니다.",
      derivation: [
        "자기 availability는 다른 점들의 지지 합입니다. 비대각의 min(0,⋅)를 그대로 사용하면 exemplar 판정이 달라집니다.",
      ],
    },
  ],
  numerical: {
    title: "좌표 0,1,4, preference=-2, damping=0.5",
    steps: [
      "초기 A=0. 첫 행 S는 (-2,-1,-16)입니다.",
      "damping 전 r(0,0)=-1, r(0,1)=1, r(0,2)=-15이므로 실제 새 R 첫 행은 (-0.5,0.5,-7.5)입니다.",
      "다른 행을 갱신하면 r(1,0)=0.5, r(2,0)=-7입니다. 새 a(0,0)=0.5×0.5=0.25입니다.",
    ],
  },
  parameters: [
    {
      key: "preference",
      effect:
        "크면 많은 점이 exemplar가 되기 쉽습니다. K를 고정하는 파라미터는 아닙니다.",
      experiment: "같은 데이터에서 -0.1과 -0.01을 비교하세요.",
    },
    {
      key: "damping",
      effect: "0.5 이상 1 미만. 클수록 이전 메시지를 오래 유지합니다.",
      experiment: "반복 수를 충분히 두고 0.5와 0.9의 메시지 변화를 비교하세요.",
    },
    {
      key: "convergenceWindow",
      effect: "exemplar 상태가 연속 유지되어야 하는 반복 수입니다.",
      experiment: "반복 한도 종료의 converged=false와 비교하세요.",
    },
  ],
  complexity: {
    theory: "T회 dense 메시지 갱신 O(Tn²), 거리 구성 O(n²d).",
    implementation: "행별 최고/차고 점수와 열별 양의 합을 재사용합니다.",
    space: "계산 O(n²), 행렬 Trace는 별도 바이트 예산 적용.",
    cost: "메시지 행렬과 전체 기록이 큰 비용입니다.",
  },
  implementation: [
    "전체 N차원 특성으로 유사도를 계산합니다. 표시 좌표는 exemplar를 그릴 때만 사용합니다.",
    "고정된 동률 순서를 사용합니다. 모든 비대각 유사도가 같으면 preference 비교의 해석적 최적 분할을 명시적으로 기록합니다.",
    "exemplar가 없으면 수렴 실패 오류입니다. 한도에 도달해 exemplar가 있으면 현재 분할과 converged=false를 표시합니다.",
  ],
  comparison: [
    {
      other: "PAM",
      difference:
        "PAM은 대표 수 K를 고정하고 교환 비용을 탐색합니다. AP는 유사도와 메시지 및 preference로 대표 수를 결정합니다.",
    },
  ],
  references: [
    {
      title:
        "Frey & Dueck (2007), Clustering by Passing Messages Between Data Points",
      url: "https://utstat.utoronto.ca/reid/sta414/frey-affinity.pdf",
      note: "원문 1–2쪽의 R/A·대각·damping 확인.",
    },
    {
      title: "scikit-learn AffinityPropagation",
      url: "https://scikit-learn.org/stable/modules/generated/sklearn.cluster.AffinityPropagation.html",
      note: "검증용 1.7.2와 실제 분할·관측 exemplar 비교. 제품 코드 복사 없음.",
    },
  ],
  preset: "blobs",
  events: ["messages", "extract"],
  advanced: [
    "메시지는 소속 확률이 아닙니다. preference와 초기 동률, 진동 및 반복 한도에 따라 다른 해를 얻을 수 있으며 전역 최적을 보장하지 않습니다.",
  ],
  experimentParams: { iterations: 200, convergenceWindow: 10 },
};

export const densitypeaks: Lesson = {
  purpose:
    "국소 밀도 ρ와 앞선 밀도 순위 점까지의 거리 δ로 군집 중심 후보를 구별합니다. 이 엔진은 명시적인 상위 γ=ρδ 중심 선택 변형을 사용합니다.",
  analogy:
    "밀집 지역 중에서도 더 높은 밀도의 지역과 멀리 떨어진 봉우리를 찾고, 나머지는 가까운 상위 순위 이웃의 소속을 따라갑니다.",
  operations: [
    {
      title: "밀도",
      input: "전체 원본 특성 거리와 dc",
      calculation:
        "자기 자신을 제외한 Gaussian 또는 cutoff 이웃 기여를 합칩니다.",
      output: "각 점의 실제 ρ",
    },
    {
      title: "부모와 δ",
      input: "ρ 내림차순",
      calculation:
        "앞선 순위 중 최근접 점을 부모로 정합니다. 동밀도는 인덱스 순서입니다.",
      output: "부모 간선과 실제 δ",
    },
    {
      title: "중심 선택",
      input: "결정 그래프 (ρ,δ)",
      calculation:
        "최상위 루트를 유지하고 γ 순위에서 중복 위치를 제외한 최대 K개 중심을 선택합니다.",
      output: "선택 중심, ρδ 점수",
    },
    {
      title: "할당·halo",
      input: "부모와 중심",
      calculation:
        "밀도 순서로 부모 소속을 상속합니다. 다른 군집의 dc 이웃 쌍에서 경계 밀도를 계산합니다.",
      output: "전체 분할과 별도 halo 표지",
    },
  ],
  equations: [
    {
      title: "밀도와 결정 그래프",
      tex: String.raw`\rho_i=\sum_{j\ne i}\exp\!\left[-(d_{ij}/d_c)^2\right],\quad \delta_i=\min_{j\prec i}d_{ij},\quad \gamma_i=\rho_i\delta_i`,
      symbols:
        "dc>0: 밀도 스케일, j≺i: 밀도 내림차순에서 앞선 점. cutoff는 Gaussian 항 대신 1[d_ij<dc]를 사용합니다.",
      meaning: "ρ는 밀집도, δ는 앞선 순위의 점과 떨어진 정도입니다.",
      derivation: [
        "거리만으로 밀도를 합산하므로 화면 투영이 바뀌어도 원본 특성이 같으면 결과가 같습니다.",
        "원저자 MATLAB 코드의 정렬 순위 관례를 사용합니다. 최고 순위의 δ는 다른 δ들의 최댓값입니다. 같은 밀도는 엄밀한 고밀도 관계가 아니므로 인덱스 동률 정책을 명시합니다.",
      ],
    },
  ],
  numerical: {
    title: "0,0.1,1,1.1 · cutoff dc=0.2 · K=2",
    steps: [
      "자기 자신을 제외하면 각 점의 ρ는 모두 1입니다. 순위는 인덱스 순서입니다.",
      "부모는 각각 없음,0,1,2이며 δ는 (0.9,0.1,0.9,0.1)입니다. 첫 값은 다른 δ의 최댓값입니다.",
      "γ 상위의 서로 다른 위치 0과 1을 중심으로 선택해 {0,0.1}, {1,1.1}을 얻습니다. 군집 사이 dc 이웃이 없어 halo는 없습니다.",
    ],
  },
  parameters: [
    {
      key: "epsilon",
      effect: "dc이며 일반 DBSCAN의 군집 확장 반경과 역할이 다릅니다.",
      experiment: "0.05와 0.2의 결정 그래프를 비교하세요.",
    },
    {
      key: "densityKernel",
      effect: "Gaussian은 연속 밀도, cutoff는 엄격한 d<dc 이웃 수입니다.",
      experiment: "같은 dc에서 ρ 동률과 중심 순위를 비교하세요.",
    },
    {
      key: "k",
      effect:
        "상위 γ 선택의 최대 중심 수입니다. 동일 위치는 하나로 정리합니다.",
      experiment: "2와 3의 중심 및 부모 할당을 비교하세요.",
    },
  ],
  complexity: {
    theory: "거리 O(n²d), 밀도·부모·halo O(n²), 정렬 O(n log n).",
    implementation:
      "모든 점과 원본 차원을 계산합니다. 대형 입력은 부모·할당 기록을 단계별로 요약합니다.",
    space: "거리 행렬 O(n²), 결정 그래프 O(n), Trace 별도 바이트 예산.",
    cost: "공간 인덱스 없는 정확 dense 구현입니다.",
  },
  implementation: [
    "원문 코드의 수동 사각형 중심 선택을 자동 추정인 것처럼 표시하지 않습니다. 이 엔진은 루트+상위 γ의 명시적 K 선택 변형입니다.",
    "동률의 부모 관계는 앞선 정렬 순위입니다. 동일 위치 중심을 중복 선택하지 않습니다.",
    "halo는 별도 표지이며 최종 분할 레이블을 노이즈로 조용히 덮어쓰지 않습니다.",
  ],
  comparison: [
    {
      other: "DBSCAN",
      difference:
        "DBSCAN은 핵심점의 밀도 도달 가능성으로 확장하고, 이 방법은 선택 봉우리와 상위 순위 부모 관계를 사용합니다.",
    },
  ],
  references: [
    {
      title:
        "Rodriguez & Laio (2014), Clustering by fast search-and-find of density peaks",
      url: "https://doi.org/10.1126/science.1242072",
      note: "원논문 서지. 원문 PDF는 기관 저장소에서 열람 제한.",
    },
    {
      title: "원저자 cluster_dp MATLAB 자료",
      url: "https://people.sissa.it/~laio/Research/Clustering_source_code/cluster_dp.tgz",
      note: "직접 내려받아 밀도·δ·정렬 순위·halo 절차 확인. 원본 코드 제품 복사/재배포 없음.",
    },
  ],
  preset: "blobs",
  events: ["density", "distance", "extract", "assign"],
  advanced: [
    "평탄한 밀도나 dc 설정 오류는 결정 그래프의 봉우리를 모호하게 만듭니다. K 선택은 원문의 수동 중심 판단을 대체하는 명시적 변형이며 자동 K 보장이 아닙니다.",
  ],
};
