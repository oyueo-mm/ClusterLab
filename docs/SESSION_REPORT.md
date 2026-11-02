## 2026-11-03 홈 타이포그래피·설정 패널 개선 — 공개 배포 완료

제품 `96d9bab381065e2452584acb70ca629bd69d2ab8`. [Actions41472349888](https://github.com/oyueo-mm/ClusterLab/actions/runs/41472349888) validate/Pages 성공. 로컬·원격 타입/ESLint/빌드 및 Vitest **651/651·46파일**, 최종 전체 Chromium/mobile 각각 **122통과·14조건부 생략·0실패**다. 최초 모바일 패널 겹침1건을 경계 ResizeObserver 보완으로 해결했고 최초/표적/최종 전체 실행을 구분해 보존했다.

홈은 큰 `ClusterLab`과 정확한 `인터랙티브 군집화 알고리즘 백과사전`으로 정리했다. 영문 소개·슬로건·설명·사이드바 소개 카드를 제거했다. 1440px 제목86.4px/보조27.36px, 390px 54.6px/21.84px이다. 기존 버튼3개·실제 Trace 데모4개·자동 순환을 유지했다. 두 실험실은 저장값이 없을 때 오른쪽 설정 패널이 닫히며 기존 저장 설정·폭·집중 모드·Trace를 보존한다.

공개 1920/1440/1024/768/390/320px의 홈·두 실험실18화면에서 오류/가로 넘침0, 데스크톱/mobile 공개 동작8/8 통과. 공개 JS/CSS 해시는 로컬 제품 빌드와 같다. 소스4파일만 변경했고 엔진·데이터·애니메이션·편집·홈 데모199파일의 Git blob과 별도 알고리즘 작업 트리를 보존했다. [최종 보고서](HOME_POLISH_REPORT.md), [배포 명세](home-polish/release.json)를 기준으로 사용한다. 이번 개선은 완료했으며 미구현79개 후보 등 기존 알고리즘 마스터 기록은 유지한다. 실제 휴대전화 하드웨어는 미검증이다.

## 2026-11-02 캔버스 중심 실험실 — 공개 배포 완료

제품 소스 `ae1c2cceae92fe64a75deab7165c02d3b7886ec8`. [Actions41444492938](https://github.com/oyueo-mm/ClusterLab/actions/runs/41444492938)의 validate125274337280/Pages deploy125283077444가 모두 성공했다. 원격 타입·ESLint·빌드·Vitest **651/651·46파일**, 전체 Chromium/mobile **118통과/14조건부 생략/0실패**다. Firefox/WebKit 별도28통과/2중복생략, 최종 세 브라우저 작업 공간12/12통과를 서로 다른 실행으로 기록한다.

[공개 사이트](https://oyueo-mm.github.io/ClusterLab/)의 7개 폭×3모드21구성, 주요 시각화22조합, 상호작용5개를 확인했다. 브라우저 오류0이며 실제 계산·되감기·패널·집중 모드·검색·도감 더블클릭을 확인했다. 1440×900 캔버스829×570→1066×711.2(+60.4%), 집중 모드 화면 면적79.0%. 최종 로컬 드래그DPR1/2 약60FPS, 공개58.8/60.0FPS, Worker요청1→1이다. [전체 보고서](CANVAS_WORKSPACE_REPORT.md), [배포 명세](workspace/release.json), [공개 측정](workspace/public/measurements.json)을 최종 근거로 사용한다.

이번 실험실 UI 개편은 완료했다. 기존198개 계산·데이터·이력·애니메이션 파일,53개 엔진/212추천/32프리셋, 홈·도감·비교·가이드를 보존했다. 영어 지원/새 알고리즘은 진행하지 않았다. 실제 휴대전화 하드웨어와 Worker/GPU 최대 메모리는 미측정이며, 전체 알고리즘 마스터의79후보는 별도 미완료다. 문서/테스트 대기 보완 후속은 제품 코드를 변경하지 않으며 `[skip ci]`로 기록한다. 다른 작업 트리/프로젝트 서버를 보존했다.

# 통합 세션 보고서 — 53개 소스 개발 단위

## UI·데이터셋 개편 최종 확정 — 2026-11-02

**공개 배포 완료.** 제품 main `c51ea16a3993a5d0892f037592902ff49cd89ae0`, [Actions41328815303](https://github.com/oyueo-mm/ClusterLab/actions/runs/41328815303)의 validate124914359131/Pages deploy124918641408 성공. 타입·ESLint·빌드·단위592/592(43파일), 전체 Chromium/mobile **105통과/13조건부 생략/0실패**. 생략은 기존 환경별 조건과 중복 화면 행렬이며 수치 단언을 약화하지 않았다. 최종 로컬 보완은 Chromium/mobile/Firefox/WebKit45통과/3중복생략이다. 그 이전 cross52/2와 실행 범위를 구분한다.

[공개 사이트](https://oyueo-mm.github.io/ClusterLab/)에서1440/390px를 새 컨텍스트로 검사했다. 홈4개 실제 Worker 데모·대표6개 실제 엔진 미리보기·도감132개·DBSCAN 기본 초승달 및359개 타임라인/한 단계 되감기·Louvain 원본graph24노드49간선/31이벤트가 정상이며 pageerror와 가로 넘침이 없었다. 공개6화면을 저장하고 데스크톱 홈·모바일 홈/실험실을 직접 확인했다. VizLab 공개1440/390px와 정보 구조도 비교했다. [배포 명세](ui-datasets/release.json), [CI 전체 로그](ui-datasets/ci-final.log), [공개 실행](ui-datasets/public-verification.json), [디자인 검토](UI_DESIGN_REVIEW.md)를 참조한다. 홈은 캔버스 리사이즈가 발생하는 full-page 캡처 대신 실제 viewport를 촬영했다.

이번 UI·추천 시스템 범위는 완료했다. 53/53엔진에 기본1·추가2·한계1, 총212추천 구성. 32프리셋·기존 계산/데이터/홈/이력142파일을 그대로 보존했다. 신규 엔진은 추천 매핑·교재 메타데이터 검사를 통과해야 한다. 사용자 편집/가져오기/명시적 추천은 자동 초기 데이터보다 우선하며 IndexedDB 이전/차단/복원/Undo/Redo를 검사했다. 실제 기기 미검사, 초기약516kB/교재약594kB 청크 경고와 App의 고급 편집 UI 추가 분리 여지는 남는다. 마스터119후보 중79미구현·엄격 인증0은 바꾸지 않았다.

커밋: 데이터27c8f38 → UI ed67773 → 소유 데이터/기본 추천 보완c51ea16. 원격 PR 생성은 연결 권한403으로 불가하여 사용자 승인 범위 안에서 main을 fast-forward/push했다. 강제 push나 기존 작업 트리 변경은 없었다. 아래 “진행 중” 및 이전 제품 확정은 각각 당시 이력이며 이 최상단 결과가 우선한다. 후속 증거 커밋은 제품 소스를 변경하지 않는다.

## 최신 재개 상태 — 2026-11-02

제품 소스 main **c51ea16**까지 push했다(데이터27c8f38, UI ed67773, 소유 데이터 보존/기본 추천 c51ea16). 첫 원격41325473043은 브라우저96통과/13생략/1실패로 배포하지 않았다. 모바일 홈 데모 영역을 화면에 놓도록 검사를 보완했다. 최종 로컬 상태·셸·품질 **45통과/3중복생략**, 단위592/592, 타입/ESLint/build 및 원본142/142 보존을 확인했다.

새 원격 [Actions41328815303](https://github.com/oyueo-mm/ClusterLab/actions/runs/41328815303)의 ESLint·타입·단위·빌드가 통과했고 전체 브라우저 검사 진행 중이다. 완료 후 Pages와 공개 desktop/mobile 검사 및 최종 증거 커밋을 이어간다. 이 절은 아직 공개 배포 성공 확정이 아니다. 실제 기기 미검사와 번들 경고는 UI_DESIGN_REVIEW에 기록했다. 후보79개/엄격 인증0을 유지한다.

## 최신 세션: VizLab UI·데이터셋 개편 진행 중 — 2026-11-01

이 절과 [UI_DATASET_PLAN](UI_DATASET_PLAN.md)이 이번 작업의 최신 상태다. 아래의 fc5cc15 공개 검증은 **이전 53개 엔진 릴리스**이며 이번 UI 개편의 배포 증거로 사용하지 않는다.

원격 main과 동일한 clean c4d6a7d에서 독립 브랜치를 생성했다. 기존 `.local/sequential-worktree`와 사용자 VizLab 트리는 손대지 않았다. 최신 VizLab7131ea9 사본은 `.local/vizlab-reference`에 보관했다. 홈/Sidebar/router/Catalog/추천/미리보기/교재 통합/패널/IndexedDB/원본 비교가 변경 영역이다. 실제 엔진 파일과 32프리셋 생성기는 수정하지 않았다.

추천 **53/53**에 기본1·추가2·한계1이 있다. 2026-11-02 기준 단위592/592·43파일과 type/lint/build가 통과했다. 데이터 시스템 안정 커밋27c8f38. 첫 전체100개66통과/22실패/12생략 후 실패를 보완해 후속 검사에서 해결했다. Firefox/WebKit52통과/2중복행렬생략, 마지막 네 구성 상태21통과/3중복행렬생략. 상세 실행별 결과는 CONTINUE와 ui-datasets 원자료를 따른다. 단일 최종 원격 전체 회귀/공개 배포는 아직 미확정이며 UI 통합 커밋과 Actions/Pages 검증을 이어간다.

> 최종 공개 체크포인트:53개(기존13+후보40), 미구현79개, 완전 인증0. 제품main fc5cc15·Actions41305149245 validate/Pages 성공. 원격532/39파일·전체브라우저78통과/12기존생략, 로컬 다섯 spec cross38/38, 공개4브라우저8/8. 아래 중간 기록보다 SESSION_REPORT 마지막 확정 절을 우선한다.

전체 마스터 목표는 미완료다. 현재 source53개=기존13+후보40,119후보 중79개는 미구현, 엄격한 완전 인증0개다. 최종 Git/CI/Pages는 이 파일 마지막 확정 절을 우선한다. 안정50개 제품da10d21/문서d6e4e0d의 성공 기록은 sessions/platform50에 원문 보존했다.

## 개발 개요·분류·119개 상태

이번 실제 추가는 BSAS108, MBSAS109, TTSAS110이다. BSAS는 원본 순서/이동 평균 대표의 순차 알고리즘, MBSAS/TTSAS는 실제 pass·유보·대표 갱신 규칙이 다른 주요 변형이다. 같은 K-Means를 이름만 바꾼 세 엔진이 아니다. 119개별 번호·이름·입력·분류·실제 모듈·진행 상태는 ALGORITHM_REGISTRY/candidates.json을 따른다. 기존13과 신규40을 중복 집계하지 않고 SOM/LVQ/NG/GNG는 관련 학습법으로 구분한다.

## 아키텍처·기존 보존·입력

lazy registry/스키마·동기 검증 API·원본 Dataset Worker·실제 terminate 취소·cache/generation 보호를 유지했다. 제품 경로에 정적 전체 엔진 import를 넣지 않았다. 새로운 제품 의존성을 추가하지 않았다. 기존13 모듈·32프리셋·홈13종/11순환·v03/v04·패키지/워크플로 보존과 실제 회귀를 검사한다.

새 순차 방법은 ordered numeric batch다. 원본 순서·모든 ND를 사용하며 표시2D/정답label/seed에 의존하지 않는다. 별도 streamDataset/무한 증분 세션 지원으로 세지 않는다. 기존8개 원본 유형과 실제 제약/이산 count/가중 그래프·행렬/시간축 처리를 보존한다. JSON 편집으로 원본 순서와 값을 실제 바꾸며 최대100 delta Undo/Redo를 유지한다.

600개 및 새 전역 데이터 개수 상한은 없다. BSAS/MBSAS의 q는 모형의 최대 군집 수이고 q>n도 유효하다. TTSAS는q를 사용하지 않는다. 실제 ND/K/출력·작업/Trace 바이트 정책을 검사하며 전체 계산과 표시 창·기록 요약을 구분한다. 수치·자원 오류를 빈 성공으로 감추지 않는다.

## 실제 계산·Trace·시각화·교재

BSAS는 한 pass에서 배정 즉시 평균을 갱신한다. MBSAS는 첫 pass seed만 선택하고 다른 행은 유보, 둘째 pass에서 유보 행만 원래 순서로 배정·평균 갱신한다. TTSAS는 하한 포함/상한 초과/중간 유보를 실제 계산하고 재방문한다. 직전 pass의 진전이 없으면 다음 첫 pending으로 새 대표를 만든다. 각 원본/후보 거리·대표 생성/이동·배정/유보·pass·완료를 실제 순서로 기록한다.

평균은 anchor 상대 갱신, 진단 SSE는 실제 배정 집합의 증분 오차다. counts/prototypeCounts는 현재 단위 가중치 정책에서 같은 실제 배정 수이며 유보를 세지 않는다. −1은 미처리이고 통계적 noise가 아니다. 완료를 Lloyd 고정점·전역 최적이라고 부르지 않는다.

sourceValues 최초 불변 clone 공유·analysis/label delta·48checkpoint·전후/임의 탐색을 유지했다. 큰 입력은 실제 첫/2의 거듭제곱 단계·최종 요약이며 원본 계산을 표본화하지 않는다. 전용 ND 대표·원본 순서·실제 거리/두 경계·실제 판단/회차·수치 표를 제공한다. 위치만 보간하고 수치/분기는 실제 상태이며 reduced-motion을 따른다.

거리 막대는 판단 전 후보 거리이고 assign의 대표는 갱신 후다. 이 차이를 UI와 교재에 명시한다. SVG는 비율을 먼저 계산하여 유효한1e308 거리의 불필요한 곱셈 overflow를 막았다. 현재/다음 대표의 위치 보간을 계산 중간 상태로 오인시키지 않는다.

native sequential-partition은 method/labels/centroids/counts/prototypeCounts/passes/unassigned/완료/assignedSSE다. computedRows/sourceDimensions는 실제 전체 원본이다. 도감 검색/검증 필터·원본 실험실·알고리즘별 파라미터·수식/유도/손계산/한계·실제 Worker mini·이벤트 전달을 함께 연결했다. 입력이 다른 비교를 억지로 실행하지 않는다.

## 단위·독립 레퍼런스

타입·ESLint·build와 전체 Vitest532/532·39파일이 통과했다. 첫 전체529성공/교재 최소절차3실패는 실제 완료 확인 단계를 보완한 후 통과했다. 원자료 unit-first와unit-final을 구분한다. 수학 oracle 실패라고 하지 않는다.

새 수치/상태13개와 공개 lazy/native/스키마4개가 포함된다. 다른 기존 동적 알고리즘/가이드 검사도53개로 확장된다. 공식 PyClustering0.10.1.2(ccore=False·명시적 Euclidean), NumPy2.5.4로60원본의180결과를 실제 재생성했다. 각 모듈 SHA·실제 labels/means/counts·독립 NumPy SSE를 fixture에 보존한다. 180fixture를180개의 Vitest 함수로 합산하지 않는다.

원서 Pattern Recognition(2009) 전체 열람·최초 논문 전수 확인은 미완료다. 공식 문서0.10.1과 실행0.10.1.2, Manhattan prose/실제 Euclidean, TTSAS strict prose/실제 하한 포함을 구분했다. 검증 라이브러리의 BSD-3-Clause를 확인했고 외부 구현·런타임을 제품에 복사하지 않았다. JOSS2019는 라이브러리 논문이며 BSAS의 최초 논문으로 세지 않는다.

## 브라우저·기존 회귀·성능

전체 Chromium/mobile78성공·12기존 조건부 생략·0실패다. 홈 자동 순환/GMM·기존13 Worker·입출력/편집/Undo/Redo/제스처/비교·53개 교재·raw 원본을 포함한다. 신규 순차4/4는 실제3 Worker·숨은ND·입력 순서·MBSAS2pass/TTSAS유보·전후/표시변경 불변·native 전체 원본·1001행·7폭·mini의 원본/변경 파라미터/선택사건 전달을 확인한다. 후속4/4는 같은 구성의 재검사이고1↔1e308 그래프 배율 불변을 추가했다. 중복 합산하지 않는다.

Firefox/WebKit은 다섯 플랫폼 spec38/38이다. 모든 legacy 편집/홈 테스트의 cross 검증으로 확대하지 않는다. 실제 raw JSON/log와 화면 증거는 platform53에 보존한다. 초기/수정 후·로컬/원격·전체/부분 결과를 구분한다.

Node24/Windows x64의100/1000/10000/100000 원본·3차원·두 분리 군집에서 각3방법을 전체 처리했다. 입력식·임계값/q·장치·회차/K·이벤트/Trace bytes·시간/heap delta는 sequential-performance.json이다. 생성/Worker/Canvas/FPS/취소 지연/장시간 peak는 제외한다. TTSAS 한 pass인 쉬운 사례를 다회 재검사 최악 성능으로 일반화하지 않는다. heap delta는 peak가 아니며 GC로 음수가 될 수 있다.

## 파일·커밋·배포·남은 범위

주요 파일은 sequentialCommon/bsas/mbsas/ttsas, sequentialTypes/Details, native datasetExecution·registry/params/resources/types, SequentialAnalysis/CSS, 순차 교재·독립 Python/fixture·수치/통합/브라우저 검사다. 전체 수정은 git show --stat를 따른다. 안정 단위로 커밋하고 main은 검증 후 fast-forward하며 강제 푸시/히스토리 재작성을 하지 않는다. 현재 새53개 CI/Pages는 아직 미확정이다. 당시50개 배포 성공을53개 성공으로 전용하지 않는다.

후보79개·119개 전수 원문 조사·완전 마스터 검수, typed 비교/지표·3D/PCA·시각 그래프/행열/시간 편집·청크/transferable·적응 Worker pool/계산 pause·무한 스트림·더 큰/장시간 peak/FPS가 남아 있다. 다음 연구 큐와 CONTINUE를 읽고 현재3개를 중복 구현하지 않는다. 새 실행 수53을 완전 인증 수로 표시하지 않는다.

## 안정50개 main 병합과 최종 로컬 확인

순차 소스 체크포인트는297eb31이다. main d6e4e0d를 히스토리 재작성 없이 병합했다. 소스 충돌은 없었고 현재 문서11개는53개 내용을 유지했다. 50개 원문은 이미 정확한 Git 객체로 sessions/platform50에 보존했으며, 원래 main의 CI/공개 증거와 COP 고유성 단언도 함께 보존했다.

병합 후 lint/build(타입 포함)·전체532/39파일과 실제 순차 Chromium/mobile4/4가 다시 통과했다. 이4개는 전체78개 중 같은 구성의 재검사다. 후보 거리의 실제 계산값과 assign 전후 상태를 추가 감사했고, 유효한1e308 배율에서도 유한한 동일 그래프 폭을 확인했다. 실제 TTSAS pass2 유보 화면(desktop/mobile PNG)을 보존하고 desktop을 직접 확인했다. 거리0.6, 하한0.4, 상한1, 실제 미배정1행의 상태다. 아직 새53개 원격/공개 결과로 표시하지 않는다.

## 최종53개 공개 배포 확정 — 2026-11-01

최종 제품 소스 **fc5cc155cae4904c72d7166a0e7dce57745a71f3**, main. 코드 체크포인트297eb31에 안정50개 main d6e4e0d를 병합했다. [Actions41305149245](https://github.com/oyueo-mm/ClusterLab/actions/runs/41305149245)의 Ubuntu/Node22 validate(job124843923836)와 Pages deploy(job124847332976)가 모두 성공했다. 원격 lint/type/build·전체 **532/532·39파일**, 한 번의 전체 Chromium/mobile **78통과·12기존 조건부 생략·0실패**가 확정됐다. 테스트 개수가 모든 입력/장치의 정확성·성능을 보장하는 것은 아니다.

공개 https://oyueo-mm.github.io/ClusterLab/ 에서 새 순차3개의 실제 ND Worker·원본 순서·실제 유보/pass·역재생·native전체 원본·1001행/7폭·유효한1e308 거리 그래프·mini 원본/변경 파라미터/선택사건 전달을 확인했다. Chromium/mobile4/4, Firefox/WebKit4/4로 **공개8구성 모두 통과**했다. 실제 공개 TTSAS 유보 장면의 desktop/mobile PNG도 보존했다. 이는 최신 공개사이트의 모든 legacy 테스트를 실행한 결과가 아니다. 최신 전체 회귀는 위 원격78개, 로컬 다섯 spec cross는38개, 직전50개 소스의 공개20개 검사는 archive 기록으로 각각 구분한다.

원자료 ci-validation.log/json, deployment.json, browser-public*.json/log와 공개 PNG는 platform53에 있다. root에서도 기존 .local 검증 환경 경로를 명시해 공식180결과를 다시 생성했고 fixture가 동일함을 확인했다(reference-root.log). 기존13·프리셋/홈/디자인/워크플로/의존성20파일의 Git clean-filter blob은4ac46eb와 동일하다. 최종 source/runtime/test/의존성은 이 원격 검증 커밋 이후 바꾸지 않는다.

현재 **53개 실행 경로 = 기존13 + 후보40**,119후보 중 **79개 미구현**, 엄격한 마스터 완전 인증0개다. 전체 목표는 미완료다. PCK/PCM/FPCM/MPCK/Constrained Spectral·Leader 등 다음 작업과 전체 후보를 CONTINUE/REGISTRY/RESEARCH_QUEUE에 남겼다. 후속 저자2005 수식의 직접 페이지 확인·독립 양의 거리 블록 검산은 FUZZY_FORMULAS에 별도 연구로 보존했다. PCM/FPCM 제품 엔진·R 비교·원전 전체 확인 완료로 집계하지 않는다.

후속 문서·연구 기록 전용 [skip ci] 커밋은 제품 코드/테스트/의존성을 바꾸지 않는다. 최종 문서 SHA는 git log를 따른다. main과 feat/sequential-clustering을 같은 검증 체크포인트로 유지하며 강제 푸시/히스토리 재작성은 하지 않는다.

작업용 preview4373과 프로젝트 경로/Vite/포트4273이 모두 확인된 자체 preview를 종료했다. 타 프로젝트4173은 건드리지 않았고, 작업 트리와 검증 환경·증거는 그대로 보존했다. 원격 검증 제품 이후 runtime/test/의존성 diff가 없음을 확인했으며 이후 커밋은 문서·검증 증거·후속 연구 기록만 포함한다.
