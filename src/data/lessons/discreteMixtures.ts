import type { Lesson } from "./types";

export const bernoulli: Lesson = {
  purpose:
    "조건부 독립 이진 특성의 product-Bernoulli 혼합을 실제 최대우도 EM으로 학습합니다. 원본 모든 차원에서 성분별 성공 확률과 혼합 가중치, Bayes 사후소속을 추정합니다.",
  analogy:
    "여러 종류의 응답자가 예/아니오 질문에 답한 체크표에서, 종류별 예 응답 확률과 각 응답자의 소속 확률을 함께 추정합니다.",
  operations: [
    {
      title: "이진 원본과 초기화",
      input: "NumericDataset의 실제 0/1 값, K·seed",
      calculation:
        "표시 좌표와 독립인 원본 전체를 검증하고 θ를(0,1), π를1/K로 초기화합니다. 초기 모수 선택이며 prior나 pseudo-count가 아닙니다.",
      output: "initialize: 실제 모수·전체 로그우도",
    },
    {
      title: "로그 확률 E-step",
      input: "현재 π·θ와 모든 이진 행",
      calculation:
        "특성별 Bernoulli log-PMF를 합하고 log-sum-exp로 성분별 Bayes 사후확률을 정규화합니다. θ=0/1의 불가능 사건은−∞이고0log0을 NaN으로 만들지 않습니다.",
      output: "expectation: rᵢₖ·Nₖ·가중 성공 횟수",
    },
    {
      title: "정확한 무prior M-step",
      input: "실제 사후소속과 충분통계",
      calculation:
        "πₖ=Nₖ/n, θₖⱼ=Σrᵢₖxᵢⱼ/Nₖ. 빈 성분은 π=0·기존 유효 θ를 유지하며 재시드나 clipping으로 목적함수를 바꾸지 않습니다.",
      output: "maximization: 새 θ·π, 갱신에 사용한 이전 통계",
    },
    {
      title: "전체 재평가와 종료",
      input: "갱신된 모수",
      calculation:
        "모든 행의 정규화 상수를 포함한 실제 로그우도와 사후확률을 재평가합니다. |Δℓ|≤tolerance·max(1,|이전ℓ|)이면 종료하고 한도 종료는 미수렴으로 표시합니다.",
      output: "finish: 일치하는 모수·사후확률·레이블·로그우도",
    },
  ],
  equations: [
    {
      title: "Product-Bernoulli mixture",
      tex: "p(x_i)=\\sum_{k=1}^K\\pi_k\\prod_{j=1}^d\\theta_{kj}^{x_{ij}}(1-\\theta_{kj})^{1-x_{ij}}",
      symbols: "xᵢⱼ∈{0,1}, θₖⱼ∈[0,1], πₖ≥0, Σπ=1",
      meaning:
        "성분 안에서 특성이 조건부 독립입니다. 일반적인 상관 다변량 Bernoulli와는 다른 모형입니다.",
      derivation: [
        "성분 k를 고정하면 각 질문의 성공/실패 확률을 곱합니다.",
        "숨은 성분을 π로 가중해 합하면 관측 확률이 됩니다.",
        "그 로그의 전체 합 ℓ=Σᵢlogp(xᵢ)를 최적화합니다.",
      ],
    },
    {
      title: "E/M 유도",
      tex: "r_{ik}=\\frac{\\pi_kp(x_i|k)}{\\sum_h\\pi_hp(x_i|h)},\\quad N_k=\\sum_i r_{ik},\\quad\\theta_{kj}=\\frac{\\sum_i r_{ik}x_{ij}}{N_k},\\quad\\pi_k=\\frac{N_k}{n}",
      symbols: "r은 확률적 잠재 성분 posterior, N은 유효 소속 크기",
      meaning: "FCM 소속도와 달리 관측 확률 모형의 Bayes 사후확률입니다.",
      derivation: [
        "E에서 잠재 one-hot 성분의 조건부 기대값이 Bayes 식의 r입니다.",
        "Q의 θ 항은 Σᵢrᵢₖ[xᵢⱼlogθ+(1−xᵢⱼ)log(1−θ)]입니다.",
        "미분을0으로 두면 weighted 성공 횟수/Nₖ가 됩니다. 경계는 실제 MLE일 수 있습니다.",
        "가중치합1의 Lagrange 승수로 π=Nₖ/n을 얻습니다.",
      ],
    },
  ],
  numerical: {
    title: "고정 초기 모수의 E/M 손검산 (미니 실험의 난수 초기화와 구분)",
    steps: [
      "네 행(1,0),(0,1),(1,1),(0,0), π=(1/2,1/2), θ₁=(.8,.2), θ₂=(.2,.8)을 가정합니다.",
      "(1,0)의 성분 확률은.64와.04이므로 r₁=(16/17,1/17)입니다. (0,1)은 반대이고 나머지 두 행은 각각(1/2,1/2)입니다.",
      "각 성분의 N은2입니다. 성분1의 첫 축 weighted 성공 합은16/17+1/2=49/34입니다.",
      "M에서 θ₁=(49/68,19/68), θ₂=(19/68,49/68), π=(1/2,1/2)입니다.",
      "새 모수의 모든 행 확률을 다시 평가한 합 로그우도가 다음 실제 상태입니다. θ의 선형 화면 이동은 추가 EM 계산을 의미하지 않습니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "유한 혼합 성분 수이며 활성 성분 수/식별 가능한 그룹 수와 다를 수 있습니다.",
      experiment: "K=1과2의 실제 likelihood·확률 벡터를 비교하세요.",
    },
    {
      key: "iterations",
      effect: "실제 E/M 갱신 최대 횟수입니다.",
      experiment: "1회와30회에서 한도 종료·우도 변화를 비교하세요.",
    },
    {
      key: "tolerance",
      effect: "전체 관측 로그우도의 상대 개선 종료 조건입니다.",
      experiment: "0과1e−6에서 실제 반복 수를 비교하세요.",
    },
    {
      key: "seed",
      effect:
        "support 내부 θ 초기 모수를 재현합니다. 입력 순서가 같아야 합니다.",
      experiment: "seed를 바꾸어 지역 최적·비식별성 영향을 관찰하세요.",
    },
  ],
  complexity: {
    theory:
      "한 E/M sweep O(nKd). 유한 혼합 ML은 지역 최적과 성분 permutation을 갖습니다.",
    implementation:
      "M 후 전체 posterior/우도를 추가 재평가하므로 상수 배수 비용이 있습니다. 모든 계산은 원본 d차원입니다.",
    space: "작업 O(nd+nK+Kd), Trace는 바이트 예산과 기록 간격에 의존합니다.",
    cost: "전체 n×K 확률 행렬과 원본/Worker 복사 공간을 사전 추정하며 위험한 할당은 실패를 명시합니다.",
  },
  implementation: [
    "무prior ML, seed 기반 내부 초기 확률, 정확한 weighted Bernoulli MLE. 사후 smoothing·자동 이진화 없음.",
    "상수 특성의 θ=0/1은 정상입니다. 단일 이진 변수의 혼합은 일반적으로 성분별 식별이 불가능합니다.",
    "빈 성분 π=0은 유지하며 전체 행을 임의로 다른 성분에 강제하지 않습니다.",
    "작은 데이터는 모든 E/M, 큰 예상 기록은 실제 전체 계산을 유지하고 일부 반복 상세만 명시적으로 생략합니다.",
    "M 직후 화면의 사후소속은 새 모수로 재평가한 값입니다. 실제 갱신에 쓴 직전 통계도 별도로 확인할 수 있습니다.",
  ],
  comparison: [
    {
      other: "K-Modes",
      difference:
        "K-Modes의 mismatch/최빈값과 달리 특성별 성공 확률·모형 likelihood를 추정합니다.",
    },
    {
      other: "Fuzzy C-Means",
      difference:
        "FCM의 거리 기반 퍼지 membership과 Bernoulli의 Bayes posterior는 해석과 목적함수가 다릅니다.",
    },
    {
      other: "Multinomial Mixture",
      difference:
        "독립적인 이진 특성과 전체 길이를 조건으로 한 count-vector 범주 모델을 구분합니다.",
    },
  ],
  references: [
    {
      title: "Liang (2015), Technical Details about the EM Algorithm §3.1",
      url: "https://www.ee.columbia.edu/~dliang/files/em.pdf",
      note: "저자의 단일 Bernoulli 예제 EM 유도. 제품은 조건부 독립 product 확장이고 이 노트를 최초 논문이라고 주장하지 않습니다.",
    },
    {
      title: "SciPy bernoulli 공식 문서",
      url: "https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bernoulli.html",
      note: "0/1 support·경계 PMF 정의 및 독립 density 검증.",
    },
  ],
  preset: "tiny",
  events: ["initialize", "expectation", "maximization", "finish"],
  advanced: [
    "성분 레이블 순열은 같은 혼합을 나타낼 수 있습니다. 확률적 군집 수 K를 주어도 의미 있는 K개 군집이 보장되지 않습니다.",
    "EM 비감소는 지정한 ML 모형의 실제 M-step에 대한 성질입니다. priors·clipping·임의 재시드는 다른 목적함수/절차입니다.",
    "로그우도는 평균이 아니라 관측 전체 합이며 각 원본 행의 분포 정규화 상수를 포함합니다.",
  ],
  experimentDataset: {
    kind: "numeric",
    values: [
      [1, 1, 1],
      [1, 1, 0],
      [1, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
    featureNames: ["이진 질문1", "이진 질문2", "이진 질문3"],
    provenance: {
      generator: "binary-response-hand-example",
      seed: 42,
      parameters: { rows: 8, dimensions: 3 },
    },
  },
  experimentParams: { k: 2, seed: 42, iterations: 30, tolerance: 1e-8 },
};

const countParameters: Lesson["parameters"] = [
  ...bernoulli.parameters.slice(0, 3),
  {
    key: "seed",
    effect:
      "support 내부의 초기 모수와 동일 혼합 가중치를 재현합니다. M-step에 prior나 pseudo-count를 더하는 설정이 아닙니다.",
    experiment: "같은 seed/원본으로 실제 EM Trace가 재현되는지 확인하세요.",
  },
];
export const poisson: Lesson = {
  ...bernoulli,
  purpose:
    "성분 안에서 조건부 독립인 비음수 정수 count의 product-Poisson 혼합을 실제 무prior 최대우도 EM으로 학습합니다. 성분별 강도 λ와 혼합 가중치·사후확률을 추정합니다.",
  analogy:
    "여러 종류의 장소에서 같은 관측 시간 동안 기록한 사건 횟수를 보고, 종류별 평균 발생 횟수와 각 장소의 소속을 함께 추정합니다.",
  operations: [
    {
      title: "실제 count 원본",
      input: "비음수 안전 정수 ND 관측·K·seed",
      calculation:
        "부동소수 관측을 반올림하지 않고 거부합니다. 초기 λ=(특성 전체 평균+1)×시드 난수 계수(.5,1.5), π=1/K는 양의 초기 모수 선택이며 prior가 아닙니다.",
      output: "initialize: 모든 차원의 양의 rate·전체 우도",
    },
    {
      title: "정규화 상수를 포함한 E",
      input: "현재 rate·가중치",
      calculation:
        "각 축의 xlogλ−λ−log(x!)를 합하고 log-sum-exp posterior를 구합니다. 큰 count는 deviance/Stirling 동치식으로 상쇄를 줄입니다.",
      output: "expectation: 실제 r·유효 N·가중 count",
    },
    {
      title: "정확한 rate MLE",
      input: "E의 충분통계",
      calculation:
        "π=N/n, λ=Σrx/N을 실제 계산합니다. 전부0인 특성은 λ=0이라는 정상 MLE를 갖습니다. 빈 성분은π0과 이전 유효 rate를 유지합니다.",
      output: "maximization: 새 rate·직전 갱신 통계",
    },
    {
      title: "실제 관측 확률 재평가",
      input: "갱신된 모든 모수",
      calculation:
        "λ0의 x0은 질량1, 양의 x는 질량0입니다. 새로운 전체 posterior·상수 포함 log-PMF 합을 계산하고 실제 상대 우도 개선으로 종료합니다.",
      output: "finish: rate와 일치하는 확률·레이블·LL",
    },
  ],
  equations: [
    {
      title: "Product-Poisson 관측 모형",
      tex: "p(x_i)=\\sum_{k=1}^K\\pi_k\\prod_{j=1}^d\\frac{e^{-\\lambda_{kj}}\\lambda_{kj}^{x_{ij}}}{x_{ij}!}",
      symbols: "xᵢⱼ는 비음수 정수, λₖⱼ≥0는 count 강도",
      meaning:
        "λ는 확률이 아니며1보다 클 수 있습니다. 동일한 노출 조건의 관측 모델입니다.",
      derivation: [
        "Poisson 한 축의 질량은 e^−λ λ^x/x!입니다.",
        "성분 내 조건부 독립이면 축별 질량을 곱하고, 성분 가중합으로 관측 모형을 얻습니다.",
        "x!는 E에서 성분 비교 시 소거할 수 있지만 정확한 전체 로그우도에는 포함해야 합니다.",
      ],
    },
    {
      title: "Weighted rate MLE",
      tex: "r_{ik}=\\frac{\\pi_kp(x_i|k)}{\\sum_h\\pi_hp(x_i|h)},\\quad\\lambda_{kj}=\\frac{\\sum_i r_{ik}x_{ij}}{N_k},\\quad N_k=\\sum_i r_{ik}",
      symbols: "r은 실제 Bayes posterior, N은 유효 관측 수",
      meaning: "rate는 posterior로 가중한 실제 count 평균입니다.",
      derivation: [
        "Q의 rate 항은 Σᵢrᵢₖ[xᵢⱼlogλ−λ]입니다.",
        "λ에 대한 미분 Σrx/λ−N=0에서 λ=Σrx/N입니다.",
        "가중합0이면 λ0이 경계 MLE입니다. prior·양수 clamp를 추가하지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "count0·3, 초기 rate1·4의 한 E/M",
    steps: [
      "두 행 x=0,3과 π=(.5,.5), λ=(1,4)를 가정합니다. 미니 실험의 seed 초기화와는 별도의 손검산입니다.",
      "x=0의 성분 질량은 e^−1,e^−4이고 r₀,₁=1/(1+e^−3)≈.952574입니다.",
      "x=3의 질량은 e^−1/6,64e^−4/6이므로 r₃,₁=1/(1+64e^−3)입니다. factorial6이 정확한 관측 질량에 필요합니다.",
      "N₁=r₀,₁+r₃,₁, λ₁,new=3r₃,₁/N₁입니다. 성분2는 보완 posterior로 같은 식을 계산합니다.",
      "λ=0에서 x0의 PMF는1, x3의 PMF는0입니다.0×log0을 NaN으로 처리하면 이 경계를 틀리게 계산합니다.",
    ],
  },
  parameters: countParameters,
  implementation: [
    "독립 product-Poisson·유한 K·무prior ML EM입니다. 상관 Poisson·zero-inflation·노출시간 offset·회귀 모형은 구현하지 않았습니다.",
    "모든 관측은 비음수 안전 정수입니다. rate는 유한 비음수 실수이며 관측을 자동 반올림하지 않습니다.",
    "정확한 Poisson PMF 항을 deviance와 Stirling remainder로 안정 평가하며 큰 count의 log-factorial 차감 상쇄를 줄입니다.",
    "M 후 모든 원본의 실제 posterior/LL를 다시 평가해 현재 rate와 화면 확률이 일치합니다. 이전 M에 쓴 통계는 별도입니다.",
    "기록 바이트 예산으로 상세 반복을 생략할 때도 모든 관측을 실제 계산하며 출력 정책에 기록 간격을 표시합니다.",
  ],
  comparison: [
    {
      other: "Bernoulli Mixture",
      difference:
        "Bernoulli는0/1 성공 확률, Poisson은0부터 시작하는 count와 발생 강도를 추정합니다.",
    },
    {
      other: "Multinomial Mixture",
      difference:
        "Poisson은 특성별 count 강도, Multinomial은 행의 실제 총 count를 조건으로 합1인 범주 확률을 추정합니다.",
    },
    {
      other: "GMM",
      difference:
        "Gaussian 실수 밀도·공분산과 달리 정수 PMF·factorial 정규화를 사용합니다.",
    },
  ],
  references: [
    {
      title: "Grün & Leisch (2008), FlexMix Version2",
      url: "https://stat.ethz.ch/CRAN/web/packages/flexmix/vignettes/mixture-regressions.pdf",
      note: "저자 수정 vignette의 실제 Poisson mixture GLM·EM. 제품은 독립 intercept-only count 모형이며 covariate/zero-inflation을 구현했다고 표시하지 않습니다.",
    },
    {
      title: "SciPy poisson 공식 문서",
      url: "https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson.html",
      note: "PMF·λ0 경계 및 독립 수치 oracle. 검증 실행 버전은 연구 문서에 고정합니다.",
    },
  ],
  advanced: [
    "독립 Poisson에서 축별 조건부 평균과 분산이 같습니다. 과산포/상관 count를 지원한다고 주장하지 않습니다.",
    "노출 기간이 다르면 rate를 단순 비교하기 어렵습니다. 현재 원본은 같은 관측 단위/노출 조건을 가정합니다.",
    "ML EM은 지역 최적일 수 있습니다. λ의 화면 보간은 실제 중간 M-step이나 새로운 count 관측이 아닙니다.",
  ],
  experimentDataset: {
    kind: "numeric",
    values: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [8, 9],
      [9, 8],
      [10, 9],
      [9, 10],
    ],
    featureNames: ["동일 시간 사건A", "동일 시간 사건B"],
    provenance: {
      generator: "poisson-count-hand-example",
      seed: 42,
      parameters: { rows: 8, dimensions: 2, exposure: 1 },
    },
  },
  experimentParams: { k: 2, seed: 42, iterations: 40, tolerance: 1e-9 },
};

export const multinomial: Lesson = {
  ...bernoulli,
  purpose:
    "각 행의 실제 총 count를 조건으로 하는 유한 Multinomial mixture를 무prior 최대우도 EM으로 학습합니다. 행 길이가 달라도 같은 범주 확률 profile로 계산합니다.",
  analogy:
    "문서마다 길이는 다르지만 단어별 출현 횟수를 기록하여, 주제별 단어 비율과 문서의 주제 소속 확률을 함께 추정합니다.",
  operations: [
    {
      title: "원본 count vector와 행 길이",
      input: "비음수 안전 정수 ND·행별 실제 mᵢ",
      calculation:
        "행합도 안전 정수인지 검사하고 시드의 양수 벡터를 정규화해 각 성분 θ 합을1로 초기화합니다. 자동 TF-IDF/길이 정규화/Dirichlet prior는 없습니다.",
      output: "initialize: 실제 count·행합·θ·π",
    },
    {
      title: "Multinomial E-step",
      input: "각 원본 행·합1의 성분 확률",
      calculation:
        "mᵢ!/∏xᵢⱼ!를 포함한 실제 count-vector log-PMF와 π로 posterior를 계산합니다. 값0인 범주에 양의 count가 있으면 그 성분 확률은0입니다.",
      output: "expectation: 실제 r·가중 범주 count",
    },
    {
      title: "가중 count profile MLE",
      input: "성분별 weighted category count",
      calculation:
        "θₖⱼ=Σrᵢₖxᵢⱼ/Σrᵢₖmᵢ, πₖ=Nₖ/n입니다. 분모는Nₖ가 아니라 가중 token 총수입니다. 분모0은 식별 불가여서 이전 유효 θ를 유지합니다.",
      output: "maximization: 새로운 합1 θ와 이전 충분통계",
    },
    {
      title: "전체 likelihood와 native posterior",
      input: "새 θ·π와 원본 모두",
      calculation:
        "정규화상수와 실제 mᵢ를 포함해 전체 확률을 재평가합니다. m0인 행의 likelihood1·posteriorπ를 보존하고 정보가 있는 행을 임의로 선택하지 않습니다.",
      output: "finish: 전체 행 posterior·θ·π·LL",
    },
  ],
  equations: [
    {
      title: "행합을 조건으로 한 Multinomial mixture",
      tex: "p(x_i|m_i)=\\sum_k\\pi_k\\frac{m_i!}{\\prod_j x_{ij}!}\\prod_j\\theta_{kj}^{x_{ij}},\\quad m_i=\\sum_jx_{ij},\\quad\\sum_j\\theta_{kj}=1",
      symbols: "범주는 열, 행은 하나의 count vector입니다.",
      meaning:
        "조건부 독립 categorical 열의 곱과 다른 모형입니다. 행합에 대한 별도 생성 분포는 모델링하지 않습니다.",
      derivation: [
        "m개의 사건을 범주별 x개로 배치하는 경우의 수가 m!/∏x!입니다.",
        "한 배치의 확률 ∏θ^x를 곱해 count-vector PMF를 얻습니다.",
        "성분 가중합으로 숨은 주제를 주변화합니다.",
      ],
    },
    {
      title: "가중 token 수 정규화",
      tex: "N_k=\\sum_i r_{ik},\\quad\\theta_{kj}=\\frac{\\sum_i r_{ik}x_{ij}}{\\sum_i r_{ik}m_i},\\quad\\pi_k=\\frac{N_k}{n}",
      symbols: "분모는 weighted token 합, π는 weighted 문서 수로 결정됩니다.",
      meaning: "문서 길이와 문서별 사후소속을 모두 사용합니다.",
      derivation: [
        "Q에서 θ 항은 Σᵢⱼrᵢₖxᵢⱼlogθₖⱼ입니다.",
        "θ 합1 제약의 Lagrange 미분으로 θ가 weighted category count에 비례합니다.",
        "모든 범주를 합하면 분모가 Σᵢrᵢₖmᵢ가 됩니다. 문서 수N으로 나누면 일반적으로 합1이 되지 않습니다.",
      ],
    },
  ],
  numerical: {
    title: "계수2와 weighted token 분모 검산",
    steps: [
      "행(2,0),(0,2),(1,1), θ₁=(.8,.2), θ₂=(.2,.8), π=(.5,.5)를 가정합니다.",
      "첫 행의 질량은.64,.04이고 posterior는(16/17,1/17)입니다. 두 번째는 반대입니다.",
      "(1,1)의 실제 PMF는2×.8×.2=.32입니다. 계수2를 빠뜨리면 posterior는 같아도 로그우도가 잘못됩니다.",
      "성분1 N=1.5, weighted 첫 범주 count=2×16/17+.5=81/34, weighted token 합=3입니다.",
      "따라서 θ₁,new=(27/34,7/34), θ₂,new=(7/34,27/34)입니다. N=1.5로 나누면 잘못된 확률을 얻습니다.",
      "m0 행은 PMF1이고 사후확률이π입니다. 범주 count가 전부0인 성분은 θ를 식별할 수 없습니다.",
    ],
  },
  parameters: countParameters,
  implementation: [
    "조건부 Multinomial count-vector ML EM입니다. product-categorical LCA·Dirichlet-multinomial·토픽별 단어할당 LDA가 아닙니다.",
    "행별 총 count를 조건으로 계산하며 실제 길이를 임의로 같게 만들거나 단위벡터로 정규화하지 않습니다.",
    "독립 Poisson을 총수로 조건화한 동치 PMF를 사용하여 큰 log-factorial의 상쇄를 줄이고 정규화 계수도 유지합니다.",
    "실제 θ0이 학습될 수 있고 불가능한 사건은 질량0입니다. prior/pseudo-count/clipping으로 숨기지 않습니다.",
    "m0 관측도 모두 처리합니다. 모든 weighted count0인 성분의 이전 유효 profile을 유지하고 식별 한계를 표시합니다.",
  ],
  comparison: [
    {
      other: "Poisson Mixture",
      difference:
        "성분별 발생량 λ 대신 실제 총량m을 조건으로 범주 비율θ를 추정합니다.",
    },
    {
      other: "Bernoulli Mixture",
      difference:
        "여러 독립 이진 특성이 아니라 count-vector의 배치 계수와 총 count 제약을 포함합니다.",
    },
    {
      other: "K-Modes",
      difference:
        "범주 token의 mismatch와 달리 정수 count·행 길이·확률 PMF를 실제 사용합니다.",
    },
  ],
  references: [
    {
      title:
        "Rigouste, Cappé & Yvon (2006), Multinomial Mixture Model for Text Clustering",
      url: "https://arxiv.org/pdf/cs/0606069",
      note: "저자 원문의 count mixture·EM·초기화·smoothing 논의. 현재 엔진은 무prior ML이며 논문의 모든 Bayesian/Gibbs 변형을 구현했다고 하지 않습니다.",
    },
    {
      title: "SciPy multinomial 공식 문서",
      url: "https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.multinomial.html",
      note: "정규화 계수 포함 실제 PMF의 독립 검증용 공식 자료.",
    },
  ],
  advanced: [
    "같은 행 안에서 범주 count는 총수 제약으로 독립이 아닙니다. product-categorical LCA와 입력 의미를 혼동하지 않습니다.",
    "m=1만 관측하면 혼합이 하나의 categorical로 축약되어 성분별 식별이 일반적으로 불가능합니다.",
    "제로 길이 행을 제외하거나 smoothing을 넣으면 다른 추정 절차가 됩니다. 현재는 관측을 모두 보존하는 명시적 ML 정책을 사용합니다.",
  ],
  experimentDataset: {
    kind: "numeric",
    values: [
      [10, 1, 0],
      [8, 0, 1],
      [12, 1, 0],
      [0, 1, 8],
      [1, 0, 10],
      [0, 1, 12],
      [0, 0, 0],
    ],
    featureNames: ["단어A 횟수", "단어B 횟수", "단어C 횟수"],
    provenance: {
      generator: "multinomial-profile-hand-example",
      seed: 42,
      parameters: {
        rows: 7,
        dimensions: 3,
        variableLengths: true,
        zeroLength: true,
      },
    },
  },
  experimentParams: { k: 2, seed: 42, iterations: 40, tolerance: 1e-9 },
};
