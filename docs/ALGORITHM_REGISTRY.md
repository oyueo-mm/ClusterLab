# 알고리즘 전체 등록 현황

2026-11-01 통합 작업 기준. **실제 실행 엔진 44개 = 기존 13개 + 신규 후보 중31개**, 신규 후보119개 중 **88개 미구현**이다. 이번 확장에서는 기존25개에 실제 엔진19개를 추가했다. 후보 번호·이름119개를 모두 보존하며 미조사 항목을 이름 등록만으로 조사·구현 완료 처리하지 않는다.

전체 마스터 검수 기준의 **완전 구현 인증은0개(아직 미인증)**다. 제한과 검증 범위를 공개한 실행 엔진44개와 구분한다. 신규19개는 실제 계산·내부 Trace·전용 분석 시각화·가이드/미니 실험·독립 수치 검증을 갖췄으나, 현재 통합 브라우저·전체 기능 회귀·Pages 배포는 검증 중이다. 브라우저/배포 성공으로 상향하려면 `docs/VALIDATION.md`와 `docs/SESSION_REPORT.md`의 최종 증거를 확인한다. 이전12개 후보의 브라우저 문구는 이전 세션의 검증 범위이며 새44개 통합 배포 성공을 뜻하지 않는다.

이전25개 상태는 `docs/sessions/platform25/`에, 더 이전 기반 상태는 `docs/sessions/foundation/`에 보존했다. 기존 검증 자료를 삭제하거나 덮어써서 과거 실적을 바꾸지 않는다.

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

## 신규 후보 119개

엔진 연결31개, 미구현88개. 입력은 실제 제품 계약이며 미구현 후보는 확인 전까지 조사 필요로 둔다.

| 번호 | 후보                             | 분류                                                     | 입력                | 실제 엔진 / 상태                                                                                                        |
| ---: | -------------------------------- | -------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
|    1 | Mini-Batch K-Means               | 변형 (비복원 epoch)                                      | points2d            | Mini-Batch K-Means · 기존 실제 계산·Trace·가이드·수치 검증, 제한 범위                                                   |
|    2 | Bisecting K-Means                | 변형                                                     | points2d            | Bisecting K-Means · 기존 실제 계산·Trace·가이드·수치 검증, 제한 범위                                                    |
|    3 | X-Means                          | 주요 변형 (BIC 기반 K-Means 분할 탐색)                   | numeric-nd          | X-Means · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT                   |
|    4 | G-Means                          | 주요 변형 (정규성 검정 기반 K-Means 분할)                | numeric-nd          | G-Means · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT                   |
|    5 | Dip-Means                        | 주요 변형 (dip 검정 기반 K-Means 분할)                   | numeric-nd          | Dip-Means · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT                 |
|    6 | DP-Means                         | 독립 알고리즘 (small-variance 비모수 hard 목적함수)      | numeric-nd          | DP-Means · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT                  |
|    7 | K-Medians                        | 주요 변형 (L1 중앙값)                                    | points2d            | K-Medians · 기존 실제 계산·Trace·가이드·수치 검증, 제한 범위                                                            |
|    8 | K-Modes                          | 주요 변형 (범주 불일치·최빈값 batch 갱신)                | categorical         | K-Modes · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT                   |
|    9 | K-Prototypes                     | 주요 변형 (수치·범주 혼합 prototype)                     | mixed               | K-Prototypes · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT              |
|   10 | Spherical K-Means                | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   11 | Kernel K-Means                   | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   12 | Balanced K-Means                 | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   13 | K-Means--                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   14 | CLARA                            | 표본 탐색 변형                                           | points2d            | CLARA · 기존 실제 계산·Trace·가이드·수치 검증, 제한 범위                                                                |
|   15 | CLARANS                          | 주요 변형 (무작위 medoid 탐색)                           | points2d            | CLARANS · 기존 실제 계산·Trace·가이드·수치 검증, 제한 범위                                                              |
|   16 | K-Center                         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   17 | Hartigan–Wong K-Means            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   18 | PAMSIL                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   19 | PAMMEDSIL                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   20 | Fuzzy C-Means                    | 독립 알고리즘                                            | points2d            | Fuzzy C-Means · 기존 실제 계산·Trace·가이드·수치 검증, 제한 범위                                                        |
|   21 | Possibilistic C-Means            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   22 | Fuzzy Possibilistic C-Means      | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   23 | COP-KMeans                       | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   24 | PCKMeans                         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   25 | MPCKMeans                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   26 | Constrained Spectral Clustering  | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   27 | Density Peaks / CFSFDP           | 중심 선택 변형 (명시적 K)                                | numeric-nd          | Density Peaks / CFSFDP · 기존 실제 계산·Trace·가이드·수치 검증, 제한 범위                                               |
|   28 | SNN Clustering                   | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   29 | DENCLUE                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   30 | LSDBC                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   31 | DeLiClu                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   32 | Generalized DBSCAN               | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   33 | GriDBSCAN                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   34 | ST-DBSCAN                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   35 | DenStream                        | 독립 알고리즘 (시간 감쇠 밀도 micro-cluster 요약)        | stream              | DenStream · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT                 |
|   36 | D-Stream                         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   37 | CluStream                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   38 | Support Vector Clustering        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   39 | CURE                             | 독립 알고리즘 (전체 데이터 절차)                         | points2d            | CURE · 기존 실제 계산·Trace·가이드·수치 검증, 제한 범위                                                                 |
|   40 | CHAMELEON                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   41 | FINCH                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   42 | HACAM                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   43 | COBWEB                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   44 | SLINK                            | 최적화 (single linkage)                                  | 입력 계약 조사 필요 | 정의·관계 조사 · 미구현                                                                                                 |
|   45 | CLINK                            | 구현 기법 (complete 유사, 순서 의존성 주의)              | 입력 계약 조사 필요 | 정의·관계 조사 · 미구현                                                                                                 |
|   46 | NN-Chain HAC                     | 최적화 (linkage별 조건)                                  | 입력 계약 조사 필요 | 정의·관계 조사 · 미구현                                                                                                 |
|   47 | Evidence Accumulation Clustering | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   48 | Spectral Clustering              | 독립 알고리즘·정규화 변형                                | numeric-or-graph    | Spectral Clustering · 기존 실제 계산·Trace·가이드·수치 검증, 제한 범위                                                  |
|   49 | Affinity Propagation             | 독립 알고리즘                                            | numeric-nd          | Affinity Propagation · 기존 실제 계산·Trace·가이드·수치 검증, 제한 범위                                                 |
|   50 | Louvain                          | 독립 알고리즘 (다단계 greedy modularity)                 | numeric-or-graph    | Louvain · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT                   |
|   51 | Leiden                           | 주요 변형 (Louvain에 연결성 refinement·집약 추가)        | numeric-or-graph    | Leiden · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT                    |
|   52 | Label Propagation                | 독립 알고리즘 (비동기 가중 이웃 레이블 전파)             | numeric-or-graph    | Label Propagation · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT         |
|   53 | Chinese Whispers                 | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   54 | Girvan–Newman                    | 독립 알고리즘 (간선 betweenness 제거; 가중 확장)         | numeric-or-graph    | Girvan–Newman · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT             |
|   55 | Walktrap                         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   56 | Infomap                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   57 | Markov Clustering (MCL)          | 독립 알고리즘 (전이 흐름 expansion·inflation)            | numeric-or-graph    | Markov Clustering (MCL) · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT   |
|   58 | Greedy Modularity (CNM)          | 독립 greedy modularity 알고리즘의 전수 스캔 구현 변형    | numeric-or-graph    | Greedy Modularity (CNM) · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT   |
|   59 | Fluid Communities                | 독립 알고리즘 (경쟁 유체 밀도 전파)                      | numeric-or-graph    | Fluid Communities · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT         |
|   60 | Clique Percolation               | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   61 | BigCLAM                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   62 | Stochastic Block Model           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   63 | OSLOM                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   64 | CLIQUE                           | 독립 알고리즘 (격자 부분공간; MDL 미사용 변형)           | numeric-nd          | CLIQUE · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT                    |
|   65 | STING                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   66 | WaveCluster                      | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   67 | BANG                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   68 | PROCLUS                          | 독립 알고리즘 (projected medoid·부분공간 탐색)           | numeric-nd          | PROCLUS · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT                   |
|   69 | ORCLUS                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   70 | SUBCLU                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   71 | PreDeCon                         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   72 | DiSH                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   73 | HiSC                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   74 | 4C                               | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   75 | CASH                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   76 | LMCLUS                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   77 | DOC                              | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   78 | P3C                              | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   79 | COPAC                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   80 | ERiC                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   81 | Bayesian GMM / DP-GMM            | 분리 검토 필요 (finite Bayesian/DP)                      | 입력 계약 조사 필요 | 정의·관계 조사 · 미구현                                                                                                 |
|   82 | Student-t Mixture                | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   83 | Mixture of Factor Analyzers      | 모형 (요인분석 혼합)                                     | 입력 계약 조사 필요 | 정의·관계 조사 · 미구현                                                                                                 |
|   84 | von Mises–Fisher Mixture         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   85 | Multinomial Mixture              | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   86 | Bernoulli Mixture                | 모델 (binary LCA와 동등 조건)                            | 입력 계약 조사 필요 | 정의·관계 조사 · 미구현                                                                                                 |
|   87 | Latent Class Analysis            | 모델 (binary 경우 Bernoulli와 중복)                      | 입력 계약 조사 필요 | 정의·관계 조사 · 미구현                                                                                                 |
|   88 | Gaussian–Uniform Mixture         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   89 | Poisson Mixture                  | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   90 | Beta Mixture                     | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   91 | Mixture of Probabilistic PCA     | 모형 변형 (PPCA 혼합)                                    | 입력 계약 조사 필요 | 정의·관계 조사 · 미구현                                                                                                 |
|   92 | Neural Gas                       | 관련 학습법 (경쟁 양자화)                                | points2d            | Neural Gas · 기존 실제 계산·Trace·가이드·수치 검증, 제한 범위                                                           |
|   93 | Growing Neural Gas               | 관련 학습법 (성장 양자화)                                | points2d            | Growing Neural Gas · 기존 실제 계산·Trace·가이드·수치 검증, 제한 범위                                                   |
|   94 | ART1                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   95 | Fuzzy ART                        | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   96 | SOM-SC                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   97 | SyncNet                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   98 | HSyncNet                         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|   99 | Sync-SOM                         | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  100 | DEC                              | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  101 | IDEC                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  102 | VaDE                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  103 | DeepCluster                      | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  104 | Deep K-Means (DKM)               | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  105 | N2D                              | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  106 | DipDECK                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  107 | DeepECT                          | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  108 | BSAS                             | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  109 | MBSAS                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  110 | TTSAS                            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  111 | Leader                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  112 | Canopy                           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  113 | Spectral Co-Clustering           | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  114 | Spectral Biclustering            | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  115 | Cheng–Church Biclustering        | 독립 알고리즘 (MSR 기반 행·열 이중군집)                  | matrix              | Cheng–Church Biclustering · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT |
|  116 | Plaid Model                      | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  117 | Bimax                            | 독립 알고리즘 (최대 이진 이중군집 divide-and-conquer)    | matrix              | Bimax · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT                     |
|  118 | StreamKM++                       | 분류 검토 필요                                           | 입력 계약 조사 필요 | 미조사                                                                                                                  |
|  119 | K-Shape                          | 독립 알고리즘 (shape-based 시계열 군집화; 직접 NCC 구현) | timeseries          | K-Shape · 실제 계산·Trace·전용 분석·가이드·독립 수치 검증; 제한 범위, 통합 검증 이력은 SESSION_REPORT                   |

## 이번19개 실행 범위와 근거

모두 제한 범위의 실제 엔진이다. 다음 한계와 원문 접근 범위를 포함해 해석한다. 브라우저/배포는 이 문서 갱신 시점에 검증 중이다.

| 엔진                      | 실제 범위·한계                                                                            | 연구 문서·출처 확인 범위                                                                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X-Means                   | 출판된 X-Means BIC heuristic; kd-tree 가속·전역 최적 보장 없음                            | [AUTO_MODELS](research/AUTO_MODELS.md) · [원문/공식 정의](https://www.cs.cmu.edu/~dpelleg/download/xmeans.pdf); 저자 PDF pp2–4와 ELKI 점수 정의 확인                                                                                   |
| G-Means                   | 검증된 α=.0001만 지원; 작은 표본 검정 불충분 표시                                         | [AUTO_MODELS](research/AUTO_MODELS.md) · [원문/공식 정의](https://papers.nips.cc/paper/2526-learning-the-k-in-k-means.pdf); 원문 Algorithm1·표본 분산·AD 보정 확인                                                                     |
| Dip-Means                 | 모든 viewer·시드 Uniform bootstrap; kernel 미지원, generic hull은 AS217 가속 구현 아님    | [AUTO_MODELS](research/AUTO_MODELS.md) · [원문/공식 정의](https://papers.nips.cc/paper_files/paper/2012/file/a8240cb8235e9c493a0c30607586166c-Paper.pdf); Dip-Means 원문 확인; dip 원전은 서지·공식 구현 설명 확인, 원전 PDF 접근 제한 |
| DP-Means                  | SSE+λK 순차 최적화; DP-GMM posterior 추론 아님, 반복·최대 K 한도 명시                     | [AUTO_MODELS](research/AUTO_MODELS.md) · [원문/공식 정의](https://icml.cc/2012/papers/291.pdf); 원문 Algorithm1·§3.2·정리 확인                                                                                                         |
| K-Modes                   | 실제 범주 열; 초기화·동률·빈 군집 정책 명시, 화면 중심은 표시용 평균                      | [DATA_CLUSTERING](research/DATA_CLUSTERING.md) · [원문/공식 정의](https://link.springer.com/article/10.1023/A:1009769707641); Huang 서지·초록; 본문 구독 제한, klaR 공식 batch 정의 확인                                               |
| K-Prototypes              | 전체 수치 제곱거리+γ 범주 불일치; 자동 표준화·자동 γ·결측 처리 없음                       | [DATA_CLUSTERING](research/DATA_CLUSTERING.md) · [원문/공식 정의](https://journal.r-project.org/articles/RJ-2018-048/); Huang 원문 본문 구독 제한; 구현 저자 R Journal의 거리·갱신 수식 확인                                           |
| DenStream                 | RMS CF 요약·원본 시각; warm batch 끝 시각 개수 가중치, 정적 전체 DBSCAN과 구별            | [DENSTREAM](research/DENSTREAM.md) · [원문/공식 정의](https://www.cs.sfu.ca/~ester/papers/SDM2006.DenStream.final.pdf); 원문 §3–4·Algorithm1/2·초기화·macro 정의 및 독립 경계 감사                                                     |
| Louvain                   | 가중 무방향; 연결된 커뮤니티·전역 최적 보장 없음                                          | [COMMUNITIES](research/COMMUNITIES.md) · [원문/공식 정의](https://arxiv.org/abs/0803.0476); 원문 local move·집약과 독립 NetworkX Q 확인                                                                                                |
| Leiden                    | 실제 단일 계층 iteration; 반복적 점근 subset 최적 수렴 전체를 구현했다고 하지 않음        | [COMMUNITIES](research/COMMUNITIES.md) · [원문/공식 정의](https://arxiv.org/abs/1810.08473); 원문 실제 refinement와 저자 leidenalg 비교                                                                                                |
| Label Propagation         | 시드 순서·동률 의존, 반복 한도와 수렴 구분; Q는 관측 지표                                 | [COMMUNITIES](research/COMMUNITIES.md) · [원문/공식 정의](https://arxiv.org/abs/0709.2938); 원문·NetworkX 비동기 투표/합의 정의 확인                                                                                                   |
| Girvan–Newman             | 가중치는 strength, 길이는1/weight; 요청 K 컷, 최고 Q 컷 자동 선택 없음                    | [COMMUNITIES](research/COMMUNITIES.md) · [원문/공식 정의](https://arxiv.org/html/cond-mat/0112110v1); 원문 반복 제거와 Brandes dependency·NetworkX 수치 확인                                                                           |
| Markov Clustering (MCL)   | 밀집 정확 행렬곱·pruning 없음; tolerance 기반 support와 표시용 hard labels 구분           | [COMMUNITIES](research/COMMUNITIES.md) · [원문/공식 정의](https://ir.cwi.nl/pub/4604/04604D.pdf); 1998 CWI 원문 Definition6·§5 확인; 2000 학위논문 서지 확인                                                                           |
| Greedy Modularity (CNM)   | 원문 heap 가속 미구현; 양의 ΔQ에서 종료, 전체 음수 병합 덴드로그램 아님                   | [GRAPH_EXTRA](research/GRAPH_EXTRA.md) · [원문/공식 정의](https://arxiv.org/html/cond-mat/0408187v2); CNM 원문 §II와 NetworkX 독립 Q·병합 검산                                                                                         |
| Fluid Communities         | 연결·단순·무방향·단위 가중치만; 조건 위반 거부, 반복 부족 미할당은 오류                   | [GRAPH_EXTRA](research/GRAPH_EXTRA.md) · [원문/공식 정의](https://arxiv.org/pdf/1703.09307); 원문 §3·공식 NetworkX 입력 계약 확인                                                                                                      |
| CLIQUE                    | 요청 최대 차원까지 unpruned Apriori; 모든 중첩 소속과 실제 DNF 보존, 최소 cover 보장 없음 | [DATA_CLUSTERING](research/DATA_CLUSTERING.md) · [원문/공식 정의](https://www2.cs.sfu.ca/CourseCentral/459/han/papers/agrawal98.pdf); 원문 §2–3 strict selectivity·Apriori·face 연결·DNF 확인                                          |
| PROCLUS                   | 실제 후보 표본·전체 원본 평가; 군집 최소2축·연속 미개선 한도, 전역 최적 보장 없음         | [DATA_CLUSTERING](research/DATA_CLUSTERING.md) · [원문/공식 정의](https://sigmodrecord.org/?download_id=6956&smd_process_download=1); 원문 §2·Figures2–6 및 ELKI 공식 계약 확인                                                        |
| Cheng–Church Biclustering | 원본 δ 재검산 safeguard·순차 수용 명시; 요청 수는 시도 수, 중복 출력을 부풀리지 않음      | [BICLUSTERING](research/BICLUSTERING.md) · [원문/공식 정의](https://cdn.aaai.org/ISMB/2000/ISMB00-010.pdf); 원문 Algorithm1–4·원본 기반 추가·반전·masking 확인                                                                         |
| Bimax                     | 실제 binary만; 최소 행·열을 만족하는 모든 최대 bicluster, byte 예산 실패는 오류           | [BICLUSTERING](research/BICLUSTERING.md) · [원문/공식 정의](https://www.sop.tik.ee.ethz.ch/publicationListFiles/pbzw2006b.pdf); 원문 Appendix A.1 분할·Z admissibility 직접 확인                                                       |
| K-Shape                   | 동일 길이·공통 균일 grid; 직접 전체 lag 합산·Jacobi, FFT 없음; 목적 단조성 보장 없음      | [TIMESERIES](research/TIMESERIES.md) · [원문/공식 정의](https://www.paparrizos.org/papers/PaparrizosSIGMOD15.pdf); 원문 Algorithm1–3·Eq8/13/15·AppendixB와 공식 tslearn 계약 확인                                                      |

## 집계·분류·조사 범위

- 신규19개: 자동 K 결정4(X/G/Dip/DP), 그래프7(Louvain/Leiden/LPA/GN/MCL/CNM/Fluid), 범주·혼합2(K-Modes/K-Prototypes), 부분공간2(CLIQUE/PROCLUS), 스트림1(DenStream), 행렬2(Bimax/Cheng–Church), 시계열1(K-Shape).
- 기존 후보12개: Mini-Batch/Bisecting/K-Medians/CLARA/CLARANS/FCM/Density Peaks/CURE/Spectral/AP/Neural Gas/GNG. 합계 후보31개이며 기존13개와 중복 집계하지 않는다. Neural Gas/GNG, SOM/LVQ는 관련 프로토타입 학습법이다. 후보31개를 모두 수학적으로 독립된 군집화 목적함수31개라고 주장하지 않는다.
- SLINK/CLINK/NN-chain은 linkage 계산 기법·최적화 관계를 조사했으나 새 엔진으로 세지 않는다. CLINK를 표준 AGNES complete와 동등한 정확 고속 구현으로 인증하지 않는다.
- Bayesian GMM/DP-GMM, Bernoulli/LCA, MFA/MPPCA는 [TAXONOMY](research/TAXONOMY.md)의 모델·별칭·제약 조건을 따른다. 미구현88개 중 이8개 후보의 정의·관계 조사 기록은 보존하되 전수 원문 확인이나 실행 완료로 올리지 않았다. 나머지80개는 미조사 상태다. `*_QUEUE.md`의 부분 메모만으로 정식 조사 완료가 되지 않는다.
- Huang 원문 구독 제한, Dip 원전 접근 제한, CLARA 책 전체·기존 FCM/Bisecting 자료의 열람 범위는 각각 연구 문서에 명시한다. 구현 저자의 공식 설명·공식 독립 구현으로 정의를 확인한 경우와 원문 직접 열람을 구별한다.
- 기존 후보 연구: [SPECTRAL](research/SPECTRAL.md), [MESSAGES_DENSITY](research/MESSAGES_DENSITY.md), [PROTOTYPES](research/PROTOTYPES.md), [CENTROID_VARIANTS](research/CENTROID_VARIANTS.md), [MEDOID_VARIANTS](research/MEDOID_VARIANTS.md). 이번19개 자료와 수치 검증·성능·한계는 위 표의 연구 파일을 따른다.
- 수치형 원본의 모든 차원을 사용한다. 그래프 엔진은 실제 원본 간선 또는 명시적 union-kNN 변환을 사용하며 그래프를 몰래 표시 좌표로 대체하지 않는다. Fluid의 연결·비가중 조건과 Bimax의 binary 조건 등은 별도 엄격히 검증한다.
- 미구현 후보에는 `engine:null`을 유지한다. 원문 접근·분류·구현·Trace·시각화·단위/독립 검증·브라우저·배포 단계를 같은 완료 상태로 합치지 않는다.

실행 레지스트리는 `src/engine/registry.ts`, 상세는 `algorithmDetails.ts`/`nextDetails.ts`, 후보 원본은 `src/data/candidates.json`이다. 변경 시 engine 연결 개수31·미연결88·전체119와 실제 실행 레지스트리44를 함께 확인한다. 이 문서의 개발 상태는 향후 완료를 약속하는 수치가 아니라 현재 파일과 검증 증거의 집계다.
