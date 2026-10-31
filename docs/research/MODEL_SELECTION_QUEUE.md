# 다음 중심 기반 엔진: 원문 확인 메모

2026-10-31, 소스 732a410 배포 검증 대기 중 작성. **아래 네 후보는 미구현**이며 제품 엔진 수/구현 상태를 올리지 않는다. 원문 일부/공식 정의 확인과 전체 조사 완료를 구분한다. 다음 구현 시 수치 oracle·Trace·가이드까지 연결한 후 candidates.json 상태를 갱신한다.

## 후보 3 X-Means

Pelleg & Moore (ICML 2000), X-means: Extending K-means with Efficient Estimation of the Number of Clusters. [저자 PDF](https://www.cs.cmu.edu/~dpelleg/download/xmeans.pdf)는 열렸지만 텍스트 인코딩이 깨져 수식 전체를 확인하지 못했다. 스크린샷 경로도 이번 도구에서 실제 이미지가 전달되지 않아 읽은 것으로 처리하지 않는다. [공식 ELKI 문서](https://elki-project.github.io/releases/current/doc/elki/clustering/kmeans/XMeans.html)의 정보 기준 기반 국소 분할과 내부 K-Means 계약을 확인했다. 이 ELKI 버전의 kmax가 엄격한 최종 상한이 아니며 최대 두 배까지 나올 수 있다는 구현 주의도 있다. 후속 작업은 원문 BIC 우도·자유도·분산 추정·국소/전체 표본 수를 원본으로 확정하는 것이다. 단순 SSE 감소를 BIC라 부르지 않는다.

## 후보 4 G-Means

Hamerly & Elkan (NIPS 2003), [Learning the k in k-means](https://papers.nips.cc/paper/2526-learning-the-k-in-k-means.pdf), Algorithm 1 및 §2.1을 읽었다. 분할 후보 두 중심의 연결 방향으로 투영·표준화한 뒤 정규분포 적합 Anderson–Darling 검정으로 분할 수용을 결정한다. 이후 전체 K-Means를 다시 수행한다. PCA 초기 후보는 c±s√(2λ/π)이며 s는 주성분 방향이다. 유의수준과 다중 검정 문제가 있고 임의 비정규 군집 수의 참값 보장은 없다.

원문 Eq.1은 A²=−n−Σ(2i−1)[log Φ(z_i)+log(1−Φ(z_(n+1−i)))]/n이다. Eq.2는 추정된 평균/분산에 대해 A²*=A²(1+4/n−25/n²)를 사용한다. 다른 통계 패키지의 Stephens 보정/임계값과 무조건 같은 것으로 가정하지 않는다. 원문 예시는 α=.0001, 임계값 1.8692를 제시한다. 후속 구현에서는 표본 분산 규약·작은 n/0분산 처리·안정적인 log-CDF·임계값/유의수준·보정식을 독립 수치로 확인해야 한다.

## 후보 5 Dip-Means

Kalogeratos & Likas (NIPS 2012), [Dip-means](https://papers.nips.cc/paper_files/paper/2012/file/a8240cb8235e9c493a0c30607586166c-Paper.pdf), §2와 Algorithm 1을 읽었다. 각 관측점을 viewer로 삼아 군집 내 모든 점까지의 거리분포에 단봉성 dip 검정을 적용한다. 표준 Uniform 부트스트랩 dip와 비교한 p-value, split-viewer 비율 임계값, score로 분할할 군집 하나를 선택하고 실제 이분할 후 전체 K-Means를 정제한다. 정규성 검정 G-Means와 동일하지 않다.

후속 핵심은 Hartigan dip의 정확한 convex minorant/concave majorant 절차·동률/작은 표본·부트스트랩 시드·p-value 부등호·원문 score 정의와 분할 초기화의 완전 확인이다. dip를 히스토그램 봉우리 수로 대체하지 않는다. 큰 거리 자료구조와 부트스트랩 작업량을 별도로 추정하고 표본을 줄일 경우 명시적인 변형으로 표시한다.

## 후보 6 DP-Means

Kulis & Jordan (ICML 2012; arXiv 2011), [Revisiting k-means: New Algorithms via Bayesian Nonparametrics](https://icml.cc/2012/papers/291.pdf), Algorithm 1·§3.2/Theorem 3.1을 읽었다. 목적은 Σ_c Σ_(x∈c)||x−μ_c||²+λK다. 원문은 전체 평균 한 중심으로 시작하고 점을 순서대로 방문하며 최근접 **제곱거리**가 λ보다 클 때 그 점을 새 중심으로 즉시 추가한다. 평균은 순회 후 갱신한다. λ를 거리 반경과 혼동하지 않는다. 순서 의존성이 있으며 사후확률을 반환하는 DP-GMM 추론과 별개다.

후속 구현은 순차 중심 생성/할당/평균/벌점 목적함수 Trace, 빈 군집 규약·같은 거리·시드/순서, 손계산과 독립 penalized objective 검증이 필요하다. 초기 λ 선택/정지/스케일/임의 차원 계약을 명시한다. 전역 최적·Bayesian posterior라고 표시하지 않는다.

이 기록은 직접 확인한 범위의 요약이며 외부 코드를 제품에 복사하지 않았다. 네 엔진의 원문 전체 검토·라이선스/독립 구현 확인·수치 검증은 후속 작업이다.
