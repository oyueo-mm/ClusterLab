import type { Lesson } from "./types";

export const xmeans: Lesson = {
  purpose:
    "X-Means는 부모 군집과 실제 두 자식 군집의 모델 점수를 비교하여 군집 수를 늘립니다. 여기서는 Pelleg–Moore 원문의 X-Means BIC 공식을 사용하는 제한 범위를 명시합니다.",
  analogy:
    "대표를 하나 더 늘리기 전에 두 대표가 설명력을 충분히 높이는지 복잡도 비용까지 합산해 심사합니다.",
  operations: [
    {
      title: "전체 정제",
      input: "원본 모든 차원·초기 K·seed",
      calculation:
        "실제 전체 Lloyd 할당과 평균을 반복합니다. 빈 중심은 제거합니다.",
      output: "전체 레이블·ND 평균·SSE",
    },
    {
      title: "국소 후보",
      input: "각 부모의 원본 점",
      calculation:
        "평균에서 시드 방향으로 반대편 두 중심을 두고 부모 데이터만으로 실제 2-Means를 수행합니다.",
      output: "후보 두 자식·군집별 잔차",
    },
    {
      title: "BIC 심사",
      input: "부모 K=1과 자식 K=2의 n,d,SSE",
      calculation:
        "동일한 부모 표본 수 n으로 원문 분산·우도 점수·자유도를 계산합니다. 자식 점수가 더 클 때만 수용합니다.",
      output: "실제 before/after·수용/거절",
    },
    {
      title: "전체 모델 선택",
      input: "수용된 국소 분할",
      calculation:
        "분할 후 전체 데이터로 다시 정제하고 탐색 중 전역 점수가 가장 높은 모델을 보존합니다.",
      output: "최종 실제 분할과 수렴/한도 정보",
    },
  ],
  equations: [
    {
      title: "원문 X-Means 점수",
      tex: String.raw`\widehat\sigma^2=\frac{\mathrm{SSE}}{n-K},\qquad p=K(d+1),\qquad BIC_X=\ell_X-\frac p2\log n`,
      symbols:
        "n: 비교하는 동일 표본 수, d: 원본 차원, K: 해당 모델 중심 수, p: 원문 자유도.",
      meaning:
        "SSE 감소만으로 분할하지 않고 모델 복잡도를 벌점으로 비교합니다.",
      derivation: [
        "부모와 두 자식은 같은 표본을 사용하되 K와 군집 크기가 다릅니다.",
        "이는 원문 X-Means의 점수 규약입니다. σ²를 일반적인 d차원 구형 Gaussian의 정확한 MLE라고 부르지 않습니다.",
      ],
    },
    {
      title: "공개된 군집별 점수",
      tex: String.raw`\ell_X=\sum_j\left[n_j\log\frac{n_j}{n}-\frac{n_j}{2}\log(2\pi)-\frac{n_jd}{2}\log\widehat\sigma^2-\frac{n_j-K}{2}\right]`,
      symbols: "n_j: 실제 j군집 표본 수. 모든 로그는 자연로그입니다.",
      meaning:
        "원문의 정규화와 잔차 항을 그대로 사용하는 공개 X-Means 규약입니다.",
      derivation: [
        "군집별 크기와 전체 잔차를 실제 분할에서 구합니다.",
        "원문에는 정규화/분산 식의 통계적 한계가 알려져 있습니다. 이를 숨기거나 수정된 Gaussian 우도와 동일시하지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "세 번째 축으로만 나뉘는 여섯 점",
    steps: [
      "x=y=0, z=0,0.1,0.2,2,2.1,2.2입니다. 한 평균은 z=1.1, 두 평균은 z=0.1/2.1입니다.",
      "원문 점수의 부모는 약 −13.297845, 두 자식은 23.606980이므로 이 분할은 수용합니다.",
      "이 수치는 독립 NumPy 식과 비교합니다. 일반 데이터에서 참 K를 찾는다는 보장은 아닙니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect: "최초 탐색 중심 수입니다.",
      experiment: "1과 2에서 탐색 경로를 비교하세요.",
    },
    {
      key: "maxClusters",
      effect:
        "사용자가 선택한 모델 복잡도 상한이며 데이터 개수 상한이 아닙니다.",
      experiment: "4와 8에서 실제 BIC 수용 경로를 비교하세요.",
    },
    {
      key: "iterations",
      effect: "각 전체/국소 Lloyd 최대 반복입니다.",
      experiment: "작은 반복 한도의 미수렴 정보를 확인하세요.",
    },
  ],
  complexity: {
    theory:
      "한 Lloyd 실행 O(TnKd), 분할 라운드·지역 탐색 횟수를 추가해야 합니다.",
    implementation:
      "브라우저 구현은 정확한 전체 점 스캔이며 논문의 kd-tree 가속은 없습니다.",
    space: "원본·할당 O(nd+n), 중심 O(Kd), Trace 별도 예산.",
    cost: "원문의 BIC는 작은/낮은 유효 차원 표본에서 과분할할 수 있습니다.",
  },
  implementation: [
    "원본 모든 차원을 사용하며 표시 좌표는 계산하지 않습니다. 시드 초기화/분할 방향과 실제 판단을 기록합니다.",
    "n≤K 후보 점수는 불허하고 SSE=0 부모는 더 나누지 않습니다. 임의 epsilon 분산을 만들어 정규화하지 않습니다.",
    "최대 K를 엄격히 지키는 실행 정책입니다. 원문/ELKI의 느슨한 상한과 구분합니다. 최종 출력은 탐색 중 최선 전역 점수 모델입니다.",
  ],
  comparison: [
    {
      other: "G-Means",
      difference:
        "G-Means는 실제 분할 방향의 정규성 검정, X-Means는 명시된 BIC 점수로 결정합니다.",
    },
    {
      other: "Bisecting K-Means",
      difference:
        "이분할 K-Means는 지정한 목표 K까지 분할하며 X-Means는 점수 심사를 합니다.",
    },
  ],
  references: [
    {
      title: "Pelleg & Moore (2000), X-means",
      url: "https://www.cs.cmu.edu/~dpelleg/download/xmeans.pdf",
      note: "원문 pp2–4를 로컬 PDF 이미지로 직접 읽어 모델 탐색·BIC 식을 확인했습니다.",
    },
    {
      title: "ELKI BayesianInformationCriterionXMeans",
      url: "https://elki-project.github.io/releases/current/doc/elki/clustering/kmeans/quality/BayesianInformationCriterionXMeans.html",
      note: "공식 구현 문서도 원문 점수의 알려진 문제를 명시합니다. 제품 코드 복사 없음.",
    },
  ],
  preset: "blobs",
  events: ["test", "split", "move"],
  advanced: [
    "원문의 X-Means 점수는 완전한 Gaussian mixture likelihood나 전역 최적성 증명이 아닙니다. 다른 BIC 변형을 쓸 때는 명칭과 식을 분리해야 합니다.",
  ],
  experimentParams: { k: 1, maxClusters: 4, iterations: 30 },
};

export const gmeans: Lesson = {
  purpose:
    "G-Means는 두 후보 중심이 제안하는 방향에 원본 점을 투영하고 Anderson–Darling 정규성 검정으로 분할을 수용합니다. 실제 가설검정과 전체 K-Means 정제를 수행합니다.",
  analogy:
    "방 하나 안의 분포가 한 Gaussian 모양인지 실제 표본으로 검사해, 충분한 기각 근거가 있으면 두 방으로 나눕니다.",
  operations: [
    {
      title: "PCA 후보",
      input: "부모 원본 벡터·평균·공분산",
      calculation:
        "최대 고유벡터 s와 고유값 λ로 c±s√(2λ/π) 두 후보를 만듭니다.",
      output: "실제 ND 후보 중심",
    },
    {
      title: "분할 방향",
      input: "후보 2-Means의 실제 최종 중심",
      calculation:
        "v=c1−c2로 투영한 뒤 표본 평균과 표본 표준편차로 표준화합니다.",
      output: "실제 정렬 z값",
    },
    {
      title: "정규성 검정",
      input: "정렬 z·정규 log-CDF",
      calculation:
        "원문 A²와 보정 A²*를 계산하고 검증된 α=.0001 임계값 1.8692와 비교합니다.",
      output: "검정 통계량·기각/비기각",
    },
    {
      title: "정제와 반복",
      input: "수용된 자식들",
      calculation: "모든 원본 점과 전체 중심으로 Lloyd를 다시 수행합니다.",
      output: "수용 분할이 없거나 사용자 한도까지 반복",
    },
  ],
  equations: [
    {
      title: "Anderson–Darling 통계량",
      tex: String.raw`A^2=-n-\frac1n\sum_{i=1}^n(2i-1)\left[\log\Phi(z_{(i)})+\log\Phi(-z_{(n+1-i)})\right]`,
      symbols: "Φ: 표준 정규 CDF, z_(i): 표준화 후 정렬된 실제 투영값.",
      meaning:
        "Gaussian과 empirical CDF의 차이를 꼬리에도 민감하게 평가합니다.",
      derivation: [
        "v의 크기는 이후 표준화로 제거됩니다. 모든 원본 차원이 후보 중심과 v 계산에 참여합니다.",
        "작은 꼬리 확률을 0으로 반올림하지 않도록 log-CDF를 안정적으로 계산합니다.",
      ],
    },
    {
      title: "원문 보정과 판정",
      tex: String.raw`A_*^2=A^2\left(1+\frac4n-\frac{25}{n^2}\right),\qquad A_*^2>1.8692\ \Longrightarrow\ \text{split}`,
      symbols: "n: 해당 부모 표본 수. 임계값은 원문 α=.0001 예시를 사용합니다.",
      meaning: "일반 통계 패키지의 다른 AD 보정을 무조건 섞지 않습니다.",
      derivation: [
        "검정에서 평균·분산을 표본으로 추정했으므로 원문의 보정을 적용합니다.",
        "최소 8개 표본·양의 분산을 요구하며 비기각을 정규성의 증명으로 설명하지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "정규성 검정 손검산 절차",
    steps: [
      "투영값에서 평균을 빼고 ddof=1 표준편차로 나눈 뒤 정렬합니다.",
      "독립 SciPy log_ndtr의 고정 40점 두 봉우리 fixture는 원문 보정 A²*≈6.742551입니다.",
      "6.742551>1.8692이므로 이 fixture에서는 두 자식을 수용합니다. 고정 8점 정규 fixture의 A²*≈0.551157은 비기각합니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect: "초기 중심 수입니다.",
      experiment: "초기 K=1과 2의 검정 대상을 비교하세요.",
    },
    {
      key: "minSamples",
      effect: "검정할 부모의 최소 표본 수로 8 이상입니다.",
      experiment: "작은 군집이 검정되지 않는 이유를 확인하세요.",
    },
    {
      key: "significance",
      effect: "현재는 원문으로 확인한 α=.0001만 지원합니다.",
      experiment: "임계값 1.8692와 실제 A²*를 비교하세요.",
    },
    {
      key: "maxClusters",
      effect: "사용자 모델 K 한도입니다.",
      experiment: "한도 종료와 비기각 종료를 구분하세요.",
    },
  ],
  complexity: {
    theory:
      "전체/국소 Lloyd와 부모별 공분산 O(nd²), dense 고유해 O(d³), 투영 정렬 O(n log n).",
    implementation:
      "모든 원본 차원의 공분산을 실제로 구합니다. 큰 d에서는 공분산 바이트 예산을 검사합니다.",
    space: "원본 O(nd), 부모 공분산 O(d²), Trace 별도.",
    cost: "여러 정규성 검정의 오류율·작은 표본의 검정력·Gaussian 가정이 실제 K 선택에 영향을 줍니다.",
  },
  implementation: [
    "표본 분산 ddof=1과 원문 AD 보정을 명시합니다. 다른 α는 검증된 임계값 없이 가짜 보간하지 않고 오류를 반환합니다.",
    "0분산/작은 부모는 무리하게 나누지 않습니다. 사용자 한도는 통계적 수렴과 구분합니다.",
    "정규성 검정이 임의 군집의 참 개수나 비구형 모든 모양을 정확히 복원한다고 주장하지 않습니다.",
  ],
  comparison: [
    {
      other: "X-Means",
      difference: "모델 BIC와 정규성 가설검정은 다른 결정 규칙입니다.",
    },
    {
      other: "Dip-Means",
      difference:
        "Dip-Means는 Gaussian 정규성이 아닌 거리분포의 단봉성을 검사합니다.",
    },
  ],
  references: [
    {
      title: "Hamerly & Elkan (2003), Learning the k in k-means",
      url: "https://papers.nips.cc/paper/2526-learning-the-k-in-k-means.pdf",
      note: "Algorithm1/§2.1, 원문 보정 Eq2 및 α=.0001/1.8692를 확인했습니다.",
    },
    {
      title: "ELKI 0.8 GMeans 공식 문서",
      url: "https://elki-project.github.io/releases/current/doc/elki/clustering/kmeans/GMeans.html",
      note: "Anderson–Darling 기반 자동 중심 수와 국소 분할 계약 참고. ELKI 전체 결과 동등성을 주장하지 않습니다.",
    },
  ],
  preset: "blobs",
  events: ["test", "split", "move"],
  advanced: [
    "다중 검정의 Bonferroni 해석과 모델 선택의 적응성에 주의합니다. 비기각은 null 가설이 참이라는 사후확률이 아닙니다.",
  ],
  experimentParams: {
    k: 1,
    maxClusters: 4,
    minSamples: 8,
    significance: 0.0001,
    iterations: 30,
  },
};

export const dipmeans: Lesson = {
  purpose:
    "Dip-Means는 모든 군집 구성원을 viewer로 삼아 군집 내 거리분포의 Hartigan dip를 계산하고, Uniform bootstrap으로 단봉성을 검정합니다. 실제 convex/concave envelope 계산을 사용합니다.",
  analogy:
    "각 사람의 위치에서 나머지 사람까지의 거리가 한 덩어리인지 여러 덩어리인지 묻고, 충분한 사람이 분리를 지지하는 군집부터 나눕니다.",
  operations: [
    {
      title: "실제 거리 viewer",
      input: "부모 군집의 모든 원본 ND 점",
      calculation:
        "각 viewer에서 모든 부모 구성원까지의 Euclidean 거리(자신의 0 포함)를 정렬합니다.",
      output: "모든 viewer의 실제 일변량 거리분포",
    },
    {
      title: "Hartigan dip",
      input: "정렬된 거리",
      calculation:
        "convex minorant/concave majorant 기하학적 hull과 ECDF 점프 양쪽을 비교해 modal interval을 수축합니다.",
      output: "실제 dip 통계량",
    },
    {
      title: "Bootstrap 검정",
      input: "같은 n의 시드 Uniform 표본 B개",
      calculation:
        "실제 bootstrap dip 중 관측 dip 이상인 비율을 p값으로 계산합니다. viewer를 표본으로 줄이지 않습니다.",
      output: "split viewer 수·비율·평균 dip score",
    },
    {
      title: "한 군집 분할",
      input: "충분한 split viewer 비율을 가진 후보",
      calculation:
        "score가 가장 큰 군집 하나만 시드 관측점/반사점 2-Means로 나누고 전체 Lloyd로 정제합니다.",
      output: "실제 K+1 분할 또는 비기각 종료",
    },
  ],
  equations: [
    {
      title: "Dip와 empirical bootstrap p값",
      tex: String.raw`\operatorname{Dip}(F_n)=\inf_{G\in\mathcal U}\|F_n-G\|_\infty,\qquad \widehat p_i=\frac1B\sum_{b=1}^B\mathbf1[\operatorname{Dip}(U_n^{(b)})\ge\operatorname{Dip}(F_n^{(i)})]`,
      symbols:
        "U: 단봉 CDF 집합, F_n^(i): viewer i의 거리 empirical CDF, U_n^(b): 실제 Uniform bootstrap empirical CDF.",
      meaning: "히스토그램 봉우리 개수나 Gaussian 검정으로 바꾸지 않습니다.",
      derivation: [
        "viewer마다 n이 같으면 같은 bootstrap reference를 재사용할 수 있습니다.",
        "유한 B의 p값은 1/B 간격이며 0도 가능합니다. 작은 α에서 해상도와 불확실성을 명시합니다.",
      ],
    },
    {
      title: "군집 score",
      tex: String.raw`V_j=\{i:\widehat p_i\le\alpha\},\quad s_j=\begin{cases}|V_j|^{-1}\sum_{i\in V_j}\operatorname{Dip}(F_n^{(i)})&|V_j|/n_j\ge v_{th},\\0&\text{otherwise}.\end{cases}`,
      symbols: "α: 유의수준, v_th: 분할 지지 viewer 비율 한도.",
      meaning: "가장 큰 양의 score를 가진 한 군집만 분할합니다.",
      derivation: [
        "기각 viewer가 없으면 score는 0입니다.",
        "p값과 dip 자체를 같은 값으로 혼동하지 않습니다. 분할 초기화와 전체 정제도 실제 계산합니다.",
      ],
    },
  ],
  numerical: {
    title: "동일점·두 덩어리의 dip",
    steps: [
      "같은 값 8개 또는 정확한 등간격 값 0..7의 allow-zero dip는 0입니다.",
      "0,0,1,1의 독립 diptest 통계량은 0.25입니다. 이것은 p값 0.25를 뜻하지 않습니다.",
      "bootstrap B=100이면 p값 해상도는 0.01입니다. α=.05와 viewer 비율을 바꿔 실제 분할 여부를 관찰합니다.",
    ],
  },
  parameters: [
    {
      key: "bootstrapSamples",
      effect: "실제로 생성하는 Uniform 참조 표본 수입니다.",
      experiment: "100과 500에서 p값 해상도·실행량을 비교하세요.",
    },
    {
      key: "significance",
      effect: "viewer 단봉성 기각 수준입니다.",
      experiment: ".01과 .05의 split viewer 수를 비교하세요.",
    },
    {
      key: "splitViewFraction",
      effect: "군집이 분할 후보가 되기 위한 최소 viewer 비율입니다.",
      experiment: ".01과 .5에서 후보 score를 비교하세요.",
    },
    {
      key: "minSamples",
      effect: "검정할 군집의 최소 표본 수, 4 이상입니다.",
      experiment: "작은 표본을 무리하게 검정하지 않는 조건을 확인하세요.",
    },
    {
      key: "maxClusters",
      effect: "사용자가 설정한 모델 K 상한입니다.",
      experiment: "한도 종료와 후보 없음 종료를 구분하세요.",
    },
  ],
  complexity: {
    theory:
      "원문 AS217과 달리 이 독립 구현은 hull 재구성 방식으로 dip 한 번 최악 O(n²). 모든 viewer 최악 O(n³), bootstrap 최악 O(Bn²)이며 정렬/전체 Lloyd가 추가됩니다.",
    implementation:
      "거리 행렬 전체를 저장하지 않고 viewer별 거리 벡터를 실제 계산합니다. 통계적 reference를 같은 n에서 재사용합니다.",
    space:
      "viewer 거리·hull O(n), bootstrap cache O(B×서로 다른 크기 수), 원본 O(nd), Trace 별도.",
    cost: "큰 n은 매우 비쌉니다. 조용한 viewer 표본화·히스토그램 근사 없이 Worker 취소와 자원 안내를 사용합니다.",
  },
  implementation: [
    "n<4/모든 값 동일에서는 allow-zero dip 규약을 사용합니다. independent diptest0.11과 동률/무작위 표본을 비교합니다.",
    "원문의 empirical bootstrap p값을 사용하므로 0과 유한 표본 오차가 가능합니다. plus-one p값 변형이나 표 보간과 같은 방법이라고 표시하지 않습니다.",
    "각 viewer를 모두 처리합니다. 원문과 동일한 한 군집 선택 score, 시드 관측점과 평균 반사점 분할을 사용합니다. kernel 버전은 미지원입니다.",
  ],
  comparison: [
    {
      other: "G-Means",
      difference: "정규분포 모양과 단봉성은 다른 null 가설입니다.",
    },
    {
      other: "Bisecting K-Means",
      difference:
        "분할할 군집과 정지 판단이 dip/시드 bootstrap에 의해 결정됩니다.",
    },
  ],
  references: [
    {
      title: "Kalogeratos & Likas (2012), Dip-means",
      url: "https://papers.nips.cc/paper_files/paper/2012/file/a8240cb8235e9c493a0c30607586166c-Paper.pdf",
      note: "거리 viewer·bootstrap Eq2·score Eq3·Algorithm1과 반사점 초기화를 확인했습니다.",
    },
    {
      title: "Hartigan & Hartigan (1985), The Dip Test of Unimodality",
      url: "https://doi.org/10.1214/aos/1176346577",
      note: "통계량의 원문 서지. 직접 원문 전체 접근은 제한되어 공식 독립 구현·수치 oracle로 추가 검증했습니다.",
    },
    {
      title: "diptest0.11.0",
      url: "https://pypi.org/project/diptest/",
      note: "GPL 패키지는 검증 환경에서만 실행하며 제품에 코드/패키지를 포함하지 않습니다.",
    },
  ],
  preset: "blobs",
  events: ["test", "split", "move"],
  advanced: [
    "원문의 거리 단봉성 기준은 모든 기하학적 군집 형태의 완벽한 분리 기준이 아닙니다. Bootstrap 횟수·시드·검정력과 선택 오류를 함께 설명해야 합니다.",
  ],
  experimentParams: {
    k: 1,
    maxClusters: 4,
    bootstrapSamples: 100,
    significance: 0.05,
    minSamples: 4,
    splitViewFraction: 0.01,
    iterations: 30,
  },
};

export const dpmeans: Lesson = {
  purpose:
    "DP-Means는 제곱거리와 군집 수 벌점의 합을 줄이는 순차 hard-clustering입니다. 새 점이 모든 현재 중심에서 λ보다 큰 제곱거리에 있으면 즉시 새 중심을 만듭니다.",
  analogy:
    "기존 대표까지 가는 비용보다 새 대표를 유지하는 고정 비용이 싸면 새 대표를 생성합니다.",
  operations: [
    {
      title: "전체 평균",
      input: "원본 모든 차원",
      calculation: "원문처럼 K=1의 전체 평균에서 시작합니다.",
      output: "실제 한 중심·전체 초기 할당",
    },
    {
      title: "순차 생성",
      input: "원본 순서의 다음 점",
      calculation:
        "현재까지 만들어진 중심 전부에 제곱거리를 계산합니다. 최소값>λ면 해당 점을 즉시 새 중심으로 만듭니다.",
      output: "실제 생성 또는 최근접 할당",
    },
    {
      title: "평균 갱신",
      input: "한 번의 순차 방문 후 할당",
      calculation: "빈 중심을 제거하고 각 실제 군집의 ND 평균을 갱신합니다.",
      output: "SSE·λK·합 목적함수",
    },
    {
      title: "종료",
      input: "새 중심·할당 변화·사용자 한도",
      calculation:
        "새 중심과 할당 변화가 없으면 수렴, 반복/K 상한은 제한 종료로 구분합니다.",
      output: "실제 마지막 할당·평균·수렴 상태",
    },
  ],
  equations: [
    {
      title: "벌점 목적함수와 생성 조건",
      tex: String.raw`J=\sum_{j=1}^K\sum_{x_i\in C_j}\|x_i-\mu_j\|_2^2+\lambda K,\qquad \min_j\|x_i-\mu_j\|_2^2>\lambda\Rightarrow K\leftarrow K+1`,
      symbols: "λ>0: 제곱거리 단위의 새 중심 벌점, μ_j: 현재 군집 평균.",
      meaning: "λ는 Euclidean 반경이 아니며 DP-GMM 사후확률도 아닙니다.",
      derivation: [
        "새 중심을 점 자신에 놓으면 해당 점의 잔차가 0이 되는 대신 λ를 지불합니다.",
        "잔차 절감이 λ보다 클 때만 새 중심을 만들고, 고정 할당의 평균은 제곱오차를 최소화합니다.",
      ],
    },
  ],
  numerical: {
    title: "0,0.1,0.2,0.8,0.9,1과 λ=.08",
    steps: [
      "전체 평균 .5에서 시작합니다. 첫 점 0의 제곱거리 .25>.08이므로 새 중심을 만듭니다.",
      "점의 원본 순서를 그대로 방문하고 평균을 갱신하면 최종 중심 .1과 .9를 얻습니다.",
      "전체 SSE=.04, λK=.16이므로 J=.20입니다. 독립 NumPy 순차 구현과 각 반복 목적함수를 비교합니다.",
    ],
  },
  parameters: [
    {
      key: "lambda",
      effect: "양의 군집 생성 제곱거리 벌점입니다.",
      experiment: ".02와 .2에서 실제 새 중심 생성을 비교하세요.",
    },
    {
      key: "maxClusters",
      effect: "사용자가 선택한 최대 모델 복잡도입니다.",
      experiment:
        "한도 도달은 원래 무제한 DP-Means의 수렴이 아님을 확인하세요.",
    },
    {
      key: "iterations",
      effect: "전체 순차 방문·평균 갱신 최대 횟수입니다.",
      experiment: "1과 20에서 실제 목적함수와 수렴 상태를 비교하세요.",
    },
  ],
  complexity: {
    theory: "T번 순차 방문, 최대 K 중심, d차원에서 O(TnKd).",
    implementation:
      "모든 원본 점을 실제 순서대로 방문하고 빈 군집을 제거합니다. 시각화용 표본을 계산 입력으로 사용하지 않습니다.",
    space: "원본 O(nd), 할당 O(n), 중심 O(Kd), Trace 별도.",
    cost: "원본 순서·스케일·λ와 사용자가 설정한 K/반복 한도에 영향을 받습니다.",
  },
  implementation: [
    "초기 중심은 원문 전체 평균이며 seed로 데이터를 몰래 재정렬하지 않습니다. 같은 원본 순서에서 재현합니다.",
    "반복 한도에서는 마지막 실제 할당·평균을 반환하고 수렴으로 표시하지 않습니다. 최대 K에서 새 중심 요구가 남으면 제한을 표시합니다.",
    "작은 데이터는 점별 할당을 기록하고 큰 데이터는 실제 생성과 반복별 요약을 기록합니다. 전체 계산은 동일합니다.",
  ],
  comparison: [
    {
      other: "K-Means",
      difference:
        "고정 K의 SSE 대신 λK를 포함하며 순차 새 중심 생성이 있습니다.",
    },
    {
      other: "X-Means",
      difference:
        "DP-Means는 명시적 벌점 목적함수, X-Means는 부모/자식의 모델 점수 비교입니다.",
    },
  ],
  references: [
    {
      title:
        "Kulis & Jordan (2012), Revisiting k-means: New Algorithms via Bayesian Nonparametrics",
      url: "https://icml.cc/2012/papers/291.pdf",
      note: "Algorithm1의 순차 생성·전체 평균 초기화와 §3.2/Theorem3.1 목적함수를 확인했습니다.",
    },
    {
      title: "Brian Kulis: Small-Variance Asymptotics 연구 설명",
      url: "https://people.bu.edu/bkulis/research.htm",
      note: "저자가 설명한 작은 분산 극한·DP-Means 도출 배경. posterior 추론과 벌점 목적함수의 구분을 위한 참고 자료입니다.",
    },
  ],
  preset: "blobs",
  events: ["insert", "assign", "move"],
  advanced: [
    "DP mixture의 small-variance limit에서 유도됐지만 유한 posterior sampling/variational inference를 수행하지 않습니다. 순서 의존성과 지역 수렴을 명시합니다.",
  ],
  experimentParams: { lambda: 0.04, maxClusters: 8, iterations: 30 },
};
