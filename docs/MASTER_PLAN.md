# ClusterLab 통합 개발 계획

> 최신 체크포인트: 소스50개(기존13+후보37), 미구현82개, 완전 인증0. 로컬 type/lint/build·단위509/37파일·독립oracle3종·Chromium/mobile 고유74성공/12기존생략·네 플랫폼spec Firefox/WebKit34/34가 확정됐다. main/CI/Pages는 아직 대기다. 이하 중간 기록보다 SESSION_REPORT 마지막 확정 절을 우선한다.

2026-11-01. 전체 마스터 목표는 **진행 중**이다. 기존 v0.1~v0.6·Git 기록과 이전 플랫폼 검증을 보존한다. [재개 요청](requests/2026-10-31-CONTINUATION.md), [기반 세션](sessions/foundation/), [이전25개 플랫폼](sessions/platform25/), [안정44개 체크포인트](sessions/platform44/)를 구분하며 사용자가119개 명세를 다시 전달하지 않아도 이어간다.

## 집계와 완료 기준

기존13개와 신규 후보119개 전부가 개발 범위다. **현재 소스의 실제 실행 엔진50개 = 기존13 + 후보37**, 후보 **82개는 미구현**이다. 안정44개 이후 COP-KMeans·이산 혼합3개·그래프2개를 추가했으며 새 통합은 로컬 검증 중이다. 후보119개의 전수 원문 조사와 마스터 검수는 미완료이며 **완전 구현 인증은0개(아직 미인증)**다. 실행 가능 수를 독립 알고리즘 수나 완전 인증 수로 표시하지 않는다.

실제 계산, 수학적 정의, 내부 연산 Trace, 전용 시각화, 파라미터, 수학 교재·손계산·실제 미니 실험, 독립 수치 검증을 함께 개발한다. 별칭·초기화·최적화를 중복 집계하지 않고 SOM/LVQ/Neural Gas/Growing Neural Gas는 관련 학습법으로 구분한다. 원문 직접 열람·서지/초록 확인·공식 구현 정의 확인도 구별한다.

## 기존25개 플랫폼에서 보존한 기반

1. 기존13개·32개 프리셋·홈11라운드·편집/비교/교재·디자인과 과거 검증 증거.
2. 600개 고정 제한 제거, 실행별 byte 자원 검사, 전체 계산과 표시 LOD 분리, 실제 Worker 종료 취소, delta 편집 이력.
3. 동적 import 레지스트리, 스키마 파라미터, 검색 도감, FCM/Bisecting 및 Spectral/AP/Density Peaks/CURE/Neural Gas/GNG/K-Medians/Mini-Batch/CLARA/CLARANS.
4. 표시 좌표와 원본 Dataset 분리, ND·가중 무방향 그래프 계산, Trace delta·행렬 참조 공유와 알고리즘별 분석.

이는 이전 세션의 결과다. 이전25개 플랫폼의 브라우저·Pages 실적은 새44개 통합 배포 성공으로 재사용하지 않는다.

## 안정44개에서 추가했던19개와 보존 범위

후속 요청의 우선14개를 모두 실제 엔진으로 연결했고, 추가5개도 구현했다. 전체 마스터를 이19개로 축소하지 않는다.

| 계열         | 실제 추가 엔진                                                    | 대표 내부 계산·출력                                                          |
| ------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 자동 K 결정4 | X-Means, G-Means, Dip-Means, DP-Means                             | 전체 ND Lloyd·BIC·AD·모든 viewer dip/Uniform bootstrap·SSE+λK                |
| 그래프5      | Louvain, Leiden, Label Propagation, Girvan–Newman, MCL            | local move·실제 refinement·집약·가중 투표·Brandes 제거·확장/inflation        |
| 범주·혼합2   | K-Modes, K-Prototypes                                             | 실제 범주 최빈값과 수치 평균·혼합 목적함수                                   |
| 부분공간2    | CLIQUE, PROCLUS                                                   | Apriori 격자·face 연결·DNF·중첩 소속, locality·Z·차원 선택·medoid 정제       |
| 스트림1      | DenStream                                                         | 원본 시각과 전체 특성의 CF·감쇠·승격·pruning·macro                           |
| 추가5        | Bimax, Cheng–Church Biclustering, K-Shape, CNM, Fluid Communities | 실제 행×열 bicluster·MSR/반전/masking, NCC/정렬/고유 형태, ΔQ 병합·유체 밀도 |

구조형 실험실은 원본 유형별 시드 생성·실제 편집·JSON 입출력·delta Undo/Redo와 호환되는 엔진 선택을 지원한다. 시계열·행렬의 전용 분석과 실제 미니 실험을 유지하며 이번에는 constrained 원본의 COP 실행과 관계 편집을 연결했다. 알고리즘별 원문 가속 부재·실행 변형·제한은 [전체 등록 현황](ALGORITHM_REGISTRY.md)과 `research/`를 따른다. 모든 범주·고차원·stream 원본을 표시2D 좌표로 대체하지 않는다.

## 현재50개 소스의 신규6개 세로 개발

| 범위             | 실제 엔진·계약                                                                             | 제한·근거                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 하드 제약        | COP-KMeans, 실제 ND·ML 폐쇄·CL 검사·허용 할당·평균/SSE, constrained-partition              | 원본 행순서 greedy여서 feasible 분할이 있어도 실패 가능. [CONSTRAINED](research/CONSTRAINED.md)                                |
| 이산 혼합        | Bernoulli/Poisson/Multinomial Mixture, 실제 log-PMF·log-sum-exp E/M·전체 posterior·mixture | 무prior ML, 실제0/1·정수 count·행 trials 조건,0 경계/빈 성분/비식별성 공개. [DISCRETE_MIXTURES](research/DISCRETE_MIXTURES.md) |
| 계층·중첩 그래프 | Walktrap의 전체 Pᵗ·인접 Ward 계층/원본 최고Q cut, CPM의 모든 k-clique/공유face/중첩 cover  | Walktrap 밀집 n², 원문 heap 가속 없음. CPM 목적함수 없음·label−1은 비소속. [GRAPH_FOLLOWUP](research/GRAPH_FOLLOWUP.md)        |

세로 단위는 실제 원본·Trace·전용 분석·스키마 파라미터·수학 가이드/손검산·실제 미니 실험·독립 Python fixture를 포함한다. 모델 원본 생성기는 bit/count/profile 및 실제 제약 관계를 보존한다. [동적 API 통합](../src/engine/extension-integration.test.ts)과 [원본 생성기](../src/data/model-presets.test.ts)는 전체 차원·native 결과·제약 영향·분포 통계·되감기·바이트 사전 거부를 검증한다. 이 결과를 브라우저/배포 완료로 대체하지 않는다.

## 현재 검증과 배포 관문

현재50개 소스에서 마지막 확인된 타입 검사·ESLint·프로덕션 빌드와 **Vitest509개/37파일**, 신규 독립 Python reference3개 재생성이 통과했다. 독립 수치 fixture, 원본 모든 차원, 시드·실패·자원 거부, 실제 Trace 전진/역진/checkpoint 검증을 포함한다. 수치 사례 수를 테스트 개수로 부풀리지 않는다. **새 브라우저 통합은 첫 실행4통과/4실패 뒤 테스트 가정·접힌 분석 접근을 수정 중이며, 전체 기존 회귀·새 GitHub Actions/Pages 배포는 아직 확정하지 않았다.** 안정44개의 배포 증거를 새50개의 배포 성공으로 재사용하지 않는다. 최종 결과·명령·커밋은 [SESSION_REPORT](SESSION_REPORT.md)와 [VALIDATION](VALIDATION.md)을 따른다.

각 안정 단위는 적절한 수치·단위·통합·Playwright 검사 후 커밋한다. Chromium/mobile 및 Firefox/WebKit, 1920/1440/1024/800/768/390/320px을 범위별로 기록한다. 배포 성공과 알고리즘 수학 검증·성능 보장을 혼동하지 않는다.

## 다음82개 후보와 의존 관계

1. 현재50개의 로컬 브라우저 통합 오류를 분리하고 기존 기능 전체 회귀·실제 Pages 동작·안정 커밋을 확정한다. 이전44개 배포와 현재 결과를 구분한다.
2. [후보119개 상태](ALGORITHM_REGISTRY.md)의 미구현82개를 그대로 추적한다. 원문/공식 정의·입출력·분류·수식·독립 reference를 먼저 확인한다. 불명확한 명칭을 비슷한 가짜 엔진으로 채우지 않는다.
3. COP의 hard 제약 계약을 보존하며 PCK/MPCKMeans·Constrained Spectral을 각각 실제 penalty·metric/graph 최적화와 연결한다. COP의 이름만 바꾸거나 실패를 soft 위반으로 감추지 않는다.
4. 남은 중심·퍼지·밀도·계층·그래프 후보를 구현한다. Spherical/Kernel/Balanced·PCM/FPCM·SNN/DENCLUE·CHAMELEON/FINCH 및 SLINK/CLINK/NN-chain의 linkage/최적화 구분을 유지한다.
5. 부분공간·상관 군집의 남은 후보와 범주·고차원 편집을 확장한다. 차원 추가/삭제·실제3D 회전·PCA/평행좌표·행렬 행열 구조 변경·시계열 시간축의 편리한 UI는 아직 후속 범위이며 현재 속성 표/ML·CL 관계/JSON 편집과 구별한다.
6. 확률·혼합11개 중 현재 이산3개를 보존하고 나머지8개를 분포·EM/VB/샘플링 정의대로 구현한다. Bayesian GMM/DP-GMM, Bernoulli/LCA, MFA/MPPCA의 공유/제약 관계를 유지하고 기존 GMM 래퍼로 대체하지 않는다. [후속 혼합 큐](research/MIXTURE_FOLLOWUP_QUEUE.md)를 따른다.
7. 신경망 계열의 ART·동기화 및 딥 군집화는 실제 가중치·잠재표현·손실 학습을 도입한다. 런타임 크기·라이선스·GitHub Pages/브라우저 호환성과 실제 학습 성능을 측정한다. 고정 결과 재생은 제외한다.
8. D-Stream/CluStream/StreamKM++·순차 방법·남은 이중군집을 실제 데이터 입력·출력과 함께 완성한다. 무한 공급 스트림·증분 UI·청크 입출력·디스크 저장은 현재 전체prefix 재계산 방식과 별도 구현한다.
9. 전송 가능한 버퍼·공간/근접 인덱스·자원별 Worker pool·정확한 저메모리 연산·장시간 peak/누수를 병목 측정에 따라 개선한다. WASM/GPU·FFT/행렬 가속은 회귀 동등성을 확인한 뒤 선택한다.

각 알고리즘을 계산→Trace→전용 분석→파라미터→교재/미니 실험→독립 검증→브라우저까지 가능한 한 하나의 세로 단위로 진행한다. 공통 계약 변경은 기존 계산과 되감기 동등성을 먼저 확보한다.

## 대량 데이터·중단 및 재개

새 전역 점 수 상한을 만들지 않는다. 모든 입력을 계산하고 원래 알고리즘의 CF/표본 후보 탐색, 명시적 근사, Trace 요약, 화면 표시 LOD를 서로 구분한다. 자원 예산 초과·수치 불안정·미수렴·취소는 실제 상태대로 보고한다.100~100만 이상을 알고리즘의 복잡도에 맞게 검증하며 Node 시간·heap 차이를 브라우저 FPS·peak 보장으로 부풀리지 않는다.

PROGRESS/ALGORITHM_REGISTRY/ARCHITECTURE/VALIDATION/PERFORMANCE/SESSION_REPORT/CONTINUE에 구현·검증·제한·다음 명령·커밋을 유지한다. 세션 한계에서는 안정 변경을 검증·커밋하고 미완료82개와 구체적인 재개 작업을 남긴다. 전체119개 목표를 부분 완료로 끝냈다고 보고하지 않는다.

이전 안정44개 제품fd78886의 전체 원격 검증·Pages 배포는 성공했고 [당시 문서](sessions/platform44/)를 보존했다. 현재 개발 브랜치의50개 소스는 그 이후6개를 추가한 상태로 공개 배포가 아직 확정되지 않았다. 다음 개발은 기존119개 범위를 유지하며 CONTINUE와 제약/그래프/혼합 후속 원문 큐를 따른다.
