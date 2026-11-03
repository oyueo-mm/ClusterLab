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

## 2차 확장 진행 — FPCM 세로 단위 검증 중

기준 main d2dbf12에서 FPCM1997을 먼저 진행한다. 현재 소스56엔진·224추천(브라우저/안정 커밋 미완료), 공개 제품은55개32dc4cf 그대로다. 전용17테스트·기존PCM/FCM/추천 포함102대상, 타입/ESLint가 통과했다. [2차 확장 기록](ALGORITHM_EXPANSION_2_REPORT.md), [FPCM 계약](research/FPCM.md), `scripts/fpcm_reference.py`를 먼저 읽는다. FPCM UI/미니·실제 Worker·반응형/성능을 검증해 안정 커밋한 뒤 MPCKMeans를 순차 개발한다. MPCK 제품·독립 oracle는 아직 작성하지 않았다. 자동 승인 검토 시간 초과로 한 번 검사 시작이 지연됐으나 허용된 재시도는 성공했다. 다른 작업 트리는 보존했다. 아래1차 확장은 과거 완료 기록이다.

## 2026-11-03 1차 확장 — 55개 엔진 공개 배포·최종 검증 완료

제품 main `32dc4cfa634bc181f27f408ff49dc48d81d014a0`의 [Actions/Pages](https://github.com/oyueo-mm/ClusterLab/actions/runs/41513054284) validate·deploy가 성공했다. **55엔진·220추천·77미구현·엄격 원문 완전 인증0**이다. 로컬과 원격 모두 타입·ESLint·빌드·Vitest694/694·48파일, 전체 Chromium/mobile130통과/14기존조건부생략/0실패다. 공개 사이트19통과/1기존중복생략, 신규8추천×2화면16계산/되감기,6폭×2엔진·표본 클릭·리사이즈 무재계산15검사를 확인했다. 공개 HTML/JS/CSS 해시도 로컬 빌드와 동일하다.

PCK `bed5b79` → PCM `98b77b3` → 기존 구조형 기본값 복원 `daa6b2e` → 교재/추천 검증 `926b14e` → 통합·실측 `32dc4cf` 순서로 개발했다. [최종 확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md), [배포 명세](extension-55/release.json), [로컬 전체](extension-55/browser-local.json), [공개](extension-55/browser-public.json), [CI](extension-55/ci-summary.json)를 따른다. 아래 검증 중/54개/53개 표기는 과거 기록이다.

원본 ND·유한 제약 비용 PCK와1993 고정 척도·비정규화 전형성 PCM을 실제 Trace·분석·추천·가이드/미니·독립 NumPy와 연결했다. 기존53엔진 수학 소스·32프리셋·홈,212추천/생성636건,119후보 이름/순서를 보존했다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/`c4d6a7d`를 보존했다. R ppclust 실행·1993 원문 전체 인증·실물 휴대전화·최대 GPU/Worker 메모리는 미검증이다. 후속 FPCM·MPCKMeans 등77후보는 별도 미완료이며 이번 세션에서 추가하지 않는다.

## 현재 배포 검증 진행 — main32dc4cf 푸시 완료

`32dc4cfa634bc181f27f408ff49dc48d81d014a0`을 origin/main에 정상 푸시했다. [Actions41513054284](https://github.com/oyueo-mm/ClusterLab/actions/runs/41513054284), validate job125509489605에서 lint/typecheck/Vitest/build가 성공했고 전체 브라우저 검사가 진행 중이다. 아직 Pages/공개 완료로 기록하지 않는다. 원격 전체 통과와 Pages 성공 뒤 공개20검사(`fuzzy-constraints-extension`, `encyclopedia`, `v02`, `v05` spec), 추천16검사, 레이아웃15검사 및 번들 해시를 확인한다. 로컬 preview4476은 이번 작업의 서버이며 다른4173/작업 트리는 보존한다.

재개 시 `.local/extension-actions.ps1`, `.local/capture-extension-browser.py`, `.local/extension-release.mjs`, `.local/finalize-extension.py`가 이 작업 공간에 있다. 최종 문서 작성기는 CI/배포/공개 결과가 모두 성공해야 실행되도록 검증한다. 제품 코드는 푸시 이후 변경하지 않았다.

## 최신 체크포인트 — 55개 로컬 통합 검증 완료, 공개 배포 다음

PCK `bed5b79` → PCM `98b77b3` → 기존 구조형 기본값 복원 `daa6b2e` → 전체 교재/추천 UI 검증 `926b14e` 순서로 커밋했다. 현재55엔진·220추천·77미구현·엄격 원문 완전 인증0. 전체 Vitest694/694·48파일, 타입·ESLint·빌드, 전체 Chromium/mobile130통과/14기존생략/0실패·재시도를 확인했다. 생략14개는 이전 실행과 동일하다. 신규8추천의 실제 UI16검사,6폭×2엔진/표본클릭/리사이즈 무재계산15검사도 통과했다.

실제 Worker의100/1000행 출력과 취소, 기본 UI재생 입력 크기를 구분해 최종 실측했다. [확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md)와 `extension-55/browser-local.json`, `research/*-final-browser-performance.json`을 따른다. 기존53엔진·프리셋/홈 관련63소스,212추천/생성636건,119후보 이름/순서를 보존했다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/`c4d6a7d`를 보존했다.

다음은 검증된 main 커밋 푸시, GitHub Actions/Pages 완료 확인, 공개 신규 실험/미니·전체55개 진입·홈·추천/되감기·반응형 확인이다. 현재 공개 배포 완료로 선언하지 않는다. 아래는 과거 체크포인트다.

## 2026-11-03 PCKMeans·PCM 확장 — 로컬 55개 통합 검증 중

PCKMeans 안정 커밋 `bed5b79` 이후 PCM을 순차 구현했다. 실행 엔진 **55개**, 기존119후보 중42개 연결·**77개 미구현**, 추천 **220구성**(기존212+각4), 엄격 원문 완전 인증 **0개**다. 기존53개 엔진 수학 로직과32프리셋을 보존한다. [이번 확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md)와 [PCKMeans](research/PCKMEANS.md)·[PCM](research/PCM.md)의 범위·수치 정책을 우선한다.

PCM은 원본 전체 ND에서 별도 FCM 초기화·양수 고정 Ω·1993 목적·독립 전형성·로그 가중 평균을 실제 계산한다. NumPy 직접 거듭제곱 oracle14사례(13성공/영분산 자동척도 오류1), 수식 손계산과 전체 중간 AO·최종 결과·Trace 역진/seek를 검산했다. R ppclust 실행 비교와1993 원문 전체 인증은 하지 않았다. 2005 원저자 재서술의 식과 공식 매뉴얼을 대조했으며 제품에 라이브러리 소스를 복사하지 않았다.

현재 전체 Vitest **694/694·48파일**, 타입·ESLint·빌드 통과. 기존212추천 및 생성636건은 `f615923`과 동일하다. Node PCM100/1000/10000행(d4,K3) 실제 계산+Recorder13.37/46.32/193.98ms, Trace46이벤트·347256/2674654/4662828추정바이트를 관측했다(단일 실행, Worker/렌더 제외). 전체 브라우저·Actions·공개 배포는 아직 검증 중이다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/`c4d6a7d`를 보존한다. 아래 과거 체크포인트는 당시 결과다.

## 2026-11-03 신규 확장 1차 — PCKMeans 세로 단위 완료, PCM 다음

현재 main 로컬54엔진·추천216구성·후보78개 미구현·엄격 완전 인증0이다. PCKMeans 원본ND·일관 제약의 정확한 희소 폐쇄·유한 벌점·실제 후보/평균 Trace·관계/중심 시각화·전용 분석·4추천·가이드/실제 비용 변경 mini·독립 NumPy8사례/140배정을 연결했다. 원문 ½SSE와 제품 SSE의 w=2w_p 대응 및 초기화/동률/종료 변형을 명시한다.

전체 Vitest670/670·47파일, PCK전용15개, 타입/ESLint/build 통과. PCK 실험/미니와 기존 제약·모델 Chromium/mobile12/12통과(생략0). Node100/1000/10000 및 대형 폐쇄, 브라우저100/1000·10만행 계산 중 취소·짧은 재생약60FPS를 실제 관측했다. 기존212추천/생성636건은 f615923과 동일하다. [확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md), [수학/수치/성능](research/PCKMEANS.md)을 먼저 읽는다.

이 단계의 안정 커밋 이후 PCM을 순차 구현한다. FUZZY_FORMULAS의 기존 블록 검산을 활용하며 새 PCM 전체 AO·ND 초기화·척도/전형성·진단·4추천·FCM 비교 mini·단위/브라우저는 아직 남았다. 두 엔진 완료 후 전체55개/220추천·기존 회귀·Actions/Pages/공개 확인을 수행한다. 공개 제품은 아직96d9bab, 원격main은f615923이며 이번 전체 단위/공개 배포는 미완료다. main 강제push 없음, 별도 `.local/sequential-worktree`/`feat/sequential-clustering`/c4d6a7d를 보존한다.

## 2026-11-03 홈 타이포그래피·설정 패널 개선 — 공개 배포 완료

제품 `96d9bab381065e2452584acb70ca629bd69d2ab8`. [Actions41472349888](https://github.com/oyueo-mm/ClusterLab/actions/runs/41472349888) validate/Pages 성공. 로컬·원격 타입/ESLint/빌드 및 Vitest **651/651·46파일**, 최종 전체 Chromium/mobile 각각 **122통과·14조건부 생략·0실패**다. 최초 모바일 패널 겹침1건을 경계 ResizeObserver 보완으로 해결했고 최초/표적/최종 전체 실행을 구분해 보존했다.

홈은 큰 `ClusterLab`과 정확한 `인터랙티브 군집화 알고리즘 백과사전`으로 정리했다. 영문 소개·슬로건·설명·사이드바 소개 카드를 제거했다. 1440px 제목86.4px/보조27.36px, 390px 54.6px/21.84px이다. 기존 버튼3개·실제 Trace 데모4개·자동 순환을 유지했다. 두 실험실은 저장값이 없을 때 오른쪽 설정 패널이 닫히며 기존 저장 설정·폭·집중 모드·Trace를 보존한다.

공개 1920/1440/1024/768/390/320px의 홈·두 실험실18화면에서 오류/가로 넘침0, 데스크톱/mobile 공개 동작8/8 통과. 공개 JS/CSS 해시는 로컬 제품 빌드와 같다. 소스4파일만 변경했고 엔진·데이터·애니메이션·편집·홈 데모199파일의 Git blob과 별도 알고리즘 작업 트리를 보존했다. [최종 보고서](HOME_POLISH_REPORT.md), [배포 명세](home-polish/release.json)를 기준으로 사용한다. 이번 개선은 완료했으며 미구현79개 후보 등 기존 알고리즘 마스터 기록은 유지한다. 실제 휴대전화 하드웨어는 미검증이다.

## 2026-11-02 캔버스 중심 실험실 — 공개 배포 완료

제품 소스 `ae1c2cceae92fe64a75deab7165c02d3b7886ec8`. [Actions41444492938](https://github.com/oyueo-mm/ClusterLab/actions/runs/41444492938)의 validate125274337280/Pages deploy125283077444가 모두 성공했다. 원격 타입·ESLint·빌드·Vitest **651/651·46파일**, 전체 Chromium/mobile **118통과/14조건부 생략/0실패**다. Firefox/WebKit 별도28통과/2중복생략, 최종 세 브라우저 작업 공간12/12통과를 서로 다른 실행으로 기록한다.

[공개 사이트](https://oyueo-mm.github.io/ClusterLab/)의 7개 폭×3모드21구성, 주요 시각화22조합, 상호작용5개를 확인했다. 브라우저 오류0이며 실제 계산·되감기·패널·집중 모드·검색·도감 더블클릭을 확인했다. 1440×900 캔버스829×570→1066×711.2(+60.4%), 집중 모드 화면 면적79.0%. 최종 로컬 드래그DPR1/2 약60FPS, 공개58.8/60.0FPS, Worker요청1→1이다. [전체 보고서](CANVAS_WORKSPACE_REPORT.md), [배포 명세](workspace/release.json), [공개 측정](workspace/public/measurements.json)을 최종 근거로 사용한다.

이번 실험실 UI 개편은 완료했다. 기존198개 계산·데이터·이력·애니메이션 파일,53개 엔진/212추천/32프리셋, 홈·도감·비교·가이드를 보존했다. 영어 지원/새 알고리즘은 진행하지 않았다. 실제 휴대전화 하드웨어와 Worker/GPU 최대 메모리는 미측정이며, 전체 알고리즘 마스터의79후보는 별도 미완료다. 문서/테스트 대기 보완 후속은 제품 코드를 변경하지 않으며 `[skip ci]`로 기록한다. 다른 작업 트리/프로젝트 서버를 보존했다.

# 재개 절차 — 도감 Trace 애니메이션·추천 규모 공개 배포 완료

2026-11-02 후속 작업: 실제 Trace 기반 최대 36프레임 Canvas 미리보기(썸네일 Worker 2개·동시 재생 4개·5.6초 루프), 212추천별 count 및 수 조절 UI를 구현했다. 수학 엔진 53개·후보 79개·32개 프리셋 생성식은 유지한다. `a45488c`는 미리보기, `cd999da`는 추천 규모/UX 커밋이다. [구조·개수·검증 보고서](PREVIEW_SCALE_REPORT.md)를 우선 읽는다.

**최종 확정:** 제품 main `4d82687f89658786e304aeb74618629aa5347f4f`, [Actions41378959392](https://github.com/oyueo-mm/ClusterLab/actions/runs/41378959392) validate/Pages 성공. 전체 단위 **651/651·46파일**, 전체 Chromium/mobile **111통과/13기존 조건부 생략/0실패**다. 로컬 셸·소유권·편집·미리보기4개 spec35통과/9기존생략, 최신 미리보기6/6 및 단축키 반복5/5도 통과했다. 옛120점 고정 기대값, 초기 옵션/데이터 수 불일치, 페이지 준비 전 단축키 경합과 정적 최종 설명을 보완했다.

공개1440/390px에서 16개 알고리즘/장치 조합·48장 초기/중간/최종 화면 및 reduced-motion을 확인했다. 공개53개 미리보기·캐시·Worker·루프/정지·개수/Undo/Redo 검사는 최초5통과/1첫 진입10초대기초과 후 동일조건1/1 재검사 통과다. 공개FPS약60, 메인힙26.32/20.69MiB(Worker/GPU 최대 메모리 제외), 전체클립보존추정9.95MiB. 원본143개 해시, 32프리셋 생성식/기본값, 212개 추천의 목적·시드·파라미터를 보존했다. `docs/preview-scale/release.json`, `ci-final.json`, `public/verification.json`, `public-browser-*.json`, 전체212개 변경 전후 표와 [보고서](PREVIEW_SCALE_REPORT.md)를 최종 증거로 사용한다.

이번 개선은 완료했으며 전체 알고리즘 마스터는 **미완료**다. 후보79개를 추가 구현하지 않았고 엄격 인증0 상태를 유지한다. 실제 휴대전화 하드웨어와 Worker/GPU 최대 실제 메모리는 미측정이다. 기존 `.local/sequential-worktree`와 세션 원자료를 보존했다. 후속 기록 커밋은 문서/검증치만 갱신하며 배포 제품 SHA는 위 값이다.

---

# 이전 기록 — UI·데이터셋 개편 공개 배포 완료

**2026-11-02 최종 확정:** 제품 main `c51ea16a3993a5d0892f037592902ff49cd89ae0`, [Actions41328815303](https://github.com/oyueo-mm/ClusterLab/actions/runs/41328815303) validate/Pages 성공. 단위592/592·43파일, 전체 Chromium/mobile105통과/13기존 조건부 생략/0실패. 로컬 최종 네 구성45통과/3중복생략. 공개1440/390px에서 홈4실제 데모·대표6실제 결과·132개 도감·DBSCAN 기본moons/되감기·Louvain 원본graph 실행을 확인했다. `ui-datasets/release.json`, `ci-final.log`, `public-verification.json`, `public-*.png`가 최종 증거다. 아래 진행 중 기록은 당시 이력이다.

이번 UI·데이터셋 개편은 완료했다. 실행53개 모두 기본1+추가2+한계1(212구성)을 제공하고 엔진/프리셋/홈/이력142파일을 보존했다. 후보119개 중79개 미구현·엄격 인증0개인 마스터 목표는 계속 미완료다. 다음 알고리즘 작업은 MASTER_PLAN/RESEARCH_QUEUE를 따른다. UI 추가 개선은 초기/교재 번들 경량화와 App의 남은 고급 편집 UI 분리다. 실제 휴대전화 미검사. 기존 `.local/sequential-worktree`와 사용자 VizLab 작업 트리를 보존했다.

2026-11-02 최신 보완: main에 UI통합 `ed67773`까지 반영했다. 첫 Actions41325473043은 모바일 홈 가시성 검사 1개로 실패하여 Pages는 배포하지 않았다. 수정 후 로컬 네 구성 상태/셸/품질 **45통과/3중복생략**, 단위592/592, 타입/ESLint/build, 원본142/142 보존 통과. 사용자 소유 데이터와 자동 추천을 IndexedDB에서 구분하며 기존 저장 데이터도 보존한다. 다음은 보완 커밋 push → 새 전체 Actions/Pages → 실제 공개 desktop/mobile 검사 → 최종 문서다. `local-smoke-*`를 공개 검사로 취급하지 않는다.

**최신 작업은 `feat/vizlab-ui-datasets`의 VizLab 기반 UI 개편이다. 아래 과거 알고리즘 연구 후속보다 사용자 최신 지시를 우선한다.** [개편 계획·검증·남은 작업](UI_DATASET_PLAN.md)을 읽고 이어간다. 기준 main `c4d6a7d`, 엔진53/미구현79/엄격 인증0은 유지한다. 기존 별도 순차 작업 트리는 수정하지 않는다.

2026-11-02 재개 상태: 홈·사이드바·URL 도감·ID 실험실·설정/데이터/분석 탭·53개 추천(기본1+추가2+한계1)·실제 형식별 미리보기·IndexedDB·가이드·원본 비교를 구현했다. 타입/ESLint/build와 전체 Vitest **592/592·43파일** 통과. 데이터 시스템 안정 커밋은 **27c8f38**이다. UI 통합 커밋 후 원격 CI·공개 배포를 이어간다. 현재 **원격 전체 브라우저 회귀/공개 배포 완료가 아니다**.

첫 전체100개는66통과/22실패/12기존생략이었다. 이후 실패22개 중20개 재검증 통과, 홈2개도 썸네일 Worker 구분/데모를 화면에 보이게 한 후 통과했다. 새 UI/상태 검사17통과/1화면행렬생략 후 검색2개를 별도 재검사해 통과했다. Firefox/WebKit **52통과/2중복행렬생략**, 최신 시드137·IndexedDB·원본 비교·가이드·전체화면·7폭 패널 검사는 네 구성에서 **21통과/3중복행렬생략**이다. 서로 다른 실행의 개수를 한 번의 전체 결과로 합산하지 않는다. 원자료는 ui-datasets의 browser-first-full/retry/shell/filter-final/cross/state-final JSON이다. 현재 4473 전용 preview는 후속 확인에 사용하며 다른 프로젝트 서버는 종료하지 않는다.

검증 후 안정 커밋을 생성하고 원격 브랜치/PR 또는 main에 충돌 없이 통합·Actions·Pages·공개 desktop/mobile 검증까지 이어간다. 강제 push 금지. `docs/UI_DATASET_PLAN.md`의 남은 범위를 완료하기 전 전체 완료로 표시하지 않는다. 과거 알고리즘 마스터 목표/79개 후보를 축소하지 않는다.

---

# 이전 재개 절차 — 순차3개 통합

> 최종 공개 체크포인트:53개(기존13+후보40), 미구현79개, 완전 인증0. 제품main fc5cc15·Actions41305149245 validate/Pages 성공. 원격532/39파일·전체브라우저78통과/12기존생략, 로컬 다섯 spec cross38/38, 공개4브라우저8/8. 아래 중간 기록보다 SESSION_REPORT 마지막 확정 절을 우선한다.

MASTER_PLAN/PROGRESS/ALGORITHM_REGISTRY/SESSION_REPORT/ARCHITECTURE/DATA_FORMATS/PERFORMANCE/VALIDATION/RESEARCH_QUEUE와 research 자료를 먼저 읽는다. 전체 마스터를 다시 요청하지 않는다. 현재 소스53개/후보40연결·79미구현/완전인증0이다. BSAS/MBSAS/TTSAS를 다시 만들지 않는다. 마지막 source SHA/Actions/Pages는 SESSION_REPORT 마지막 확정 절과 git log를 따른다.

## 작업 위치와 검사

현재 root main은53개 제품fc5cc15이며 feat/sequential-clustering도 같은 체크포인트다. 원래 개발 트리 .local/sequential-worktree를 보존하고 root에서 같은 검사를 실행한다. 직전50개는 제품da10d21/문서d6e4e0d다. 당시50개 문서 원문은 sessions/platform50에 보존했다.

```powershell
git status --short
git log -5 --oneline
git branch -av
npm run typecheck
npm run lint
npm test
npm run build
python -B scripts/sequential_reference.py
npm run preview -- --port 4373 --strictPort
# 별도 터미널
$env:CLUSTERLAB_BASE_URL='http://127.0.0.1:4373/ClusterLab/'
npx playwright test
$env:CLUSTERLAB_CROSS_BROWSER='1'
npx playwright test tests/platform.spec.ts tests/next-platform.spec.ts tests/constraints-models.spec.ts tests/model-guides.spec.ts tests/sequential-platform.spec.ts --project=firefox --project=webkit
```

브라우저는 같은 결과 폴더를 사용하는 작업끼리 하나씩 실행하고 종료코드를 확인한 다음 원자료를 복사한다. session_id는 완료가 아니다. 실행 중 dist를 다시 빌드하지 않는다. root4273/이 트리4373은 각자 서버이며 타 프로젝트4173을 종료하지 않는다. .local 전체·작업 트리를 삭제하지 않는다. Windows spawn/검증 패키지 접근 거부는 해당 실행만 정식 escalation으로 재시도하고 실패를 숨기지 않는다.

## 실제 순차 정책과 주의점

- BSAS: d>θ와K<q일 때 생성, 그 외 배정 즉시 평균 갱신. MBSAS: 첫 pass seed만 생성하고 그 외 유보, 두 번째 pass는 미배정만 같은 순서로 배정·평균 갱신한다. seed를 두 번 세지 않는다.
- TTSAS: d≤하한 배정/d>상한 생성/나머지 유보. 직전 pass 진전0이면 다음 첫 pending 생성이며 최초도 이 규칙이다. q를 적용하지 않는다. 원본 순서와 모든 실제 차원을 유지하고 seed로 섞지 않는다.
- −1은 유보/미처리다. native sequential-partition의 완료는 전원 배정이며 Lloyd 고정점이나 전역 최적을 뜻하지 않는다. SSE는 현재 배정 진단이다. 거리 후보는 판단 전 값, assign의 대표는 갱신 후 값이다.
- sourceValues 최초 Recorder clone을 재사용한다. 상세/요약 Trace와 전체 계산을 구분하고 48checkpoint·역진을 유지한다. 실제 큰 수에서도 SVG 거리 비율의 나눗셈을 먼저 한다. 새 n상한을 만들지 않는다.
- 전용 분석·가이드·rawDataset/변경 파라미터/선택사건 전달·native 결과가 실제 Worker와 연결돼 있다. 구조형 분석에 legacy details.analysis-panel이 있다고 가정하지 않는다.

## 레퍼런스·증거·다음 단계

검증 전용 .local/sequential-reference-runtime은 PyClustering0.10.1.2/NumPy2.5.4이며 제품에 포함하지 않는다. 공식 문서0.10.1, 실행한 각 Python 모듈 SHA, BSD-3-Clause, 원서 전체 접근 한계를 SEQUENTIAL과 fixture에서 구분한다. 60원본의180결과는 Vitest 함수 수와 다르다. 기존50개 oracle/증거도 보존한다.

현재 전체532/39파일·로컬78성공/12기존생략·후속순차4/4·교차38/38가 통과했다. main 동기화·최종 검사·안정 커밋·Actions/Pages·공개 확인이 아직이면 먼저 완료한다. root50의 COP 고유성 보완은 registry에서 이미 제거했고, main을 병합해 단위/브라우저 단언과 최종50개 배포 증거도 함께 보존한다. 문서 충돌은 새53개 현재 내용과 sessions/platform50의 정확한 원문을 모두 유지한다. 강제 푸시·히스토리 재작성은 하지 않는다.

다음 실제 엔진은 RESEARCH_QUEUE/NEXT_50_QUEUE의 PCK/PCM/FPCM/MPCK/Constrained Spectral·Leader 및 나머지 후보에서 이어간다. PCK 원문 consistent closure와 finite soft 비용, FPCM/PFCM 차이, ND warm-start/generalized eigen 의존성을 지킨다. 부분 원문 검토·엔진 등록·완전 인증을 같은 완료로 세지 않는다.

현재 설치한 순차 검증 환경은 이 작업 트리의 .local/sequential-reference-runtime에 있다. main을 원래 root에서 실행할 때 재설치 대신 다음처럼 같은 검증 환경을 명시할 수 있다.

```powershell
$env:CLUSTERLAB_SEQUENTIAL_REFERENCE_RUNTIME = Join-Path $PWD '.local/sequential-worktree/.local/sequential-reference-runtime'
python -B scripts/sequential_reference.py
```

검증 환경 경로는 제품 런타임/번들에 들어가지 않는다. 새 clone에는 위 연구 문서의 고정 버전 설치 절차를 사용한다.

## 다음 재개 시작점

현재 main은53개이며 위50개 기준/개발 위치 설명은 진행 당시 기록이다. 원래 root에서 CONTINUE 명령을 사용하고, 이전 .local/sequential-worktree도 같은 체크포인트로 보존한다. 현재 전체/공개 검증을 이유 없이 반복하거나 순차3개를 중복 개발하지 않는다. 다음에는 RESEARCH_QUEUE와 FUZZY_FORMULAS/NEXT_50_QUEUE를 읽고 남은79개의 실제 계산부터 이어간다. 수식 블록 검산만 완료된 후보를 제품 구현으로 올리지 않는다. 새 변경에 필요한 회귀와 독립 oracle를 수행한 뒤 다음 안정 커밋을 만든다.
