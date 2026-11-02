## 2026-11-03 1차 확장 공개 검증 완료

PCKMeans와1993 고정 양수 척도 PCM을 각각 실제 계산·원본 ND·Trace·전용 분석/가이드/미니·4추천·독립 NumPy와 연결했다. 실행55개·추천220구성·미구현77개·엄격 원문 완전 인증0이다. 제품 `32dc4cf`의 Actions41513054284/Pages 성공, 로컬·원격694단위/전체130통과·14기존생략, 공개19통과·1기존중복생략 및 추천16/화면15/대규모재생4조건을 확인했다. [최종 범위·수식·원문과의 차이·검증](../ALGORITHM_EXPANSION_1_REPORT.md)을 우선한다. R 실행과1993 원문 전체 인증은 미실시다. 아래54개/53개/구현 전 상태는 당시 연구 기록이며 FPCM 등 후속 후보를 구현으로 올리지 않는다.

## 2026-11-03 PCM 후속 구현

1993 고정 양수 척도 PCM을 원본 ND로 실제 구현했다. 비정규화 전형성·별도 ND FCM 초기화·로그 평균·자동 영분산 오류/수동 양수 퇴화를 구분한다. 기존 수치 예제를 회귀 fixture로 재사용했고 독립 NumPy14사례와 전용20테스트로 검산했다. R 실행 및1993 원문 전체 인증은 미실시다. [PCM 계약/검증](PCM.md), [확장 보고서](../ALGORITHM_EXPANSION_1_REPORT.md)를 따른다. FPCM 등 나머지 후보를 완료로 올리지 않는다. 아래는 기존 연구 기록이다.

## 2026-11-03 PCKMeans 후속 구현

SDM2004 Figure1을 직접 렌더링해 기존 미확인 초기화를 보완했다. PCKMeans 제한 범위 세로 구현·독립 NumPy/Trace/브라우저 검증은 [PCKMEANS.md](PCKMEANS.md)를 따른다. 현재 로컬54엔진/78미구현/엄격 인증0, PCM과 전체55 통합 배포는 다음 단계다. 아래 연구 메모의 날짜별 미구현 상태는 당시 기록으로 보존한다.

# 50엔진 이후의 다음 구현 단위 사전 검토

2026-11-01. **구현을 시작하기 전의 연구 계획**이다. 현재 개발 소스50개(기존13+후보37), 후보119개 중 미구현82개라는 작업 기준에서 아래6개를 우선 검토한다. 이 문서 작성으로 엔진·조사 완료 수를 늘리지 않는다. 전체119개 후보를 축소하거나 나머지76개를 제외하지 않는다. 50엔진 배포·브라우저 통합 결과는 이 문서의 검증 범위가 아니다.

## 선택과 순서

| 후보 번호 | 다음 실제 구현 단위 제안                                              | 기존 구현과의 수학적 차이                                  | 시작 조건                                                |
| --------- | --------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| 24        | PCKMeans, 우선 SDM2004의 일관된 제약/closure 기본형                   | COP의 hard 허용 검사 대신 유한한 위반 비용을 실제로 최소화 | closure로 유도된 pair도 목적함수에 들어가는 정책 확정    |
| 21        | Possibilistic C-Means, PCM1993 목적함수                               | FCM의 행 합1을 제거하고 전형성 및 군집별 척도 사용         | 원문 추가 확보 또는 아래 저자 재정의·공식 구현 교차 확인 |
| 108       | BSAS, 명시적 Euclidean/입력 순서/대표점 평균 갱신                     | 순차 유입마다 임계값과 현재 군집 수로 생성·할당 결정       | 대표점/거리/동률/최대 군집 수를 독립 구현과 고정         |
| 22        | Fuzzy Possibilistic C-Means, FPCM1997                                 | U의 행 정규화와 T의 열 정규화를 동시에 사용하는 별도 목적  | FPCM/PFCM 명칭 분리, ND U/T 공통 연산의 회귀 검증        |
| 25        | MPCKMeans, 우선 원문의 군집별 대각 metric 변형                        | 제약 비용뿐 아니라 metric과 log determinant를 실제 학습    | PCK 이후, 양의 metric 및 farthest-pair 갱신의 수치 검증  |
| 26        | Constrained Spectral Clustering, Wang–Davidson2010의 2-way relaxation | signed 제약 행렬을 포함한 generalized eigenproblem         | 일반화 고유해 및 제약 점수/반올림 계약을 먼저 검증       |

권장 순서는 PCK·PCM·BSAS의 독립 작업부터 시작하고 FPCM, MPCK, constrained spectral을 뒤따르게 하는 것이다. 각 항목은 엔진·Trace·전용 분석·가이드·실제 미니 실험·독립 검산·브라우저 확인까지 하나씩 완료한다. 아래 수식은 구현 대상의 명세 초안이며 현재 제품에서 실행되는 계산이 아니다.

## 실제 열람 범위와 출처

웹 접근 결과를 2026-11-01 확인했다. PDF의 추출 텍스트를 읽었으며 OCR이 깨진 수식은 원문 수식 전체를 육안 검증했다고 취급하지 않는다. 원문 공개는 구현 코드의 재배포 허가와 다르다.

| 대상                 | 원논문·공식 URL                                                                                                                                                                                                                                                           | 이번에 확인한 범위 / 남은 접근 한계                                                                                                                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PCK                  | Basu, Banerjee & Mooney, _Active Semi-Supervision for Pairwise Constrained Clustering_, SDM2004, pp333–344. [저자 PDF](https://www.cs.utexas.edu/~ml/papers/semi-sdm-04.pdf)                                                                                              | PDF12쪽 중 §2–3의 비용·closure·할당·평균·순서 의존성 설명을 열람. Figure1 수식 OCR 일부 불완전. 동일 PCK 목적은 아래 ICML2004 Eq1에서도 읽을 수 있음.                                                                                                                                                                                            |
| MPCK                 | Bilenko, Basu & Mooney, _Integrating Constraints and Metric Learning in Semi-Supervised Clustering_, ICML2004, pp81–88. [학회 PDF](https://icml.cc/Conferences/2004/proceedings/papers/119.pdf) · [저자 PDF](https://bilenko.com/papers/04-semi-icml.pdf)                 | PDF8쪽, §2.4 Eq3–6·Figure1·§3.1/3.3의 실제 metric과 대각/전체 행렬 구분 열람. 실행 가능한 원저자 코드 및 라이선스는 이 메모에서 확인하지 못함.                                                                                                                                                                                                   |
| Constrained Spectral | Wang & Davidson, _Flexible Constrained Spectral Clustering_, KDD2010. [저자 대학 PDF](https://web.cs.ucdavis.edu/~davidson/Publications/rp058d-wang.pdf)                                                                                                                  | PDF10쪽, §3 Eq3–15 및 Algorithm1·K-way 확장 설명 열람. [2012 후속작 초록](https://arxiv.org/abs/1201.5338)은 별도 버전이며 2010 방법과 섞어 구현하지 않음.                                                                                                                                                                                       |
| PCM                  | Krishnapuram & Keller, _A possibilistic approach to clustering_, IEEE TFS1(2), 1993, pp98–110. [DOI](https://doi.org/10.1109/91.227387) · [출판사](https://ieeexplore.ieee.org/document/227387)                                                                           | 출판사 본문은 JavaScript/로봇 검증으로 미열람. 서지 및 1993/1996 목적 구분은 [공식 ppclust PCM 문서](https://search.r-project.org/CRAN/refmans/ppclust/html/pcm.html), 정의는 아래 2005 저자 논문 §III에서도 교차 검토. 1993 원문 전체 열람 완료로 세지 않음.                                                                                    |
| FPCM                 | Pal, Pal & Bezdek, _A mixed c-means clustering model_, FUZZ-IEEE1997 vol1, pp11–21. [DOI](https://doi.org/10.1109/FUZZY.1997.616338) · [출판사](https://ieeexplore.ieee.org/document/616338)                                                                              | 1997 출판사 본문은 동일 접근 제한. [공식 ppclust FPCM 문서](https://search.r-project.org/CRAN/refmans/ppclust/html/fpcm.html) 및 원저자들의 2005 논문 §IV 재정의를 열람. 1997 원문 전체를 읽었다고 하지 않음.                                                                                                                                    |
| FPCM/PFCM 구분       | Pal, Pal, Keller & Bezdek, _A Possibilistic Fuzzy c-Means Clustering Algorithm_, IEEE TFS13(4), 2005, pp517–530. [DOI](https://doi.org/10.1109/TFUZZ.2004.840099) · [대학 호스팅 논문 PDF](https://www.comp.ita.br/~forster/CC-222/material/fuzzyclust/fuzzy01492404.pdf) | PDF14쪽의 초록·§I/III/IV/V를 통해 FPCM1997의 표본 방향 정규화와 PFCM2005의 다른 모형을 구분. 추출 텍스트에서 다수 수식 기호가 빠지므로 수식의 최종 계수·첨자는 추가 원문 확인 필요.                                                                                                                                                              |
| BSAS                 | Theodoridis & Koutroumbas, _Pattern Recognition_, 4th ed., 2009. [출판사 서지 URL](https://www.sciencedirect.com/book/9781597492720/pattern-recognition)                                                                                                                  | 책 본문을 열람하지 못했으며 출판사 재접속은403. [Novikov의 JOSS2019 논문](https://doi.org/10.21105/joss.01230)의 BSAS/책 인용과 [저자 PyClustering 원본 소스](https://raw.githubusercontent.com/annoviko/pyclustering/master/pyclustering/cluster/bsas.py)의 실제 process/대표점 갱신을 확인. 이를 BSAS 최초 발표 원논문 확인으로 과장하지 않음. |

## 공통 계약에서 먼저 해결할 사항

현재 [ConstrainedDataset](../../src/engine/dataset.ts)은 ND 수치 데이터와 무가중 ML/CL pair를 담는다. [검증기](../../src/engine/datasetValidation.ts)는 ML closure 내부 CL을 입력 오류로 거부한다. 이는 COP 및 **일관된 제약을 가정하는 원문 PCK/MPCK 기본 전처리**와 함께 사용할 수 있다. 반면 모순된 유한 soft pair나 signed 신뢰도를 받는 확장에는 hard 계약을 그대로 쓰면 안 된다. soft 여부·pair 비용·중복 합산·유도 관계·원래 관계를 명시한 별도 계약을 설계하고 COP의 의미는 보존해야 한다.

현재 [ConstraintAnalysis](../../src/engine/constraintTypes.ts)는 allowed/blockers와 SSE 중심이다. PCK에는 거리/위반/총비용, MPCK에는 실제 metric/logdet/최대 거리 pair를 추가해야 한다. hard 제약의 `allowed=false`를 soft 비용과 혼용하지 않는다. 사용자 화면에서는 유한 비용을 감수한 위반을 계산 실패로 표시하지 않는다.

현재 [FCM](../../src/engine/algorithms/fuzzy.ts)은 Point[]의 xy로 계산한다. ND PCM/FPCM을 추가할 때 투영된 xy로 warm-start하면 입력 계약 위반이다. 전체 원본 차원을 사용하는 FCM 초기화 연산을 별도로 검증하거나 기존 엔진을 회귀 테스트와 함께 확장해야 한다. Recorder의 행렬 필드 재사용만으로 새로운 T/척도/목적함수의 의미가 검증되는 것은 아니다.

현재 [고유해 도구](../../src/engine/linalg.ts)는 실수 대칭 행렬의 표준 Jacobi 고유해다. generalized eigenproblem을 지원하지 않는다. `inverse(B)*A`를 이 함수에 넘기는 방식은 일반적으로 대칭 조건을 깨므로 사용할 수 없다.

## 24. PCKMeans: hard 제약과 다른 실제 비용

원문 기본 목적은 다음과 같다. pair는 무방향으로 한 번씩 센다.

\[
J=\sum_i\|x_i-\mu_{z_i}\|^2+
\sum_{(i,j)\in M}w_{ij}[z_i\ne z_j]+
\sum_{(i,j)\in C}\bar w_{ij}[z_i=z_j].
\]

원문 §3은 consistent ML closure와 이웃 간 CL을 **실제로 augment한 뒤 이후 M/C로 사용**한다. 따라서 closure를 초기화 그림에만 표시하고 목적함수는 raw pair만 세면 원문 기본형과 다르다. 초기화는 제약 이웃 기반, 할당은 seeded 순서의 pointwise 비용 최소화, 중심은 실제 산술평균이다. Active PCKMeans의 질의 선택 기능은 별개 범위로 남긴다. [SDM2004 §2–3](https://www.cs.utexas.edu/~ml/papers/semi-sdm-04.pdf), [ICML2004 Eq1](https://bilenko.com/papers/04-semi-icml.pdf).

구현 설계상 원문 uniform 비용·일관된 closure 기본형부터 권장한다. soft raw-pair/모순 허용은 별도 옵션과 검증을 갖춘 변형으로만 도입한다. 이 경우 원문 closure를 그대로 적용해서는 안 된다. closure pair를 n²개 만들지 않고 성분별 군집 수 집계로 정확하게 비용을 계산하는 방식을 먼저 검산할 수 있다. 서로 같은 ML 성분을 hard로 통째 할당해서는 안 된다.

Trace는 실제 후보별 squared distance·ML/CL 비용·선택 전후 ΔJ·원래/유도 pair·중심 갱신을 담는다. 시각화는 위반 pair와 총비용 분해를 보여 준다. 모든 candidate가 허용되지만 비용이 다르다는 사실이 COP와의 차이다.

독립 검증 계획은 작은 고정 중심에서 모든 K^n label의 비용을 NumPy로 열거하고, 제품 각 pointwise 이동의 전체 ΔJ를 독립 pair 루프로 재계산하는 것이다. 고정 label 평균·closure 유도 pair 수·weight0·작은 비용에서 실제 제약 위반·동률·빈 군집·시드 순서를 검사한다. 최종 결과가 전역 최소가 된다고 요구하지 않는다. 공식 실행 oracle은 아직 확보하지 않았으며 NumPy 검산 역시 이번 메모에서 실행하지 않았다.

## 21. PCM1993: 전형성과 척도

정의할 계산 범위는 η>1, 군집별 양수 Ω를 갖는 1993 형태다. 1996 entropy 목적을 같은 이름으로 조용히 바꾸지 않는다.

\[
J=\sum_{i,j}t_{ij}^{\eta}d_{ij}^2+
\sum_j\Omega_j\sum_i(1-t_{ij})^{\eta},\quad
t_{ij}=\frac1{1+(d_{ij}^2/\Omega_j)^{1/(\eta-1)}},\quad
v_j=\frac{\sum_i t_{ij}^{\eta}x_i}{\sum_i t_{ij}^{\eta}}.
\]

FCM 기반 척도 추정은 Ω_j=K·Σ_i u_ij^m d_ij²/Σ_i u_ij^m이며 K>0이다. 척도 고정/추정의 실행 순서와 초기화도 결과의 일부다. T의 행 합을1로 만들지 않으며 사후확률로 부르지 않는다. 서로 같은 중심으로 수렴할 수 있는 본질적 한계도 숨기지 않는다. [공식 PCM 문서](https://search.r-project.org/CRAN/refmans/ppclust/html/pcm.html), [저자2005의 PCM 설명](https://www.comp.ita.br/~forster/CC-222/material/fuzzyclust/fuzzy01492404.pdf).

현재 계약에는 ND 입력과 파라미터 스키마를 재사용할 수 있으나 native T·Ω·중심·목적/수렴 상태를 추가해야 한다. Trace는 실제 ND 초기화/척도 산정/전형성/가중 중심을 기록한다. Ω=0인 동일 데이터의 처리와 중심 가중치 소실을 정의하기 전 임의 epsilon으로 성공 처리하지 않는다. log-domain 갱신과 실제 오류를 구분한다.

oracle 후보는 ppclust의 `oftype=1`이며 고정 초기 중심·척도, `stand=FALSE`, FCM 자동 실행 여부를 맞춰야 한다. NumPy 미분 및 한 단계 값과도 비교한다. 전형성 합이1이 아닌 수치 예제·멀리 떨어진 이상치·중복 중심·동일 데이터·ND 투영 불변성·각 고정 Ω 단계의 J를 검증한다. 원문1993의 전문 접근 및 R oracle 실행은 후속 과제다.

## 108. BSAS: 실제 순차 생성과 평균

공식 구현의 계산은 첫 점으로 시작하고, 각 다음 점과 현재 대표점 사이의 최소 거리가 θ보다 **클 때** Kmax 미만이면 새 군집을 만드는 것이다. 그 외에는 가까운 군집에 넣고 `mean←((size−1)mean+x)/size`로 갱신한다. Kmax는 모형의 군집 수 예산이며 입력 점 수 상한이 아니다. 공식 Python 소스는 실제 기본 metric이 Euclidean인데 주석에는 Manhattan이라고 적혀 있어, oracle 호출에 metric을 명시해야 한다. [PyClustering 저자 소스](https://raw.githubusercontent.com/annoviko/pyclustering/master/pyclustering/cluster/bsas.py).

현재 NumericDataset의 원래 행 순서를 도착 순서로 사용하는 ND 엔진이 가능하다. 순서를 seed로 몰래 섞지 않는다. 실제 StreamDataset 어댑터는 순차 상태를 유지하는 별도 작업이며 BSAS가 사용하지 않는 timestamp에 decay 의미를 부여하지 않는다. Trace는 현재 점·기존 대표점 거리·θ 비교·Kmax 포화·생성/할당·갱신 전후 평균을 기록하고 미처리 행을 최종 label로 꾸미지 않는다. 기본 연산은 O(nKd), 대표점 O(Kd), label O(n)이며 상세 Trace 비용은 별도다.

oracle은 공식 `bsas(...,ccore=False,metric=EUCLIDEAN)`과 독립 NumPy prefix 검산을 제안한다. 공식 소스는 대표점으로 첫 입력 list를 참조해 수정하므로 검증용 입력을 deepcopy하여 오염을 막는다. 매 prefix에서 군집 모든 원본 행의 평균을 다시 구해 비교하고 θ 동률·Kmax=1·음수 θ 오류·좌표 중복·입력 순열을 검사한다. 책 본문·역사적 최초 정의·고정된 공식 버전 oracle 실행은 아직 미완료다.

## 22. FPCM1997: U와 T의 정규화 방향

후보22의 범위는 1997 FPCM으로 우선 고정하는 것이 타당하다. `Fuzzy Possibilistic`와 `Possibilistic Fuzzy`를 같은 알고리즘의 철자 차이로 세지 않는다. 원저자들의 2005 PFCM은 T의 표본 방향 합 제약을 제거하고 별도 penalty/가중치를 쓰는 다른 모형이다. [2005 저자 논문 초록·§IV/V](https://www.comp.ita.br/~forster/CC-222/material/fuzzyclust/fuzzy01492404.pdf).

\[
J=\sum_{i,j}(u_{ij}^{m}+t_{ij}^{\eta})d_{ij}^{2},\quad
\sum_j u_{ij}=1\;(\text{각 점}),\quad
\sum_i t_{ij}=1\;(\text{각 군집}),\quad m,\eta>1.
\]

U는 각 점에서 군집 방향, T는 각 군집에서 **표본 방향**으로 역거리 거듭제곱을 정규화한다. 중심은 u^m+t^η 가중 평균이다. [공식 FPCM 문서](https://search.r-project.org/CRAN/refmans/ppclust/html/fpcm.html)는 일부 수식의 합 첨자·거리 첨자에 불일치가 있어 그대로 코드로 옮기지 않는다. 위 제약의 Lagrange 미분과 저자 재정의를 추가 대조한다.

ND rows·두 별도 행렬·서로 다른 합 방향·실제 중심/손실을 native 결과와 분석에 담는다. T를 보기 좋게 행 정규화하더라도 그것은 별도 표시값이며 계산값을 덮어쓰지 않는다. 모든 행이 T의 분모에 영향을 주므로 임의 청크별 정규화는 원래 전체 batch 계산과 다르다. U/T 저장 O(nK), 원본 O(nd) 및 Trace byte를 실행 전에 추정한다.

R `ppclust::fpcm`과 독립 NumPy 제약 최소화/고정 중심 검산을 제안한다. zero-distance 다중 동률·표본 전체 복제 시 T 스케일 변화·각 정규화 합·원본 ND·목적 변화·실제 되감기를 확인한다. 1997 전문 확보와 수식 오탈자 해소 전에는 원문 연구 완료 또는 완전 구현으로 표시하지 않는다.

## 25. MPCKMeans: 실제로 학습할 metric

계획하는 원문 목적은 군집별 A_h≻0에 대해 Σ_i(d²_Azi(x_i,μ_zi)−log det A_zi)와 제약 위반 비용을 더한다. 위반 ML 비용의 거리 계수는 f_M=(d²_Azi(x_i,x_j)+d²_Azj(x_i,x_j))/2, 위반 CL은 f_C=max_{p,q∈X}d²_Azi(p,q)−d²_Azi(x_i,x_j)다. max pair는 **전체 데이터**에서 각 metric으로 구한다. 학습은 할당·평균·A 갱신이며 원문은 shared/cluster-specific 및 diagonal/full을 구분한다. [ICML2004 §2.4 Eq4–6, §3.3](https://bilenko.com/papers/04-semi-icml.pdf).

우선 군집별 **대각** metric을 실제 학습하는 명시적 제한 범위가 가능하다. 이것도 상수 metric PCK 래퍼로 대체할 수 없다. 대각 양수·logdet·분모0·최대 pair 변경·단조성·회전 비불변성을 검증한다. full SPD까지 구현하지 않았다면 full metric 지원으로 집계하지 않는다. 원문의 초기화 역시 consistent closure augmentation을 포함하므로 PCK의 계약 결정에 의존한다.

수치 난점은 CL의 현재 scalar 비용이 음수가 아니더라도 갱신 scatter의 모든 방향이 양수가 보장된다고 단정할 수 없다는 것이다. singular/indefinite 갱신을 조용히 clamp하면 목적이 바뀐다. 실제 실패·정규화 변형 여부를 공개해야 한다. farthest pair의 정확 탐색은 diagonal이어도 일반적으로 O(Kn²d) 연산이 필요하며 거리행렬은 만들지 않아도 된다. full metric은 O(Kd²) 저장 및 행렬 분해 비용이 추가된다. 초기 성능 목표를 PCK와 동일하게 잡지 않는다.

분석 화면에는 ND metric 대각/고유방향·logdet·학습 전후 거리·제약 비용·최대 pair를 표시한다. 독립 NumPy 전체 목적·farthest pair 전수검사, 유한차분, SciPy Cholesky/고유값을 사용해 각 갱신을 검산할 계획이다. 원저자 실행 코드와 정규화 없는 퇴화 사례의 수렴 범위는 아직 확인하지 못했으므로 현 단계에서 보장하지 않는다.

## 26. Constrained Spectral: 일반화 고유해를 먼저

여러 방법을 포함하는 포괄적 이름이므로 먼저 Wang–Davidson2010 Algorithm1의 2-way relaxation으로 범위를 고정한다. A는 비음수 무방향 affinity, Q는 signed 제약 신뢰도 행렬이다. L̄=I−D^−1/2 A D^−1/2, Q̄=D^−1/2 Q D^−1/2로 두고 다음을 푼다.

\[
\bar L v=\lambda\left(\bar Q-\frac{\beta}{\operatorname{vol}(G)}I\right)v.
\]

원문은 양의 고유값 후보를 정규화(vᵀv=vol(G))하고 trivial 해를 제외한 뒤 cut 비용 vᵀL̄v로 선택한다. β는 완화된 제약 점수의 하한이며 discrete label의 모든 ML/CL 충족 보장이 아니다. 2-way rounding 및 K-way embedding은 서로 구분한다. [원문 §3 Eq3–15·Algorithm1](https://web.cs.ucdavis.edu/~davidson/Publications/rp058d-wang.pdf).

현재 NumericDataset+constraint에는 affinity 생성 과정을 명시해 붙일 수 있다. 원래 가중 GraphDataset+제약을 동시에 받으려면 새 복합 입력 계약이 필요하다. hard closure의 불일치 선제 거부는 signed 신뢰도 표현과 맞지 않는다. degree0·empty graph·비연결 그래프·중복 고유값·singular pencil·β 경계·trivial 해 판정 정책을 먼저 정한다.

가장 큰 선행 작업은 일반화 고유해 수치 커널이다. 오른쪽 행렬은 indefinite일 수 있으므로 SPD B를 요구하는 `eigh(A,B)`를 무조건 쓰거나 일반 비대칭 `B^-1 L`을 현재 Jacobi로 풀 수 없다. SciPy `eig(A,B)`와 잔차를 대조하여 유한/무한·복소·퇴화 해의 처리와 수학적 범위를 먼저 확인한다. dense n² byte와 고유해 연산량을 실제 자원으로 예측한다.

Trace/분석은 A·L̄·Q̄·generalized 후보·feasibility/잔차·cut·실제 relaxed vector·rounding 위반을 보여 줘야 한다. 독립 oracle 계획은 SciPy generalized eigen 및 작은 signed 그래프 손계산이다. 표준 spectral에 마지막 label 수정만 붙이는 것은 이 구현 단위가 아니다. 일반화 커널 없이 구현을 시작하거나 두 행렬이 대칭이라는 이유만으로 모든 수치 사례를 안전하다고 보장하지 않는다.

## Leader 등 남은 후보의 구분

Leader111은 BSAS108의 이름만 바꾸어 추가하지 않는다. [공식 R leaderCluster1.5 문서](https://search.r-project.org/CRAN/refmans/leaderCluster/html/leaderCluster.html)는 Hartigan1975를 인용하며 움직이는 centroid·가중치·반복 pass를 설명한다. 따라서 `Leader=항상 고정 최초 대표점`이라고 일괄 정의하기도 어렵다. Hartigan의 해당 본문과 채택할 버전의 원래 갱신·반복을 확보한 후 BSAS와 다른 상태 전이를 별도로 정해야 한다. 현재는 **정의 비교 후속 후보**이며 여섯 구현 제안 외의 일곱 번째 완료 항목이 아니다. MBSAS109/TTSAS110도 실제 2-pass/두 임계값 정의를 독립 검토한 뒤 별도 개발한다.

## oracle·라이선스·완료 판정

ppclust 문서 버전은1.1.0.1이며 [CRAN 미러 DESCRIPTION](https://github.com/cran/ppclust/blob/master/DESCRIPTION)의 라이선스는 GPL(>=2)다. 검증용 R 프로세스 후보이며 브라우저 제품 코드로 복사·번들하지 않는다. PyClustering 현재 저자 소스는 BSD-3-Clause 표기를 확인했으나 예전0.8.x 문서는 다른 라이선스 표기가 있으므로 실행 시 실제 고정 버전/커밋·의존성·라이선스를 다시 기록한다. 원저자 PCK/MPCK/constrained spectral의 재현 실행 패키지는 이 조사에서 확보하지 못했다.

**이번 작업은 문서와 소스 계약의 읽기 감사만 수행했다.** 위 새 oracle을 설치·실행하거나 fixture·엔진·파라미터·레지스트리를 추가하지 않았다. 출처 열람과 독립 수치 검증 완료를 혼동하지 않는다. 다음 구현 담당자는 실제 단계 값 fixture·ND 투영 불변성·전진/역진·checkpoint·최종 native 결과 일치·자원 실패·100/1,000 이상의 적합한 규모 벤치마크를 남기고, 기존50개 회귀 및 브라우저 검증 후에만 상태표를 갱신해야 한다.
