# 알고리즘 전체 등록 현황

2026-10-31. 실행 엔진 25개: 기존 13 + 신규 후보 12. 아래 119개 모두를 추적하지만 전수 원문 조사는 미완료다. 이름 등록은 실제 구현으로 세지 않는다. 전체 마스터 기준 완전 구현 인증 0개(아직 미인증), 사용 가능한 제한 범위 엔진 25개를 구분한다. 이전 상태는 sessions/foundation/ALGORITHM_REGISTRY.md에 보존했다.

## 기존 13개

| 엔진 | 분류 | 상태 |
|---|---|---|
| K-Means | 기존 알고리즘 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| DBSCAN | 기존 알고리즘 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| HDBSCAN | 기존 알고리즘 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| AGNES | 기존 알고리즘 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| DIANA | 기존 알고리즘 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| SOM | 관련 학습법 (위상 학습) | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| LVQ | 관련 학습법 (지도 프로토타입) | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| OPTICS | 기존 알고리즘 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| PAM | 기존 알고리즘 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| ROCK | 기존 알고리즘 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| GMM | 기존 알고리즘 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| BIRCH | 기존 알고리즘 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |
| Mean Shift | 기존 알고리즘 | 기존 계산·Trace 보존, 기준 회귀 검사; 원문 전수 재감사 미완료 |

## 신규 후보 119개

실제 엔진 연결 12개, 미구현 107개. 이번 세션 신규 10개는 수치·Trace·가이드와 Chromium/mobile/Firefox/WebKit 신규 플랫폼 검증을 거쳤다. 전체 회귀와 배포 결과는 VALIDATION/SESSION_REPORT에서 별도 확인한다.

| 번호 | 후보 | 분류 | 실제 엔진 / 상태 |
|---:|---|---|---|
| 1 | Mini-Batch K-Means | 변형 (비복원 epoch) | Mini-Batch K-Means · 실제 계산/Trace/전용 시각화/가이드/독립 수치 검증 (제한 범위) |
| 2 | Bisecting K-Means | 변형 | Bisecting K-Means · 실제 계산/Trace/전용 시각화/가이드/독립 수치 검증 (제한 범위) |
| 3 | X-Means | 분류 검토 필요 | 미조사 |
| 4 | G-Means | 분류 검토 필요 | 미조사 |
| 5 | Dip-Means | 분류 검토 필요 | 미조사 |
| 6 | DP-Means | 분류 검토 필요 | 미조사 |
| 7 | K-Medians | 주요 변형 (L1 중앙값) | K-Medians · 실제 계산/Trace/전용 시각화/가이드/독립 수치 검증 (제한 범위) |
| 8 | K-Modes | 분류 검토 필요 | 미조사 |
| 9 | K-Prototypes | 분류 검토 필요 | 미조사 |
| 10 | Spherical K-Means | 분류 검토 필요 | 미조사 |
| 11 | Kernel K-Means | 분류 검토 필요 | 미조사 |
| 12 | Balanced K-Means | 분류 검토 필요 | 미조사 |
| 13 | K-Means-- | 분류 검토 필요 | 미조사 |
| 14 | CLARA | 표본 탐색 변형 | CLARA · 실제 계산/Trace/전용 시각화/가이드/독립 수치 검증 (제한 범위) |
| 15 | CLARANS | 주요 변형 (무작위 medoid 탐색) | CLARANS · 실제 계산/Trace/전용 시각화/가이드/독립 수치 검증 (제한 범위) |
| 16 | K-Center | 분류 검토 필요 | 미조사 |
| 17 | Hartigan–Wong K-Means | 분류 검토 필요 | 미조사 |
| 18 | PAMSIL | 분류 검토 필요 | 미조사 |
| 19 | PAMMEDSIL | 분류 검토 필요 | 미조사 |
| 20 | Fuzzy C-Means | 독립 알고리즘 | Fuzzy C-Means · 실제 계산/Trace/전용 시각화/가이드/독립 수치 검증 (제한 범위) |
| 21 | Possibilistic C-Means | 분류 검토 필요 | 미조사 |
| 22 | Fuzzy Possibilistic C-Means | 분류 검토 필요 | 미조사 |
| 23 | COP-KMeans | 분류 검토 필요 | 미조사 |
| 24 | PCKMeans | 분류 검토 필요 | 미조사 |
| 25 | MPCKMeans | 분류 검토 필요 | 미조사 |
| 26 | Constrained Spectral Clustering | 분류 검토 필요 | 미조사 |
| 27 | Density Peaks / CFSFDP | 중심 선택 변형 (명시적 K) | Density Peaks / CFSFDP · 실제 계산/Trace/전용 시각화/가이드/독립 수치 검증 (제한 범위) |
| 28 | SNN Clustering | 분류 검토 필요 | 미조사 |
| 29 | DENCLUE | 분류 검토 필요 | 미조사 |
| 30 | LSDBC | 분류 검토 필요 | 미조사 |
| 31 | DeLiClu | 분류 검토 필요 | 미조사 |
| 32 | Generalized DBSCAN | 분류 검토 필요 | 미조사 |
| 33 | GriDBSCAN | 분류 검토 필요 | 미조사 |
| 34 | ST-DBSCAN | 분류 검토 필요 | 미조사 |
| 35 | DenStream | 분류 검토 필요 | 미조사 |
| 36 | D-Stream | 분류 검토 필요 | 미조사 |
| 37 | CluStream | 분류 검토 필요 | 미조사 |
| 38 | Support Vector Clustering | 분류 검토 필요 | 미조사 |
| 39 | CURE | 독립 알고리즘 (전체 데이터 절차) | CURE · 실제 계산/Trace/전용 시각화/가이드/독립 수치 검증 (제한 범위) |
| 40 | CHAMELEON | 분류 검토 필요 | 미조사 |
| 41 | FINCH | 분류 검토 필요 | 미조사 |
| 42 | HACAM | 분류 검토 필요 | 미조사 |
| 43 | COBWEB | 분류 검토 필요 | 미조사 |
| 44 | SLINK | 최적화 (single linkage) | 정의·관계 조사 · 미구현 |
| 45 | CLINK | 구현 기법 (complete 유사, 순서 의존성 주의) | 정의·관계 조사 · 미구현 |
| 46 | NN-Chain HAC | 최적화 (linkage별 조건) | 정의·관계 조사 · 미구현 |
| 47 | Evidence Accumulation Clustering | 분류 검토 필요 | 미조사 |
| 48 | Spectral Clustering | 독립 알고리즘·정규화 변형 | Spectral Clustering · 실제 계산/Trace/전용 시각화/가이드/독립 수치 검증 (제한 범위) |
| 49 | Affinity Propagation | 독립 알고리즘 | Affinity Propagation · 실제 계산/Trace/전용 시각화/가이드/독립 수치 검증 (제한 범위) |
| 50 | Louvain | 분류 검토 필요 | 미조사 |
| 51 | Leiden | 분류 검토 필요 | 미조사 |
| 52 | Label Propagation | 분류 검토 필요 | 미조사 |
| 53 | Chinese Whispers | 분류 검토 필요 | 미조사 |
| 54 | Girvan–Newman | 분류 검토 필요 | 미조사 |
| 55 | Walktrap | 분류 검토 필요 | 미조사 |
| 56 | Infomap | 분류 검토 필요 | 미조사 |
| 57 | Markov Clustering (MCL) | 분류 검토 필요 | 미조사 |
| 58 | Greedy Modularity (CNM) | 분류 검토 필요 | 미조사 |
| 59 | Fluid Communities | 분류 검토 필요 | 미조사 |
| 60 | Clique Percolation | 분류 검토 필요 | 미조사 |
| 61 | BigCLAM | 분류 검토 필요 | 미조사 |
| 62 | Stochastic Block Model | 분류 검토 필요 | 미조사 |
| 63 | OSLOM | 분류 검토 필요 | 미조사 |
| 64 | CLIQUE | 분류 검토 필요 | 미조사 |
| 65 | STING | 분류 검토 필요 | 미조사 |
| 66 | WaveCluster | 분류 검토 필요 | 미조사 |
| 67 | BANG | 분류 검토 필요 | 미조사 |
| 68 | PROCLUS | 분류 검토 필요 | 미조사 |
| 69 | ORCLUS | 분류 검토 필요 | 미조사 |
| 70 | SUBCLU | 분류 검토 필요 | 미조사 |
| 71 | PreDeCon | 분류 검토 필요 | 미조사 |
| 72 | DiSH | 분류 검토 필요 | 미조사 |
| 73 | HiSC | 분류 검토 필요 | 미조사 |
| 74 | 4C | 분류 검토 필요 | 미조사 |
| 75 | CASH | 분류 검토 필요 | 미조사 |
| 76 | LMCLUS | 분류 검토 필요 | 미조사 |
| 77 | DOC | 분류 검토 필요 | 미조사 |
| 78 | P3C | 분류 검토 필요 | 미조사 |
| 79 | COPAC | 분류 검토 필요 | 미조사 |
| 80 | ERiC | 분류 검토 필요 | 미조사 |
| 81 | Bayesian GMM / DP-GMM | 분리 검토 필요 (finite Bayesian/DP) | 정의·관계 조사 · 미구현 |
| 82 | Student-t Mixture | 분류 검토 필요 | 미조사 |
| 83 | Mixture of Factor Analyzers | 모형 (요인분석 혼합) | 정의·관계 조사 · 미구현 |
| 84 | von Mises–Fisher Mixture | 분류 검토 필요 | 미조사 |
| 85 | Multinomial Mixture | 분류 검토 필요 | 미조사 |
| 86 | Bernoulli Mixture | 모델 (binary LCA와 동등 조건) | 정의·관계 조사 · 미구현 |
| 87 | Latent Class Analysis | 모델 (binary 경우 Bernoulli와 중복) | 정의·관계 조사 · 미구현 |
| 88 | Gaussian–Uniform Mixture | 분류 검토 필요 | 미조사 |
| 89 | Poisson Mixture | 분류 검토 필요 | 미조사 |
| 90 | Beta Mixture | 분류 검토 필요 | 미조사 |
| 91 | Mixture of Probabilistic PCA | 모형 변형 (PPCA 혼합) | 정의·관계 조사 · 미구현 |
| 92 | Neural Gas | 관련 학습법 (경쟁 양자화) | Neural Gas · 실제 계산/Trace/전용 시각화/가이드/독립 수치 검증 (제한 범위) |
| 93 | Growing Neural Gas | 관련 학습법 (성장 양자화) | Growing Neural Gas · 실제 계산/Trace/전용 시각화/가이드/독립 수치 검증 (제한 범위) |
| 94 | ART1 | 분류 검토 필요 | 미조사 |
| 95 | Fuzzy ART | 분류 검토 필요 | 미조사 |
| 96 | SOM-SC | 분류 검토 필요 | 미조사 |
| 97 | SyncNet | 분류 검토 필요 | 미조사 |
| 98 | HSyncNet | 분류 검토 필요 | 미조사 |
| 99 | Sync-SOM | 분류 검토 필요 | 미조사 |
| 100 | DEC | 분류 검토 필요 | 미조사 |
| 101 | IDEC | 분류 검토 필요 | 미조사 |
| 102 | VaDE | 분류 검토 필요 | 미조사 |
| 103 | DeepCluster | 분류 검토 필요 | 미조사 |
| 104 | Deep K-Means (DKM) | 분류 검토 필요 | 미조사 |
| 105 | N2D | 분류 검토 필요 | 미조사 |
| 106 | DipDECK | 분류 검토 필요 | 미조사 |
| 107 | DeepECT | 분류 검토 필요 | 미조사 |
| 108 | BSAS | 분류 검토 필요 | 미조사 |
| 109 | MBSAS | 분류 검토 필요 | 미조사 |
| 110 | TTSAS | 분류 검토 필요 | 미조사 |
| 111 | Leader | 분류 검토 필요 | 미조사 |
| 112 | Canopy | 분류 검토 필요 | 미조사 |
| 113 | Spectral Co-Clustering | 분류 검토 필요 | 미조사 |
| 114 | Spectral Biclustering | 분류 검토 필요 | 미조사 |
| 115 | Cheng–Church Biclustering | 분류 검토 필요 | 미조사 |
| 116 | Plaid Model | 분류 검토 필요 | 미조사 |
| 117 | Bimax | 분류 검토 필요 | 미조사 |
| 118 | StreamKM++ | 분류 검토 필요 | 미조사 |
| 119 | K-Shape | 분류 검토 필요 | 미조사 |

## 분류와 조사 범위

- SLINK/CLINK/NN-chain은 linkage와 구현 알고리즘의 관계를 조사했으나 새 엔진으로 세지 않았다. 특히 CLINK를 AGNES complete와 동일한 정확 구현으로 주장하지 않는다.
- Bayesian GMM/DP-GMM, Bernoulli/LCA, MFA/MPPCA의 별칭·포함 관계는 research/TAXONOMY.md를 따른다. 정의 관계 조사만으로 구현 완료나 독립 엔진을 추가하지 않는다.
- Density Peaks는 명시적 K와 gamma 중심 선택, Mini-Batch는 비복원 epoch라는 실행 변형이다. CLARA/CLARANS는 medoid 탐색 변형으로 등록한다. Neural Gas/GNG는 관련 프로토타입 학습이다.
- CLARA 책 전체와 이전 FCM/Bisecting 원문 등 접근 제한은 해당 research 문서/이전 기록에 명시한다. 모든 원문을 직접 읽었다는 주장을 하지 않는다.
- 신규 10개 원문·수식·독립 fixture·제한: research/{SPECTRAL,MESSAGES_DENSITY,PROTOTYPES,CENTROID_VARIANTS,MEDOID_VARIANTS}.md. 107개 미구현 후보 중 관계를 조사한 8개 외의 항목은 정식 조사 완료로 상향하지 않았다. 추가 11개 후보의 원문 일부·서지·남은 검산은 research/*_QUEUE.md에 보존했다. 부분 메모는 전수 조사 완료가 아니다.

실행 레지스트리: src/engine/registry.ts / algorithmDetails.ts. 후보 원본: src/data/candidates.json. 변경 시 이 문서와 구현/미구현 수를 함께 갱신한다.
