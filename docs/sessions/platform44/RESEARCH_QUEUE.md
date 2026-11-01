# 후속 원문 조사·구현 큐

2026-11-01 현재 **44개 실행 엔진 / 신규 후보119개 중31개 구현·88개 미구현 / 마스터 완전 구현 인증0개**다. 이전25개/107개 상태와 아래117개/엔진 없음 표현은 과거 조사 당시 기록으로 보존하며 현재 구현 상태를 뜻하지 않는다. [등록 현황](ALGORITHM_REGISTRY.md)과 [전체 계획](MASTER_PLAN.md)이 현재 집계 기준이다. 후보 목록을 축소하지 않는다.

## 이번 조사에서 실제 엔진으로 이어진19개

| 범위                                | 현재 근거·구현 기록                                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| X/G/Dip/DP-Means                    | [AUTO_MODELS](research/AUTO_MODELS.md): 실제 BIC·AD·dip/Uniform bootstrap·비모수 hard 목적함수, 원문 직접 접근 범위와 dip 원전 제한 |
| Louvain/Leiden/LPA/GN/MCL           | [COMMUNITIES](research/COMMUNITIES.md): 이동/정제/집약·투표·중심성·전이 행렬, 실제 NetworkX/원저자 비교                             |
| K-Modes/K-Prototypes/CLIQUE/PROCLUS | [DATA_CLUSTERING](research/DATA_CLUSTERING.md): 실제 범주·혼합·부분공간, Huang 본문 구독 제한과 공식 수식 대체 확인                 |
| DenStream                           | [DENSTREAM](research/DENSTREAM.md): CF·시계·승격/pruning 경계 감사와 실제100k 전체 입력 측정                                        |
| Bimax/Cheng–Church                  | [BICLUSTERING](research/BICLUSTERING.md): 원문 분할과 실제 MSR·행열 중첩, 독립 전수/수치 검산                                       |
| K-Shape                             | [TIMESERIES](research/TIMESERIES.md): 실제 시계열 NCC/정렬·고유 형태, 직접 합산과 FFT 미구현 구분                                   |
| CNM/Fluid                           | [GRAPH_EXTRA](research/GRAPH_EXTRA.md): 실제 ΔQ 병합·유체 투표, 원문 heap 부재·연결/단위 가중치 계약                                |

이19개는 후속 우선14개와 추가5개다. 전체 통합 타입·lint·build·Vitest426개는 통과했으며 브라우저·배포는 검증 중이다. 최종 결과는 SESSION_REPORT를 따른다. 이 상태로 전체 마스터 완전 구현이라고 하지 않는다.

## 미구현88개 조사 순서

- **입력/관계 계약부터:** COP/PCK/MPCKMeans·Constrained Spectral의 원본 제약 편집·실제 위반 처리, 남은 퍼지·범주/혼합·부분공간 관계를 정의한다. 스키마만 있는 constrained를 실행 가능으로 세지 않는다.
- **중심·밀도·계층·그래프 잔여:** 각각 원논문/공식 정의·수식·입출력·중복 여부를 확인하고 실제 엔진·Trace·전용 시각화·독립 reference까지 연결한다. 후보 이름만으로 분류 완료로 올리지 않는다.
- **확률·혼합11개:** 분포·추론법·초깃값·수렴·책임도 의미를 구분한다. [TAXONOMY](research/TAXONOMY.md)의 Bayesian/DP·Bernoulli/LCA·MFA/MPPCA 관계 조사와 최초 원문/실제 추정 구현을 혼동하지 않는다.
- **신경망·딥 계열 잔여:** ART·동기화·실제 임베딩/가중치 학습을 조사하고 적합한 런타임의 라이선스/용량/브라우저/Pages를 측정한다. K-Means 래퍼·고정 결과는 구현이 아니다.
- **스트림·순차·행렬 잔여:** 실제 시각·유입·행×열 출력·부분 실행을 유지하며 무한 스트림 공급/청크 처리와 현재 prefix 재계산을 구별한다. 표/JSON 편집 외 실제 시간축·행열 구조·3D/고차원·제약 편집은 후속 UX다.

미구현88개 중80개는 미조사 상태이고,8개(SLINK/CLINK/NN-chain/Bayesian-GMM-DP/MFA/Bernoulli/LCA/MPPCA)는 정의·관계 조사 기록만 있다. 이8개도 엔진 없음·원문 전체 전수 확인 미완료다. 각 *_QUEUE.md의 부분 자료는 연구 시작점이며 현재19개 완료 기록이 있는 경우 해당 본문 연구 문서로 넘어간다. 모든119행의 실제 상태는 candidates.json/ALGORITHM_REGISTRY.md를 함께 갱신한다.

## 아래는 기반 세션의 원본 조사 메모

**역사적 기록:** 다음 텍스트의 시제·미구현 수·접근 실패는 당시 관측이다. AP/CURE/Spectral/Density Peaks는 이후 구현됐으며 최신 근거는 research/SPECTRAL.md, MESSAGES_DENSITY.md, PROTOTYPES.md를 따른다. 과거 문헌 접근 한계를 소급하여 성공으로 바꾸지 않는다.

> 이 파일은 직전 기반 세션의 역사적 조사 메모다. 아래 117개/엔진 없음 표현은 당시 상태다. 현재는 25개 실행/107개 후보 미구현이며 실제 결과는 ALGORITHM_REGISTRY.md와 research/ 문서를 따른다. 다음 후보 원문 일부 확인은 research/MODEL_SELECTION_QUEUE.md 및 COMMUNITY_QUEUE.md에 있다.

# 후속 엔진 조사 메모 — 원문 조사 진행 중

2026-10-31, 원격 브라우저 검증 대기 중 확인한 1차 자료다. 아래 메모만으로 후보의 원문·정의 전수 조사나 구현 완료 상태를 상향하지 않는다. `candidates.json`의 117개 미구현 상태는 유지한다. 원문 코드를 제품에 복사하지 않는다.

## 후보 49 Affinity Propagation

Frey & Dueck, _Clustering by Passing Messages Between Data Points_, Science 315 (2007), 972–976. [원문 PDF](https://utstat.utoronto.ca/reid/sta414/frey-affinity.pdf), 1–2쪽 메시지 정의와 갱신 및 damping을 확인했다.

입력은 유사도 s(i,k), 대각은 preference. 좌표에서 쓰려면 비대각 유사도를 음의 제곱거리로 정의한 변환을 명시한다. 실수 responsibility와 availability는 퍼지 소속도 행렬과 별개의 메시지다. r(i,k)=s(i,k)−max_{l≠k}[a(i,l)+s(i,l)], 비대각 a(i,k)=min(0,r(k,k)+Σ_{l∉{i,k}}max(0,r(l,k))). 대각 availability와 메시지 damping, 최종 exemplar consistency, 동률 및 진동을 추가로 검산해야 한다.

예정 Trace는 유사도 구성→responsibility 갱신→availability 갱신→exemplar 판단이며, preference로 군집 수가 달라지는 것을 표시한다. dense 메시지 행렬의 실제 바이트를 사전 추정해야 한다. 아직 엔진/전용 시각화/독립 수치 fixture 없음.

## 후보 39 CURE

Guha, Rastogi & Shim, _CURE: An Efficient Clustering Algorithm for Large Databases_, SIGMOD 1998, 73–84. [원문 PDF](https://www2.cs.sfu.ca/CourseCentral/459/han/papers/guha98.pdf), 대표점 선택·축소·병합, 3–5쪽을 확인했다.

한 평균 대신 흩어진 여러 대표점을 선택한 뒤 평균 쪽으로 축소한다. 군집 간 거리는 서로 다른 군집의 대표점 쌍 중 최소 거리다. 병합 후 대표점을 다시 선택해야 하며 단순 centroid linkage로 대체하면 안 된다. 대표점 축소는 q′=q+α(μ−q)로 구현할 수 있다. 모든 점에서 대표점을 재선택하는 기본 절차와 부모 대표점만 사용하는 개선 절차를 구분해야 한다.

논문의 확장 전략에는 random sampling/partitioning이 포함된다. 전체 데이터의 계층 병합과 표본 기반 대형 실행을 동일한 정확 모드로 표시하면 안 된다. 먼저 소규모 전체 데이터 버전을 수치 검산하고, 원문 표본 모드를 별도 명시적 옵션으로 검토한다. 대표점 선택→축소→최근접 쌍 병합을 실제 Trace로 기록할 계획이다. 아직 엔진 없음.

## 후보 48 Spectral Clustering

Ng, Jordan & Weiss, _On Spectral Clustering: Analysis and an algorithm_, NIPS 14, 회의 2001/권 출판 2002. [공식 논문 페이지](https://papers.nips.cc/paper/2092-on-spectral-clustering-analysis-and-an-algorithm). PDF는 접근했으나 텍스트 인코딩이 깨져 해당 문서의 수식을 추출 검증하지 못했다. 원문 수식 재확인, Shi–Malik 계열과의 구분, 라플라시안 선택/고유값 순서/행 정규화/고립 노드 처리/중복 고유값의 불변성 검증이 다음 단계다. 최종 임베딩을 K-Means에 입력하는 것만으로 고유분해가 구현되었다고 간주하지 않는다.

## 후보 27 Density Peaks / CFSFDP

Rodriguez & Laio, _Clustering by fast search-and-find of density peaks_, Science 344 (2014), 1492–1496, DOI 10.1126/science.1242072. [저자 소속기관 기록](https://iris.sissa.it/handle/20.500.11767/14183)에서 서지·초록 확인. 원문 PDF는 기관 기록에서 비공개로 표시된다. ρ/δ 정의·cutoff/Gaussian kernel 선택·density 동률·가장 높은 밀도점·중심 선택·halo 처리를 원문 또는 저자 구현으로 확인해야 한다. 아직 엔진 없음.

2026-11-01 후속 준비: [CONSTRAINT_QUEUE](research/CONSTRAINT_QUEUE.md)에 COP/PCK/MPCK/Constrained Spectral의 실제 열람 범위와 원문 접근 제한·수식/오류/독립oracle 계약을 남겼다. 엔진을 추가하거나 정식 조사 완료로 상태를 올리지 않았다.

배포 검증 대기 중 [MIXTURE_FOLLOWUP_QUEUE](research/MIXTURE_FOLLOWUP_QUEUE.md)에 후보81–91의 분포별 EM/입력/수치 경계·실제 원문 열람·공식 oracle 확보 여부를 정리했다. TAXONOMY의 관계 조사와 새 부분 열람을 구분하며 구현·정식 조사 완료 수에 합산하지 않는다.

[GRAPH_FOLLOWUP_QUEUE](research/GRAPH_FOLLOWUP_QUEUE.md)에 다음7개 그래프 후보의 원문·방향/가중/중첩·전이/목적함수·현재 계약 차이와 접근 제한을 기록했다. Walktrap/Infomap/CPM 공식 구현 smoke는 다음 oracle 준비이며 신규 제품 엔진 검증이나 구현 수로 세지 않았다.
