# 홈 타이포그래피와 설정 패널 기본 상태

2026-11-03. 기준은 최신 `main`의 `035cc7b`이며 다른 작업 트리와 알고리즘 개발 기록을 보존했다.

제품 변경은 `96d9bab381065e2452584acb70ca629bd69d2ab8`의 소스 4개 파일이다. 전체 소스 256개 중 252개, 엔진·데이터·애니메이션·편집 및 홈 데모 199개 보호 대상의 Git blob이 기준과 같다. [원본 보존 확인](home-polish/source-preservation.json).

## 변경 내용

홈 왼쪽을 `ClusterLab` 제목과 정확한 보조 문구 `인터랙티브 군집화 알고리즘 백과사전`으로 정리했다. 영문 소개, 기존 슬로건, 두 줄 설명과 사이드바 하단 소개 카드를 제거했다. 다른 장식 문구를 추가하지 않았다. 기존 이동 버튼 3개, 오른쪽 실제 Trace 데모 4개와 자동 순환 코드는 그대로다.

VizLab 공개 홈의 큰 제목·작은 보조 제목·왼쪽 정렬 관계를 참고했다. ClusterLab의 Black Han Sans 제목, Pretendard 보조 문구, 포레스트 그린과 블랙은 유지했다. 제목은 데스크톱 `clamp(48px, 6vw, 96px)`, 520px 이하 `clamp(48px, 14vw, 64px)`이다. 보조 문구는 각각 `clamp(24px, 1.9vw, 30px)`와 `clamp(20px, 5.6vw, 24px)`이며 줄 높이는 1.45다. 제목 아래 간격은 16px, 버튼 위 간격은 28px로 정리했다.

| 화면 폭 | 제목 | 보조 문구 |
|---|---:|---:|
| 1920px | 96px | 30px |
| 1440px | 86.4px | 27.36px |
| 1024px | 61.44px | 24px |
| 768px | 48px | 24px |
| 390px | 54.6px | 21.84px |
| 320px | 48px | 20px |

2D와 구조형 실험실의 공통 `LabWorkspace`에서 저장값이 없을 때 오른쪽 설정·분석 패널의 기본값을 `false`로 바꿨다. 최초 React 상태 생성 시 적용하므로 열린 패널을 나중에 닫는 효과를 사용하지 않는다. 데스크톱의 기존 저장된 열림/닫힘 및 폭 복원을 유지한다. 모바일 800px 이하에서 진입할 때 닫는 기존 정책도 유지한다. 집중 모드, 탭, 파라미터와 계산 코드는 변경하지 않았다.

## 화면 비교

동일한 브라우저와 높이 1000px에서 캡처했다. 1440px 제목은 57.6→86.4px, 보조 문구는 23.04→27.36px이다. 390px은 각각 44→54.6px, 18→21.84px이다. 1440px에서는 기존 데모 크기와 수직 중앙 정렬을 유지했고 모바일에서는 설명과 여백이 줄어 데모가 더 위에서 시작한다.

| 폭 | 변경 전 | 변경 후 |
|---|---|---|
| 1440px | [전](home-polish/before-1440.png) | [후](home-polish/local/home-1440.png) |
| 390px | [전](home-polish/before-390.png) | [후](home-polish/local/home-390.png) |

[VizLab 참고 화면](home-polish/vizlab-reference.png), [기존 글자 크기](home-polish/before.json), [로컬 18개 화면 측정](home-polish/local/verification.json).

1920/1440/1024/768/390/320px에서 홈 및 K-Means·TTSAS를 확인했다. 홈 버튼 3개와 데모 4개, 정확한 보조 문구, 소개 카드 제거, 두 실험실의 초기 닫힘, 가로 넘침 없음, 브라우저 오류 0건을 확인했다. 데스크톱에서는 패널을 닫은 공간 310px을 시각화 영역이 사용한다. 좁은 화면에서는 기존 드로어 정책을 유지한다.

## 검증 및 배포

- TypeScript, ESLint, 프로덕션 빌드 통과. 기존 500kB 이상 청크 안내는 유지된다.
- Vitest 46파일·651개 전부 통과 (`--maxWorkers=1`).
- 홈 기존 반응형 검사: 9개 폭×2개 높이×사이드바 2상태 통과. 글자 크기 및 데이터 편집기 7폭 검사 통과.
- 패널 기본값과 저장 복원, 기존 리사이즈·키보드·전체 화면·가이드 표적 회귀: Chromium/mobile 7통과·1조건부 생략. 신규 두 실험실 검사에서 패널 및 집중 모드 조작으로 Worker 계산 요청 수와 Trace 재생 위치가 변하지 않음을 확인했다.
- 최초 전체 Playwright는 121통과·14조건부 생략·1실패였다. 모바일 COP-KMeans에서 설명 높이가 변할 때 설정 드로어가 재생 버튼을 덮는 경계 측정 문제를 발견했다. 기존 관찰 대상인 stage/재생 컨트롤에 더해 stage의 캔버스·설명·도크 자식의 크기 변화를 관찰하도록 보완했다. rAF 일괄 갱신과 계산 입력은 그대로다. [최초 실행](home-polish/browser-first.json), [발견 화면](home-polish/mobile-overlap-before-fix.png)을 보존한다.
- 최종 빌드에서 제약 모델·실험실 셸·작업 공간 3개 spec을 재검증해 **26통과·2조건부 생략·0실패**였다. 두 실험실 신규 검사에는 모바일 패널 하단이 재생 영역을 침범하지 않는 검증도 추가했다. [보완 후 실행](home-polish/browser-panels-fixed.json).
- 최종 로컬 전체 Playwright는 **122통과·14조건부 생략·0실패·0flaky**로 완료됐다(15.6분). 최초 실패를 숨기거나 표적 검사 결과를 전체 통과로 합산하지 않았다. [최종 전체 실행](home-polish/browser-final.json).
- [Actions 41472349888](https://github.com/oyueo-mm/ClusterLab/actions/runs/41472349888)의 validate `125368929811` 및 Pages deploy `125380309988` 모두 성공했다. 원격 TypeScript·ESLint·빌드·Vitest **651/651·46파일**, 전체 Chromium/mobile **122통과·14조건부 생략·0실패**다(브라우저 17.4분). [원격 단계별 상태](home-polish/ci-status.json), [로그 요약](home-polish/ci-summary.json).
- [공개 사이트](https://oyueo-mm.github.io/ClusterLab/)에서 6개 폭×홈/두 실험실 **18구성**, 브라우저 오류0건·가로 넘침0건·초기 설정 패널 닫힘을 확인했다. 실제 홈 Worker와 폰트, 두 실험실의 설정·폭 저장/복원·집중 모드·Trace/계산 유지 검사는 데스크톱/mobile **8/8 통과**다. [공개 화면 및 측정](home-polish/public/verification.json), [공개 상호작용 결과](home-polish/browser-public.json).
- 공개 1440/390px 스크린샷도 [데스크톱](home-polish/public/home-1440.png)·[모바일](home-polish/public/home-390.png)로 보존했다. 공개 JS·CSS 두 번들의 SHA-256이 최종 로컬 빌드와 일치한다. 제품 배포 커밋은 **`96d9bab381065e2452584acb70ca629bd69d2ab8`**이며 [배포 명세](home-polish/release.json)에 기록했다. 후속 검증 문서 커밋은 `[skip ci]`로 남기며 배포 제품 코드는 바꾸지 않는다.

실제 휴대전화 하드웨어 검사는 수행하지 않았다. 알고리즘 마스터의 미구현 79개 후보는 이번 작업 범위 밖이며 기존 기록을 유지한다.
