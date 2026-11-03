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

## 2026-11-02 캔버스 중심 실험실 — 공개 배포 완료

제품 소스 `ae1c2cceae92fe64a75deab7165c02d3b7886ec8`. [Actions41444492938](https://github.com/oyueo-mm/ClusterLab/actions/runs/41444492938)의 validate125274337280/Pages deploy125283077444가 모두 성공했다. 원격 타입·ESLint·빌드·Vitest **651/651·46파일**, 전체 Chromium/mobile **118통과/14조건부 생략/0실패**다. Firefox/WebKit 별도28통과/2중복생략, 최종 세 브라우저 작업 공간12/12통과를 서로 다른 실행으로 기록한다.

[공개 사이트](https://oyueo-mm.github.io/ClusterLab/)의 7개 폭×3모드21구성, 주요 시각화22조합, 상호작용5개를 확인했다. 브라우저 오류0이며 실제 계산·되감기·패널·집중 모드·검색·도감 더블클릭을 확인했다. 1440×900 캔버스829×570→1066×711.2(+60.4%), 집중 모드 화면 면적79.0%. 최종 로컬 드래그DPR1/2 약60FPS, 공개58.8/60.0FPS, Worker요청1→1이다. [전체 보고서](CANVAS_WORKSPACE_REPORT.md), [배포 명세](workspace/release.json), [공개 측정](workspace/public/measurements.json)을 최종 근거로 사용한다.

이번 실험실 UI 개편은 완료했다. 기존198개 계산·데이터·이력·애니메이션 파일,53개 엔진/212추천/32프리셋, 홈·도감·비교·가이드를 보존했다. 영어 지원/새 알고리즘은 진행하지 않았다. 실제 휴대전화 하드웨어와 Worker/GPU 최대 메모리는 미측정이며, 전체 알고리즘 마스터의79후보는 별도 미완료다. 문서/테스트 대기 보완 후속은 제품 코드를 변경하지 않으며 `[skip ci]`로 기록한다. 다른 작업 트리/프로젝트 서버를 보존했다.

# 현재 아키텍처 — 53개 소스 개발 트리

## UI·추천 데이터셋 개편 구조 (2026-11-02 공개 배포 완료)

최신 UI 작업은 [UI_DATASET_PLAN](UI_DATASET_PLAN.md)을 따른다. `router.ts`의 ID 해시와 기존 페이지 별칭, `Sidebar`, `pages/Home`, lazy `Catalog`, 기존 점/원본 실험실, 공통 `lab/LabTabs`·`FullscreenButton`·`LabDetails`, `compare/CompareWorkbench`로 역할을 나눈다. 원본 비교는 유형별 공통 Dataset과 독립 파라미터/Trace를 사용하며, 기존 2D 비교는 호환 경로에 보존한다. 아래 과거의 “typed 비교 UI 미구현”은 이번 개편 전 체크포인트 설명이다. 유형별 공통 품질 지표/3D/PCA 등 마스터 후속은 여전히 별도 미완료다.

`data/recommendations.ts`는 엔진53개를 명시적으로 연결하고 기존32프리셋/원본 생성기를 재사용한다. 교재의 요약·실제 관련 알고리즘만 `catalogMetadata.json`으로 추출해 전체 수학 교재가 초기 로드되지 않게 한다. 신규 엔진은 추천 등록 및 메타데이터 동기화 검사를 통과해야 한다. `DatasetPreview`는 형식별 원본 표현을 공유하고 `AlgorithmPreview`는 최대2 Worker·화면 밖 취소·최종 요약 캐시를 사용한다. 썸네일 예산48행은 사용자 실행 데이터 상한이 아니다.

초기 자동 데이터와 사용자 소유 데이터를 구분한다. 후자는 알고리즘 전환만으로 덮어쓰지 않으며, 소유 표시를 IndexedDB 데이터와 함께 저장해 localStorage가 차단되어도 보존한다. 과거 저장 데이터는 사용자 데이터로 이전한다. 행렬/시계열/범주형의 현대 실험실 주 시각화는 DatasetPreview를 사용하고 실제 전체 원본 실행과 표시 예산을 구분한다.

자동 저장은 원본을 IndexedDB로, 작은 파라미터/탭/추천 선택만 localStorage로 분리한다. 데이터 편집 이력 코어는 변경하지 않았다. `useExperiment`는 입력·알고리즘·파라미터와 일치하는 완료 Trace만 UI에 노출해 전환 직후 잘못된 이전 결과가 표시되지 않게 한다. 수치 엔진/Recorder/기존 프리셋/홈 데모/이력142파일의 Git blob이 기준 c4d6a7d와 동일함을 `ui-datasets/source-preservation.json`에 기록했다.

> 최종 공개 체크포인트:53개(기존13+후보40), 미구현79개, 완전 인증0. 제품main fc5cc15·Actions41305149245 validate/Pages 성공. 원격532/39파일·전체브라우저78통과/12기존생략, 로컬 다섯 spec cross38/38, 공개4브라우저8/8. 아래 중간 기록보다 SESSION_REPORT 마지막 확정 절을 우선한다.

현재 소스는 기존13개와 신규 후보40개를 합한53개 실행 경로다. 후보119개 중79개는 미구현이며 엄격한 마스터 완전 인증은0개다. 직전50개(제품da10d21/문서d6e4e0d)의 원문은 [sessions/platform50](sessions/platform50/ARCHITECTURE.md)에 보존했다. 새3개의 전체 검증·배포는 SESSION_REPORT 마지막 확정 결과를 따른다.

## 데이터와 실행 계약

기존 Point[]를 폐기하지 않고 Dataset union을 함께 사용한다. numeric·categorical·mixed·graph·matrix·timeseries·stream·constrained를 각 호환 엔진에 전달한다. 모든53개가 모든 유형을 지원하는 구조가 아니다. supportsDataset/validateDataset/validateParameters/prepareDataset이 실제 지원과 원본·자원을 검사한다.

displayPoints는 선택 축과 원본의 화면 배치를 만들 뿐이다. 엔진은 네 번째 인수의 원본으로 모든 지원 특성·실제 범주 문자열·원본 간선/가중치·행렬 셀·시간축·timestamp·ML/CL을 계산한다. 표시 축 변경은 같은 원본 계산을 재실행하지 않는다. 원본 계산과 Canvas LOD·표 표시 창을 구분한다.

registry의 메타데이터·스키마·기본값·실제 지원 입력·예제 원본·분류·검증·한계·lazy loader를 사용한다. 제품 Worker는 필요한 모듈만 동적 import한다. 정적 run/nextEngines는 동기 검증 API이며 제품 진입점에 넣지 않는다. 신규 BSAS/MBSAS/TTSAS도 각각 실제 모듈이고 단순 K-Means 대체가 아니다.

## Worker·취소·캐시

무거운 계산은 Worker에서 수행하며 취소는 실제 terminate다. 세대 ID·원본 Dataset·파라미터 키로 오래된 결과를 배제한다. raw 실행 메시지에서 중복 표시 points는[]로 생략하되 완료 cache.points는 현재 실제 표시 참조를 보존해야 traceIsCurrent와 내보내기가 정상이다. 이 기존 수정사항을 유지한다.

진행 보고는 실제 기록 이벤트 수이며 모든 산술 연산의 완료 백분율이 아니다. 재생 pause와 계산 자체 pause는 다르다. 계산 pause/resume·기기별 자원 Worker pool은 미구현이다. 최대4개 비교와 독립 Worker 실행은 보존한다. typed 원본끼리의 새 비교 UI는 아직 없다.

## native 결과

| kind                  | 실제 반환 정보                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| partition             | 원본 행 labels. 범주/혼합의 실제 중심은 분석 상태에 보존                                              |
| communities           | 계층·해당 목적값·중첩 소속. Walktrap dendrogram/selectedLevel, CPM communities/무목적 이름            |
| subspaces             | CLIQUE 부분공간·구성원·격자/영역·전체 memberships                                                     |
| projected-partition   | PROCLUS medoid·선택 차원·influence·labels·목적값                                                      |
| biclustering          | Bimax/Cheng–Church 행×열 biclusters와 양쪽 memberships                                                |
| timeseries-partition  | K-Shape 전체 파형 중심·shift·실제 squared-SBD 진단                                                    |
| stream-summary        | DenStream 실제 시각·processed·미소군집 CF                                                             |
| constrained-partition | COP 전체ND 중심·labels·성분/CL·실제 hard SSE·활성K                                                    |
| mixture               | 이산 혼합 method·모수/가중치·전체 Bayes posterior·정규화 포함 sumLL                                   |
| sequential-partition  | BSAS/MBSAS/TTSAS method·labels·ND centroids·counts/prototypeCounts·passes·unassigned·완료·assignedSSE |

computedRows/sourceDimensions는 계산한 전체 원본 수/차원이다. 행렬의 computedColumns와 시계열의 timeSeriesSteps도 구분한다. CPM −1은 미소속, 순차 −1은 미처리/유보이며 통계적 노이즈라고 표시하지 않는다.

## Trace와 실제 애니메이션

Recorder는 before/after analysis delta·label/center delta·48이벤트 checkpoint로 전진·역진을 복원한다. 불변 행렬·원본·관계 참조를 공유한다. 새 순차 엔진은 sourceValues의 최초 Recorder clone을 재사용하여 매 기록마다 원본을 복사하거나 다시 비교하지 않는다. 작은 입력은 실제 거리 검사·생성·배정·유보·pass를 기록하고, 큰 입력은 실제 첫/2의 거듭제곱 단계와 최종 상태를 기록한다. 생략한 중간 상세를 모두 저장했다고 주장하지 않는다.

AlgorithmAnalysis와 계열별 분석이 실제 상태를 표시한다. 중심/뉴런/공분산·메시지·밀도·부분공간·CF·행렬·파형·제약·이산모수·순차 대표를 각각 구분한다. 현재→다음 위치/색의 시각 보간과 실제 숫자·분기를 구별하고 reduced-motion을 따른다. 순차 SVG 거리 좌표는 비율을 먼저 계산하여 유효한1e308 거리에서도 불필요한 곱셈 overflow를 피한다. 실제 숫자를 잘라서 숨기지 않는다.

순차 counts와 prototypeCounts는 현재 정책에서 같은 실제 단위 가중치 배정 행 수다. MBSAS의 유보 행은 첫 pass에 포함하지 않는다. TTSAS는 실제 유보 재검사와 무진전 다음 pass의 첫 pending 생성 규칙을 수행한다. SSE는 진단이고 전체 분할의 단조 최적화나 Lloyd 고정점을 뜻하지 않는다.

## 편집·자원·남은 범위

기존13 모듈·32프리셋·HomeDemos13종/11순환·v03/v04 디자인·기존 Undo/Redo/제스처/입출력을 보존한다. typed 편집은 최대100개의 경로/splice delta 이력과 bounded 표를 사용한다. CSV/JSON legacy 호환과 typed JSON을 구분한다.

새 전역 행 수 상한은 없다. 실행별 원본 차원/간선·실제 출력·작업/Trace byte 예산을 검사한다. 기본256MiB/64MiB는 정책이고 가용RAM/peak 측정값이 아니다. 수치 불안정·자원 부족·잘못된 유형·미수렴·취소를 빈 성공으로 바꾸지 않는다.

청크 파일 파서·transferable 버퍼·3D 회전/PCA·시각 그래프 편집·증분 무한 스트림 UI·장시간 누수/FPS·적응 Worker pool·새 typed 비교/지표·GPU/WASM 가속은 미완료다. DenStream UI는 실제 CF class를 사용하되 유입 prefix 전체를 재계산한다. 순차3개는 ordered numeric batch이며 streamDataset 지원으로 세지 않는다.
