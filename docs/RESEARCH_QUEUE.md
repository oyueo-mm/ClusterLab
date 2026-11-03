## 2차 확장 현재 상태

소스57엔진·228추천·75미구현·엄격 인증0. FPCM1997 U행/T열 정규화와 MPCKMeans2004 multiple diagonal을 원본 ND·실제 Trace·독립 NumPy/SciPy로 연결했다. 기존55엔진·220추천은 보존했다. 계약·실제 검증 및 공개 배포 상태는 [2차 보고서](ALGORITHM_EXPANSION_2_REPORT.md)를 따른다. 아래는 이전 기록이다.

## 2026-11-03 1차 확장 — 55개 엔진 공개 배포·최종 검증 완료

제품 main `32dc4cfa634bc181f27f408ff49dc48d81d014a0`의 [Actions/Pages](https://github.com/oyueo-mm/ClusterLab/actions/runs/41513054284) validate·deploy가 성공했다. **55엔진·220추천·77미구현·엄격 원문 완전 인증0**이다. 로컬과 원격 모두 타입·ESLint·빌드·Vitest694/694·48파일, 전체 Chromium/mobile130통과/14기존조건부생략/0실패다. 공개 사이트19통과/1기존중복생략, 신규8추천×2화면16계산/되감기,6폭×2엔진·표본 클릭·리사이즈 무재계산15검사를 확인했다. 공개 HTML/JS/CSS 해시도 로컬 빌드와 동일하다.

PCK `bed5b79` → PCM `98b77b3` → 기존 구조형 기본값 복원 `daa6b2e` → 교재/추천 검증 `926b14e` → 통합·실측 `32dc4cf` 순서로 개발했다. [최종 확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md), [배포 명세](extension-55/release.json), [로컬 전체](extension-55/browser-local.json), [공개](extension-55/browser-public.json), [CI](extension-55/ci-summary.json)를 따른다. 아래 검증 중/54개/53개 표기는 과거 기록이다.

원본 ND·유한 제약 비용 PCK와1993 고정 척도·비정규화 전형성 PCM을 실제 Trace·분석·추천·가이드/미니·독립 NumPy와 연결했다. 기존53엔진 수학 소스·32프리셋·홈,212추천/생성636건,119후보 이름/순서를 보존했다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/`c4d6a7d`를 보존했다. R ppclust 실행·1993 원문 전체 인증·실물 휴대전화·최대 GPU/Worker 메모리는 미검증이다. 후속 FPCM·MPCKMeans 등77후보는 별도 미완료이며 이번 세션에서 추가하지 않는다.

## 2026-11-03 PCKMeans·PCM 확장 — 로컬 55개 통합 검증 중

PCKMeans 안정 커밋 `bed5b79` 이후 PCM을 순차 구현했다. 실행 엔진 **55개**, 기존119후보 중42개 연결·**77개 미구현**, 추천 **220구성**(기존212+각4), 엄격 원문 완전 인증 **0개**다. 기존53개 엔진 수학 로직과32프리셋을 보존한다. [이번 확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md)와 [PCKMeans](research/PCKMEANS.md)·[PCM](research/PCM.md)의 범위·수치 정책을 우선한다.

PCM은 원본 전체 ND에서 별도 FCM 초기화·양수 고정 Ω·1993 목적·독립 전형성·로그 가중 평균을 실제 계산한다. NumPy 직접 거듭제곱 oracle14사례(13성공/영분산 자동척도 오류1), 수식 손계산과 전체 중간 AO·최종 결과·Trace 역진/seek를 검산했다. R ppclust 실행 비교와1993 원문 전체 인증은 하지 않았다. 2005 원저자 재서술의 식과 공식 매뉴얼을 대조했으며 제품에 라이브러리 소스를 복사하지 않았다.

현재 전체 Vitest **694/694·48파일**, 타입·ESLint·빌드 통과. 기존212추천 및 생성636건은 `f615923`과 동일하다. Node PCM100/1000/10000행(d4,K3) 실제 계산+Recorder13.37/46.32/193.98ms, Trace46이벤트·347256/2674654/4662828추정바이트를 관측했다(단일 실행, Worker/렌더 제외). 전체 브라우저·Actions·공개 배포는 아직 검증 중이다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/`c4d6a7d`를 보존한다. 아래 과거 체크포인트는 당시 결과다.

## 2026-11-03 PCKMeans 후속 구현

SDM2004 Figure1을 직접 렌더링해 기존 미확인 초기화를 보완했다. PCKMeans 제한 범위 세로 구현·독립 NumPy/Trace/브라우저 검증은 [research/PCKMEANS.md](research/PCKMEANS.md)를 따른다. 현재 로컬54엔진/78미구현/엄격 인증0, PCM과 전체55 통합 배포는 다음 단계다. 아래 연구 메모의 날짜별 미구현 상태는 당시 기록으로 보존한다.

# 후속 원문 조사·구현 큐

> 최종 공개 체크포인트:53개(기존13+후보40), 미구현79개, 완전 인증0. 제품main fc5cc15·Actions41305149245 validate/Pages 성공. 원격532/39파일·전체브라우저78통과/12기존생략, 로컬 다섯 spec cross38/38, 공개4브라우저8/8. 아래 중간 기록보다 SESSION_REPORT 마지막 확정 절을 우선한다.

> 현재53개 소스(기존13+후보40), 미구현79개, 완전 인증0. 안정50개는 sessions/platform50에 원문 보존했다. 전체532/39파일·로컬78통과/12기존생략·후속순차4/4·다섯 spec Firefox/WebKit38/38이 통과했다. 새 main/CI/Pages는 SESSION_REPORT 마지막 확정 결과를 따른다. 아래 과거 수치는 당시 기록이다.

2026-11-01 현재 소스는 **50개 실행 엔진 / 신규 후보119개 중37개 구현·82개 미구현 / 마스터 완전 구현 인증0개**다. 안정44개 이후6개는 로컬 통합 중이며 새 배포가 확정되지 않았다. 이전25개/107개·44개/88개와 아래117개/엔진 없음 표현은 과거 조사 당시 기록으로 보존한다. [안정44개 조사 문서](sessions/platform44/RESEARCH_QUEUE.md), [등록 현황](ALGORITHM_REGISTRY.md), [전체 계획](MASTER_PLAN.md)을 구분하고 후보 목록을 축소하지 않는다.

## 안정44개에서 이어진19개와 현재 소스의 추가6개

| 범위                                | 현재 근거·구현 기록                                                                                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X/G/Dip/DP-Means                    | [AUTO_MODELS](research/AUTO_MODELS.md): 실제 BIC·AD·dip/Uniform bootstrap·비모수 hard 목적함수, 원문 직접 접근 범위와 dip 원전 제한                                     |
| Louvain/Leiden/LPA/GN/MCL           | [COMMUNITIES](research/COMMUNITIES.md): 이동/정제/집약·투표·중심성·전이 행렬, 실제 NetworkX/원저자 비교                                                                 |
| K-Modes/K-Prototypes/CLIQUE/PROCLUS | [DATA_CLUSTERING](research/DATA_CLUSTERING.md): 실제 범주·혼합·부분공간, Huang 본문 구독 제한과 공식 수식 대체 확인                                                     |
| DenStream                           | [DENSTREAM](research/DENSTREAM.md): CF·시계·승격/pruning 경계 감사와 실제100k 전체 입력 측정                                                                            |
| Bimax/Cheng–Church                  | [BICLUSTERING](research/BICLUSTERING.md): 원문 분할과 실제 MSR·행열 중첩, 독립 전수/수치 검산                                                                           |
| K-Shape                             | [TIMESERIES](research/TIMESERIES.md): 실제 시계열 NCC/정렬·고유 형태, 직접 합산과 FFT 미구현 구분                                                                       |
| CNM/Fluid                           | [GRAPH_EXTRA](research/GRAPH_EXTRA.md): 실제 ΔQ 병합·유체 투표, 원문 heap 부재·연결/단위 가중치 계약                                                                    |
| COP-KMeans                          | [CONSTRAINED](research/CONSTRAINED.md): 원저자2001 pointwise greedy·ML폐쇄/CL·실제 ND SSE, feasible 입력에서도 greedy 실패 가능, 독립 closure/완전탐색·손검산           |
| Bernoulli/Poisson/Multinomial       | [DISCRETE_MIXTURES](research/DISCRETE_MIXTURES.md): 무prior ML EM·support/0경계·상수 포함 sumLL·전체 posterior, 실제 NumPy/SciPy full EM 및 실제 bit/count/profile 입력 |
| Walktrap/CPM                        | [GRAPH_FOLLOWUP](research/GRAPH_FOLLOWUP.md): 실제 전이/Ward/최고Q cut·모든clique/공유face/중첩, NumPy/NetworkX/저자igraph 검산·가속 부재/목적함수 없음                 |

앞19개는 안정44개에서 구현한 우선14개와 추가5개이고, 마지막6개가 현재50개 소스의 신규 개발이다. 마지막 전체 타입·lint·build·Vitest509개/37파일과 신규 Python reference3개 재생성은 통과했다. 새 브라우저 첫 실행은4통과/4실패로 테스트 가정·접힌 분석 접근을 보완 중이며 전체 회귀·배포는 미확정이다. 최종 결과는 SESSION_REPORT를 따른다. 이 상태로 전체 마스터 완전 구현이라고 하지 않는다.

## 미구현82개 조사 순서

- **입력/관계 계약부터:** COP의 실제 hard 준수·원본 관계 편집·greedy 오류를 보존하고 PCK/MPCKMeans·Constrained Spectral의 서로 다른 penalty/metric/graph 최적화를 정의한다. COP 이름만 바꿔 대체하지 않는다. 남은 퍼지·범주/혼합·부분공간의 입력 관계도 구분한다.
- **중심·밀도·계층·그래프 잔여:** 각각 원논문/공식 정의·수식·입출력·중복 여부를 확인하고 실제 엔진·Trace·전용 시각화·독립 reference까지 연결한다. 후보 이름만으로 분류 완료로 올리지 않는다.
- **확률·혼합11개 중 잔여8개:** 현재 이산3개를 보존하면서 Beta·Student-t·vMF·Gaussian–Uniform·Bayesian/DP·MFA/LCA/MPPCA를 해당 분포/추론법대로 구현한다. [MIXTURE_FOLLOWUP_QUEUE](research/MIXTURE_FOLLOWUP_QUEUE.md)의 실제 원문 열람·접근 실패·oracle 준비 범위, [TAXONOMY](research/TAXONOMY.md)의 Bayesian/DP·Bernoulli/LCA·MFA/MPPCA 관계를 따른다. 이진 LCA를 Bernoulli와 중복 집계하지 않는다.
- **신경망·딥 계열 잔여:** ART·동기화·실제 임베딩/가중치 학습을 조사하고 적합한 런타임의 라이선스/용량/브라우저/Pages를 측정한다. K-Means 래퍼·고정 결과는 구현이 아니다.
- **스트림·순차·행렬 잔여:** 실제 시각·유입·행×열 출력·부분 실행을 유지하며 무한 스트림 공급/청크 처리와 현재 prefix 재계산을 구별한다. 현재 속성 표/JSON·hard 관계 편집과 별도로 시간축·행열 구조·3D/고차원의 추가 UX가 남아 있다.

미구현82개는 원문 전수 조사·실행·전용 시각화·독립 검증의 완료를 뜻하지 않는다. TAXONOMY와 각 *_QUEUE.md의 관계/부분 열람은 연구 시작점이며 실제 구현 기록이 있는 후보는 위 본문 연구 문서로 넘어간다. Bernoulli의 이전 정의·관계 조사 상태를 현재 구현 상태로 재사용하지 않는다. 모든119행의 세부 상태는 candidates.json/ALGORITHM_REGISTRY.md를 기준으로 함께 유지한다.

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

## 안정44개 배포 대기 중 후속 준비 기록 (보존)

아래는 신규6개를 구현하기 전의 문헌 준비 기록이다. 현재 구현은 위 CONSTRAINED/DISCRETE_MIXTURES/GRAPH_FOLLOWUP을 따른다.

2026-11-01 후속 준비: [CONSTRAINT_QUEUE](research/CONSTRAINT_QUEUE.md)에 COP/PCK/MPCK/Constrained Spectral의 실제 열람 범위와 원문 접근 제한·수식/오류/독립oracle 계약을 남겼다. 엔진을 추가하거나 정식 조사 완료로 상태를 올리지 않았다.

배포 검증 대기 중 [MIXTURE_FOLLOWUP_QUEUE](research/MIXTURE_FOLLOWUP_QUEUE.md)에 후보81–91의 분포별 EM/입력/수치 경계·실제 원문 열람·공식 oracle 확보 여부를 정리했다. TAXONOMY의 관계 조사와 새 부분 열람을 구분하며 구현·정식 조사 완료 수에 합산하지 않는다.

[GRAPH_FOLLOWUP_QUEUE](research/GRAPH_FOLLOWUP_QUEUE.md)에 다음7개 그래프 후보의 원문·방향/가중/중첩·전이/목적함수·현재 계약 차이와 접근 제한을 기록했다. Walktrap/Infomap/CPM 공식 구현 smoke는 다음 oracle 준비이며 신규 제품 엔진 검증이나 구현 수로 세지 않았다.

## 현재 순차 개발 이후의 큐

BSAS108/MBSAS109/TTSAS110은이제실제모듈·ND분석·Trace·교재/mini·공식Python/NumPy검산으로이어졌다. 소스53/후보40연결·79미구현·완전인증0이며전체브라우저/배포는SESSION_REPORT를따른다. NEXT_50_QUEUE의BSAS는사전조사당시기록으로보존하고현재실제범위는SEQUENTIAL이다. PCK/PCM/FPCM/MPCK/ConstrainedSpectral/Leader의정의·원문접근·계약의남은요구사항은그큐에서계속한다. 나머지후보도전체범위에남아있다.

후속 PCM/FPCM의 저자2005 재서술 수식을 실제 페이지로 확인하고, 표본×군집 표기 전치·서로 다른 합 방향·양의 거리 블록의 KKT/목적값·복제 효과를 독립 NumPy로 검산했다. [FUZZY_FORMULAS](research/FUZZY_FORMULAS.md)는 다음 구현의 자료이며 제품 엔진·R 비교·원전 전체 조사 완료가 아니다. 현재53개/후보40·79미구현/완전 인증0은 그대로다.
