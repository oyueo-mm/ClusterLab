# ClusterLab v0.5 검증 보고서

검증일: 2026-10-29 (Asia/Seoul). 기준 v0.4: `f14fec6e9a1b66c24e06892ec811b2c4ed1efcd9`. 작업 시작 시 원격 main과 로컬 HEAD 일치를 확인했습니다.

## 변경 범위

- `src/v03.css`: 기존 `.hero-copy`에 `align-self: center`를 적용하고 상단 패딩 20px 및 `.hero-actions`의 바깥쪽 하단 마진 24px을 제거했습니다. 제목부터 버튼 하단까지의 실제 콘텐츠가 오른쪽 `.home-cycle` 높이의 중앙에 놓입니다. 오른쪽 영역의 크기와 정렬은 그대로입니다.
- 800px 이하에서는 기존 단일 열 전환을 유지하고 `align-self: start`로 상단 흐름을 명시합니다. 768px는 제목과 카드를 겹침 없이 배치하기 위해 기존처럼 단일 열입니다. 340px 이하의 카드 한 열 배치도 v0.4 동작을 보존합니다.
- 제목·부제목·버튼의 문구, Black Han Sans·Pretendard, 제목 크기·굵기·색상, 버튼 크기·색상, 내부 간격은 변경하지 않았습니다. HomeDemos·HomeCycle·Canvas·엔진·라운드·데이터셋 코드도 변경하지 않았습니다.
- `tests/v05.spec.ts`: 1920·1440·1024·820·801·800·768·390·320px × 높이 600·1080px × 사이드바 접힘·펼침 상태를 검사합니다. 좁은 화면에서는 기존 UI가 접기 버튼을 숨기므로 넓은 화면에서 접기 상태를 설정한 뒤 리사이즈합니다.
- `playwright.config.ts`: `CLUSTERLAB_BASE_URL`로 공개 배포 사이트에서도 동일 테스트를 실행할 수 있습니다. 미지정 시 기존 개발·프로덕션 프리뷰 동작을 유지합니다.
- `package.json`·`package-lock.json`: 버전 0.5.0. `README.md`: 변경 내용과 이 보고서 링크.

## 검증 기준

- 좌우 배치에서는 제목 상단~버튼 하단의 중심과 오른쪽 영역 중심 차이 1px 미만.
- 세로 배치에서는 소개 상단 여백 및 소개~시뮬레이션 간격 각각 32px 이하. 화면 높이에 맞춘 불필요한 빈 영역 없음.
- 제목의 실제 텍스트 경계, 버튼 내용·경계, 가로 넘침, 겹침, 버튼 가로 정렬, 기존 카드 열 배치 검사.
- 기존 테스트로 실제 Worker 애니메이션, 재생·일시정지, 진행률, 카드의 실험실 이동, 11개 데이터셋·13개 알고리즘의 자동 순환과 래핑을 검사합니다.
- GMM은 지연된 ResizeObserver로 v0.4 결함 조건을 재현하고, 다섯 라운드에서 initialize·E·M·완료 시 실제 Canvas 타원 기하와 다음 라운드 전환을 확인합니다.

## 실행 결과

- ESLint: 통과.
- TypeScript: 통과.
- Vitest: 9개 파일, 132개 테스트 통과.
- 프로덕션 빌드: 통과.
- 추가 반응형 회귀 테스트: 36개 조합 통과.
- 전체 프로덕션 Playwright: 26개 통과, 4개 의도된 모바일 중복 검사 생략 (7.6분). 자동 순환·원본 데이터 전달·전체 GMM 라운드 검사는 데스크톱에서 실행하고 모바일은 별도의 라이프사이클·내비게이션·레이아웃 검사를 실행합니다.

## 화면 증거와 공개 배포 확인 방법

높이 1080px에서 캡처한 [1920px](screenshots/home-1920.png), [1440px](screenshots/home-1440.png), [사이드바 접힌 1440px](screenshots/home-1440-collapsed.png), [768px](screenshots/home-768.png), [390px](screenshots/home-390.png), [320px](screenshots/home-320.png)를 보존합니다. 높이 600px도 같은 자동 경계 검사로 검증했습니다.

공개 사이트에서는 `CLUSTERLAB_BASE_URL=https://oyueo-mm.github.io/ClusterLab/`을 설정해 `tests/v05.spec.ts`의 동일한 레이아웃 검사를 실행할 수 있습니다. 배포는 기존 main push → validate → GitHub Pages 워크플로를 사용합니다. 로컬 전용 서버는 외부 URL 지정 시 시작하지 않습니다.

`e24529357e5cd419d193c0876b2f1e423507b152`의 [Actions 검증·Pages 배포](https://github.com/oyueo-mm/ClusterLab/actions/runs/40874564390)는 모두 성공했습니다. 공개 HTML의 JS·CSS 자산명이 로컬 프로덕션 빌드와 일치합니다. 공개 사이트의 화면 크기·높이·사이드바 36개 조합, 폰트, 버튼·메뉴, 실제 Worker 공유 데이터·화면 밖 중단·카드 선택·재생 제어 검사는 **7개 통과, 1개 모바일 중복 검사 생략**입니다.

공개 검증에서 테스트의 배경 중앙 클릭이 열린 사이드바에 가려질 수 있음을 확인했습니다. 제품 코드는 그대로 유지하고, 메뉴 닫기 검사가 화면 오른쪽의 노출된 배경을 클릭하도록 보완한 뒤 위 공개 검사를 다시 통과했습니다.

브라우저 스크린샷·트레이스는 GitHub Actions의 `browser-evidence` 아티팩트에서도 확인할 수 있습니다.

공개 사이트: https://oyueo-mm.github.io/ClusterLab/
