# X/G/Dip/DP-Means — 실제 계산·Trace·검증

작성 2026-11-01 (전 세션 원문 확인 2026-10-31). 네 엔진과 전용 분석·교재를 구현했다. **부모 통합의 최종 타입/전체 회귀/브라우저/배포는 별도 확인**하며 이 파일만으로 완전 구현을 선언하지 않는다.

## 공통 계약과 재현

엔진은 Point[], Params, Recorder, Dataset?를 받고 numericRows의 **모든 원본 차원**을 사용한다. Point 좌표는 표시용이며 이를 바꾸어도 계산/Trace가 달라지지 않는 테스트가 있다. 공통 ND Lloyd는 실제 할당/평균/전체 SSE를 기록하고 빈 중심을 제거한다. 초기 결과를 미리 계산해 재생하는 방식이 아니다. 시드 초기 중심과 실제 최초 평균 이동, 국소 두 후보의 초기화/할당/평균을 기록한다.

analysis.kind=model-selection의 centroids는 ND 원본 중심, proposedCentroids/candidateLabels는 국소 후보이며 최종 중심과 구분한다. G/Dip 실제 투영·viewer·bootstrap 분포와 후보 수용/거절을 보존한다. AutoAnalysisView는 실제 값·차원별 중심 이동/국소 후보 이동·empirical CDF를 보여주고 reduced-motion을 준수한다. 원본 중심을 임의의 2D 점으로 바꾸지 않는다. 모든 Trace 전진/역진/checkpoint 및 최종 결과를 검증했다.

maxClusters는 사용자가 선택하는 모델 복잡도 설정이며 입력 데이터 수 제한이 아니다. 실제 데이터/차원을 몰래 표본화하지 않는다. 시간/공간이 큰 정확 계산은 자원 안내/Worker 취소/Trace 바이트 예산을 따른다. 직접 엔진의 G-Means 공분산·Jacobi·원본 추정은 128d²+16nd를 공통 256MiB 작업 정책을 할당 전에 검사한다. 전체 작업 공간/TypedArray 전송은 공통 플랫폼 정책과 후속 개선에 속한다.

## X-Means

Pelleg & Moore, X-means: Extending K-means with Efficient Estimation of the Number of Clusters, ICML2000. [저자 PDF](https://www.cs.cmu.edu/~dpelleg/download/xmeans.pdf)의 깨진 텍스트는 PyMuPDF 이미지로 렌더링해 **pp2–4를 직접 읽었다**. 이전 MODEL_SELECTION_QUEUE의 미확인 수식 문제를 해소했다. [ELKI 공식 BIC 문서](https://elki-project.github.io/releases/current/doc/elki/clustering/kmeans/quality/BayesianInformationCriterionXMeans.html)와 [PyClustering 공식 문서/소스 수식](https://github.com/annoviko/pyclustering/blob/master/pyclustering/cluster/xmeans.py)도 비교했다.

전체 Lloyd → 시드 방향의 반대쪽 두 후보 → 각 부모 데이터만으로 실제 2-Means → 국소 BIC 비교 → 수용한 분할을 함께 적용 → 전체 정제 순서다. 탐색 중 **전역 점수가 가장 좋은 모델**을 반환한다. 같은 표본의 부모와 자식을 비교하고 자유도 p=K(d+1), 원문 σ²=SSE/(n−K)를 사용한다. 알려진 원문 점수의 정규화/잔차 규약을 따르며 이를 수정된 구형 Gaussian의 정확한 MLE BIC라고 주장하지 않는다. 코드/가이드/분석 화면에서 공개된 X-Means 점수라는 한계를 명시한다. ELKI 문서도 해당 문제를 경고한다. zero-SSE 부모는 더 나누지 않고 n≤K 후보는 불허한다. strict maxClusters·kd-tree 가속 없음은 명시적 실행 정책이다. 작고 낮은 유효 차원의 표본에서 과분할하거나 일반 blobs에서 참 K와 다를 수 있다.

독립 NumPy 식: x=y=0, z=[0,.1,.2,2,2.1,2.2]의 부모 score −13.2978450333, 자식 score 23.6069795144. 시드나 데이터 품질을 바꿔 원하는 K를 강제하지 않는다.

## G-Means

Hamerly & Elkan, [Learning the k in k-means](https://papers.nips.cc/paper/2526-learning-the-k-in-k-means.pdf), NIPS2003, Algorithm1/§2.1을 확인했다. 부모 공분산의 최대 고유방향으로 c±s√(2λ/π)를 초기화하고 실제 2-Means 후 중심 연결 방향으로 투영한다. 표준화는 **표본 분산 ddof=1**, 원문 AD 보정 A²*=A²(1+4/n−25/n²)이다.

현재 정확히 확인한 α=.0001 / 임계값1.8692만 지원하며 다른 α를 임의 보간하지 않는다. 최소8개·양의 분산을 요구하고 작은/0분산 부모는 분할하지 않는다. logNormalCDF는 Laplace 연분수와 중심 구간 Simpson 적분으로 계산해 실제 SciPy log_ndtr와 −1e6~+1e6의 꼬리까지 비교했다. overflow/underflow는 명시적 오류이며 소수값 clamp로 검정값을 조작하지 않는다. 비기각은 Gaussian의 증명이나 사후확률이 아니다. 다중 검정/작은 표본 검정력·가정 위반에 대한 한계가 남는다.

고정 40점 두 봉우리 fixture의 원문 보정 통계량6.7425512026>1.8692, 고정8점 Gaussian fixture는 .5511572766으로 비기각한다. 일반 scipy.anderson의 다른 보정/임계값과 동일하다고 하지 않는다.

## Dip-Means

Kalogeratos & Likas, [Dip-means](https://papers.nips.cc/paper_files/paper/2012/file/a8240cb8235e9c493a0c30607586166c-Paper.pdf), NIPS2012, §2–3, Eq2/3, Algorithm1의 viewer/empirical bootstrap/평균 split-viewer dip score/한 군집 분할을 확인했다. 초기 자식은 원문처럼 시드 관측점과 평균 반사점을 사용한다. kernel 버전은 미지원이다.

Hartigan & Hartigan (1985), The Dip Test of Unimodality, DOI10.1214/aos/1176346577; P.M.Hartigan (1985), Algorithm AS217, DOI10.2307/2347485를 서지 확인했다. 원문 전체 PDF 직접 접근은 제한되었다. 공개 공식 ClustPy/원저자 파생 구현의 수학적 envelope 절차를 참고하고, 제품 코드는 연결 인덱스 AS217 포트가 아니라 **직접 재구성하는 generic convex hull**로 독립 작성했다. GPL diptest 구현을 복사하지 않았다. [ClustPy 공식 dip 설명](https://github.com/collinleiber/ClustPy/blob/master/clustpy/utils/diptest.py), [diptest 공식 패키지](https://pypi.org/project/diptest/)를 확인했다.

같은 n의 Uniform reference를 시드로 B개 생성하고 모든 viewer의 실제 거리 dip와 비교한다. p=비율(referenceDip≥observedDip), p≤α에서 기각한다. split viewer 비율이 v_th 이상이면 평균 dip를 score로 삼고 가장 큰 한 군집만 분할한다. viewer를 줄이거나 히스토그램 봉우리로 대체하지 않는다. p값은 1/B 해상도로 0이 가능하다. plus-one 수정이나 표 보간과 같은 방법이라고 표시하지 않는다. 현재 bootstrap B가 작으면 극단 α에서 불확실성이 크며 사용자가 조절한다.

허용 zero 규약: n<4, 모두 동일, 정확한 등간격 표본은 dip0. 모달 구간 hull을 만들기 전 **2의 거듭제곱으로만 rescale**해 임의 범위 나눗셈이 정확한 등간격을 깨뜨리는 문제를 방지했다. ECDF 점프 양쪽을 평가한다. 독립 diptest0.11.0으로 random/tied/다중봉·4값 격자의 n4~8 exhaustive 조합·1e±150 스케일 등 **565개 fixture**를 비교했다. 이는 한 단위 테스트 안의 수치 사례이며 테스트565개라고 부풀리지 않는다.

복잡도는 원문 최적 AS217과 다르다. 재구성 hull의 각 modal 수축은 선형이며 dip 한 번 최악 O(n²), 모든 viewer 최악 O(n³), bootstrap 최악 O(Bn²), 정렬·전체 Lloyd가 추가된다. 각 viewer의 거리 배열만 만들어 전체 거리 행렬은 저장하지 않는다. 원본 O(nd), 거리/hull O(n), 크기별 reference cache O(B×서로 다른 군집 크기 수), Trace는 별도다. 정확성 확인용 작은 입력을 우선하며 대형 실행에서 근사를 몰래 적용하지 않는다.

## DP-Means

Kulis & Jordan, [Revisiting k-means: New Algorithms via Bayesian Nonparametrics](https://icml.cc/2012/papers/291.pdf), ICML2012(arXiv2011), Algorithm1/§3.2/Theorem3.1을 읽었다. 전체 평균 한 중심으로 시작, 원본 순서대로 최근접 **제곱거리**>λ이면 즉시 해당 점을 중심으로 추가, 전체 순회 뒤 평균 갱신이다. 목적은 SSE+λK다. 빈 군집은 제거하고 실제 평균/할당·목적함수를 기록한다. 입력 순서를 seed로 몰래 바꾸지 않는다.

반복/최대 K 종료를 무제한 원문 절차의 수렴으로 표시하지 않는다. 반환은 마지막 실제 순회/평균 상태다. λ는 반경이 아니며 posterior 추론을 수행하는 DP-GMM과 다르다. ND 전체 순차 학습은 O(TnKd), 원본 O(nd), 할당 O(n), 중심 O(Kd)다. 큰 입력은 점별 기록 대신 실제 생성과 반복 요약을 명시하되 전체 계산은 같다. [.0,.1,.2,.8,.9,1], λ=.08에서 중심 .1/.9, SSE=.04, λK=.16, 총 J=.20을 독립 NumPy 순차 코드와 비교했다.

## 독립 검증과 제품 의존성

`python scripts/auto_models_reference.py` → fixtures/auto-models-reference.json. 실제 실행 버전 NumPy2.5.4, SciPy1.18.1, diptest0.11.0. diptest GPL3는 **검증 전용** .local/auto-reference-runtime에만 설치하고 제품 코드/번들에 포함하지 않는다. 제품 라이브러리 추가나 외부 알고리즘 코드 복사는 없다. 원문/독립 구현의 라이선스와 실제 열람 한계를 구분한다.

`npx vitest run src/engine/auto-models.test.ts`: **15/15 통과**. 독립 수치 kernels/전체 ND·표시 불변/시드/실제 최초·국소 중심 변화/동일점/잘못된 입력/한도/underflow/Trace 전후·checkpoint/적정 규모 관측을 확인했다. 성능 test는 속도 assertion을 두지 않는다. 타입·ESLint는 부모 통합에서 전체 재검사하며 소유 파일 ESLint는 통과했다. 원격 브라우저/배포 성공을 아직 주장하지 않는다.

## 단일 Node 성능 관측

Windows x64, Node24.19.0, seed42, maxK8, iterations12, Dip bootstrap50. 입력 생성·Worker 복사·브라우저 렌더링은 제외한다. heap delta는 peak가 아니며 GC로 음수일 수 있다. 원본 측정은 [auto-models-performance.json](auto-models-performance.json)이다. Dip은 실제 전체 viewer 비용 때문에100점만 측정했다. 모든 알고리즘에100만 입력을 강제하거나 새 전역 입력 상한을 두지 않았다.

| 엔진 | n | ms | 이벤트 | Trace 추정bytes | 실제 K |
|---|---:|---:|---:|---:|---:|
| X-Means | 100 | 1.22 | 14 | 28260 | 1 |
| X-Means | 1000 | 2.47 | 16 | 163180 | 1 |
| G-Means | 100 | 4.77 | 54 | 101122 | 3 |
| G-Means | 1000 | 16.45 | 76 | 534072 | 3 |
| Dip-Means | 100 | 10.32 | 58 | 133888 | 4 |
| DP-Means | 100 | 3.99 | 406 | 236856 | 2 |
| DP-Means | 1000 | 26.74 | 4006 | 6061506 | 2 |

서로 다른 시드/분포·부하/GC에 따라 수치가 달라진다. X-Means의 현재 blobs 관측은 K=1이며 원문 BIC가 참 군집 수를 보장하지 않는 사실을 숨기지 않았다. 브라우저 FPS/실제 모바일·peak 메모리 검증은 후속이다.
