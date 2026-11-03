# 2차 알고리즘 확장 완료 — FPCM1997 · MPCKMeans2004

제품 커밋 [`0c3b2cb`](https://github.com/oyueo-mm/ClusterLab/commit/0c3b2cbb2ca41d957c66ac4de8c14659df3a22c2)의 [Actions/Pages](https://github.com/oyueo-mm/ClusterLab/actions/runs/41583432258) 검증·배포가 성공했다. [공개 사이트](https://oyueo-mm.github.io/ClusterLab/)에서 신규 실제 계산·가이드·추천·편집/복원·반응형을 확인했고, 공개 HTML이 참조하는 JS/CSS와 선택한 신규 엔진/Worker 청크의 SHA256이 로컬 빌드와 같다. [배포 명세](extension-57/release.json), [CI 로그 요약](extension-57/ci-summary.json).

| 구분 | 이전 | 현재 |
|---|---:|---:|
| 실행 엔진 | 55 | **57** |
| 추천 구성 | 220 | **228** |
| 미구현 후보 | 77 | **75** |
| 엄격 원문 완전 인증 | 0 | **0 (별도 기준)** |

기준 main은 d2dbf12/공개32dc4cf였다. FPCM 안정9d09be1 → MPCKMeans 안정8086104 → 최초 통합1eee4a1 → 표시 축 복원 수정/배포0c3b2cb 순서로 개발했다. FPCM의 수치·UI 세로 단위를 완료한 뒤 MPCKMeans 제품을 작성했다. 원래119후보의 번호·이름·순서를 유지하고22/25만 갱신했다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/c4d6a7d를 보존했다. main 강제 푸시는 하지 않았다.

## FPCM1997: 실제 범위와 원문 대조

원본 ND에서 J=Σ(U^m+T^η)D², U는 표본별 행 합1, T는 군집별 열 합1이다. 중심은 (U^m+T^η) 가중 원본 평균이다. 별도 실제 ND FCM 준비 계산을 사용하며 기존2D FCM은 변경하지 않았다. PCM1993의 독립 전형성·Ω 벌점이나 PFCM2005의 a/b 모형으로 바꿔 구현하지 않았다.

1997 DOI의 전체 본문 접근은 완료하지 못했다. 원저자2005 재서술 논문 인쇄522쪽 Eq15–18을 실제 렌더링해 대조했다. 영거리 해는 영거리 후보에만 균등 분배하고 다른 값은0, epsilon으로 바꾸지 않는다. 중심·가중치 계산은 로그 공간을 사용하고 표현 범위/중복 중심/중심 잔차를 공개한다. T는 소속 확률이 아니며 표본 복제 시1/r로 줄어든다. 이 정책·제약·초기화 차이는 [FPCM 계약](research/FPCM.md)에 있다.

실제 Trace는 초기화, ND FCM U/평균, 거리, U/T 갱신, 원본 중심 이동, 목적·잔차·종료를 담는다. 역진/임의 seek/checkpoint가 같은 상태를 복원한다. 분석은 U/T 원소·행/열 합·유효 가중치·원본 중심·진단을 제공한다. T 막대는 실제 [0,1] 값이며 보기 좋게 행 정규화하지 않는다. 가이드 미니는 같은 원본에서 실제 ND FCM 기준 U와 FPCM U/T, 별도 실제 PCM Worker T를 비교하고 실제 이벤트·입력·설정을 실험실로 전달한다.

전용 생성기4개는 분리/겹침/크기·밀도 차이/표본 복제 한계다. 추천120/120/120/24행, 시드42와 사용자 지정 생성 옵션을 지원한다. 기존 추천을 이름만 바꾸지 않았다.

## MPCKMeans2004: multiple diagonal 모델

원저자 [ICML2004 PDF](https://bilenko.com/papers/04-semi-icml.pdf)의 Eq4–8·Figure1·수렴 caveat를 렌더링해 대조했다. 군집마다 양수 대각 A_h를 학습한다. J는 원본 Mahalanobis 제곱거리−표본별 logdet A_h+거리 가중 ML/CL 유한 비용이다. ML 비용은 두 끝 metric 거리의½평균, CL 비용은 **현재 metric에서 전체 원본의 정확 최대 쌍거리−제약 쌍거리**다. 제약 위반 개수와 비용은 별개이며 최대쌍 CL 위반 비용은0일 수 있다.

일관된 ML 폐쇄·성분 간 CL 전파를 실제 목적/배정/metric 분모에 사용한다. 모든 무방향 쌍을 한 번만 센다. 감독 평균·size×최소거리 farthest-first/부족 시 시드 perturbation·시드 sweep 순서·현재 label 동률 유지·빈 군집 유지 정책을 명시했다. 평균 후 Eq8의 대각 a_hq=n_h/S_hq를 실제 갱신한다. N² 거리/폐쇄 배열을 만들지 않고 모든 원본 쌍/폐쇄 관계를 스트리밍한다. 같은 입력·같은 A의 정확 최대 결과만 캐시한다.

기본 α=0이다. 음수/비유한 분모는 명시적 갱신 실패이며 전역 불가능 증명으로 부르지 않는다. S≥0·일부0·trace(S)>0인 경우에만 선택 α·trace(S)I 조건화를 제공하며 원래 목적의 정확 stationary 갱신과 구분한다. 전체 동일점 trace0은 이 정책으로도 실패한다. 새 A에서 최대 witness·실제 J를 다시 구하고 목적 증가/witness 변경/조건화/수렴 종료 이유를 기록한다. 원문도 최대 witness 변경/conditioning에서 단조 수렴을 보장하지 않는다.

Full SPD·single metric·개별 관계 가중치·모순 soft 확장은 이번 범위 밖이다. [수학 계약·차이·재현](research/MPCKMEANS.md)을 따른다. 원저자 RISC 코드 안내는 HTTP200으로 읽었으나 WekaUT 아카이브 전송 지연으로 다운로드를 중지했고 저자 실행 비교·버전/라이선스를 검증했다고 세지 않았다. 외부 GPL/Weka 코드를 제품에 복사하지 않았다.

실제 Trace는 감독/초기화·전체 최대쌍 탐색 진행·실제 후보별 거리/−logdet/ML/CL·즉시 배정·원본 평균·Eq8 분모·대각 전후·최대 witness·목적·종료를 담는다. 최대 탐색 중 비용은 직전 완료 계산임을 명시하고 부분 최대를 새 목적에 쓰지 않는다. 타원은 선택 원본 두 축의 d²_A=1 대각 단면이다. 분석에는 전체 A/원본 중심/분모/최대쌍/비용/위반/진단과 실제 목적 곡선이 있다. 실제 PCK Worker 비교 미니는 같은 원본·제약·시드·w를 사용하되 두 목적의 숫자를 동일 척도로 비교하지 않는다.

자체 생성기4개는 이방성/4차원 단위 차이/거리-감독 충돌/상수축 조건화 한계다. 기존 constrained 추천 크기 정책에 따라120/120/120/24행이다. 생성기 자체 기본80/80/80/12와 추천 적용 수를 구분한다. 한계 추천은 α=1e-6을 명시하며0으로 바꾸면 strict 특이 오류를 확인할 수 있다.

## 독립 수치 검증

제품보다 먼저 독립 Python fixture를 작성·실행했다. NumPy2.5.4, SciPy1.18.1, Python3.12.10이며 두 라이브러리의 본체 라이선스는 BSD-3-Clause다. 실제 NumPy 배포판 METADATA는 `BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0`, SciPy는 본체3조항과 별도 번들 고지를 담고 있다. fixture의 짧은 license 문자열은 본체 요약이고 배포판 전체 고지와 구분한다. [실제 설치 메타데이터/해시](research/extension57-verifier-environment.json). 검산 도구로만 사용했고 제품 의존성/재배포 바이너리에 넣지 않았다. 제품 코드를 oracle에 import하거나 외부 구현 코드를 제품에 복사하지 않았다. R ppclust 실행은 미실시다.

FPCM은11개 전체 AO 사례와 손계산/표본 복제 블록이다. U/T·모든 평균/목적·고차원·중복·동일점·단일점·불균일 지수·시드137·한도·1e±100을 검산했다. 손계산 X=(0,1,4), 초기 C=(.5,3), m=η=2에서 T 열은 (49/99,49/99,1/99), (4/49,9/49,36/49)다. 갱신 직후 J=2.261496914065, 새 C=(.495645374793,3.901908087734), 평균 후 J=1.090819067499이다. [fixture](research/fpcm-reference.json), [독립 코드](../scripts/fpcm_reference.py).

MPCK은17사례(정상13/의도한 오류4), Floyd 폐쇄·전체 원본 전수 최대·직접 전체 목적·모든 후보 ΔJ/반복 label·중심·A·분모/목적을 비교했다.4행/K2의16개 배정 목적도 독립 열거했다. SciPy inverse/Cholesky와 NumPy slogdet를 실제 사용했고 전진·중앙 유한차분으로 S−n/A 기울기를 확인했다. 초기 최대 witness가 (1,2)에서 갱신 후(3,4)로 바뀌는 예제에서 이전 witness 미분0을 새 목적 미분0으로 속이지 않았다. [fixture/환경](research/mpck-reference.json), [독립 코드](../scripts/mpck_reference.py).

FPCM 전용17테스트·MPCK 전용22테스트가 모든 Trace stateAt/정역/checkpoint/native 결과, 표시 좌표와 원본 ND의 분리, 자원/수치 오류, 요약에서도 전체 입력 계산, 전용 추천 등을 단언한다. 기존 FCM/COP/PCK/PCM 계산은 변경하지 않았다.

## 성능 — Node와 실제 브라우저 구분

Windows/Node24.19.0/Core Ultra7 256V·seed42 단일 관측이다. 생성/투영/독립 재검산은 Node 엔진+Recorder 시간에서 제외한다.10,000 MPCK은1회 전체 반복이며 수렴 완료로 표시하지 않는다. 서로 다른 파라미터/반복이므로 두 알고리즘 속도 순위로 읽지 않는다.

| 엔진 | n/d/K | Node+Recorder ms | 이벤트 | 추정 Trace bytes |
|---|---|---:|---:|---:|
| FPCM |100/4/3|14.72|31|384984|
| FPCM |1000/4/3|34.08|23|2501074|
| FPCM |10000/4/3|179.88|23|4458948|
| MPCK |100/2/2|8.58|41|122222|
| MPCK |1000/2/2|54.71|181|764446|
| MPCK |10000/2/2·1sweep|858.93|77|1594978|

d/K/E 변화·정확한 파라미터·종료/목적/전체 최대 검산은 [FPCM Node](research/fpcm-performance.json)·[MPCK Node](research/mpck-performance.json)에 있다. 실제 빌드 Worker100/1000행,d4,K3의 FPCM 계산34.7/109.5ms(벽시간149.2/229.9ms), MPCK5.5/42.3ms(벽시간34.7/65.4ms)를 따로 기록했다.10만행·d4·K8은 실제 computing 진행 이후 각각405.8/182ms에 terminate했고250ms 동안 완료 응답이 없었다. [FPCM Worker](research/fpcm-browser-performance.json), [MPCK Worker](research/mpck-browser-performance.json).

로컬 및 공개 실제 UI100/1000행,d4,K2의2.2초 반복 Trace 재생을 별도로 측정했다. 로컬은 두 엔진 모두 약60FPS·p95 약16.7~16.8ms다. [FPCM 로컬 UI](extension-57/local-fpcm-rendering-performance.json), [MPCK 로컬 UI](extension-57/local-mpck-rendering-performance.json), [공개4실측](extension-57/public-rendering-performance.json). RAF 간격은 GPU 소요시간이 아니고 heap 차이는 peak가 아니다. 장시간/저사양/최대GPU메모리를 보장하지 않는다. 신규 전역 행 상한은 추가하지 않았고 기존64MiB Trace·256MiB 작업 예산을 유지했다.

## 기존 기능·전체 회귀·공개 검증

기존55엔진·32프리셋·홈 수학/데이터 소스67개의 LF 정규화 hash,220추천 객체·660개 생성(default/seed137/count19)은 기준 d2dbf12와 같다.119후보는22/25 이외 모두 같은 객체다. [보존 근거](extension-57/existing-preservation.json). 기존 캔버스 UI·독립 패널·설정 기본 닫힘·집중/전체화면·도감 더블클릭·Undo/Redo·원본 사용자 데이터·비교·Worker 취소를 유지했다.

로컬/CI 모두 TypeScript·ESLint·빌드·**Vitest741/741·50파일**, 전체 Chromium/mobile **138통과·14기존조건부생략·0실패/재시도**다. 로컬은 자원 경합을 줄여maxWorkers2, CI는 기존 기본 npm test로 통과했다.14생략은 이전55엔진 기준의 같은(file,title,project) 집합이며 늘리지 않았다. [로컬](extension-57/browser-local.json), [검사/최초 실패 기록](extension-57/local-checks.json), [CI](extension-57/ci-summary.json).

최초 FPCM 전체 기본 병렬 실행의 기존 그래프 성능 관측 하나가5초를 초과했다. 단언/시간 제한을 바꾸지 않고715개 전체를 두 작업자로 재실행해 통과했다. 통합 최초741개 중 새 도감 요약/교재 목적 문구 불일치1개도 기존 단언이 발견해 문구를 수정하고 같은741개를 모두 통과했다. 실패 기록을 숨기거나 기존 테스트를 삭제/생략하지 않았다.

최초 브라우저138통과 이후 추가 검토에서 MPCK의 ND 축3/4→2D 데이터 Undo 때 타원이 이전 축을 참조하는 오류를 발견했다. 같은 실제 시나리오에 모든 uncaught pageerror가0이어야 한다는 단언을 추가하자 오류1개가 재현됐다. 점·중심과 같은 축 범위로 타원을 clamp하고 같은 축일 때는2D단면을 그리지 않도록 고쳤다. [수정 전 실패](extension-57/axis-error-reproduction.json), [강화된 실험/미니16통과](extension-57/browser-axis-fixed.json). 이전41581911253 validate/deploy를 [취소](extension-57/ci-before-axis-fix.json)하고 수정본의741단위·전체138/14브라우저를 로컬과 새Actions에서 다시 통과시킨 뒤 배포했다. 수학 엔진 변경이나 단언 약화 없이 실제 렌더 오류를 고쳤다. 최초138은 [이전 기록](extension-57/browser-before-axis-fix.json)으로 구분한다.

공개에서는 **27통과·1기존 모바일 중복생략**으로57개 진입·홈·4엔진(PCK/PCM/FPCM/MPCK)의 실험/미니·원본 ND·편집/Undo/복원·설정변경·역진·실제 이벤트 전달을 확인했다. 별도로57개 실제 도감 Worker 클립/캐시/최대2Worker 검사가 Chromium/mobile **2/2** 통과했다. [공개 기능](extension-57/browser-public.json), [공개 미리보기](extension-57/browser-public-previews.json).

로컬/공개 각각 신규8추천×1440/390px=16개 실제 전체 입력 계산·되감기·FPCM U/T 제약·MPCK 양수 A/명시조건화가 통과했다.1920/1440/1024/768/390/320px×두 엔진 및리사이즈 무재계산/위치 유지14개도 각각 통과했다. [공개 추천16](extension-57/public-recommendation-browser.json), [공개6폭 좌표/스크린샷14](extension-57/public-layout/measurements.json). 공개 HTML/번들 및 신규 엔진/Worker 청크는 SHA256으로 로컬과 일치했다.

공개 보조 CLI의 최초 UI-ready5초 대기는 두 차례 초과했다.390px FPCM에서는 오류 알림 없이 실제 Trace가 곧 도착했고, 별도 관찰의 전체 준비/응답은 2657.8–5150.9ms, 순수 엔진은 16.7–26.2ms였다. validated→computing 사이의 동적 모듈 준비·전달/스케줄링 시간을 순수 군집화 시간으로 세지 않는다. [실패·단계별 관측](extension-57/public-startup-observations.json). 기본5초 UI 단언과 기존 회귀 제한을 변경하지 않았으며, 보조 도구의 명시적 `--observe-worker-startup` 모드에서 실제 원래 Worker 응답을 기존30초 프로토콜 범위로 관찰한 뒤 같은5초 UI 단언과 모든 수치/입력/되감기 단언을 실행했다. 추천16 결과는 이 관찰 모드이고5초 이내 cold-start 통과로 표시하지 않는다. 명령은 `node scripts/verify-extension-recommendations.mjs public docs/extension-57 'Fuzzy Possibilistic C-Means,MPCKMeans' --observe-worker-startup`이다. 이 모드는 웹 앱/계산 엔진을 바꾸지 않는다. 최종 보조 도구는 전체ESLint와 실제 공개 실행으로 검증했다.

## 미검증·후속 범위

1997 전체 원문 완전 인증, R ppclust/원저자 WekaUT 실행 비교, Full SPD/모순 soft/개별 가중치 확장, 실제 휴대전화 Safari/Firefox/WebKit 추가 회귀, 장시간 저사양/GPU peak 메모리는 이번 완료 범위가 아니다. 검증된 범위의 실행 엔진57개와 엄격 원문 완전 인증0개를 구분한다. 나머지75후보는 유지하며 후속 작업에서 별도 조사·독립 검산·세로 개발 단위로 진행한다. PFCM2005나 다른 신규 엔진을 이번 수에 중복 포함하지 않았다.
