# PCKMeans·Possibilistic C-Means 1차 확장

기준 main `f615923`, 공개 제품 `96d9bab`(홈/캔버스 UI 개편 완료). 다른 `.local/sequential-worktree`의 `feat/sequential-clustering`/`c4d6a7d`를 보존한다. 기존53개→목표55개, 미구현79→77, 추천212→220이며 엄격한 원문 완전 인증은 별도0이다.

## 현재 체크포인트 — PCKMeans 세로 단위 완료

현재 로컬 소스54개·추천216개·후보78개 미구현이다. PCKMeans의 일관된 원본 ND·희소 폐쇄·유한 비용·감독 초기화·순차 비용 최적화·전체 평균·실제 Trace·전용 분석·관계/중심 시각화·4추천·가이드/실제 미니·독립 수치 검증을 연결했다. [PCKMeans 상세 정의·원문과의 차이·성능·범위](research/PCKMEANS.md)를 따른다.

- 독립 NumPy8사례·140개 작은 배정 목적 검산, 전용15단위 테스트.
- 전체 Vitest670/670·47파일. 타입·ESLint·프로덕션 빌드 통과.
- PCK 실험/미니 및 기존 COP·모델 Chromium/mobile12/12 통과, 생략0.
- Node100/1000/10000행 및1000행 대규모 폐쇄의 실제 비용, 브라우저100/1000행·10만행 계산 중 terminate·실제 재생을 관측했다.
- 기존212추천의 메타데이터 및 기본·seed137·count19 생성636건이 기준 main과 동일하다. [원본 보존](extension-55/existing-dataset-preservation.json).

재현: `python scripts/pckmeans_reference.py`, `npx vitest run src/engine/pckmeans.test.ts`, `npx tsx scripts/pckmeans_performance.ts`, `node scripts/measure-native-extension.mjs PCKMeans constrained pckmeans`. 브라우저는 `CLUSTERLAB_BASE_URL=http://127.0.0.1:4476/ClusterLab/`와 `npx playwright test tests/fuzzy-constraints-extension.spec.ts tests/constraints-models.spec.ts`를 사용한다.

## PCM 세로 단위 — 2026-11-03 로컬 구현·검증 완료

PCK 안정 커밋 `bed5b79` 이후 PCM을 순차 구현했다. 현재 **55개 실행 엔진·220추천 구성·77미구현 후보**, 엄격 원문 완전 인증은 별도 **0개**다. 기존119후보 번호/이름/순서를 유지하며 FPCM·MPCKMeans 등은 구현으로 올리지 않았다. 위 PCK54개 상태는 당시 체크포인트다.

PCM은1993형 `Σt^ηD²+ΣΩ(1−t)^η`, 독립 전형성 `t=1/(1+(D²/Ω)^(1/(η−1)))`, 원본 ND `t^η` 평균을 실제 계산한다. 별도의 ND FCM 준비 U로 군집별 `Ω=κ·가중분산`을 한 번 추정해 고정하거나 양수 수동 Ω를 지정한다. FCM m, PCM η, 계수 κ, 척도 Ω를 구분한다. T의 행/열 합을 정규화하지 않는다. 기존2D FCM 엔진은 변경하지 않았다. [PCM 계약·출처·검증](research/PCM.md).

로그/softplus·상대 로그 가중치·expm1로 수식을 평가하며 epsilon을 더하지 않는다. 자동 영분산 척도는 오류, 양수 수동 척도의 상수/중복은 퇴화 진단이다. 표현 반올림·로그 유효 가중치·중복 중심·점 다양성 부족을 공개한다. 반환 중심에서 T를 재평가하고 평균 고정점 잔차를 표시한다. 1996 entropy·FPCM·PFCM은 포함하지 않는다. 1993 원문 전체는 접근하지 못했고2005 원저자 재서술 Eq8/10/11과 공식 ppclust 매뉴얼을 대조했다. R은 실행하지 않았다.

독립 NumPy2.5.4 직접 power AO14사례(정상13·예상 오류1), FUZZY_FORMULAS 손계산, 전체 warm/main 중간 상태·최종 중심/T/척도/J/가중치·원본 ND·극소/극대·중복/상수/이상치·시드/한도를 검산했다. PCM전용20테스트, 기존FCM8회귀, 전체 **694/694·48파일**과 타입·ESLint·빌드 통과. R ppclust1.1.0.1(GPL>=2)은 문서/버전·설정만 확인했으며 제품에 소스를 복사하지 않았다. 독립 oracle는 NumPy(BSD-3-Clause)이며 실제 버전/설정은 fixture에 기록했다.

PCM 전용 분석은 원본 중심·척도·T/로그T·거리·행합/최대값·유효/로그 가중치·FCM 기준 U·목적·잔차·퇴화 진단을 제공한다. 표본 클릭 또는 검사 버튼/원본 행 입력으로 군집별 독립 [0,1] 값을 확인한다. `typicality` 이벤트를 FCM expectation과 구분한다. 실제 중심·이상치 전형성의 투명도·전체 원본 ND 계산과 표시 투영을 분리한다. 큰 입력도 전체 계산하며 중간 행렬만 바이트 기준 요약, 최종 전체 T/로그T/거리와 FCM 기준 U를 보존한다. 기존64MiB Trace/256MiB 작업 정책 안에서 새 전역 행 상한은 없다.

분리·원거리 이상치·다른 분산·동일 중심 한계의 전용4추천을 등록했다. 미니는 같은 원본의 실제 ND FCM U와 PCM T를 비교하고 선택한 실제 이벤트/원본/파라미터를 실험실로 전달한다. 도감은 실제 Worker Trace·기존 캐시/동시성/화면 밖 중지/reduced-motion·더블클릭을 공유한다. 신규 실험/미니 Chromium/mobile **8/8** 통과(생략0): 실제 Worker·파라미터·되감기·분석·원본 편집/Undo/복원·무재계산 투영/집중 모드·정확한 이벤트 이동을 단언한다. [결과](extension-55/new-algorithms-browser.json).

PCM Node엔진+Recorder(생성/투영/Worker/렌더 제외)100/1000/10000행,d4,K3,seed42:13.37/46.32/193.98ms,46이벤트,347256/2674654/4662828추정Trace바이트였다. [환경·전체 입력·직접 J 재집계](research/pcm-performance.json). 힙 차이는 최대/유지 메모리가 아니다. 실제 Chromium156,1440×900,DPR1에서100/1000행 Worker와wall시간을 별도 관측했고10만행·d4,K8은 실제 computing 이후 terminate/250ms 무응답을 확인했다. 시작→terminate는 취소 호출 지연이 아니다. UI2.2초 재생에서 타임라인0→25.33, RAF약60FPS를 관측했다(GPU/장기보장 아님). [실제 브라우저 측정](research/pcm-browser-performance.json).

기존212추천/원본 생성636건을 다시 비교해 `f615923`과 모두 동일했다. 기존53개 엔진 수학 파일과32프리셋을 수정하지 않았다. 실제 휴대전화 하드웨어, Worker/GPU 최대 메모리, R 결과 일치, 전역 최적, 원문 완전 인증은 미검증이다.

재현: `python scripts/pcm_reference.py`, `npx vitest run src/engine/pcm.test.ts src/engine/expansion.test.ts`, `npx tsx scripts/pcm_performance.ts`, `node scripts/measure-native-extension.mjs "Possibilistic C-Means" numeric pcm`.

## 통합·배포 진행 중

전체 교재 회귀에서 PCK 가이드 참고문헌1개가 기존 공통 기준(2개 이상)에 미달함을 확인했다. 실제 비교 대상인 Wagstaff et al.ICML2001 원저자 COP-KMeans 논문을 추가해 hard 제약과 유한 비용의 차이 근거를 보완했다. 출처 수 단언이나 테스트를 완화하지 않았다. 계산 엔진 변경은 없다.

기존 `#structured`의 Spectral 기본 진입이 신규 목록 선두 등록의 영향을 받는 것을 전체 회귀에서 발견했다. PCM을 목록 끝에 등록해 기존 기본값을 보존했다. 해당 기존 ND/가중 그래프 및 신규 실험/미니 Chromium/mobile **14/14**가 수정 후 통과했고, 전체 단위694/694·타입·ESLint·빌드도 다시 통과했다. [수정 후 대상 회귀](extension-55/default-route-regression.json). 수정 후 전체144개 브라우저 회귀는 처음부터 다시 실행 중이다. 최초 중단 실행을 전체 성공으로 계산하지 않는다.

신규 두 실험실을1920/1440/1024/768/390/320px(높이900)에서 실제 브라우저로 측정했다. 오른쪽 설정은 첫 방문 기본 닫힘, 모든 폭에서 가로 넘침 없이 재생 버튼이 화면 안에 있었다. 1440px 캔버스1376×735.42,390px에서 PCK390×655.72·PCM390×663이었다. 원본 표본 실제 클릭으로 독립 전형성 검사가 열리는 것도 확인했다. [13개 화면/클릭 검사·스크린샷](extension-55/local-layout/measurements.json). 실제 휴대전화 측정은 아니다.

PCM 완료 뒤 기존53개 포함 전체55개·추천220구성·전체 회귀·성능·GitHub Actions·Pages·공개 데스크톱/모바일 확인을 수행한다. 현재 단계만으로 이번 전체 개발 단위를 완료 또는 공개 배포 완료라고 하지 않는다. 기존53개 엔진의 수학 로직을 수정하지 않았다.
