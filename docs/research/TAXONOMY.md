# 후보 중복·변형·최적화 분류 조사

2026-10-31. 아래는 **문헌·정의 조사 결과**이며 엔진 구현 완료 기록이 아니다. 기존 후보 번호를 지우거나 독립 알고리즘 개수를 부풀리지 않는다. 원문 접근 여부를 항목별로 구분한다. 조사에 사용한 공개 구현 코드를 제품으로 복사하지 않았다.

## 44 SLINK / 45 CLINK / 46 NN-Chain HAC

세 이름 모두 새로운 군집화 목적함수를 뜻하는 것이 아니라, 계층 구조를 계산하는 **실행 알고리즘·자료구조**의 이름이다. 적용 linkage와 실제 산출물이 같다는 조건을 검증해야 기존 AGNES와의 관계를 정할 수 있다.

| 후보 | 서지·확인 범위 | 분류 및 구현 시 정책 |
|---|---|---|
| SLINK | Robin Sibson, *SLINK: An optimally efficient algorithm for the single-link cluster method*, The Computer Journal 16(1), 30–34, 1973, DOI 10.1093/comjnl/16.1.30. DOI 원문은 이번 도구에서 접근 실패. [ELKI 공식 SLINK 문서](https://elki-project.github.io/releases/current/javadoc/elki/clustering/hierarchical/SLINK.html)의 정의·참고문헌을 확인. | single linkage를 계산하는 O(n²) 시간·O(n) 보조 공간 방식. single-link 목적함수의 새 독립 방법으로 세지 않는다. 입력 전체 거리 행렬을 따로 저장하면 그 메모리는 별도이므로 전체 제품 메모리를 무조건 O(n)이라고 표시하지 않는다. |
| CLINK | Daniel Defays, *An efficient algorithm for a complete link method*, The Computer Journal 20(4), 364–366, 1977, DOI 10.1093/comjnl/20.4.364. DOI 원문 접근 실패. [ELKI 공식 CLINK 문서](https://elki-project.github.io/releases/current/javadoc/elki/clustering/hierarchical/CLINK.html)에서 정의·주의점을 확인. | complete-link 관련 O(n²) 시간·O(n) 보조 공간 절차. **표준적인 전역 최근접 병합 complete linkage와 일반적으로 같은 결과라고 간주하면 안 된다.** ELKI는 입력 순서 의존성과 결과 차이를 명시한다. 단순히 AGNES complete의 고속 옵션으로 인증하지 말고 제한된 변형으로 분리해 검증한다. |
| NN-Chain HAC | Murtagh (1983)의 survey와 1985 교재를 [ELKI 공식 NNChain 문서](https://elki-project.github.io/releases/current/javadoc/elki/clustering/hierarchical/NNChain.html)가 인용. 초기 원문을 직접 읽은 것으로 처리하지 않는다. Daniel Müllner, *Modern hierarchical, agglomerative clustering algorithms*, 2011 [저자 논문](https://arxiv.org/html/1109.2378v1)의 §3.2/정리 1을 읽음. | reciprocal nearest-neighbor chain으로 허용되는 linkage의 HAC를 계산하는 최적화 계열. 모든 linkage에 공통 적용되는 독립 군집화 목적함수가 아니다. 최초 제안의 단일 서지는 추가 역사 조사 필요. |

NN-chain의 안전한 우선 지원 대상은 complete/average/weighted/Ward다. Müllner의 정리는 single도 다루지만 single은 별도의 MST/SLINK 경로가 적절할 수 있다. [SciPy 공식 linkage 문서](https://docs.scipy.org/doc/scipy/reference/generated/scipy.cluster.hierarchy.linkage.html)는 single에 MST, complete/average/weighted/Ward에 NN-chain을 사용하고 이 경우 O(n²) 시간을 명시한다. SciPy의 저장 행렬 구현은 O(n²) 메모리다.

Müllner의 정리에는 reducibility뿐 아니라 서로 독립인 병합의 순서를 바꿔도 갱신 거리가 같다는 조건이 있다. 따라서 “reducible이면 어떤 새 linkage에도 NN-chain을 적용 가능”이라고 설명하면 부족하다. 동률에서는 직전 chain 원소 우선, 높이의 stable sort, union-find 재라벨링 등 정리의 후처리 조건도 보존해야 한다. centroid/median은 안전한 기본 지원 대상에서 제외하고, Ward의 통계적 의미를 주장할 때는 Euclidean 입력 조건을 지킨다.

후속 검증은 작은 거리 행렬의 독립 전수 HAC와 높이별 partition/cophenetic 결과를 비교한다. 동률로 가능한 이진 병합 순서가 여럿임을 구분하며, CLINK에는 표준 complete와 다른 결과를 찾는 반례·입력 순열 테스트가 필요하다. 원문/독립 구현 라이선스 확인 없이 코드를 가져오지 않는다.

## 81 Bayesian GMM / DP-GMM

**완전한 별칭이 아니다.** Bayesian GMM은 가중치·평균·공분산 등에 사전분포를 두는 넓은 모델군이다. 유한 K와 Dirichlet 가중치 사전인 모델도 포함한다. DP-GMM은 Dirichlet process 혼합을 사용하는 비모수 모델이며, 유한 Bayesian GMM과 사전 및 군집 수의 해석이 다르다.

- [scikit-learn BayesianGaussianMixture 공식 문서](https://scikit-learn.org/stable/modules/generated/sklearn.mixture.BayesianGaussianMixture.html)는 `dirichlet_distribution`과 `dirichlet_process` 두 가중치 사전 및 후자의 고정 최대 성분 수를 쓰는 truncation을 명시한다. 같은 클래스에 있다는 이유로 같은 모델이라고 세지 않는다.
- Carl Edward Rasmussen, *The Infinite Gaussian Mixture Model*, NIPS 12, 회의 1999/권 출판 2000. [공식 논문 페이지](https://papers.nips.cc/paper_files/paper/1999/hash/97d98119037c5b8a9663cb21fb8ebf47-Abstract.html), [원문](https://proceedings.neurips.cc/paper/1999/file/97d98119037c5b8a9663cb21fb8ebf47-Paper.pdf). Gibbs/MCMC 방식의 무한 Gaussian mixture 설명 확인. Bayesian mixture 전체의 최초 논문이라고 주장하지 않는다.
- David M. Blei & Michael I. Jordan, *Variational Inference for Dirichlet Process Mixtures*, Bayesian Analysis 1(1), 121–144, **2006**. [저자 최종 논문](https://people.eecs.berkeley.edu/~jordan/papers/blei-jordan-ba.pdf)의 DP·stick-breaking·변분 근사 설명 확인. 유통 중인 2004 초안과 최종 출판 연도를 구분한다.

모델 사전, inference가 VB인지 Gibbs인지, truncation 한도와 유효 성분 수, covariance 가정을 메타데이터로 분리한다. `π_k=v_k∏_{j<k}(1−v_j)`인 stick-breaking을 쓰더라도 유한 절단을 정확한 무한 posterior라고 표시하지 않는다. 기존 GMM EM 실행에 prior 이름만 붙이는 방식은 구현이 아니다. 이 후보는 하나의 이름 등록이 아니라 **모델·추론 변형군**으로 조사·구현할 대상이다.

## 86 Bernoulli Mixture / 87 Latent Class Analysis

이진 지표가 latent class 안에서 조건부 독립인 기본 LCA는 다음과 같은 **다변량 product-Bernoulli 혼합**과 같은 관측 모형이다.

`p(x)=Σ_k π_k ∏_j θ_kj^(x_j)(1−θ_kj)^(1−x_j)`, `x_j∈{0,1}`.

그러나 일반 LCA는 다범주 지표를 허용한다. [Linzer & Lewis (2011), poLCA 원 논문 페이지](https://www.jstatsoft.org/article/view/v042i10), DOI 10.18637/jss.v042.i10의 정의·초록과 [저자 공식 구현](https://github.com/dlinzer/poLCA)을 확인했다. 기본 LCA는 유한 혼합과 class 내 조건부 독립을 사용하며, covariate로 class 확률을 바꾸는 latent class regression도 별도 확장이다. 2011 논문이 LCA의 최초 발표라는 뜻은 아니고, 최초 역사 원문은 아직 직접 확인하지 못했다.

따라서 이진·조건부 독립 LCA와 Bernoulli-mixture를 동일 엔진 설정으로 제공할 수 있으며 그 동일 모델을 두 독립 알고리즘으로 중복 집계하지 않는다. 다범주 product-categorical LCA는 입력 분포를 확장하는 변형이다. 일반적인 count-vector multinomial mixture와 product-categorical 모델도 무조건 같은 것으로 묶지 않는다. Bernoulli mixture가 “독립 이진 특성의 곱”인지 다른 다변량 Bernoulli 정의인지 먼저 명시해야 한다.

poLCA는 [CRAN 공식 목록](https://www.stat.math.ethz.ch/CRAN/web/packages/poLCA/index.html)에서 GPL ≥2로 확인되었다. 검증용 실행과 제품 코드 재배포의 라이선스 책임을 구분해야 한다. 이번 작업은 이 패키지를 제품에 포함하거나 코드를 복사하지 않았다.

## 83 Mixture of Factor Analyzers / 91 Mixture of Probabilistic PCA

- Zoubin Ghahramani & Geoffrey E. Hinton, *The EM Algorithm for Mixtures of Factor Analyzers*, CRG-TR-96-1, **1996**, 개정 1997. [저자 원문](https://www.cs.utoronto.ca/~hinton/absps/tr-96-1.pdf)의 generative model/EM 절 확인. FA의 공분산은 `ΛΛᵀ+Ψ`이고 Ψ는 대각이다. 이 원문의 mixture 식 (9)은 성분들 사이에 Ψ를 공유한다.
- Michael E. Tipping & Christopher M. Bishop, *Mixtures of Probabilistic Principal Component Analysers*, Neural Computation 11(2), 443–482, **1999**, DOI 10.1162/089976699300016728. [저자 원문](https://www.miketipping.com/papers/met-mppca.pdf)의 등방 잡음과 covariance 설명 확인. PPCA 성분의 공분산은 `W_kW_kᵀ+σ_k²I`다.

등방 noise는 대각 noise의 제약형이므로, **성분별 Ψ_k를 허용하는 일반적인 MFA**의 가정 아래 MPPCA는 `Ψ_k=σ_k²I`인 제약형으로 이해할 수 있다. 다만 초기 MFA 원문의 **공유 Ψ**와 MPPCA의 성분별 σ_k²를 비교할 때는 noise 공유 규칙도 맞춰야 한다. 이 조건을 생략한 채 원문 두 모델이 엄밀히 동일하다거나 언제나 단순 포함관계라고 쓰면 부정확하다.

둘은 고차원 Gaussian 저랭크 covariance 혼합이라는 관련 모델군이지만 목적 제약·추정 절차·모수 수가 달라 별칭으로 제거하지 않는다. 기존 2D GMM을 그대로 호출하는 것은 구현으로 인정하지 않는다. 실제 latent 차원 q, loading 행렬, posterior factor moments, noise 추정과 성분 책임도를 반환·기록해야 한다. 최초 관련 선행 연구 전체에 대한 역사적 우선권은 추가 조사 대상이다.

## 레지스트리 반영 원칙

이 문서의 조사로 후보 명칭이나 번호를 삭제하지 않는다. 추천 분류는 SLINK/NN-Chain=linkage 구현 최적화, CLINK=순서 의존성을 명시한 complete-link 관련 구현 변형, Bayesian/DP GMM=모델·추론 변형군, binary-independent LCA=Bernoulli-mixture와 중복 모델, MPPCA/MFA=관련 covariance 제약 모델이다. **실제 구현·Trace·시각화·독립 실행 검증 상태는 별도**로 유지한다.
