import type { Lesson } from "./types";
export const gmm: Lesson = {
  purpose:
    "겹치는 집단의 소속을 단일 번호로 단정하지 않고 확률로 표현하기 위한 생성 모델입니다. 각 관측값이 숨은 성분 z에서 발생한 뒤 그 성분의 정규분포에서 생성되었다고 가정합니다. 길쭉하거나 회전한 분포도 공분산으로 표현합니다.",
  analogy:
    "경계의 점 하나가 두 집단 모두에서 생길 법하다면 양쪽에 책임을 나눕니다. E-step은 책임을 계산하고 M-step은 그 책임으로 가중한 통계를 다시 계산합니다. 타원은 데이터가 실제로 움직인 경로가 아니라 분포의 등밀도선입니다.",
  operations: [
    {
      title: "초기화",
      input: "좌표, 성분 수 K, seed, 공분산 형태",
      calculation:
        "K-Means++/random으로 평균을 고르고 Σ=0.04I, π=1/K로 시작합니다.",
      output: "centers의 평균·공분산·weight; initialize",
    },
    {
      title: "E-step",
      input: "고정한 θ=(π,μ,Σ)",
      calculation:
        "log π+log Gaussian을 구하고 log-sum-exp로 정규화합니다. 점마다 K개의 responsibility가 나옵니다.",
      output: "responsibilities, argmax labels, log L; expectation",
    },
    {
      title: "M-step",
      input: "고정한 responsibility rᵢk",
      calculation:
        "유효 표본 수 Nk를 구하고 가중 평균, 가중 공분산, 혼합계수를 갱신합니다. 공분산 대각에 10⁻⁶을 더합니다.",
      output: "새 centers; maximization",
    },
    {
      title: "종료와 재계산",
      input: "인접 E-step의 로그우도",
      calculation:
        "절대 차이 <10⁻⁷ 또는 반복 한도에서 종료합니다. 마지막 M-step 파라미터로 E-step을 다시 계산합니다.",
      output:
        "최종 확률과 labels; finish. 마지막 metric은 최종 재계산 이전 E-step 값입니다.",
    },
  ],
  equations: [
    {
      title: "다변량 정규분포와 혼합 모델",
      tex: String.raw`p(x\mid\theta)=\sum_{k=1}^K\pi_k\mathcal N(x\mid\mu_k,\Sigma_k),\quad\mathcal N=\frac{e^{-\frac12(x-\mu)^T\Sigma^{-1}(x-\mu)}}{(2\pi)^{d/2}|\Sigma|^{1/2}}`,
      symbols:
        "x, μ∈ℝᵈ, Σ: 대칭 양의 정부호 공분산, πk≥0이고 Σk πk=1. 앱에서는 d=2입니다.",
      meaning:
        "혼합계수는 성분의 사전확률입니다. Gaussian의 값은 확률 밀도이므로 1보다 클 수 있습니다. 한 점이 정확히 그 좌표일 확률과 혼동하지 마세요.",
      derivation: [
        "공분산 고유벡터가 타원의 축 방향, 고유값의 제곱근이 축 길이를 결정합니다. 앱은 1σ·2σ 타원을 그립니다. 2D에서 1σ 타원 안 질량은 약 39.3%로, 1D의 약 68%와 다릅니다.",
        "전체 우도 L=∏ᵢΣk πkNᵢk의 곱을 로그로 바꾸면 ℓ=ΣᵢlogΣk πkNᵢk입니다. 합 안의 로그 때문에 평균을 곧바로 분리해 최적화하기 어렵습니다.",
      ],
    },
    {
      title: "베이즈 정리에서 E-step 유도",
      tex: String.raw`r_{ik}=P(z_i=k\mid x_i)=\frac{P(z_i=k)p(x_i\mid z_i=k)}{p(x_i)}=\frac{\pi_k\mathcal N_{ik}}{\sum_j\pi_j\mathcal N_{ij}}`,
      symbols:
        "zᵢ: 잠재 성분, rᵢk: 관측 xᵢ의 성분 k 사후확률. 각 i에서 Σk rᵢk=1.",
      meaning:
        "큰 밀도뿐 아니라 성분의 사전 혼합비도 소속 확률을 바꿉니다. 색은 r로 혼합하고 hard label은 가장 큰 r의 인덱스입니다.",
      derivation: [
        "결합분포 p(x,z=k)=πkNᵢk를 주변분포 p(x)=ΣjπjNᵢj로 나눕니다. 이것이 베이즈 정리입니다.",
        "언더플로를 피하려면 aᵢk=logπk+logNᵢk, m=maxk aᵢk로 두고 logΣexp(a)=m+logΣexp(a−m)를 계산합니다. 빼고 더하는 m은 정확한 확률 비를 바꾸지 않습니다.",
      ],
    },
    {
      title: "가중 충분통계로 M-step 유도",
      tex: String.raw`N_k=\sum_i r_{ik},\quad \mu_k=\frac{\sum_i r_{ik}x_i}{N_k},\quad\Sigma_k=\frac{\sum_i r_{ik}(x_i-\mu_k)(x_i-\mu_k)^T}{N_k},\quad\pi_k=\frac{N_k}{n}`,
      symbols:
        "Nk: 정수가 아닐 수 있는 유효 표본 수. r은 E-step 결과로 고정합니다.",
      meaning:
        "각 점이 1개 혹은 0개 대신 r만큼의 표본으로 통계에 기여합니다. 공분산은 갱신한 평균을 기준으로 계산합니다.",
      derivation: [
        "기대 완전 로그우도 Q=Σᵢk rᵢk[logπk−½log|Σk|−½(xᵢ−μk)ᵀΣk⁻¹(xᵢ−μk)]+상수입니다.",
        "μ에 대한 미분을 0으로 두면 Σᵢrᵢk(xᵢ−μk)=0이므로 가중 평균입니다. 정밀도 Σk⁻¹에 대한 미분은 NkΣk=Σᵢrᵢk(xᵢ−μk)(xᵢ−μk)ᵀ를 줍니다.",
        "Σkπk=1에 Lagrange 승수를 쓰면 Nk/πk=상수이고 ΣkNk=n이어서 πk=Nk/n입니다. diag는 교차항을 0으로, spherical은 대각 평균을 같은 값으로 둡니다.",
      ],
    },
    {
      title: "EM의 하한과 단조성",
      tex: String.raw`\ell(\theta)=F(q,\theta)+\mathrm{KL}\big(q(z)\,\|\,p(z\mid X,\theta)\big)\geq F(q,\theta)`,
      symbols:
        "F=E_q[log p(X,z|θ)]−E_q[log q], KL: Kullback–Leibler 발산, q: 잠재변수 분포.",
      meaning:
        "E-step에서 하한을 현재 우도에 붙이고 M-step에서 그 하한을 올립니다.",
      derivation: [
        "q를 현재 사후분포로 정하면 KL=0이 됩니다. q를 고정하고 Q를 정확히 최대화하거나 적어도 증가시키면 새 우도는 이전 우도보다 작지 않습니다.",
        "이 보장은 같은 목적함수, 유효한 공분산, 정확한 E-step 및 Q 증가 조건이 필요합니다. 앱의 대각 정규화와 소멸 성분 보호는 순수 최대우도 M-step의 변형이므로 매번 엄밀한 우도 증가를 무조건 주장하지 않습니다.",
        "지역 최대·안장점과 공분산 붕괴 문제가 있습니다. 정규화 없는 혼합 모델 우도는 성분이 한 점으로 붕괴할 때 무한히 커질 수 있습니다.",
      ],
    },
    {
      title: "AIC와 BIC",
      tex: String.raw`\mathrm{AIC}=2p-2\hat\ell,\qquad\mathrm{BIC}=p\log n-2\hat\ell`,
      symbols:
        "p: 자유 파라미터 수, ℓ̂: 적합한 모델의 최대화 로그우도. 2D full GMM은 p=(K−1)+2K+3K=6K−1.",
      meaning:
        "적합도 개선과 모델 크기의 벌점을 함께 비교하며 작은 값을 선호합니다.",
      derivation: [
        "같은 데이터·특징·우도 정의로 적합한 모델끼리 비교해야 합니다. 서로 다른 단위나 데이터 크기의 점수를 직접 비교하지 마세요.",
        "혼합 모델에는 비식별성과 특이점이 있어 BIC의 정규 모형 근사가 완벽하지 않습니다. 앱은 AIC/BIC나 다중 초기화 모델 선택을 계산하지 않으며, 기록 중간의 ℓ을 최적 우도로 간주하면 안 됩니다.",
      ],
    },
  ],
  numerical: {
    title: "두 성분의 확률을 손으로 계산",
    steps: [
      "x=(0,0), μ₁=(0,0), μ₂=(1,0), Σ₁=Σ₂=I, π₁=π₂=0.5. N₁=1/(2π)=0.1591549431, N₂=e⁻⁰·⁵/(2π)=0.0965323526입니다.",
      "가중 밀도는 0.0795774715, 0.0482661763, 합은 0.1278436479. r₁=0.6224593312, r₂=0.3775406688이며 합은 1입니다.",
      "M-step의 별도 검산: x=(0,0),(1,0), 한 성분에 대한 r=(0.75,0.25)이면 Nk=1, μ=(0.25,0), Σxx=0.1875, π=0.5. 정규화 후 Σxx=0.187501, Σyy=0.000001입니다.",
    ],
  },
  parameters: [
    {
      key: "k",
      effect:
        "늘리면 더 많은 밀도 봉우리를 설명하지만 작은 성분·과적합·불안정이 생깁니다. 줄이면 다른 집단을 하나의 타원으로 합칩니다.",
      experiment: "비등방성 군집에서 2·3·5성분과 seed를 바꿔 보세요.",
    },
    {
      key: "covariance",
      effect:
        "full은 회전과 축 길이, diag는 축 길이만, spherical은 하나의 분산만 학습합니다.",
      experiment:
        "같은 데이터·seed에서 full→diag→spherical로 바꿔 타원 방향을 비교하세요.",
    },
    {
      key: "initialization",
      effect:
        "초기 평균이 국소해에 영향을 줍니다. 공분산과 혼합비 초기값은 고정입니다.",
      experiment:
        "겹치는 군집에서 seed를 바꿔 로그우도와 성분 모양을 비교하세요.",
    },
    {
      key: "iterations",
      effect:
        "작으면 EM을 일찍 중단하고, 크게 해도 정해진 허용오차에 도달하면 종료합니다.",
      experiment:
        "1회와 20회. 마지막 finish 확률은 마지막 평균·공분산을 사용합니다.",
    },
  ],
  complexity: {
    theory: "일반 full 공분산은 반복당 O(nKd²+Kd³), 대각 공분산은 O(nKd).",
    implementation: "d=2의 닫힌 역행렬·행렬식 계산으로 O(TnK). 초기화 O(nK²).",
    space:
      "현재 상태 O(nK). 매 E-step 확률 행렬을 보존하는 Trace는 O(TnK+T²), 로그우도 배열 복사 포함.",
    cost: "큰 K와 n, 반복 수가 비용을 늘립니다. tied 공분산·GPU·다중 초기화 없음.",
  },
  implementation: [
    "공분산 정규화는 고정 10⁻⁶입니다. Nk<10⁻⁸이면 이전 평균·공분산을 유지하고 작은 weight를 부여한 뒤 모든 weight를 재정규화합니다.",
    "Canvas는 평균과 공분산 행렬을 선형 보간한 후 고유분해합니다. 양의 정부호 행렬의 볼록 결합은 양의 정부호입니다. 보간 화면 자체는 새 EM 연산이 아닙니다.",
  ],
  comparison: [
    {
      other: "K-Means",
      difference:
        "동일한 구형 공분산·같은 혼합비에서 분산을 0으로 보내면 사후확률이 최근접 중심에 집중합니다. 일반 GMM과 K-Means가 동일한 것은 아닙니다.",
    },
  ],
  references: [
    {
      title: "Bishop (2006), PRML 9.2·9.4",
      url: "https://www.microsoft.com/en-us/research/publication/pattern-recognition-machine-learning/",
      note: "Gaussian 혼합, EM 하한과 M-step 유도.",
    },
    {
      title: "scikit-learn · Gaussian mixture models",
      url: "https://scikit-learn.org/stable/modules/mixture.html",
      note: "공분산 제약·정규화·BIC 모델 선택의 구현 관점.",
    },
    {
      title: "Dempster, Laird & Rubin (1977)",
      url: "https://doi.org/10.1111/j.2517-6161.1977.tb01600.x",
      note: "불완전 데이터와 EM의 원논문.",
    },
  ],
  preset: "anisotropic",
  events: ["initialize", "expectation", "maximization"],
  advanced: [
    "Soft clustering은 불확실성을 남깁니다. hard label은 사후확률의 argmax일 뿐 학습 목적함수가 아닙니다.",
    "성분 번호는 교환해도 같은 밀도입니다. 다른 실행을 비교할 때 번호보다 분포와 점 쌍의 관계를 보세요.",
  ],
};
