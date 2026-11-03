## 2차 확장 현재 상태

소스57엔진·228추천·75미구현·엄격 인증0。FPCM1997 U행/T열 정규화와 MPCKMeans2004 multiple diagonal을 원본 ND·실제 Trace·독립 NumPy/SciPy로 연결했다. 기존55엔진·220추천은 보존했다. 계약·실제 검증 및 공개 배포 상태는 [2차 보고서](ALGORITHM_EXPANSION_2_REPORT.md)를 따른다. 아래는 이전 기록이다.

## 2026-11-03 1차 확장 — 55개 엔진 공개 배포·최종 검증 완료

제품 main `32dc4cfa634bc181f27f408ff49dc48d81d014a0`의 [Actions/Pages](https://github.com/oyueo-mm/ClusterLab/actions/runs/41513054284) validate·deploy가 성공했다. **55엔진·220추천·77미구현·엄격 원문 완전 인증0**이다. 로컬과 원격 모두 타입·ESLint·빌드·Vitest694/694·48파일, 전체 Chromium/mobile130통과/14기존조건부생략/0실패다. 공개 사이트19통과/1기존중복생략, 신규8추천×2화면16계산/되감기,6폭×2엔진·표본 클릭·리사이즈 무재계산15검사를 확인했다. 공개 HTML/JS/CSS 해시도 로컬 빌드와 동일하다.

PCK `bed5b79` → PCM `98b77b3` → 기존 구조형 기본값 복원 `daa6b2e` → 교재/추천 검증 `926b14e` → 통합·실측 `32dc4cf` 순서로 개발했다. [최종 확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md), [배포 명세](extension-55/release.json), [로컬 전체](extension-55/browser-local.json), [공개](extension-55/browser-public.json), [CI](extension-55/ci-summary.json)를 따른다. 아래 검증 중/54개/53개 표기는 과거 기록이다.

원본 ND·유한 제약 비용 PCK와1993 고정 척도·비정규화 전형성 PCM을 실제 Trace·분석·추천·가이드/미니·독립 NumPy와 연결했다. 기존53엔진 수학 소스·32프리셋·홈,212추천/생성636건,119후보 이름/순서를 보존했다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/`c4d6a7d`를 보존했다. R ppclust 실행·1993 원문 전체 인증·실물 휴대전화·최대 GPU/Worker 메모리는 미검증이다. 후속 FPCM·MPCKMeans 등77후보는 별도 미완료이며 이번 세션에서 추가하지 않는다.

## 2026-11-03 PCKMeans·PCM 확장 — 로컬 55개 통합 검증 중

PCKMeans 안정 커밋 `bed5b79` 이후 PCM을 순차 구현했다. 실행 엔진 **55개**, 기존119후보 중42개 연결·**77개 미구현**, 추천 **220구성**(기존212+각4), 엄격 원문 완전 인증 **0개**다. 기존53개 엔진 수학 로직과32프리셋을 보존한다. [이번 확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md)와 [PCKMeans](research/PCKMEANS.md)·[PCM](research/PCM.md)의 범위·수치 정책을 우선한다.

PCM은 원본 전체 ND에서 별도 FCM 초기화·양수 고정 Ω·1993 목적·독립 전형성·로그 가중 평균을 실제 계산한다. NumPy 직접 거듭제곱 oracle14사례(13성공/영분산 자동척도 오류1), 수식 손계산과 전체 중간 AO·최종 결과·Trace 역진/seek를 검산했다. R ppclust 실행 비교와1993 원문 전체 인증은 하지 않았다. 2005 원저자 재서술의 식과 공식 매뉴얼을 대조했으며 제품에 라이브러리 소스를 복사하지 않았다.

현재 전체 Vitest **694/694·48파일**, 타입·ESLint·빌드 통과. 기존212추천 및 생성636건은 `f615923`과 동일하다. Node PCM100/1000/10000행(d4,K3) 실제 계산+Recorder13.37/46.32/193.98ms, Trace46이벤트·347256/2674654/4662828추정바이트를 관측했다(단일 실행, Worker/렌더 제외). 전체 브라우저·Actions·공개 배포는 아직 검증 중이다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/`c4d6a7d`를 보존한다. 아래 과거 체크포인트는 당시 결과다.

# 성능 측정 — 2026-10-31 플랫폼 확장

> 최종 공개 체크포인트:53개(기존13+후보40), 미구현79개, 완전 인증0. 제품main fc5cc15·Actions41305149245 validate/Pages 성공. 원격532/39파일·전체브라우저78통과/12기존생략, 로컬 다섯 spec cross38/38, 공개4브라우저8/8. 아래 중간 기록보다 SESSION_REPORT 마지막 확정 절을 우선한다.

> 현재53개 소스(기존13+후보40), 미구현79개, 완전 인증0. 안정50개는 sessions/platform50에 원문 보존했다. 전체532/39파일·로컬78통과/12기존생략·후속순차4/4·다섯 spec Firefox/WebKit38/38이 통과했다. 새 main/CI/Pages는 SESSION_REPORT 마지막 확정 결과를 따른다. 아래 과거 수치는 당시 기록이다.

현재50개 소스(후보37개 구현/82개 미구현, 완전 인증0)의 신규6개 관측은 마지막 절을 따른다. 이전44개 성능·배포 증거와 [당시 문서](sessions/platform44/PERFORMANCE.md)를 보존한다. 새 전체 타입/lint/build·단위509개/37파일·신규 Python reference3개는 통과했지만 로컬 브라우저 통합은 첫4통과/4실패 이후 수정 중이다. 새50개의 전체 회귀·공개 배포·정량 브라우저 성능 성공을 주장하지 않는다.

이전 기록은 sessions/foundation/PERFORMANCE.md와 expansion/에 보존했다. 아래는 Windows, Node v24.19.0, seed 42의 단일 관측이다. 전체 테스트 동시 부하/GC에 영향을 받는다. 생성·Worker 복사·브라우저 렌더링은 제외하며 heap delta는 peak가 아니다. 음수는 GC 영향이다.

## 전체 데이터 계산

| 엔진               |   입력 수 |      ms | 이벤트 | Trace 추정 bytes | 상태     |
| ------------------ | --------: | ------: | -----: | ---------------: | -------- |
| K-Means            |       100 |    9.34 |    608 |           364376 | complete |
| K-Means            |     1,000 |    3.49 |      9 |            63734 | complete |
| K-Means            |    10,000 |   37.34 |     11 |           588140 | complete |
| K-Means            |   100,000 |  257.66 |     13 |          5857882 | complete |
| K-Means            | 1,000,000 | 2378.62 |     15 |         58782080 | complete |
| Mini-Batch K-Means |       100 |    2.78 |      8 |            22306 | complete |
| Mini-Batch K-Means |     1,000 |    5.67 |     20 |           169594 | complete |
| Mini-Batch K-Means |    10,000 |  107.32 |    164 |          3875476 | complete |
| Mini-Batch K-Means |   100,000 |  157.87 |      6 |          5842524 | complete |
| Mini-Batch K-Means | 1,000,000 | 1955.03 |      6 |         58260824 | complete |

K-Means: K=3, 최대 5회 Lloyd. Mini-Batch: K=3, 2 epochs, batch=256.

Mini-Batch의 counts 합계는 모든 입력을 매 epoch 방문한 2n임을 확인했다. 학습과 최종 평가는 전체 입력이며 표본만 계산하지 않는다. 큰 입력의 Trace는 실제 첫 배치와 epoch 요약임을 표시한다. K-Means도 전체 입력 계산과 반복 요약을 구분한다. 이 결과는 전역 최적이나 임의 기기의 성공을 보장하지 않는다.

원본: [K-Means](platform/kmeans-scale.json), [Mini-Batch](platform/minibatch-scale.json), [25엔진 120점](platform/benchmark-120.json), [medoid](platform/medoid-performance.json), [CURE/NG/GNG](research/prototypes-performance.json). 재현: npm test -- src/engine/scale.test.ts src/engine/platform-scale.test.ts src/engine/benchmark.test.ts.

## 기록 저장과 자원 한계

analysis delta는 바뀐 행렬 필드만 저장하고 동일 행렬을 공유한다. label delta는 조밀한 변경의 임시 객체를 만들지 않는다. JSON.stringify 크기에는 공유 객체가 중복되므로 retained heap과 다르다. benchmark의 traceBytes는 과거 호환 JSON code units이고 traceUtf8Bytes가 UTF-8 직렬화 크기다. 둘 다 peak RAM이 아니다.

작업 공간 256MiB/Trace 64MiB는 명시적 바이트 정책이다. ND 원본/입력 문자열 추정을 포함하지만 모든 객체·GC peak를 완전히 예측하지 못한다. Spectral 10만 입력의 밀집 행렬은 할당 전 거부하는 테스트를 통과했다. O(n²)/O(n³) 엔진에 백만 입력을 강제하거나 새 전역 점 수 상한을 두지 않는다.

## 브라우저 측정과 남은 검증

quality.spec.ts는 홈 36점 네 Worker와 실험실 120점 재생의 rAF 평균/p95/max를 기록한다. 이는 제한된 짧은 관측으로 60FPS 보장이 아니다. Chromium/mobile 결과 JSON을 platform에 보존한다. 신규 플랫폼 Firefox/WebKit은 기능 검증이며 백만 점 렌더링 측정이 아니다.

추가 과제: 브라우저 100k/1M 전송·파일 스트리밍·첫 화면 지연·취소 지연 정량화·Undo peak·장시간 누수·대규모 그래프·기기별 FPS·WASM/GPU 병목 비교.

## 짧은 rAF 관측

| 장면              | 구성     | 평균 ms | p95 ms | 최대 ms |
| ----------------- | -------- | ------: | -----: | ------: |
| 홈 36점 네 Worker | chromium |   16.67 |  16.80 |   16.80 |
| 실험실 120점      | chromium |   17.60 |  16.70 |  100.10 |
| 홈 36점 네 Worker | mobile   |   16.67 |  16.80 |   16.80 |
| 실험실 120점      | mobile   |   16.67 |  16.70 |   16.80 |

약 2.2초 rAF 간격 관측이며 장시간/대규모 신규 엔진 FPS나 실제 모바일 하드웨어 측정이 아니다. mobile은 Chromium 기기 에뮬레이션이다.

측정 환경: Intel Core Ultra 7 256V, 논리 CPU 8, 물리 메모리 약 15.54GiB, Windows x64/Node v24.19.0. 원본 환경 메타데이터는 platform/environment.json이다. 다른 작업이 함께 실행되는 사용자 장치의 단일 관측이며 원격 Ubuntu/Node22 CI와 분리한다.

## 2026-11-01 안정44개에서 추가한19개 — 원본 관측 보존

당시44개 실행 엔진 중 추가19개를 측정했다. 각 행은 해당 JSON의 단일 관측을 발췌한 것이며 서로 다른 입력/파라미터/상세 기록을 사용한다. 엔진 간 순위를 매기는 동일 조건 비교가 아니다. Node v24.19.0/Windows이며 생성·파일 파싱·Worker 전달·브라우저 렌더링·취소 지연은 제외한다. traceEstimatedBytes는 Recorder의 바이트 추정으로 실제 heap peak와 다르다. heapDeltaBytes가 음수인 것은 GC 영향이며 peak 또는 누수 부재의 증거가 아니다.

| 엔진                 | 실제 입력 규모                           |     ms | 기록 이벤트 | Trace 추정 bytes | 원본                                                     |
| -------------------- | ---------------------------------------- | -----: | ----------: | ---------------: | -------------------------------------------------------- |
| X-Means              | n=1,000, d=2                             |   2.47 |          16 |           163180 | [자동 K](research/auto-models-performance.json)          |
| G-Means              | n=1,000, d=2                             |  16.45 |          76 |           534072 | [자동 K](research/auto-models-performance.json)          |
| Dip-Means            | n=100, d=2                               |  10.32 |          58 |           133888 | [자동 K](research/auto-models-performance.json)          |
| DP-Means             | n=1,000, d=2                             |  26.74 |        4006 |          6061506 | [자동 K](research/auto-models-performance.json)          |
| Louvain              | 실제 희소 ring n=1,000                   | 254.52 |        1047 |         33519392 | [커뮤니티](research/community-performance.json)          |
| Leiden               | 실제 희소 ring n=1,000                   |  12.82 |          34 |          1679734 | [커뮤니티](research/community-performance.json)          |
| Label Propagation    | 실제 희소 ring n=1,000                   | 102.90 |        1636 |          9885514 | [커뮤니티](research/community-performance.json)          |
| Girvan–Newman        | 실제 ring n=30                           |   1.11 |           8 |            40742 | [커뮤니티](research/community-performance.json)          |
| MCL                  | 실제 ring n=100                          | 157.46 |         127 |         10787664 | [커뮤니티](research/community-performance.json)          |
| CNM                  | 실제 희소 ring n=1,000                   |  87.22 |          23 |          2027924 | [그래프 추가](research/graph-extra-performance.json)     |
| Fluid Communities    | 실제 희소 ring n=1,000, iterations=1,000 |  66.01 |         386 |          2788876 | [그래프 추가](research/graph-extra-performance.json)     |
| K-Modes              | n=1,000, 범주 열=2                       |   1.62 |           6 |            69624 | [데이터 계열](research/data-clustering-performance.json) |
| K-Prototypes         | n=1,000, 전체 열=5                       |   3.82 |           6 |            70422 | [데이터 계열](research/data-clustering-performance.json) |
| CLIQUE               | n=1,000, d=3                             |   4.75 |           6 |           682406 | [데이터 계열](research/data-clustering-performance.json) |
| PROCLUS              | n=1,000, d=3                             |   5.07 |          13 |           239348 | [데이터 계열](research/data-clustering-performance.json) |
| DenStream 전체 Trace | n=100,000, d=3, 활성 CF=2                | 301.41 |          10 |         10625358 | [스트림](research/denstream-performance.json)            |
| Bimax                | 실제 100행×20열                          |   1.51 |          16 |           437700 | [행렬](research/matrix-performance.json)                 |
| Cheng–Church         | 실제 100행×20열                          |  26.70 |          74 |          3961284 | [행렬](research/matrix-performance.json)                 |
| K-Shape              | 실제 n=1,000, L=16                       | 139.71 |        6017 |         37453238 | [시계열](research/timeseries-performance.json)           |

원본 JSON은 각 규모/파라미터·상태·heap 증감도 보존한다. 자동 K는 seed42/maxK8/iterations12, Dip bootstrap50이며 X-Means의 이 blobs 관측 결과는 K=1이다. 참 K를 얻도록 결과나 입력을 조작하지 않았다. K-Shape는 seed42/K2/iterations3, 직접 O(L²) NCC와 밀집 고유해다. 전체 수학·기록 정책은 해당 연구 문서를 따른다.

### 계산과 기록을 나눈 사례

DenStream은 `100/1,000/10,000/100,000`행의 stateful CF와 전체 Trace를 따로 측정했다. 100,000행 stateful CF는 94.53ms, 전체 Trace는 301.41ms였으며 총 감쇠 가중치를 독립 등비합과 비교했다. 모든 행을 처리했고 최종 CF 두 개를 유지한다. 이는 활성 CF 수가 큰 입력의 최악 비용이나 UI 영속 증분 세션 성능이 아니다. UI 유입은 전체 prefix를 Worker에서 다시 계산하므로 새 관측의 화면 갱신 비용을 이 stateful 단일 관측 삽입 비용과 동일시하지 않는다.

Leiden의 1,000노드 상세 기록은 개발 중 64MiB 기록 정책을 넘었고, 실제 fast-move/refinement/집약은 유지하면서 첫 이동과 실제 단계 요약을 기록하도록 개선했다. 큰 기록에서 생략된 개별 이동을 모두 복원할 수 있다고 하지 않는다. Louvain의 1,000노드 Trace는 약 33.5MB 추정으로 더 큰 상세 기록이 계속 선형일 것이라고 보장하지 않는다.

Fluid의 1,000노드 ring은 기본 iterations=100에서 전파가 끝나지 않아 미할당 오류가 났다. 위 완료 관측은 명시적으로 iterations=1000이다. CNM은 최대 양의 ΔQ 병합을 희소 전체 스캔으로 찾아 원문 heap 가속의 복잡도를 주장하지 않는다. MCL은 pruning 없는 실제 밀집 곱/거듭제곱이며 1,000노드 희소 방식 결과와 비교할 수 없다.

### 자원 검사와 편집의 검증 범위

typed integration은 n=3,000 실제 path graph의 작은 m을 사용해 희소 공간 검사가 통과하고, 같은 n/높은 neighbors의 numeric→union-kNN 생성은 예산 초과로 계산 전에 거부되는지 검사했다. 입력 개수만 보고 raw sparse graph를 거부하는 정책이 아니다. G-Means의 d², K-Shape의 L², CLIQUE 격자/부분공간, Bimax의 실제 결과 증가도 별도 검사한다. 임의 600/1,000/100만 전역 입력 상한을 추가하지 않았다.

구조형 히스토리 테스트는 10,000행에서 한 셀의 경로 변화만 저장하고 관련 없는 행 객체를 공유하며, 한 스트림 관측 추가가 단일 splice인지 확인한다. 이 검사는 메모리 구조의 회귀이며 편집 FPS·peak 실측이 아니다. 새 16×8 표는 표시 창 크기로 원본 전체 계산과 분리한다.

### 재현과 미측정 영역

```powershell
npx vitest run src/engine/auto-models.test.ts src/engine/community.test.ts src/engine/graph-extra.test.ts
npx vitest run src/engine/data-clustering.test.ts src/engine/denstream-audit.test.ts
npx vitest run src/engine/matrix-clustering.test.ts src/engine/timeseries-clustering.test.ts
npx vitest run src/engine/typed-integration.test.ts src/editor/datasetHistory.test.ts
```

연구별 원본 JSON은 이 개발 단위의 보존 기록이며 실행 시 생성되는 임시 성능 자료와 다를 수 있다. 속도 수치를 pass/fail 문턱으로 사용하지 않는다. 이번 변경의 전체 브라우저·회귀·배포는 검증 중이다. 신규 엔진의 100k/1M 실제 그래프, 고차원/긴 파형·많은 활성 CF, 대형 입출력 전송/렌더링, Worker 취소 지연, 장시간 누수/peak, 실제 모바일 하드웨어 FPS는 아직 측정 완료하지 않았다.

### 통합 검증 보완 (성능 보장과 구분)

원본 reference 스크립트 7개 재생성이 모두 성공했다. 전체 단위 426/426 통과와 PROCLUS native output 추가 테스트 1개 개별 통과 후 최종 전체 재실행은 대기 중이다. 신규 브라우저 8시나리오×Chromium/mobile는 16/16 통과했으며 실제 추가 19개 Worker와 1,000행×12열 원본을 7개 폭에서 검사했다. 이는 입력 보존·편집·실제 계산·응답 기능 검사이며 1,000×12 모든 엔진의 정량 FPS/peak 또는 실제 모바일 하드웨어 측정이 아니다. raw graph의 화면 자원 추정에도 실제 m을 전달하도록 수정해 Worker 사전 검사와 맞췄다. 추가 가이드 사례는 검증 중이며 전체 기존 회귀·Firefox/WebKit·Actions/Pages는 아직 미실행이다.

## 2026-11-01 안정44개 최종 수치 회귀·추가 관측 (보존)

당시44개 소스의 전체 단위/통합은428/428·32파일 통과했다. 원자료와 환경은 [platform44](platform44/)에 보존했다. 신규19개 계열별 관측은 앞 절의 research JSON을 유지하며, 전체44 benchmark는 실제 입력 행 수가 엔진별로 다르다.

이번 scale 실행에서100만 전체 입력 K-Means는3774.96ms·15이벤트·Trace 추정58,782,080바이트, Mini-Batch는3627.56ms·6이벤트·전체200만 방문(2epoch)·Trace 추정58,260,824바이트였다. 생성·전송·렌더링을 제외한 단일 Node 관측이며 heap delta는 peak가 아니다. 기존25개 증거와 혼합하지 않는다. 이 관측을 신규44개 전체의100만 지원 보장으로 확대하지 않는다.

최종 빌드의 홈36점/4Worker 및 실험실120점 K-Means rAF 관측도 Chromium/mobile2검사에서 통과했다. 원자료는 platform44/{home-performance-chromium,home-performance-mobile,performance-chromium,performance-mobile}.json이다. 약2.2초 관측과 기기 에뮬레이션이며 신규 대형 데이터/실제 휴대전화/장시간60FPS 보장으로 해석하지 않는다.

안정44개 소스fd78886의 원격64전체 회귀·428단위·통합과 Pages 배포가 성공했다. 공개/교차 브라우저의 당시 범위는 보존된 SESSION_REPORT를 따른다. 위 중간426/427/16/대기 표현은44개 개발 중 관측이며 해당 체크포인트의 최종428/공개 확인과 구분한다. 장시간·대규모 브라우저 peak/FPS는 계속 미검증이다.

## 2026-11-01 현재50개 소스 — 신규6개 단일 Node 관측

COP-KMeans·이산 혼합3개·Walktrap·CPM의 실제 원본 전체 계산과 Trace를 추가 측정했다. 아래는 Node24.19.0/Windows x64의 보존 JSON에서 발췌한 **케이스당 단일 관측**이다. 서로 다른 입력·종료·기록 정책이므로 공정한 엔진 순위나 모든 기기 성능 보장이 아니다. 생성·입력/표시 점 변환·Worker 전송·브라우저 렌더링·취소 지연은 제외한다. heapBefore/heapAfter/heapDelta는 강제 GC 없는 관측이고 peak/누수 인증이 아니다.

| 실제 엔진           | 원본/설정                        |     ms | 이벤트 | Trace 추정 bytes | 원자료                                                     |
| ------------------- | -------------------------------- | -----: | -----: | ---------------: | ---------------------------------------------------------- |
| COP-KMeans          | n100000,d3,K2,한도10·희소ML/CL   | 135.78 |      7 |          7411866 | [constrained](research/constrained-performance.json)       |
| Bernoulli Mixture   | n10000,d3,K2,한도4·미수렴        |  76.64 |     10 |          6848354 | [discrete](research/discrete-mixtures-performance.json)    |
| Poisson Mixture     | n10000,d3,K2,한도4·미수렴        |  90.73 |     10 |          6840930 | [discrete](research/discrete-mixtures-performance.json)    |
| Multinomial Mixture | n10000,d3,K2,한도4·허용오차 종료 |  99.32 |     10 |          6772432 | [discrete](research/discrete-mixtures-performance.json)    |
| Poisson Mixture     | n100000,d3,K2,한도4·미수렴       | 752.88 |      6 |         45767928 | [discrete](research/discrete-mixtures-performance.json)    |
| Walktrap            | path n1000,m999,t4               | 952.84 |     26 |         58705918 | [graph-followup](research/graph-followup-performance.json) |
| Clique Percolation  | path n10000,m9999,k3,C0          |  20.16 |      3 |          2346304 | [graph-followup](research/graph-followup-performance.json) |
| Clique Percolation  | complete n18,m153,k3,C816        |   3.83 |     25 |           695994 | [graph-followup](research/graph-followup-performance.json) |

COP 원본은 파일의 명시한3D 교대 그룹·ML0–2/1–3·CL0–1이며 모든 행을 처리한다.100행은407이벤트·1000/10000/100000행은7이벤트로 기록 상세가 다르므로 시간 차이를 동일 상세 실행의 선형 개선이라고 해석하지 않는다. COP은 제약 최적 분할/불가능성 증명 엔진이 아니며 seed/행순서 greedy 실패가 가능하다. [실제 수학·기록 정책](research/CONSTRAINED.md)

이산 혼합은 Bernoulli p.15/.85,Poisson λ1/7,Multinomial profile [.8,.1,.1]/[.1,.1,.8]·실제 trials10/20의 시드42 원본이다. 실제 무prior ML이고 관측 경계0·정규화 상수·빈 성분·0길이 행의 수학적 의미를 유지한다. M 직후 전체 posterior/로그우도 재평가 비용도 포함한다.10만 Poisson은 모든 n×K 확률을 보존하고 상세 반복만 요약했으며 **미수렴**을 완료 수렴으로 보고하지 않는다. 이 단일 관측은100만 처리나 임의 큰 정수의 임의정밀도 보장이 아니다. [계약·수치 한계](research/DISCRETE_MIXTURES.md)

Walktrap은 원본 graph에 대한 정확한 전체 보행·직접 인접 Ward 탐색이며 원문 heap/거리 가속의 성능을 주장하지 않는다. n² 확률·전체 수준/계층 때문에1000노드 Trace는 약58.7MB 추정으로64MiB 예산에 가깝다. CPM path는 clique가 없는 쉬운 경우다. 모든 노드를 처리하고 비소속을 보존했지만 지수적인 조밀 clique/face 출력이나 대형 중첩의 보편 성능을 뜻하지 않는다. complete18의816개는 별도 작은 출력 사례다. CPM에는 최적화 목적함수·통계적 noise 판정이 없다. [정의·복잡도·제한](research/GRAPH_FOLLOWUP.md)

[동적 API 통합](../src/engine/extension-integration.test.ts)은 같은2048노드 빈 sparse graph에서 Walktrap dense byte 사전 거부와 CPM 전체 노드의 정상0-clique 완료를 구분한다. [생성기 회귀](../src/data/model-presets.test.ts)는10000행 분포 통계·전체 차원·25행ML성분/CL·1201행 보존과 allocation 전 byte 거부를 검사한다. 이는 수학/구조 검증이며 브라우저 FPS·peak 측정이 아니다.

재현 명령:

```powershell
python -B scripts/constrained_reference.py
python -B scripts/discrete_mixtures_reference.py
python -B scripts/graph_followup_reference.py
npx vitest run src/engine/constrained.test.ts src/engine/discrete-mixtures.test.ts src/engine/graph-followup.test.ts
npx vitest run src/engine/extension-integration.test.ts src/data/model-presets.test.ts
```

실행 시 `.local/` 성능 자료는 JIT/GC/부하로 보존 JSON과 달라질 수 있다. 속도에 pass/fail 문턱을 만들지 않는다. 새50개 소스의 로컬 브라우저 통합·전체 기존 회귀·cross-browser·Actions/Pages·장시간 메모리/실제 모바일/대규모 전송과 취소 지연은 아직 성공으로 확정하지 않았다.

## 순차3개 관측 — 53개 개발 트리

현재 소스53/후보40·79미구현/완전 인증0이다. 안정50개 문서는 sessions/platform50에 보존했다. [SEQUENTIAL](research/SEQUENTIAL.md)과 [원자료](research/sequential-performance.json)는 실제 원본100/1k/10k/100k,3차원·두 분리 군집·threshold1/upper2/q16의 각3방법 단일 Node 관측이다. 모든 원본을 처리하고 실제 시간·heap delta·회차·K·이벤트/Trace 추정을 저장했다.

TTSAS는 한 pass인 쉬운 사례다. 이를 다회 유보의 보수 최악 O(n³d) 성능으로 확대하지 않는다. 생성·Worker 전송·Canvas/FPS/취소 지연·장시간 peak는 제외했다. heap delta는 peak가 아니며 GC로 음수가 될 수 있다.

새 전역 행 개수 상한은 없다. q는 BSAS/MBSAS의 모형 매개변수이고 TTSAS에는 적용하지 않는다. 작업 추정 n(24d+128)+Kmax(48d+128)와 별도 Trace byte 예산을 검사한다. Kmax는 두 방법에서 min(n,q), TTSAS에서n이다. 예산은 브라우저 가용RAM이나 GC peak 측정이 아니다.

현재 버전의 짧은 rAF 관측은 platform53/*performance*.json이다. 홈36점/4Worker와 K-Means120점의 제한된 장면이며 신규3개·대량 데이터의 60FPS를 보장하지 않는다. 제품 거리 SVG는 값을 최대값으로 먼저 나눠1e308 같은 유효한 큰 수에서도 불필요한 곱셈 overflow를 방지한다. 이 안정화는 계산 값을 clipping한 근사 실행이 아니다.
