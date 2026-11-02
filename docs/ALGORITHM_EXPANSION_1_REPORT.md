# PCKMeans·Possibilistic C-Means 1차 확장 완료 보고서

**55개 실행 엔진·220개 추천 구성·77개 미구현 후보**다. 엄격한 원문 완전 인증은 별도 **0개**다. 기준 main `f615923`의 기존53개를 보존하고 두 알고리즘을 순차 개발했다. 제품 커밋 [`32dc4cf`](https://github.com/oyueo-mm/ClusterLab/commit/32dc4cfa634bc181f27f408ff49dc48d81d014a0)의 [Actions/Pages](https://github.com/oyueo-mm/ClusterLab/actions/runs/41513054284)가 성공했고 [공개 사이트](https://oyueo-mm.github.io/ClusterLab/)를 확인했다. 전체 마스터 완료를 주장하지 않는다.

## 1. PCKMeans의 수학과 범위

원본 전체 ND에서 `J=SSE+w·ML위반수+w·CL위반수`를 실제 최적화한다. 일관된 무가중 입력과 전역 균일 유한 w를 지원한다. ML 연결 성분 폐쇄와 성분 간 CL 전파를 정확한 희소 histogram으로 계산하며 무방향/유도 중복을 한 번만 센다. 각 표본의 모든 후보 거리·두 벌점을 비교하고 live-label 순차 배정과 전체 평균을 수행한다. ML 성분을 hard superpoint로 축약하지 않는다. 유한 비용 위반은 정상 결과이며 COP 배정 함수를 호출하지 않는다.

SDM2004의 `½SSE+w_p`와 제품의 요청 규약 `SSE+w`는 **w=2w_p**일 때 같은 문제다. 감독 이웃 평균 초기화, 부족한 중심의 전체 평균 ±5% perturbation, 시드 sweep, 최초 최근접 label, 동률 현재 label 유지, 빈 중심 유지, 허용오차를 명시한다. active querying·모순 soft 감독·관계별 가중치·MPCK 학습은 지원하지 않는다. 원논문 전체 인증이나 전역 최소 보장을 주장하지 않는다. [원문 Figure1 대조·수식·정책](research/PCKMEANS.md), [원저자 SDM2004](https://www.cs.utexas.edu/~ml/papers/semi-sdm-04.pdf).

## 2. PCM의 수학과 범위

1993형 `Σt^ηD²+ΣΩ(1−t)^η`, `t=1/(1+(D²/Ω)^(1/(η−1)))`, 원본 ND `t^η` 가중 평균을 실제 계산한다. 별도 ND FCM 준비 U로 군집별 `Ω=κ·가중분산`을 한 번 추정해 고정하거나 양수 수동 Ω를 지정한다. FCM m·PCM η·계수 κ·척도 Ω를 구분하며 **T의 행/열 합을 정규화하지 않는다**. 기존2D FCM 엔진과 초기화 결과는 변경하지 않았다.

로그/softplus·상대 로그 가중치·expm1로 안정 평가하며 epsilon 바닥값을 더하지 않는다. 자동 영분산 Ω는 오류, 수동 양수 Ω의 상수/중복은 퇴화 진단이다. 표현 반올림·로그 가중치·중복/근접 중심·원본 점 다양성을 공개한다. 반환 중심에서 T를 재평가하고 평균 고정점 잔차를 표시한다. 1996 entropy·FPCM·PFCM은 포함하지 않는다.

1993 원문 본문은 접근하지 못했고2005 원저자 재서술 Eq8/10/11과 공식 ppclust 매뉴얼을 대조했다. [PCM 계약·출처·한계](research/PCM.md), [1993 DOI](https://doi.org/10.1109/91.227387), [Pal et al.2005 원저자 재서술](https://www.comp.ita.br/~forster/CC-222/material/fuzzyclust/fuzzy01492404.pdf), [공식 매뉴얼](https://search.r-project.org/CRAN/refmans/ppclust/html/pcm.html).

## 3. 실제 Trace·전용 시각화·분석

기존 Worker/Recorder/checkpoint/역진·임의 seek와 캔버스 작업 공간을 재사용한다. PCK는 실제 후보 비용·현재 행·후보 중심·중심 이동·원래 ML/CL·위반 강조와 폐쇄/원본 위반 개수·비용·목적을 표시한다. 많은 제약의 표시 표본과 전체 정확 계산을 구분한다. PCM은 ND FCM 준비·실제 거리·별도 `typicality`·중심 이동·척도·목적을 기록한다. T/로그T/원본 거리·행합/최대값·유효/로그 가중치·FCM U·잔차·퇴화 진단을 제공한다. 표본 클릭 또는 검사 버튼으로 독립 [0,1] 전형성을 확인하며 확률 막대로 정규화하지 않는다.

원본 계산과 표시 투영은 분리한다. 큰 입력도 모든 원본 행을 계산하고 중간 행렬만 바이트 기준으로 요약한다. PCM 최종 전체 T/로그T/거리와 FCM U를 보존한다. 기존64MiB Trace/256MiB 작업 정책을 검토했고 새 전역 행 상한은 없다. 리사이즈6폭에서 각 Worker요청1→1·Trace위치를 유지했다. 실제 computing 이후 terminate와250ms 동안 완료 응답이 없음을 확인했다. 이는 최대 취소 지연 보장이 아니다.

## 4. 추천·도감·수학 가이드

각 엔진 전용4구성을 추가했다. PCK: 분리·겹침·제약 레버리지·거리/감독 충돌. PCM: 분리·원거리 이상치·다른 분산·같은 중심 한계(명시적 수동 양수 Ω). 기존32프리셋을 이름만 바꾼 구성이 아니다. [8구성 상세](DATASET_RECOMMENDATIONS.md).

도감의 실제 Worker Trace 미리보기·더블클릭·캐시/동시성/화면 밖 중지/reduced-motion을 공유한다. 가이드는 수식·손계산·초기화·종료·한계를 포함한다. PCK 미니는 w=.01/30에서 실제 배정/J가 달라지고, PCM 미니는 같은 원본 ND의 실제 FCM U와 독립 T를 비교한다. 선택한 실제 이벤트·원본·파라미터를 실험실로 전달한다. 전체55개 교재 기준도 통과했다.

## 5. 독립 수치 검증

- PCK: NumPy8사례·작은 배정140개 전체 목적 열거, 전용15테스트. 탐욕 결과를 전역 최솟값과 동일하다고 요구하지 않는다. 후보 비용·폐쇄/중복·거리/벌점·평균·동률/빈 중심·ND·순서/시드·Trace seek/역진·native 결과를 검사했다.
- PCM: NumPy2.5.4 직접 power AO14사례(정상13·예상 영분산 오류1), FUZZY_FORMULAS 손계산/스칼라 최소값, 전용20테스트. 모든 warm/main 중간 상태·중심/T/Ω/J/가중치·비정규화·ND·중복/상수/이상치·극소/극대·시드/한도·checkpoint/역진을 검산했다. 기존FCM8회귀도 통과했다.

외부 실행은 NumPy2.5.4(BSD-3-Clause) 독립 검산이다. R ppclust1.1.0.1(GPL>=2)은 문서·버전/설정만 확인했고 **실행하지 않았다**. R 기본 난수/종료 결과와의 일치를 주장하지 않으며 라이브러리 소스를 제품에 복사하지 않았다. [PCK fixture](research/pckmeans-reference.json), [PCM fixture](research/pcm-reference.json).

## 6. 성능 관측

Windows x64·Node24.19.0·Intel Core Ultra7 256V, d4,K3,seed42, 엔진+Recorder 단일 관측이다. 생성/투영/Worker/렌더를 제외한다.

| 엔진 | 원본 행 | ms | 이벤트 | Trace 추정 바이트 |
|---|---:|---:|---:|---:|
|PCK|100|20.95|408|1104176|
|PCK|1000|4.86|10|91916|
|PCK|10000|28.39|10|757916|
|PCM|100|13.37|46|347256|
|PCM|1000|46.32|46|2674654|
|PCM|10000|193.98|46|4662828|

PCK1000행 ML249500/CL250000 폐쇄도 희소 정확 비용으로 계산했다. 기록 세분도/JIT/GC가 달라 단순 속도 순위를 뜻하지 않는다. 힙 차이는 최대/유지 메모리가 아니다. [PCK Node](research/pckmeans-performance.json), [PCM Node](research/pcm-performance.json)에 원본 생성식·환경·파라미터·전체 목적 직접 재집계를 보관했다.

Chromium156,1440×900,DPR1의 추가 실제 Worker 측정: PCK100/1000행 engine17.1/6.8ms·wall45.5/25.8ms, PCM100/1000행 engine12.4/49.1ms·wall36.4/90.1ms·실제 T300/3000셀을 확인했다. UI재생은 PCK120행/PCM160행·4D·K2에서2.2초 단일 관측 약60FPS였다. 직접1000행 Worker 계산과 기본 UI재생 규모를 혼동하지 않는다. GPU시간·장기/전체 규모 FPS를 보장하지 않는다. [PCK 브라우저](research/pckmeans-final-browser-performance.json), [PCM 브라우저](research/pcm-final-browser-performance.json).

## 7. 기존 기능 보존·전체 회귀

기존53개 엔진·32프리셋/홈 관련63소스가 기준 main과 동일하다. 기존212추천 객체와 기본/seed137/count19 생성636건도 모두 동일하다.119후보 이름/번호/순서를 보존했으며 상태 변경은21/24뿐이다. [소스 보존](extension-55/source-preservation.json), [데이터 보존](extension-55/existing-dataset-preservation.json).

로컬과 원격 모두 TypeScript·ESLint·프로덕션 빌드·**Vitest694/694·48파일**, 전체 Chromium/mobile **130통과·14기존 조건부 생략·0실패**다. 로컬 재시도/불안정 테스트0, 생략14개 목록은 이전 실행과 동일하다. 기존 구조형 진입 기본값과 교재 출처 기준을 수정한 뒤 전체 회귀를 다시 실행했으며 테스트를 삭제/완화하지 않았다. [로컬 전체](extension-55/browser-local.json), [CI 원본 요약](extension-55/ci-summary.json).

## 8. main·GitHub Pages·공개 확인

PCK `bed5b79`, PCM `98b77b3`, 기본 진입 복원 `daa6b2e`, 교재/추천 검증 `926b14e`, 통합 `32dc4cf` 순서로 안정 커밋했다. [Actions](https://github.com/oyueo-mm/ClusterLab/actions/runs/41513054284) validate·Pages deploy 성공. [공개 HTML/JS/CSS 해시](extension-55/release.json)가 로컬 최종 빌드와 동일하다. 강제 푸시 없이 main을 정상 반영했다.

공개 Chromium/mobile19통과/1기존 중복 생략: 신규 두 카드의 실제 미리보기/더블클릭·실험/미니·파라미터·전용 분석·실제 계산/되감기·데이터 편집/Undo/복원, 전체55개 엔진 직접 진입, 홈4개 실제 Worker·홈 타이포그래피/버튼을 확인했다. 생략1개는 기존 v05 모바일 중복 실행이며 같은390px 검사는 데스크톱의 다중 폭 순회에 포함된다. 신규8추천×2화면16실제 계산/되감기,1920/1440/1024/768/390/320px×2엔진·표본 클릭·리사이즈 무재계산15검사도 통과했다. 공개 패널 첫 방문 기본 닫힘, 모든 폭에서 재생 버튼이 화면 안에 있었다. [공개19통과/1기존생략](extension-55/browser-public.json), [공개 추천](extension-55/public-recommendation-browser.json), [공개 측정/화면](extension-55/public-layout/measurements.json).

## 9. 재현·미검증·후속

`python scripts/pckmeans_reference.py`, `python scripts/pcm_reference.py`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npx playwright test`. Node 성능은 `npx tsx scripts/pckmeans_performance.ts`·`npx tsx scripts/pcm_performance.ts`, 실제 Worker는 `node scripts/measure-native-extension.mjs PCKMeans constrained pckmeans-final` 및 `node scripts/measure-native-extension.mjs "Possibilistic C-Means" numeric pcm-final`이다. 화면/추천은 `node scripts/measure-extension-layout.mjs local`, `node scripts/verify-extension-recommendations.mjs local`. 로컬은 `CLUSTERLAB_BASE_URL=http://127.0.0.1:4476/ClusterLab/`, 공개는 Pages URL로 명시한다.

R 실행 비교·1993 원문 전체 인증·실물 휴대전화·최대 Worker/GPU 메모리·전역 최적은 미검증/범위 밖이다. 다음 단계에서는 FPCM의 U/T 제약과 MPCKMeans의 거리 학습 계약/독립 fixture를 우선 검토한다. 나머지77후보는 이번 작업에서 추가하지 않았다. `.local/sequential-worktree`의 `feat/sequential-clustering`/`c4d6a7d`와 다른 서버를 보존했다.


## 추가: 실제 UI100/1000행 렌더링 실측

별도 fresh context에서 원본100/1000행·4D·K2를 실험실에 직접 적용했다. 실제 Worker의 반환 행 수가 원본과 같고2.2초 끝까지 반복 재생이 활성인 것을 단언했다. 닫힌 보조 패널·1440×900·DPR1에서 전체 점을 렌더링했다. 초기140ms debounce/데이터 편집은 Worker wall에 포함하지 않는다. 입력 생성식·군집/제약 수·모든 실제 파라미터·Trace 사건/바이트를 JSON에 기록했다. RAF는 GPU시간 또는 장기 성능 보장이 아니다.

|환경|엔진|행|Worker ms|RAF FPS|p95 ms|
|---|---|---:|---:|---:|---:|
|local|PCKMeans|100|17.00|60.00|16.80|
|local|PCKMeans|1000|7.50|60.00|16.70|
|local|Possibilistic C-Means|100|45.20|60.00|16.80|
|local|Possibilistic C-Means|1000|117.40|60.00|16.70|
|public|PCKMeans|100|16.50|60.00|16.80|
|public|PCKMeans|1000|8.80|60.00|16.80|
|public|Possibilistic C-Means|100|44.90|60.00|16.70|
|public|Possibilistic C-Means|1000|114.30|60.00|16.80|

[로컬 UI실측](extension-55/local-rendering-performance.json), [공개 UI실측](extension-55/public-rendering-performance.json). 재현: `node scripts/measure-extension-rendering.mjs local` 또는 `CLUSTERLAB_BASE_URL`을 Pages URL로 지정하고 `node scripts/measure-extension-rendering.mjs public`. 앞의 K3·10회 한도 Worker 전용 측정과 실제 UI의 K2·기본 반복 한도는 서로 다른 관측이며 단순 속도비로 비교하지 않는다.
