# 브라우저 결과 해석

2026-10-31. 프로덕션 preview 4273 / Chromium Desktop, iPhone13 Chromium 에뮬레이션, Firefox Desktop, WebKit Desktop.

| 기록 | 실행 범위 | 통과 | 실패 | 생략 |
|---|---|---:|---:|---:|
| browser-full-first.json | 기존+신규 전체 Chromium/mobile 58구성 | 44 | 2 | 12 |
| browser-selector-retry-first.json | 도감/신규 플랫폼, 검색 보강 중 | 10 | 2 | 0 |
| browser-final-targeted.json | 최종 도감/플랫폼 Chromium/mobile + 신규 플랫폼 Firefox/WebKit | 18 | 0 | 0 |

첫 오류는 도감 검색과 숨겨진 실험실 검색의 부분 일치, 다음 오류는 option에 명시 value 속성이 있다는 테스트 가정이다. 각각 exact label과 의미 기반 option locator로 수정했다. 제품 계산 결과 실패가 아니다. 최종 소스에서 lint/typecheck/build와 단위247개도 통과했다.

중복 실행을 제외한 Chromium/mobile 고유 검증은 46통과/12기존 조건부 skip, Firefox/WebKit 신규 플랫폼은 추가6통과다. 단일 전체 재실행이나 모든 기존 기능의 Firefox/WebKit 검증으로 확대하지 않는다. 원격 CI는 전체 단일 실행 결과를 SESSION_REPORT에 별도 기록한다. 다른 browser-*.json은 개발 중 이전 단계의 관측이다.

platform/structured/catalog 스크린샷은 실제 Worker 결과를 기록한다. quality의 performance JSON은 짧은 rAF 관측이며 대형 입력·실제 모바일 기기 보장이 아니다.

원격 전체 단일 실행 확정: Actions41187164683에서 46통과/12기존 skip/0실패, 단위247통과 및 Pages 배포 성공. 공개 사이트12/12는 browser-public.json에 보존했다. 원격 확인 시간/소스 SHA는 deployment.json과 SESSION_REPORT를 따른다.
