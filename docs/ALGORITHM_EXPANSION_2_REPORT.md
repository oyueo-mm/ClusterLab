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
