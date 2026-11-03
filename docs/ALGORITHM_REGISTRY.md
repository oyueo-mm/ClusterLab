## 2차 확장 — 표시 축 복원 오류 수정, 강화한 전체 회귀 재실행

최초 로컬138통과/14기존생략 이후 추가 코드 검토에서 MPCK의 ND 축3/4 선택→2D 데이터Undo 때 타원이 이전 축을 참조하는 오류를 발견했다. 기존 시나리오에 pageerror 무발생 단언을 추가하자 실제 Cannot read properties of undefined 오류1개가 재현됐다. 원본 점/중심과 같은 범위로 타원 축을 clamp하고 같은 축이면2D단면을 그리지 않도록 수정했다. 계산 엔진은 그대로다. [재현1실패](extension-57/axis-error-reproduction.json), [수정후 실제 fuzzy16/16·모든브라우저오류0](extension-57/browser-axis-fixed.json).

같은 전체741/741·50파일·타입·ESLint·빌드도 통과했다. 기존14생략/시간 제한/단언을 줄이지 않고 브라우저 오류 단언을 강화했다. 다음은 수정 커밋main푸시(이전41581911253 배포를 concurrency로 중단)와 수정본 전체138/14 재검증·새Actions/Pages·공개검증이다. 현재 공개57개 완료로 선언하지 않는다. 소스57/추천228/미구현75/엄격인증0, 다른 작업트리c4d6a7d는 그대로다. 아래는 이전 기록이다.

## 2차 확장 — 57엔진 로컬 전체 회귀 완료, 배포·공개 검증 다음

FPCM1997 안정9d09be1 → MPCKMeans2004 대각 metric 안정8086104 순서로 구현했다. **57엔진·228추천·75미구현·엄격 인증0**이다. 전체 TypeScript/ESLint/빌드·Vitest741/741·50파일(동일 단언·maxWorkers2), Chromium/mobile **138통과·14기존조건부생략·0실패/재시도**를 확인했다. 생략14개는55엔진 공개 기준과 동일하다. 57개 실제 Worker 도감/57개 수학가이드·홈·기존편집/복원·신규실험/실제비교/되감기·모바일을 포함한다. 기존55 math·32프리셋·220추천660생성·67소스 및119후보 번호/이름/순서를 보존했고 후보22/25만 갱신했다.

[2차 전체보고](ALGORITHM_EXPANSION_2_REPORT.md), [로컬 전체 브라우저](extension-57/browser-local.json), [검사 결과](extension-57/local-checks.json), [FPCM](research/FPCM.md), [MPCKMeans](research/MPCKMEANS.md), `docs/extension-57/`의 독립검산/실측 근거를 따른다. 두 신규4추천·실제 Trace/분석/가이드·Worker100/1000/10만취소·UI100/1000재생 약60FPS를 확인했다. 아직 공개는55개이며, 다음은 main 푸시→Actions/Pages 성공→공개57개·신규실험/비교·8추천/반응형·번들해시 확인이다. 다른 sequential 작업 트리는c4d6a7d 그대로다. 아래는 과거 기록이다.

## 2차 확장 — 두 세로 단위 로컬 완료, 통합·공개 검증 진행

FPCM 안정 커밋9d09be1 이후 MPCKMeans2004 multiple diagonal을 순차 구현했다. 소스57엔진·228추천·75미구현·엄격 인증0, 공개는 아직55개다. 원본 ND·정확 전체 최대쌍·거리−logdet·ML/CL 비용·Eq8 양수 대각 학습·명시 특이 처리·실제 Trace/역진·타원·전용분석·4전용추천·수학가이드/실제PCK비교를 연결했다. 독립 NumPy/SciPy17fixture(정상13/오류4), 모든 반복/후보ΔJ·16개배정목적·유한차분, 전용22테스트·전체741/741·50파일·타입·ESLint·빌드가 통과했다. 최초 전체는 신규 도감/교재 요약 불일치1개를 발견해 문구를 맞췄고 같은 전체를 재실행해 통과했다. 단언/시간 제한/기존 생략을 바꾸지 않았다.

MPCK Chromium/mobile4/4, 실제Worker100/1000·10만행computing이후취소, Node100/1000/10000(1sweep), 실제UI100/1000 약60FPS를 기록했다. 기존55엔진/220추천660생성/67원본math·data·home소스 보존 검증도 통과했다. [전체2차기록](ALGORITHM_EXPANSION_2_REPORT.md), [MPCK계약](research/MPCKMEANS.md), [FPCM계약](research/FPCM.md), `docs/extension-57/`를 따른다. 다음은 전체 Playwright152개 예상(기존14조건부생략 유지)·main커밋/푸시·Actions/Pages·공개검증이다. 공개 배포 완료로 선언하지 않는다. 다른 `.local/sequential-worktree`·feat/sequential-clustering·c4d6a7d는 보존한다. 아래는 과거 체크포인트다.

## 2차 확장 — FPCM 로컬 세로 단위 완료, MPCKMeans 다음

기준 d2dbf12에서 FPCM1997을 실제 원본 ND·U행/T열 정규화·실제 중심·Trace/역진·전용U/T막대/행렬·4추천·가이드/실제 FCM·PCM 비교·독립 NumPy11AO/손계산/복제 검산으로 완성했다. 현재소스56엔진·224추천·76미구현·엄격 인증0, 공개는55개32dc4cf 그대로다. 전체715/715·49파일은 `npm test -- --maxWorkers=2`로 통과했다. 초기 기본 병렬에서는 기존 graph-followup 성능 관측1개가5초를 넘었으며 단언/시간 제한을 바꾸지 않았다. 타입·ESLint·빌드, 신규/기존 fuzzy 실험·미니12/12와 전체56교재/실제도감4/4가 통과했다.

Node100/1000/10000·d/K변화, 실제Worker100/1000/10만행취소, UI100/1000행2.2초 반복재생 약60FPS를 측정했다. 기존220추천/660생성·67math/data/home소스는 d2dbf12와 동일하다. [2차 기록](ALGORITHM_EXPANSION_2_REPORT.md), [FPCM 계약](research/FPCM.md), `docs/extension-57/`의 실제 근거를 따른다. 원문 전체/R실행/실물휴대전화/최대GPU메모리는 미검증이다.

이 안정 체크포인트 이후 MPCKMeans2004 대각 metric을 순차 개발한다. 먼저 원문 Eq4–8과 최대쌍·logdet·제약 계약을 확정하고 독립 NumPy/SciPy/유한차분을 작성한다. MPCK 제품/fixture는 아직 미작성이다. Full SPD/PFCM2005/Constrained Spectral/다른신규엔진/UI재설계/영어지원은 제외한다. 완료 후57엔진·228추천·75미구현·전체회귀·Actions/Pages/공개 검증까지 이어간다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/c4d6a7d와 기존 서버를 보존했다. 이번 preview4476은 session75894다. 아래는 과거 체크포인트다.

## 2026-11-03 1차 확장 — 55개 엔진 공개 배포·최종 검증 완료

제품 main `32dc4cfa634bc181f27f408ff49dc48d81d014a0`의 [Actions/Pages](https://github.com/oyueo-mm/ClusterLab/actions/runs/41513054284) validate·deploy가 성공했다. **55엔진·220추천·77미구현·엄격 원문 완전 인증0**이다. 로컬과 원격 모두 타입·ESLint·빌드·Vitest694/694·48파일, 전체 Chromium/mobile130통과/14기존조건부생략/0실패다. 공개 사이트19통과/1기존중복생략, 신규8추천×2화면16계산/되감기,6폭×2엔진·표본 클릭·리사이즈 무재계산15검사를 확인했다. 공개 HTML/JS/CSS 해시도 로컬 빌드와 동일하다.

PCK `bed5b79` → PCM `98b77b3` → 기존 구조형 기본값 복원 `daa6b2e` → 교재/추천 검증 `926b14e` → 통합·실측 `32dc4cf` 순서로 개발했다. [최종 확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md), [배포 명세](extension-55/release.json), [로컬 전체](extension-55/browser-local.json), [공개](extension-55/browser-public.json), [CI](extension-55/ci-summary.json)를 따른다. 아래 검증 중/54개/53개 표기는 과거 기록이다.

원본 ND·유한 제약 비용 PCK와1993 고정 척도·비정규화 전형성 PCM을 실제 Trace·분석·추천·가이드/미니·독립 NumPy와 연결했다. 기존53엔진 수학 소스·32프리셋·홈,212추천/생성636건,119후보 이름/순서를 보존했다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/`c4d6a7d`를 보존했다. R ppclust 실행·1993 원문 전체 인증·실물 휴대전화·최대 GPU/Worker 메모리는 미검증이다. 후속 FPCM·MPCKMeans 등77후보는 별도 미완료이며 이번 세션에서 추가하지 않는다.

## 최신 체크포인트 — 55개 로컬 통합 검증 완료, 공개 배포 다음

PCK `bed5b79` → PCM `98b77b3` → 기존 구조형 기본값 복원 `daa6b2e` → 전체 교재/추천 UI 검증 `926b14e` 순서로 커밋했다. 현재55엔진·220추천·77미구현·엄격 원문 완전 인증0. 전체 Vitest694/694·48파일, 타입·ESLint·빌드, 전체 Chromium/mobile130통과/14기존생략/0실패·재시도를 확인했다. 생략14개는 이전 실행과 동일하다. 신규8추천의 실제 UI16검사,6폭×2엔진/표본클릭/리사이즈 무재계산15검사도 통과했다.

실제 Worker의100/1000행 출력과 취소, 기본 UI재생 입력 크기를 구분해 최종 실측했다. [확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md)와 `extension-55/browser-local.json`, `research/*-final-browser-performance.json`을 따른다. 기존53엔진·프리셋/홈 관련63소스,212추천/생성636건,119후보 이름/순서를 보존했다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/`c4d6a7d`를 보존했다.

다음은 검증된 main 커밋 푸시, GitHub Actions/Pages 완료 확인, 공개 신규 실험/미니·전체55개 진입·홈·추천/되감기·반응형 확인이다. 현재 공개 배포 완료로 선언하지 않는다. 아래는 과거 체크포인트다.

## 2026-11-03 PCKMeans·PCM 확장 — 로컬 55개 통합 검증 중

PCKMeans 안정 커밋 `bed5b79` 이후 PCM을 순차 구현했다. 실행 엔진 **55개**, 기존119후보 중42개 연결·**77개 미구현**, 추천 **220구성**(기존212+각4), 엄격 원문 완전 인증 **0개**다. 기존53개 엔진 수학 로직과32프리셋을 보존한다. [이번 확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md)와 [PCKMeans](research/PCKMEANS.md)·[PCM](research/PCM.md)의 범위·수치 정책을 우선한다.

PCM은 원본 전체 ND에서 별도 FCM 초기화·양수 고정 Ω·1993 목적·독립 전형성·로그 가중 평균을 실제 계산한다. NumPy 직접 거듭제곱 oracle14사례(13성공/영분산 자동척도 오류1), 수식 손계산과 전체 중간 AO·최종 결과·Trace 역진/seek를 검산했다. R ppclust 실행 비교와1993 원문 전체 인증은 하지 않았다. 2005 원저자 재서술의 식과 공식 매뉴얼을 대조했으며 제품에 라이브러리 소스를 복사하지 않았다.

현재 전체 Vitest **694/694·48파일**, 타입·ESLint·빌드 통과. 기존212추천 및 생성636건은 `f615923`과 동일하다. Node PCM100/1000/10000행(d4,K3) 실제 계산+Recorder13.37/46.32/193.98ms, Trace46이벤트·347256/2674654/4662828추정바이트를 관측했다(단일 실행, Worker/렌더 제외). 전체 브라우저·Actions·공개 배포는 아직 검증 중이다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/`c4d6a7d`를 보존한다. 아래 과거 체크포인트는 당시 결과다.

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
| 21 | Possibilistic C-Means | 독립 알고리즘 · 1993 고정 척도형 | numeric 원본 ND | Possibilistic C-Means | 제한 범위 구현·독립 NumPy·Trace·브라우저 검증, 완전 인증 아님 |
| 22 | Fuzzy Possibilistic C-Means | FPCM1997 | numeric ND | Fuzzy Possibilistic C-Means | independent NumPy / Trace / browser verified, restricted scope |
|   23 | COP-KMeans                       | variant                                                  | constrained         | COP-KMeans                | 독립 수치·Trace·로컬 브라우저 검증 완료 (제한 범위)                                          |
| 24 | PCKMeans | 독립 알고리즘 | constrained 원본 ND | PCKMeans | 일관 관계·균일 유한 벌점의 제한 범위, 독립 수치·브라우저 검증; 완전 인증 아님 |
| 25 | MPCKMeans | ICML2004 multiple diagonal | constrained ND | MPCKMeans | 독립 NumPy/SciPy·Trace·브라우저 검증, 제한 범위 |
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
