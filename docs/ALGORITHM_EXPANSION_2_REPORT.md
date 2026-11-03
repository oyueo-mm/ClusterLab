## 2차 확장 — 표시 축 복원 오류 수정, 강화한 전체 회귀 재실행

최초 로컬138통과/14기존생략 이후 추가 코드 검토에서 MPCK의 ND 축3/4 선택→2D 데이터Undo 때 타원이 이전 축을 참조하는 오류를 발견했다. 기존 시나리오에 pageerror 무발생 단언을 추가하자 실제 Cannot read properties of undefined 오류1개가 재현됐다. 원본 점/중심과 같은 범위로 타원 축을 clamp하고 같은 축이면2D단면을 그리지 않도록 수정했다. 계산 엔진은 그대로다. [재현1실패](extension-57/axis-error-reproduction.json), [수정후 실제 fuzzy16/16·모든브라우저오류0](extension-57/browser-axis-fixed.json).

같은 전체741/741·50파일·타입·ESLint·빌드도 통과했다. 기존14생략/시간 제한/단언을 줄이지 않고 브라우저 오류 단언을 강화했다. 다음은 수정 커밋main푸시(이전41581911253 배포를 concurrency로 중단)와 수정본 전체138/14 재검증·새Actions/Pages·공개검증이다. 현재 공개57개 완료로 선언하지 않는다. 소스57/추천228/미구현75/엄격인증0, 다른 작업트리c4d6a7d는 그대로다. 아래는 이전 기록이다.

## 2차 확장 — 57엔진 로컬 전체 회귀 완료, 배포·공개 검증 다음

FPCM1997 안정9d09be1 → MPCKMeans2004 대각 metric 안정8086104 순서로 구현했다. **57엔진·228추천·75미구현·엄격 인증0**이다. 전체 TypeScript/ESLint/빌드·Vitest741/741·50파일(동일 단언·maxWorkers2), Chromium/mobile **138통과·14기존조건부생략·0실패/재시도**를 확인했다. 생략14개는55엔진 공개 기준과 동일하다. 57개 실제 Worker 도감/57개 수학가이드·홈·기존편집/복원·신규실험/실제비교/되감기·모바일을 포함한다. 기존55 math·32프리셋·220추천660생성·67소스 및119후보 번호/이름/순서를 보존했고 후보22/25만 갱신했다.

[2차 전체보고](ALGORITHM_EXPANSION_2_REPORT.md), [로컬 전체 브라우저](extension-57/browser-local.json), [검사 결과](extension-57/local-checks.json), [FPCM](research/FPCM.md), [MPCKMeans](research/MPCKMEANS.md), `docs/extension-57/`의 독립검산/실측 근거를 따른다. 두 신규4추천·실제 Trace/분석/가이드·Worker100/1000/10만취소·UI100/1000재생 약60FPS를 확인했다. 아직 공개는55개이며, 다음은 main 푸시→Actions/Pages 성공→공개57개·신규실험/비교·8추천/반응형·번들해시 확인이다. 다른 sequential 작업 트리는c4d6a7d 그대로다. 아래는 과거 기록이다.

## 2차 확장 — 두 세로 단위 로컬 완료, 통합·공개 검증 진행

FPCM 안정 커밋9d09be1 이후 MPCKMeans2004 multiple diagonal을 순차 구현했다. 소스57엔진·228추천·75미구현·엄격 인증0, 공개는 아직55개다. 원본 ND·정확 전체 최대쌍·거리−logdet·ML/CL 비용·Eq8 양수 대각 학습·명시 특이 처리·실제 Trace/역진·타원·전용분석·4전용추천·수학가이드/실제PCK비교를 연결했다. 독립 NumPy/SciPy17fixture(정상13/오류4), 모든 반복/후보ΔJ·16개배정목적·유한차분, 전용22테스트·전체741/741·50파일·타입·ESLint·빌드가 통과했다. 최초 전체는 신규 도감/교재 요약 불일치1개를 발견해 문구를 맞췄고 같은 전체를 재실행해 통과했다. 단언/시간 제한/기존 생략을 바꾸지 않았다.

MPCK Chromium/mobile4/4, 실제Worker100/1000·10만행computing이후취소, Node100/1000/10000(1sweep), 실제UI100/1000 약60FPS를 기록했다. 기존55엔진/220추천660생성/67원본math·data·home소스 보존 검증도 통과했다. [전체2차기록](ALGORITHM_EXPANSION_2_REPORT.md), [MPCK계약](research/MPCKMEANS.md), [FPCM계약](research/FPCM.md), `docs/extension-57/`를 따른다. 다음은 전체 Playwright152개 예상(기존14조건부생략 유지)·main커밋/푸시·Actions/Pages·공개검증이다. 공개 배포 완료로 선언하지 않는다. 다른 `.local/sequential-worktree`·feat/sequential-clustering·c4d6a7d는 보존한다. 아래는 과거 체크포인트다.

# 2차 확장 — FPCM1997·MPCKMeans2004 개발 기록

기준 `d2dbf12`, 공개 제품 `32dc4cf`,55엔진·220추천·77미구현·엄격 완전 인증0이다. 첨부 요청의 앞부분은 파일에 없으며 실제 본문은 MPCK 분석 항목부터 시작하지만 최종 지시·기존 연구의 명시 수식·원저자 자료로 범위를 확인했다. FPCM을 완성·검증·안정 커밋한 다음 대각 metric MPCKMeans로 진행한다. Full SPD·PFCM2005·Constrained Spectral·다른 신규 엔진·UI 재설계·영어 지원은 제외한다.

## FPCM 현재 범위

독립 NumPy11개 전체 AO와 기존 손계산/복제 블록을 제품 작성 전에 만들었다. 실제 FPCM1997 목적·원본 ND·U행/T열 정규화·별도 ND FCM 준비·가중 평균·잔차·영거리 최적해·로그 수치 정책·실제 Trace·전용 분석·4전용 생성기·가이드/실제 PCM 비교를 연결했다. 전용17테스트와 기존PCM20/FCM8/추천57을 포함한 대상102테스트, 타입·ESLint가 통과했다. [정의·출처·미검증](research/FPCM.md), [독립 fixture](research/fpcm-reference.json).

FPCM 세로 단위는 로컬에서 완료했다. 전체715/715·49파일(`npm test -- --maxWorkers=2`), 타입·ESLint·빌드, FPCM 및 기존PCM/PCK 실제 실험/미니 Chromium/mobile12/12, 전체56교재·실제 도감 미리보기4/4가 통과했다. 최초 기본 병렬 실행에서 기존 그래프 성능 관측 하나가5초를 넘었지만 단언/시간 제한/코드는 바꾸지 않았고 CPU경합을 줄인 두 작업자의 같은 전체715개는 통과했다. 이 최초 실패도 기록으로 보존한다.

현재 소스56개·224추천·76미구현·엄격 인증0이며 공개는55개 그대로다. [전용 브라우저](extension-57/fpcm-browser.json), [최종 기존/신규12회귀](extension-57/fpcm-final-browser.json), [56교재/미리보기](extension-57/fpcm-all-guides-previews.json). 실제 T 막대 값이 Native T와 같은지도 단언했다. 기존220추천·660생성,67개 기존 math/data/home 소스는 d2dbf12와 같다. [보존 근거](extension-57/existing-preservation.json).

Node+Recorder100/1000/10000행,d4,K3,seed42 단일 관측14.72/34.08/179.88ms,31/23/23이벤트,384984/2501074/4458948추정Trace바이트였다. d8/K4·d2/K2 변화도 측정했다. [Node 범위/원본/검산](research/fpcm-performance.json). 실제 Worker100/1000·10만행 computing 이후 terminate 및250ms 완료응답 없음, 기본 UI재생을 별도 측정했다. [Worker](research/fpcm-browser-performance.json). 실제 UI100/1000행,d4,K2,2.2초 반복 재생은 약60FPS/p9516.7~16.8ms였다. [UI 실측](extension-57/local-fpcm-rendering-performance.json). RAF는 GPU시간/장기 보장이 아니며 힙 차이는 최대 메모리가 아니다.

1997 원문 전체와 R 실행 비교는 미실시다.2005 원저자 재서술 인쇄522쪽 Eq15–18을 실제 렌더링했다. 전체 목표57개/공개 배포 완료를 선언하지 않는다.

## MPCKMeans 다음 단계

FPCM 안정 커밋 이후 ICML2004 Eq4–8·대각 행렬·양수/특이 처리·전체 데이터 최대 쌍거리·ML/CL 비용의 계약을 확정하고 독립 NumPy/SciPy·유한차분을 먼저 작성한다. 기존 COP/PCK 계산·입력 계약을 느슨하게 바꾸지 않는다. 아직 제품 MPCK를 구현 또는 검증 완료로 세지 않는다.

## 회귀·배포 계획

두 엔진 완료 후 기존55 보존,57엔진·228추천·75미구현, 전체 TypeScript/ESLint/Vitest/Playwright/프로덕션 빌드, Actions/Pages 및 공개 실험/미니·편집/복원·추천·320~1920px·성능/취소를 확인한다. 기존14조건부 생략을 늘리거나 단언을 완화하지 않는다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/`c4d6a7d`를 보존한다.

## MPCKMeans 로컬 세로 단위 결과

[수학적 범위·정책·독립검산·재현](research/MPCKMEANS.md), [17fixture·SciPy기울기/16배정](research/mpck-reference.json), [Node100/1000/10000·d/K/E변화](research/mpck-performance.json), [실제Worker/취소](research/mpck-browser-performance.json), [UI100/1000재생](extension-57/local-mpck-rendering-performance.json), [Chromium/mobile4검증](extension-57/browser-mpck-target.json)을 따른다. NumPy/SciPy 결과와 정상13개 매 반복·후보ΔJ·학습A/중심/목적이 일치하고4오류를 구분했다. 전용22개·전체741개가 통과했다. 엄격 원문 인증/FullSPD/원저자 WekaUT 실행 일치로 확장하지 않는다.

초기 전체741 중 도감/교재 요약 문자열1불일치를 기존 단언이 발견했다. 문구를 일치시킨 뒤 같은741/741·50파일을 통과했다. 수치 코드·기존 테스트 시간 제한은 바꾸지 않았다. FPCM 초기 기본 병렬의 기존 graph-followup 시간 초과도 앞 기록에 남아 있다.

## 통합 로컬 회귀

741/741·50파일, 전체 브라우저138통과/14기존생략/0실패/0flaky를 확인했다. [동일 생략·전체 결과](extension-57/browser-local.json), [단위/검사 근거](extension-57/local-checks.json)를 따른다. 후속 공개 검증은 배포 완료 후 별도로 기록한다.

로컬 추가 검증: 신규8추천×데스크톱1440/모바일390의16개 실제 전체 원본 Worker 계산·되감기 및 FPCM U행/T열 제약·MPCK 양수 A/명시조건화가 통과했다. [추천16](extension-57/local-recommendation-browser.json). 두 엔진1920/1440/1024/768/390/320px의 캔버스/재생 노출·가로넘침 없음·6회리사이즈 무재계산/위치 유지14검사도 통과했다. [좌표·스크린샷14](extension-57/local-layout/measurements.json).
