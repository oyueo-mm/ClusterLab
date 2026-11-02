## 2026-11-03 PCKMeans 추가 — 로컬54개

PCKMeans 세로 단위를 연결·검증해 기존53+1=54개, 후보119개 중41개 연결·78개 미구현, 추천216개다. 엄격 완전 인증0. PCM은 다음 단계이며 전체55개/공개 배포 미완료. [현재 확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md). 아래53개 설명은 이전 기록이며119개 후보 번호/이름/순서는 유지한다.

# 알고리즘 전체 등록 현황 — 53개 개발 트리

> 최종 공개 체크포인트:53개(기존13+후보40), 미구현79개, 완전 인증0. 제품main fc5cc15·Actions41305149245 validate/Pages 성공. 원격532/39파일·전체브라우저78통과/12기존생략, 로컬 다섯 spec cross38/38, 공개4브라우저8/8. 아래 중간 기록보다 SESSION_REPORT 마지막 확정 절을 우선한다.

현재 feat/sequential-clustering 소스 **53개 = 기존13 + 후보40**, 신규 후보119개 중 **79개 미구현**, 엄격한 마스터 완전 인증0개다. 이번 순차3개는 실제 계산·Trace·ND 전용분석·수학 교재/손계산·실제 mini·독립 공식Python/NumPy oracle와 단위/신규 브라우저를 연결했다. 전체 회귀·새 배포는 검증 중이다. 모듈 연결 수와 완전 인증 수를 구별한다.

직전50개 공개판은 제품da10d21/문서d6e4e0d다. 현재53개의 원격·공개 성공은 SESSION_REPORT 마지막 절을 따른다. 전체509/37파일·CI브라우저74성공/12기존생략·공개4브라우저20구성 성공은 그 범위다. 원문은 [sessions/platform50](sessions/platform50/ALGORITHM_REGISTRY.md)에 보존했다. 직전44/25개 기록도 삭제하지 않는다. 다음표는119개의 번호·이름·순서와 실제JSON metadata를 보존한다. 미구현에 engine을 임의로 연결하지 않는다.

## 기존 13개

| 엔진       | 분류                          | 상태                                                          |
| ---------- | ----------------------------- | ------------------------------------------------------------- |
| K-Means    | 기존 알고리즘                 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| DBSCAN     | 기존 알고리즘                 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| HDBSCAN    | 기존 알고리즘                 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| AGNES      | 기존 알고리즘                 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| DIANA      | 기존 알고리즘                 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| SOM        | 관련 학습법 (위상 학습)       | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| LVQ        | 관련 학습법 (지도 프로토타입) | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| OPTICS     | 기존 알고리즘                 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| PAM        | 기존 알고리즘                 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| ROCK       | 기존 알고리즘                 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| GMM        | 기존 알고리즘                 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| BIRCH      | 기존 알고리즘                 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| Mean Shift | 기존 알고리즘                 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |

## 신규 후보119개별 실제 상태

| 번호 | 후보                             | 분류                                                     | 입력                | 실행 모듈                 | 진행 상태                                                                                    |
| ---: | -------------------------------- | -------------------------------------------------------- | ------------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
|    1 | Mini-Batch K-Means               | 변형 (비복원 epoch)                                      | points2d            | Mini-Batch K-Means        | 독립 수치·Trace·브라우저 검증 완료 (제한 범위)                                               |
|    2 | Bisecting K-Means                | 변형                                                     | points2d            | Bisecting K-Means         | 테스트 완료 · 독립 수치 검산                                                                 |
|    3 | X-Means                          | 주요 변형 (BIC 기반 K-Means 분할 탐색)                   | numeric-nd          | X-Means                   | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|    4 | G-Means                          | 주요 변형 (정규성 검정 기반 K-Means 분할)                | numeric-nd          | G-Means                   | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|    5 | Dip-Means                        | 주요 변형 (dip 검정 기반 K-Means 분할)                   | numeric-nd          | Dip-Means                 | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|    6 | DP-Means                         | 독립 알고리즘 (small-variance 비모수 hard 목적함수)      | numeric-nd          | DP-Means                  | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|    7 | K-Medians                        | 주요 변형 (L1 중앙값)                                    | points2d            | K-Medians                 | 독립 수치·Trace·브라우저 검증 완료 (제한 범위)                                               |
|    8 | K-Modes                          | 주요 변형 (범주 불일치·최빈값 batch 갱신)                | categorical         | K-Modes                   | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|    9 | K-Prototypes                     | 주요 변형 (수치·범주 혼합 prototype)                     | mixed               | K-Prototypes              | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|   10 | Spherical K-Means                | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   11 | Kernel K-Means                   | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   12 | Balanced K-Means                 | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   13 | K-Means--                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   14 | CLARA                            | 표본 탐색 변형                                           | points2d            | CLARA                     | 독립 수치·Trace·브라우저 검증 완료 (제한 범위)                                               |
|   15 | CLARANS                          | 주요 변형 (무작위 medoid 탐색)                           | points2d            | CLARANS                   | 독립 수치·Trace·브라우저 검증 완료 (제한 범위)                                               |
|   16 | K-Center                         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   17 | Hartigan–Wong K-Means            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   18 | PAMSIL                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   19 | PAMMEDSIL                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   20 | Fuzzy C-Means                    | 독립 알고리즘                                            | points2d            | Fuzzy C-Means             | 테스트 완료 · 독립 수치 검산                                                                 |
|   21 | Possibilistic C-Means            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 원문·정의 예비 검토 · 엔진 미구현                                                            |
|   22 | Fuzzy Possibilistic C-Means      | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 원문·정의 예비 검토 · 엔진 미구현                                                            |
|   23 | COP-KMeans                       | variant                                                  | constrained         | COP-KMeans                | 독립 수치·Trace·로컬 브라우저 검증 완료 (제한 범위)                                          |
| 24 | PCKMeans | 독립 알고리즘 | constrained 원본 ND | PCKMeans | 일관 관계·균일 유한 벌점의 제한 범위, 독립 수치·브라우저 검증; 완전 인증 아님 |
|   25 | MPCKMeans                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 원문·정의 예비 검토 · 엔진 미구현                                                            |
|   26 | Constrained Spectral Clustering  | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 원문·정의 예비 검토 · 엔진 미구현                                                            |
|   27 | Density Peaks / CFSFDP           | 중심 선택 변형 (명시적 K)                                | numeric-nd          | Density Peaks / CFSFDP    | 독립 수치·Trace·브라우저 검증 완료 (제한 범위)                                               |
|   28 | SNN Clustering                   | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   29 | DENCLUE                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   30 | LSDBC                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   31 | DeLiClu                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   32 | Generalized DBSCAN               | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   33 | GriDBSCAN                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   34 | ST-DBSCAN                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   35 | DenStream                        | 독립 알고리즘 (시간 감쇠 밀도 micro-cluster 요약)        | stream              | DenStream                 | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|   36 | D-Stream                         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   37 | CluStream                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   38 | Support Vector Clustering        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   39 | CURE                             | 독립 알고리즘 (전체 데이터 절차)                         | points2d            | CURE                      | 독립 수치·Trace·브라우저 검증 완료 (제한 범위)                                               |
|   40 | CHAMELEON                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   41 | FINCH                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   42 | HACAM                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   43 | COBWEB                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   44 | SLINK                            | 최적화 (single linkage)                                  | 입력 계약 조사 필요 | 없음                      | 정의·관계 조사 · 미구현                                                                      |
|   45 | CLINK                            | 구현 기법 (complete 유사, 순서 의존성 주의)              | 입력 계약 조사 필요 | 없음                      | 정의·관계 조사 · 미구현                                                                      |
|   46 | NN-Chain HAC                     | 최적화 (linkage별 조건)                                  | 입력 계약 조사 필요 | 없음                      | 정의·관계 조사 · 미구현                                                                      |
|   47 | Evidence Accumulation Clustering | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   48 | Spectral Clustering              | 독립 알고리즘·정규화 변형                                | numeric-or-graph    | Spectral Clustering       | 독립 수치·Trace·브라우저 검증 완료 (제한 범위)                                               |
|   49 | Affinity Propagation             | 독립 알고리즘                                            | numeric-nd          | Affinity Propagation      | 독립 수치·Trace·브라우저 검증 완료 (제한 범위)                                               |
|   50 | Louvain                          | 독립 알고리즘 (다단계 greedy modularity)                 | numeric-or-graph    | Louvain                   | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|   51 | Leiden                           | 주요 변형 (Louvain에 연결성 refinement·집약 추가)        | numeric-or-graph    | Leiden                    | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|   52 | Label Propagation                | 독립 알고리즘 (비동기 가중 이웃 레이블 전파)             | numeric-or-graph    | Label Propagation         | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|   53 | Chinese Whispers                 | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   54 | Girvan–Newman                    | 독립 알고리즘 (간선 betweenness 제거; 가중 확장)         | numeric-or-graph    | Girvan–Newman             | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|   55 | Walktrap                         | 독립 알고리즘 (확률보행 Ward 계층·최고Q cut)             | numeric-or-graph    | Walktrap                  | 독립 수치·Trace·로컬 브라우저 검증 완료 (제한 범위)                                          |
|   56 | Infomap                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   57 | Markov Clustering (MCL)          | 독립 알고리즘 (전이 흐름 expansion·inflation)            | numeric-or-graph    | Markov Clustering (MCL)   | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|   58 | Greedy Modularity (CNM)          | 독립 greedy modularity 알고리즘의 전수 스캔 구현 변형    | numeric-or-graph    | Greedy Modularity (CNM)   | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|   59 | Fluid Communities                | 독립 알고리즘 (경쟁 유체 밀도 전파)                      | numeric-or-graph    | Fluid Communities         | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|   60 | Clique Percolation               | 중첩 군집화 기법 (k-clique 연결 성분 cover)              | numeric-or-graph    | Clique Percolation        | 독립 수치·Trace·로컬 브라우저 검증 완료 (제한 범위)                                          |
|   61 | BigCLAM                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   62 | Stochastic Block Model           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   63 | OSLOM                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   64 | CLIQUE                           | 독립 알고리즘 (격자 부분공간; MDL 미사용 변형)           | numeric-nd          | CLIQUE                    | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|   65 | STING                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   66 | WaveCluster                      | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   67 | BANG                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   68 | PROCLUS                          | 독립 알고리즘 (projected medoid·부분공간 탐색)           | numeric-nd          | PROCLUS                   | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|   69 | ORCLUS                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   70 | SUBCLU                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   71 | PreDeCon                         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   72 | DiSH                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   73 | HiSC                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   74 | 4C                               | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   75 | CASH                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   76 | LMCLUS                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   77 | DOC                              | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   78 | P3C                              | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   79 | COPAC                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   80 | ERiC                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   81 | Bayesian GMM / DP-GMM            | 분리 검토 필요 (finite Bayesian/DP)                      | 입력 계약 조사 필요 | 없음                      | 정의·관계 조사 · 미구현                                                                      |
|   82 | Student-t Mixture                | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   83 | Mixture of Factor Analyzers      | 모형 (요인분석 혼합)                                     | 입력 계약 조사 필요 | 없음                      | 정의·관계 조사 · 미구현                                                                      |
|   84 | von Mises–Fisher Mixture         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   85 | Multinomial Mixture              | model-family                                             | numeric-nd          | Multinomial Mixture       | 독립 수치·Trace·로컬 브라우저 검증 완료 (제한 범위)                                          |
|   86 | Bernoulli Mixture                | model-family                                             | numeric-nd          | Bernoulli Mixture         | 독립 수치·Trace·로컬 브라우저 검증 완료 (제한 범위)                                          |
|   87 | Latent Class Analysis            | 모델 (binary 경우 Bernoulli와 중복)                      | 입력 계약 조사 필요 | 없음                      | 정의·관계 조사 · 미구현                                                                      |
|   88 | Gaussian–Uniform Mixture         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   89 | Poisson Mixture                  | model-family                                             | numeric-nd          | Poisson Mixture           | 독립 수치·Trace·로컬 브라우저 검증 완료 (제한 범위)                                          |
|   90 | Beta Mixture                     | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   91 | Mixture of Probabilistic PCA     | 모형 변형 (PPCA 혼합)                                    | 입력 계약 조사 필요 | 없음                      | 정의·관계 조사 · 미구현                                                                      |
|   92 | Neural Gas                       | 관련 학습법 (경쟁 양자화)                                | points2d            | Neural Gas                | 독립 수치·Trace·브라우저 검증 완료 (제한 범위)                                               |
|   93 | Growing Neural Gas               | 관련 학습법 (성장 양자화)                                | points2d            | Growing Neural Gas        | 독립 수치·Trace·브라우저 검증 완료 (제한 범위)                                               |
|   94 | ART1                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   95 | Fuzzy ART                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   96 | SOM-SC                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   97 | SyncNet                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   98 | HSyncNet                         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|   99 | Sync-SOM                         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  100 | DEC                              | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  101 | IDEC                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  102 | VaDE                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  103 | DeepCluster                      | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  104 | Deep K-Means (DKM)               | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  105 | N2D                              | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  106 | DipDECK                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  107 | DeepECT                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  108 | BSAS                             | 독립 알고리즘 (Euclidean·이동 평균 대표 순차 정책)       | numeric-nd          | BSAS                      | 독립 수치·Trace·로컬 브라우저 검증 완료 (제한 범위)                                          |
|  109 | MBSAS                            | 변형 (실제 pass·유보·대표 갱신 규칙 구분)                | numeric-nd          | MBSAS                     | 독립 수치·Trace·로컬 브라우저 검증 완료 (제한 범위)                                          |
|  110 | TTSAS                            | 변형 (실제 pass·유보·대표 갱신 규칙 구분)                | numeric-nd          | TTSAS                     | 독립 수치·Trace·로컬 브라우저 검증 완료 (제한 범위)                                          |
|  111 | Leader                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 원문·정의 예비 검토 · 엔진 미구현                                                            |
|  112 | Canopy                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  113 | Spectral Co-Clustering           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  114 | Spectral Biclustering            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  115 | Cheng–Church Biclustering        | 독립 알고리즘 (MSR 기반 행·열 이중군집)                  | matrix              | Cheng–Church Biclustering | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|  116 | Plaid Model                      | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  117 | Bimax                            | 독립 알고리즘 (최대 이진 이중군집 divide-and-conquer)    | matrix              | Bimax                     | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |
|  118 | StreamKM++                       | 분류 검토 필요                                           | 입력 계약 조사 필요 | 없음                      | 미조사                                                                                       |
|  119 | K-Shape                          | 독립 알고리즘 (shape-based 시계열 군집화; 직접 NCC 구현) | timeseries          | K-Shape                   | 실제 계산·Trace·전용 분석·가이드·독립 수치 검증 (제한 범위; 통합 검증 이력은 SESSION_REPORT) |

## 새 순차3개의 실제 범위

| 번호 | 정식 명칭                                            | 분류와 실제 차이                                                                             | 현재 검증                                                                        |
| ---- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 108  | Basic Sequential Algorithmic Scheme (BSAS)           | 순차 알고리즘·이동 평균 대표 정책. 한 pass·배정 즉시 평균 갱신·실제 최대 군집 수q.           | 공식PyClustering0.10.1.2/NumPy 및 단계 수치·원본순서/표시 불변·역재생·실제Worker |
| 109  | Modified Basic Sequential Algorithmic Scheme (MBSAS) | 주요 변형. 첫 pass seed만 생성/나머지유보, 둘째pass 미배정만 할당·평균 갱신.                 | 동일 입력BSAS1군집/MBSAS2군집의 실제 차이·공식수치/Trace·실제Worker              |
| 110  | Two-Threshold Sequential Algorithmic Scheme (TTSAS)  | 주요 변형. d≤하한 할당/d>상한 생성/중간유보, 실제재방문과무진전pass후첫pending생성. q미사용. | 경계·유보·2/3pass·공식수치/Trace·실제Worker                                      |

[SEQUENTIAL](research/SEQUENTIAL.md)에 실제 정의·수식/복잡도·정식 명칭·원서 전체 접근 한계·공식 문서와 실행 소스 분기 차이·라이선스·oracle·성능·모든 한계를 기록한다. 60원본×3=180공식 결과를180개 Vitest로 집계하지 않는다. 원서 전체 열람/최초 논문 검증 완료로 세지 않는다. 세 개가 이름만 다른 같은 엔진은 아니다.

## 보존·집계·연구 단계

- 기존13은 실제 모듈·32프리셋·홈/디자인을 보존하며 수학 원문 전수 재감사를 완료로 주장하지 않는다. SOM/LVQ/Neural Gas/Growing Neural Gas는 관련 학습법이다.
- 안정50개는 기존13+후보37이며 이전 실제19개/확장6개와 검증 기록은 해당 archive와 research 자료를 따른다. 새3개를 더한 소스는 후보40이며 독립 목적함수 알고리즘40개라고 부르지 않는다.
- BayesianGMM/DP-GMM, Bernoulli/LCA, MFA/MPPCA와 SLINK/CLINK/NN-chain의 관계는 TAXONOMY·기존자료를 따른다. 별칭·linkage 최적화·초기화를 새 엔진으로 중복 집계하지 않는다.
- PCK/PCM/FPCM/MPCK/Constrained Spectral·Leader의 예비 정의 비교는 NEXT_50_QUEUE에 있다. BSAS는 이 예비 큐에서 실제 구현으로 진행했고 MBSAS/TTSAS도 독립 규칙을 확인했다. 예비 열람을 정식 전체 조사·oracle 실행 완료라고 표시하지 않는다.
- 모든119개의 전수 원문 조사와 전체 마스터 검수는 미완료다. 미구현79개에 빈 결과나 K-Means를 붙여 완료로 채우지 않는다. 최종 새 CI/Pages는 SESSION_REPORT 마지막 확정 결과만 따른다.
