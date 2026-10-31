# ClusterLab v0.6 검증 보고서

검증일: 2026-10-29 (Asia/Seoul). 기준 v0.5 main: `bb7f9f9dffde5d638557a54fc3e92cb6443f4127`. 원격 fetch 후 로컬과 일치함을 확인했습니다. 기존 프로젝트·라이브러리를 사용하고 새 런타임 의존성은 추가하지 않았습니다.

이전 기록: [v0.1](v0.1/VALIDATION.md) · [v0.2](v0.2/VALIDATION.md) · [v0.3](v0.3/VALIDATION.md) · [v0.4](v0.4/VALIDATION.md) · [v0.5](v0.5/VALIDATION.md). 기존 v0.4 보고서는 별도 경로로 보존하고 이미지 링크만 새 상대 위치에 맞췄습니다.

## 홈 타이포그래피

| 폭 | 메인 제목 전→후 | 부제목 전→후 | 버튼 전→후 |
| --- | --- | --- | --- |
| 1920px | 48→54px | 27→31px | 14→16px |
| 1440px | 46.8→52.56px | 27→31px | 14→16px |
| 1024px | 40→42px | 26→28px | 13→14px |
| 800·768px | 44→48px | 27→30px | 14→15px |
| 390px | 31.98→33.54px | 25→26px | 13→14px |
| 320px | 28→28px | 24→24px | 12→12px |

데스크톱 기본 제목은 `clamp(42px, 3.65vw, 54px)`입니다. Black Han Sans·Pretendard·#34564D·검은 부제목·순백 배경·버튼 형태·높이·가로 배치를 보존했습니다. Grid의 `.hero-copy { align-self: center }`와 800px 이하의 `start`는 그대로입니다. 글꼴 크기에 따라 그룹 높이가 바뀌어도 오른쪽 `.home-cycle`에 맞춰 중심을 계산합니다.

v0.5의 레이아웃 검사 36개 조합(1920·1440·1024·820·801·800·768·390·320px × 높이 600·1080px × 접힌/펼친 사이드바)을 그대로 사용합니다. 실제 텍스트 경계·버튼 내용·겹침·가로 넘침·두 버튼 정렬·중심 오차 1px 미만·모바일 상단 여백을 검사합니다. 340px 이하의 기존 카드 한 열 배치는 유지합니다.

## Undo/Redo와 메타데이터

- `src/editor/history.ts`: 현재 값·past·future의 순수 상태 전이. 각 상태는 순서 있는 `points`(x/y/label/features), 기반 `preset`, 실제 생성에 적용한 `options`입니다. 스냅샷은 확정 시에만 좌표·features 배열·옵션을 복사하고 최대 100개 작업을 유지합니다.
- `useEditorHistory.ts`: React 상태와 동기 참조를 연결합니다. 연속 명령은 최신 기록에 적용하며 빈 Undo/Redo·동일 내용의 작업은 같은 상태를 반환합니다. Undo 이후 새 변경만 future를 폐기합니다. 600개 초과 입력도 히스토리 경계에서 거부합니다.
- App의 데이터 추가·이동·삭제·선택 삭제·전체 삭제·프리셋 변경·재생성·파일 가져오기가 같은 commit 경로를 사용합니다. 복원·데이터 교체 후 선택을 초기화하여 과거 인덱스를 재사용하지 않습니다.
- 생성 입력창의 초안 옵션은 기록된 생성 옵션과 분리합니다. 입력만 수정하면 작업이 생기지 않습니다. 재생성을 확정한 뒤 Undo하면 이전 데이터와 이전 생성 옵션이 함께 복구되고 Redo하면 새 생성 옵션도 복구됩니다. 기반 프리셋은 수동 편집 중 유지하여 다시 생성할 수 있습니다.
- 가져온 파일은 사용자 데이터(`preset=""`)로 표시합니다. 갤러리에 무관한 프리셋을 선택 표시하지 않고 실험실·비교 select에 `사용자 데이터`를 표시합니다. 프리셋 재생성은 비활성화합니다. Undo로 원래 프리셋·옵션·재생성 가능 상태를 복구합니다. CSV/JSON 형식은 변경하지 않았습니다.
- Lucide Undo2·Redo2, aria-label·title·disabled 상태를 추가했습니다. Ctrl/Cmd+Z, Ctrl+Y, Ctrl/Cmd+Shift+Z는 데이터셋 페이지에서만 처리합니다. input(숫자 포함)·textarea·select·contenteditable은 기본 키 동작을 보존합니다.

## 포인터 트랜잭션과 성능

Canvas는 `idle / moving-point / drawing-points / deleting-point / selecting / panning` 상태 중 하나만 수행합니다. 선택 도구·원본 데이터·뷰·시작 좌표·pointerId·버튼을 드래그 시작에 고정합니다.

점 추가·이동·삭제는 Canvas Ref의 미리보기 버퍼만 갱신합니다. 기존 rAF 렌더러가 그 버퍼를 읽고 PointerUp에서 한 번만 부모에 전달해 한 작업을 확정합니다. 연속 추가는 배열에 추가된 점만 넣고 점 이동은 한 점만 교체하여 매 PointerMove에 부모 React 상태나 전체 히스토리를 복사하지 않습니다. 한 번의 드래그가 50개 점을 생성해도 Undo/Redo는 한 번입니다. 움직이지 않은 클릭 이동·원위치로 돌아온 이동·빈 곳 삭제·600개에서의 추가 시도는 기록을 만들지 않습니다.

Trace가 없는 편집 Canvas는 점 개수가 같은 데이터 교체에서도 points 참조가 바뀌면 표시 캐시를 갱신합니다. 같은 개수의 label 변경·가져오기·Undo/Redo가 이전 라벨 색상을 계속 표시하지 않도록 했습니다.

PointerCancel·캡처 상실·리사이즈·포커스 상실·탭 숨김·도구/외부 데이터 변경·페이지 이동은 미확정 데이터 버퍼를 폐기합니다. Canvas 밖에서 정상 PointerUp하면 캡처를 통해 전체 경로를 한 번 확정합니다. 마우스 버튼 조합이 바뀌면 미확정 편집을 취소합니다. Pan/zoom은 데이터 히스토리에 들어가지 않으며 취소 후에도 마지막 보기 위치는 유지합니다.

## 우클릭 이동과 연속 추가

- 우클릭 이동은 편집 Canvas에서만 `pointerType="mouse"`, `button=2`, `buttons=2`를 확인해 우선 처리합니다. 모든 도구에서 `view.current.panX/panY`를 사용하고 `grabbing` 커서를 표시합니다. 선택된 도구·원본 데이터·히스토리는 유지합니다. 기존 화면 이동 도구와 점 이동 도구의 빈 공간 이동도 유지합니다.
- 컨텍스트 메뉴는 편집 Canvas의 onContextMenu에서만 막습니다. 툴바·실험실 Canvas 등 다른 영역에는 기본 메뉴를 유지합니다. 캡처 설정·해제·상실·취소를 명시적으로 정리합니다.
- `PointStroke`는 누적 경로 거리를 이용해 12 CSS px마다 샘플을 생성합니다. 이벤트 사이 선분을 보간하고 코너의 남은 거리도 다음 선분으로 넘깁니다. 정지 상태에서는 추가하지 않고 빠른 드래그와 느린 드래그의 밀도가 같습니다. 부동소수점 경계의 중복 샘플도 방지합니다.
- 데이터 좌표는 기존 `unproject()`를 사용합니다. zoom·pan을 반영하고 샘플 간격에 devicePixelRatio를 곱하지 않습니다. 드래그 시작 시 클래스 값을 고정합니다. 기존 점의 label·features·순서를 보존하고 새 점은 기존 단일 추가와 같은 좌표·선택 label만 가집니다.
- 남은 수용량(600−현재 개수)까지만 보간합니다. 590개에서 한 드래그로 10개만 추가되고 이후 추가 시도는 데이터·Redo 기록을 바꾸지 않습니다. 화면을 가리는 반복 알림은 추가하지 않았습니다.
- 두 번째 손가락이 들어오면 첫 손가락의 미확정 편집을 취소하고 기존 두 손가락 거리 비율 확대·축소로 전환합니다. 손가락을 뗀 뒤 새 터치는 별도 작업입니다.

## 테스트 결과

- ESLint·TypeScript: 통과.
- Vitest: 11개 파일, 146개 테스트 통과. 기존 132개와 히스토리 9개·경로 보간 5개입니다.
- 프로덕션 빌드: 통과. 알고리즘 Worker 번들은 v0.5와 같은 `worker-DyzJT8Zu.js`입니다.
- 전체 프로덕션 Playwright: **34개 통과 / 12개 역할별 중복 검사 생략 / 실패·재시도 0** (8.3분). 데스크톱에서 마우스·폭 행렬·전체 라운드를 검증하고 모바일 프로젝트에서는 별도의 네이티브 터치·핀치 및 기존 모바일 기능을 검사합니다. [결과 요약](screenshots/v06/e2e-summary.json).

새 테스트는 실제 Canvas 입력과 JSON 내보내기 결과를 사용합니다. 단일 추가/이동/삭제·선택 삭제·전체 삭제·50점 드래그·Redo 분기 폐기·no-op·100개 기록 상한·label/features·프리셋/옵션·CSV/JSON·단축키 범위·기본 텍스트 Undo·다섯 도구 우클릭 이동·ContextMenu 범위·zoom/pan 좌표·600개 제한·캡처 취소·화면 밖 해제·리사이즈·페이지 이동·네이티브 CDP 터치/핀치를 검증합니다. DOM 테스트를 위해 추가한 textarea/select/contenteditable은 테스트 실행 중에만 생성되며 제품 UI에는 들어가지 않습니다.

기존 테스트를 유지하여 13개 알고리즘·32개 프리셋의 해시·실제 Worker·재생/되감기·1~200 속도·비교·13개 교재·입출력·화면 밖 생명주기·홈 11개 데이터셋 자동 순환·13개 전체 노출·GMM 다섯 라운드의 초기/E/M/최종 타원 및 다음 라운드 전환을 검사합니다. 실패하는 테스트를 삭제하거나 기능 검증을 완화하지 않았습니다.

## 화면·성능 증거

[1920 홈](screenshots/v06/home-1920.png) · [1440 홈](screenshots/v06/home-1440.png) · [1024 홈](screenshots/v06/home-1024.png) · [800 홈](screenshots/v06/home-800.png) · [768 홈](screenshots/v06/home-768.png) · [390 홈](screenshots/v06/home-390.png) · [320 홈](screenshots/v06/home-320.png)

[1440 편집기](screenshots/v06/editor-1440.png) · [768 편집기](screenshots/v06/editor-768.png) · [390 편집기](screenshots/v06/editor-390.png) · [320 편집기](screenshots/v06/editor-320.png) · [터치 편집기](screenshots/v06/editor-touch.png)

테스트 실행의 스트로크 rAF 간격 측정은 Playwright의 `stroke-frame-times` 첨부와 `browser-evidence` 아티팩트에 기록합니다. 홈·실험실 프레임 측정도 기존 quality 테스트를 유지합니다. 자동 브라우저 측정은 실제 모든 장치의 60FPS 보장을 의미하지 않습니다.

로컬 50점 스트로크 측정: 36개 프레임 간격, p95 16.7ms, 최대 16.8ms. [JSON 증거](screenshots/v06/e2e-summary.json)에 함께 보존합니다.

## 배포와 공개 사이트 재검증

기존 main push → Actions 검증 → GitHub Pages 경로를 사용합니다. 배포 후 `CLUSTERLAB_BASE_URL=https://oyueo-mm.github.io/ClusterLab/`로 같은 테스트를 실행할 수 있습니다. 공개 검증은 `tests/v06.spec.ts`의 편집·터치·글꼴 검사와 기존 `tests/v05.spec.ts`의 반응형 중앙 정렬 검사를 포함합니다. 배포 SHA·Actions 결과·공개 검사 결과는 최종 작업 보고에서 함께 제공합니다.

공개 사이트: https://oyueo-mm.github.io/ClusterLab/

## 남아 있는 제한

- 히스토리는 현재 세션 메모리의 최대 100개 작업이며 새로고침 후에는 유지하지 않습니다. 기존 JSON 파일 형식에는 Undo 기록·화면 보기 상태를 추가하지 않습니다.
- Canvas는 기존처럼 전체를 매 프레임 다시 그립니다. 공간 인덱스·부분 다시 그리기는 추가하지 않았습니다. 터치는 Chromium 모바일 에뮬레이션과 네이티브 터치 이벤트로 검증하며 실제 모바일 기기 실측은 별도입니다.
- 드래그 미리보기 중에는 데이터 개수/부모 상태가 마지막 확정 값이고 마우스/손가락을 놓으면 갱신됩니다. 보기 이동/확대는 Undo 대상이 아닙니다.
- 편집 중 0~1개 점은 허용하지만 기존 알고리즘 계산·파일 가져오기의 2~600개 입력 규칙은 그대로입니다. CSV는 기존 단순 헤더 규격이며 인용부호 안 쉼표 등 전체 RFC 문법 지원을 추가하지 않았습니다.


---

2026-10-31 플랫폼 확장 기반의 새 검증 기록은 [expansion/VALIDATION.md](expansion/VALIDATION.md)에 추가했습니다. 위 v0.6 검증 기록은 보존합니다.


## 2026-10-31 플랫폼 확장 검증 (기존 기록 보존)

실행 엔진 25개, 신규 후보 119개 중 12개 실제 실행/107개 미구현이다. 신규 10개 계산·Trace·전용 분석·파라미터·가이드와 독립 수치를 통합했다. 타입/ESLint/production build 및 Vitest 247/247(21파일) 통과. NumPy 2.5.4/SciPy 1.18.1/sklearn 1.7.2는 검증 전용으로 실제 실행했고 제품 의존성은 추가하지 않았다.

신규 플랫폼 Playwright Chromium/mobile 6/6과 Firefox/WebKit 6/6이 통과했다. 실제 Worker, 모든 원본 ND 차원, 실제 가중 간선, 표시 변경과 계산 분리, 전후 탐색, 행렬 페이지, 오류·제약 모순·7개 폭을 확인했다. 전체 기존 회귀/원격 Actions/Pages 결과는 [현재 세션 보고서](SESSION_REPORT.md)를 따른다. 초기 테스트 선택자 실패를 실제 알고리즘 실패와 구별하고 증거를 보존했다.

자료: platform/*.json 및 스크린샷, research의 원문 열람 범위·한계, ALGORITHM_REGISTRY 전체 후보 표, DATA_FORMATS 실제 지원, PERFORMANCE 관측. 이전 expansion 증거와 버전 검증 문서를 덮어쓰지 않았다. 100만 Node 성공을 브라우저 FPS/메모리 peak 보장으로 사용하지 않는다. 전체 마스터 목표는 미완료다.

최종 로컬 보완: 도감·플랫폼 18/18 통과. 중복 제외 Chromium/mobile 46통과/12기존 조건부 skip, Firefox/WebKit 신규6통과. 최초 오류는 테스트 검색/option 선택자 가정이며 수정 후 검증했다. 전체 단일 원격 결과는 SESSION_REPORT에서 별도로 기록한다.

원격 확정: Actions41187164683/source732a410에서 단위247개 및 전체 브라우저46통과/12기존 조건부 skip/0실패, validate/deploy 모두 success. 공개 Pages Chromium/mobile12검사도 통과했다. 증거와 실제 범위는 현재 SESSION_REPORT 및 platform/browser-public.json을 따른다.
