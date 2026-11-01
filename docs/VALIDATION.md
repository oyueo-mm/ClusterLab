# ClusterLab v0.6 검증 보고서

## UI·추천 데이터셋 개편 검증 중 — 2026-11-01

현재 개편의 원자료는 `ui-datasets/`에 보존한다. 전체 단위 **592/592·43파일**: 기존532개, 추천54개, 라우팅1개, 교재 메타데이터1개, 실제 학습 현상4개. 동심원의 K-Means 한계, ε 변화에 따른 DBSCAN 노이즈, TTSAS의 실제 유보/재방문, γ 변화에 따른 혼합 데이터 배정 차이를 계산해 검사한다. 추천212구성의 원본 생성·시드 재현·파라미터·실제 엔진·Trace·행 수를 확인한다. 기존142개 계산/데이터/홈/이력파일은 c4d6a7d와 동일하다.

첫 새 탐색 Chromium/mobile6/6 통과 후 전체100개를 실행했다: **66통과·22실패·12기존생략**. 실패 원자료 `browser-first-full.json`을 남겼으며, 새 UI 제목/카드명/탭/호환 경로/스크린샷 스크롤 조건과 모바일 CTA를 보완해 실패22개를 재검증 중이다. 이는 최종 전체 통과/원격 배포 결과가 아니다. 공개 사이트 성공은 별도 최신 절에서 확정해야 한다. 아래 이전 버전의 검증 기록을 이번 개편 검증으로 합산하지 않는다.

> 최종 공개 체크포인트:53개(기존13+후보40), 미구현79개, 완전 인증0. 제품main fc5cc15·Actions41305149245 validate/Pages 성공. 원격532/39파일·전체브라우저78통과/12기존생략, 로컬 다섯 spec cross38/38, 공개4브라우저8/8. 아래 중간 기록보다 SESSION_REPORT 마지막 확정 절을 우선한다.

> 현재53개 소스(기존13+후보40), 미구현79개, 완전 인증0. 안정50개는 sessions/platform50에 원문 보존했다. 전체532/39파일·로컬78통과/12기존생략·후속순차4/4·다섯 spec Firefox/WebKit38/38이 통과했다. 새 main/CI/Pages는 SESSION_REPORT 마지막 확정 결과를 따른다. 아래 과거 수치는 당시 기록이다.

현재 2026-11-01 재개 변경의 검증 범위는 이 문서 마지막 절을 따른다. 아래 v0.6의 600개 제한·스냅샷 히스토리 설명과 2026-10-31의 25엔진/107개 미구현 수치는 당시 기록으로 보존한다. 현재 입력 고정 상한은 제거됐으며 실행 엔진은 44개다. 과거 Pages 성공을 이번 변경의 배포 성공으로 재사용하지 않는다.

검증일: 2026-10-29 (Asia/Seoul). 기준 v0.5 main: `bb7f9f9dffde5d638557a54fc3e92cb6443f4127`. 원격 fetch 후 로컬과 일치함을 확인했습니다. 기존 프로젝트·라이브러리를 사용하고 새 런타임 의존성은 추가하지 않았습니다.

이전 기록: [v0.1](v0.1/VALIDATION.md) · [v0.2](v0.2/VALIDATION.md) · [v0.3](v0.3/VALIDATION.md) · [v0.4](v0.4/VALIDATION.md) · [v0.5](v0.5/VALIDATION.md). 기존 v0.4 보고서는 별도 경로로 보존하고 이미지 링크만 새 상대 위치에 맞췄습니다.

## 홈 타이포그래피

| 폭        | 메인 제목 전→후 | 부제목 전→후 | 버튼 전→후 |
| --------- | --------------- | ------------ | ---------- |
| 1920px    | 48→54px         | 27→31px      | 14→16px    |
| 1440px    | 46.8→52.56px    | 27→31px      | 14→16px    |
| 1024px    | 40→42px         | 26→28px      | 13→14px    |
| 800·768px | 44→48px         | 27→30px      | 14→15px    |
| 390px     | 31.98→33.54px   | 25→26px      | 13→14px    |
| 320px     | 28→28px         | 24→24px      | 12→12px    |

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

## 2026-11-01 재개 작업 — 44개 실행 엔진 검증 범위

현재 소스는 기존 13개 + 신규 후보 31개 = **44개 실행 엔진**을 연결한다. 직전 25개에서 추가된 것은 자동 K 4개, 그래프 커뮤니티 7개, 범주형/혼합형/부분공간 4개, DenStream, 행렬 2개, K-Shape로 총 19개다. 신규 후보 119개 중 88개는 실행 미구현이다. 실행 가능 수·제한 범위 독립 검증·전체 마스터 완전 구현 인증을 구분한다. 전체 후보의 원문 조사도 아직 끝나지 않았다.

아래는 직접 실행한 전용 단위/독립 수치 검증과 해당 원자료다. 새로운 전체 브라우저·회귀·프로덕션 빌드·Actions·Pages 검증은 **진행 중**이며 최종 상태/커밋 SHA는 [SESSION_REPORT.md](SESSION_REPORT.md)에서 별도로 확정한다. 이 절은 과거 또는 부분 실행의 통과 수를 전체 최신 결과로 합산하지 않는다.

### 7개 연구 단위의 실제 독립 검증

| 연구/구현 범위                       | 실제 독립 근거와 비교                                                                                                  | 전용 단위 테스트                                          | 상세 기록                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| X/G/Dip/DP-Means                     | NumPy2.5.4/SciPy1.18.1/diptest0.11.0: BIC·AD/logCDF·dip·bootstrap/순차 목적식                                          | auto-models.test.ts 15개 통과                             | [자동 K](research/AUTO_MODELS.md)          |
| Louvain/Leiden/LPA/Girvan–Newman/MCL | NetworkX3.6.1/원저자 leidenalg0.12.0/igraph1.0.0/NumPy: 원본 Q·집약·분할, Brandes 점수/각 제거, MCL 곱/인플레이션/수렴 | community.test.ts 22개 통과                               | [커뮤니티](research/COMMUNITIES.md)        |
| CNM/Fluid                            | NetworkX3.6.1/NumPy2.5.4: 실제 모든 병합 ΔQ/최종 분할, ego one-hot 곱과 매 갱신 전체 count 재계산                      | graph-extra.test.ts 9개 통과                              | [추가 그래프](research/GRAPH_EXTRA.md)     |
| K-Modes/K-Prototypes/CLIQUE/PROCLUS  | NumPy2.5.4: 범주 빈도·평균·목적식, 전수 격자 성분, 모든 30개 ordered medoid 쌍의 locality/축/할당/정제                 | data-clustering.test.ts 19개 통과                         | [데이터 계열](research/DATA_CLUSTERING.md) |
| DenStream                            | NumPy2.5.4가 과거 관측/시각을 보존해 매 도착 가중 평균·RMS 반경을 재계산; 엔진과 별도 원문 경계 감사                   | denstream.test.ts 8개 + denstream-audit.test.ts 10개 통과 | [스트림 감사](research/DENSTREAM.md)       |
| Bimax/Cheng–Church                   | NumPy2.5.4: 독립 부분집합 전수 최대 직사각형, double-centering 모든 부분행렬 MSR와 삭제/부호/원본 검산                 | matrix-clustering.test.ts 13개 통과                       | [이중군집](research/BICLUSTERING.md)       |
| K-Shape                              | NumPy2.5.4/SciPy1.18.1: signal.correlate, 명시적 QᵀXᵀXQ/eigh, 독립 전체 clustering loop                                | timeseries-clustering.test.ts 8개 통과                    | [시계열](research/TIMESERIES.md)           |

각 연구 문서에 원문 열람 범위·수학적 선택·알고리즘별 계산/Trace/UI/가이드·한계·성능 JSON을 보존한다. Huang 원문 본문과 AS217 원문 전체의 직접 접근 제한, X-Means 공개 BIC 규약 문제, Fluid/원저자 PRNG 및 동률 차이, K-Shape 부호 선택/정지 정책처럼 독립 구현과 달라질 수 있는 부분을 감추지 않는다. 관련된 모든 데이터의 동일 최종 레이블이나 전역 최적을 보장하지 않는다.

Dip의 565개 fixture, Bimax의 3×3 모든512개+4×4 40개 입력, Cheng–Church의 225개 부분행렬은 **수치 비교 사례**다. 각각을 별도 테스트 함수 수로 부풀리지 않는다. Leiden의 16seed 연결성·모든 작은 분할/집약 Q, 600노드 작은 성분+고립점 회귀도 관련 전용 테스트 내부의 검증이다. 600은 이 회귀 입력의 크기일 뿐 상한이 아니다.

검증 전용 Python 라이브러리는 제품 런타임/브라우저 번들에 넣지 않았다. GPL diptest/leidenalg/igraph도 `.local`의 검증 환경에서만 사용하며 제품 코드를 복사하지 않는다. 실제 패키지 버전·원문/저자/공식 문서 출처는 각 연구와 fixture provenance를 따른다.

### 실제 원본 형식과 native output 통합

추가 [typed-integration.test.ts](../src/engine/typed-integration.test.ts)는 **24/24 통과**했다. graph 전용 31개와 함께 재실행한 결과는 **3파일 55/55 통과**다. 이 수를 위 전용 단위 테스트와 다시 합산하지 않는다. 해당 시점 global `npx tsc -b --pretty false`와 새 파일 ESLint가 통과했다.

이 통합 검사는 다음 수학적 동작을 실제 동적 `runDataset` 로더와 동기 typed `run`에서 확인한다.

- 그래프 7개에서 실제 가중 간선·노드 순서·loop/중복 규약과 원본 Q를 직접 edge sum으로 검산한다. 표시 위치를 임의로 바꾸어도 실제 분할/native 결과가 같다. 계산 후 전체 역재생이 초기 상태를 복구한다.
- X/Y가 모두 같은 수치 입력도 원본 세 번째 차원으로 정확한 union-kNN을 구성하며 실제 입력 간선과 비교한다. 지원되지 않는 형식·방향·Fluid 가중치·GN loop를 몰래 버리거나 평탄화하지 않는다.
- n=3,000 path raw graph는 실제 m 기반 희소 공간으로 허용하고, 같은 n의 큰 neighbors numeric 변환은 할당/전수 계산 전에 예산 초과로 거부한다. 입력 절단·근사 성공을 반환하지 않는다.
- 동일 표시 좌표에서도 K-Modes/K-Prototypes의 원본 범주·수치 열에 대한 독립 비용·분할을 확인한다. CLIQUE는 실제 네 번째 차원의 성분 및 모든 중첩 memberships를 전수 격자 oracle와 비교한다.
- Bimax는 손계산 3×3 예제의 네 최대 직사각형 전체와 양쪽 소속을 반환한다. Cheng–Church는 반환 rows/columns/rowSigns로 원본에서 MSR을 직접 다시 계산한다.
- K-Shape는 독립 전체 실행의 실제 형태/목적값을 비교하며, 평균·표준편차 표시가 같아도 순서가 다른 파형의 결과가 달라짐을 확인한다. 특정 seed가 항상 참 군집 수/분할을 얻는다고 검사하지 않는다.
- DenStream은 실제 timestamp 간격에 따라 `3×2^(−λgap)+1` 가중치가 달라지는지, anchor 상대 CF를 원좌표 모멘트로 복원했을 때 실제 합이 맞는지 확인한다.

API 최상위 kind는 native output.kind와 일치하며 communities/subspaces/projected-partition/biclustering/timeseries-partition/stream-summary를 일반 partition으로 잃지 않는다. computedRows/sourceDimensions와 행렬 computedColumns/시계열 timeSeriesSteps는 실제 원본 범위를 반환한다. Spectral의 partition 계약은 유지하고 PROCLUS는 labels/medoids/dimensionsByCluster/influence/objective/converged의 projected-partition으로 보존한다.

### 표 편집·되돌리기·스트림 통합의 현재 상태

구조형 원본 속성 표·그래프 노드/간선 표·관측 추가·시드 생성 provenance와 100작업 Undo/Redo가 연결됐다. datasetHistory 단위 회귀는 10,000행 한 셀의 희소 경로·관련 없는 행 객체 공유, 한 관측의 단일 splice, 전체 교체/형식 변경/Redo 분기/작업 수를 검증한다. 페이지 표시 창은 16행×8열이며 계산 크기 상한과 다르다.

시계열 시간축 변경은 JSON에서, 값/ID는 표에서 편집한다. DenStream 자동 유입은 전체 prefix의 Worker 재계산이며 model 자체의 증분 CF와 구분한다. 기존 점 편집기/홈/32프리셋/11데이터셋/비교/속도/재생·되감기·사이드바의 최신 전체 브라우저 회귀는 검증 중이다. 과거 기능이 보존되도록 구현했음을 현재 소스 연결과 이미 확정된 과거 테스트 결과만으로 최신 브라우저 통과라고 표시하지 않는다.

### 재현 명령과 남은 검증

독립 fixture 생성: `scripts/auto_models_reference.py`, `community_reference.py`, `graph_extra_reference.py`, `data_clustering_reference.py`, `denstream_reference.py`, `matrix_reference.py`, `timeseries_reference.py`. 각 fixture의 실제 생성 버전은 research/fixtures에 기록돼 있다. 검증 전용 `.local` 환경이 필요한 도구는 해당 연구 문서의 절차를 따른다.

```powershell
npx vitest run src/engine/typed-integration.test.ts src/engine/community.test.ts src/engine/graph-extra.test.ts
npx tsc -b --pretty false
npx eslint src/engine/typed-integration.test.ts
```

미완료 검증: 이번 변경 전체의 브라우저/모바일/Firefox/WebKit와 프로덕션 build/Actions/Pages 최종 확인, 장시간 누수/peak, 대형 입출력/Worker 전송·취소 지연, 100k/1M 실제 그래프·긴 파형·많은 활성 CF, 실제 모바일 FPS. Node 성능은 [PERFORMANCE.md](PERFORMANCE.md)의 한정된 관측이며 60FPS·임의 기기 메모리 성공의 증명이 아니다. 전체 마스터 프로젝트는 아직 미완료다.

### 최신 통합 실행 보완 — 확정된 범위

- `auto_models_reference.py`, `community_reference.py`, `graph_extra_reference.py`, `data_clustering_reference.py`, `denstream_reference.py`, `matrix_reference.py`, `timeseries_reference.py`를 통합 환경에서 재실행해 **7개 모두 성공**했다. 실제 버전은 NumPy2.5.4/SciPy1.18.1/diptest0.11.0/NetworkX3.6.1/igraph1.0.0/leidenalg0.12.0이다. fixture 입력 사례 수를 테스트 함수 수로 합산하지 않는다.
- 전체 Vitest **426/426 통과, 실패0**를 확인했다. 이후 PROCLUS native projected-partition에 대해 독립 fixture의 선택 축·medoid·influence를 검사하는 테스트 1개를 추가해 개별 통과했다. typed integration은 현재 25개이며 이전 24개/합동55개 숫자는 앞선 실행 기록이다. **최종 전체 427개 재실행은 아직 확정 전**이다.
- [next-platform.spec.ts](../tests/next-platform.spec.ts)의 신규 **8개 시나리오×Chromium/mobile = 16/16 통과**다. 실제 번들 Worker에서 추가 19엔진의 고유 이벤트·원본 입력·역재생·전용 분석을 확인하고, 범주/혼합 셀·그래프 가중치·행렬 셀·시계열 값 편집·Undo/Redo·스트림 prefix/자동 유입·잘못된 이진/시간 입력·결과 내보내기를 검사했다. 1,000행×12열의 마지막 셀까지 편집/계산하며 1920/1440/1024/800/768/390/320px 표시 창을 확인했다.
- 통합 검증 중 raw graph의 화면 자원 추정에 실제 m 전달을 추가했고, 캐시 적중 시 traceIsCurrent 판정 오류를 수정했다. 현재 Trace의 전체 계산 결과 내보내기가 정상 작동한다.

추가 가이드 실제 Dataset/파라미터/이벤트를 실험실로 옮기는 사례는 검증 중이다. **전체 기존 브라우저 회귀·Firefox/WebKit 신규 교차 검증·원격 Actions/Pages는 아직 미실행**이며 16/16 신규 부분 결과와 구분한다. build/최종 타입·린트·전체 테스트 재실행의 최종 상태는 SESSION_REPORT에서 확정한다. 과거 2026-10-31의 Pages/브라우저 성공을 이번 버전에 전용하지 않는다.

## 2026-11-01 릴리스 전 최종 로컬 검증

타입·ESLint·프로덕션 빌드와 전체 **428/428·32파일** 통과. [unit-final](platform44/unit-final.json), [환경](platform44/environment.json), [기준21파일 소스 동일성](platform44/legacy-source-audit.json)을 보존했다. typed integration은26개이며 앞 절의24/25개는 개발 중 기록이다.

Chromium/mobile 전체 최초 실행은 **62통과·12기존 조건부 생략·2실패**였다. 두 실패는 일부 신규 교재의 참고자료가2개 미만인 경우였다. 실제 확인한 공식 GMeans·저자 small-variance 설명·PyClustering CLIQUE와 BCCC 문서를 보강했고, 기존 테스트의 참고자료 조건은 유지했다. 수정 빌드에서44교재 순회2/2가 통과했다. 따라서 **고유 구성64통과·12생략**이며 이를 로컬 전체 단일 재실행이라고 주장하지 않는다. 최초/수정 후 원자료는 [browser-local-first](platform44/browser-local-first.json), [browser-guides-final](platform44/browser-guides-final.json)이다.

신규9×Chromium/mobile18개는 위 전체 구성에 포함된다. 18을64에 중복 합산하지 않는다. 최종 빌드의 두 플랫폼 spec은 **Firefox/WebKit24/24 통과**했다. 실제29개 추가 엔진(이번19+직전10), 원본 데이터·편집·native 결과·되감기·가이드 단계 전달·오류를 확인했다. 기존 모든 기능의 Firefox/WebKit 검증이라는 뜻은 아니다. [browser-cross-final](platform44/browser-cross-final.json)을 따른다.

원격 Actions/Pages와 공개 사이트의 이번 버전 검증은 아직 대기 중이며, SESSION_REPORT 마지막 기록에서 별도로 확정한다. 이전 버전 Pages 성공과 재사용하지 않는다.

## 최종 원격·공개 확정 — 2026-11-01

최종 제품 소스fd78886, [Actions41257323667](https://github.com/oyueo-mm/ClusterLab/actions/runs/41257323667). Ubuntu/Node22 타입·lint·428개/32파일·build와 전체 Chromium/mobile **64통과·12기존 조건부 생략·0실패**, validate/deploy 모두 성공했다. 공개 a81a931 고유34구성(33+환경 충돌 후1재검사)과 계산 코드가 같은 최종fd78886 raw 가이드4구성을 구분해 확인했다. 최종공개4는 Chromium/mobile/Firefox/WebKit 모두 통과했다. 중복/재시도 수를 합산해 부풀리지 않는다. 근거는 platform44/{ci-validation,deployment,browser-public-first,browser-public-retry,browser-public-final}.json과 공개화면이다.

추가 로컬 Worker 시작 오류1회는 원인 미확정이고, 단독 진단10개·단독 해당검사·최종원격 전체에서는 재현되지 않았다. 별도 공개 기록 정리 실패는 동시 Playwright가 같은 결과 폴더를 사용한 ENOENT였으며 단독 재실행이 통과했다. 테스트 결과를 확인하기 전의 문서 성공 표현은 SESSION_REPORT와 ARCHITECTURE에서 정정했다. 해결된 수학 오류나 항상 성공 보장으로 설명하지 않는다.

## 50개 소스 통합 검증 — 진행 중

직전44개 검증 원문은 sessions/platform44에 보존했다. 이번 신규COP/3이산혼합/Walktrap/CPM은 타입·ESLint·build·전체Vitest509/509(37파일)와 독립oracle3스크립트 재생성 성공을 확인했다. 신규 Chromium/mobile8/8이 실제 원본 Worker·Trace/되감기·수치/실패/편집·native 출력·1000행·7폭을 검사한다. 최초4성공/4실패와 수정 후8성공을 platform50/browser-{first,targeted}.json/log에 구분해 보존한다. 첫 실패는 추가CL 기본쌍 가정과 접힌 트리 접근을 수정한 것이며 수학 oracle 실패가 아니다.

원본13모듈/프리셋/홈/디자인/workflow/의존성20파일의 Git clean-filter blob이4ac46eb와 동일하다(platform50/legacy-source-audit.json). 새 전역 데이터 상한은 없고 실제 byte 예산과 표시 창을 구분한다. 전체 회귀/cross/CI/Pages는 아직 검증 중이며 최종 결과는 SESSION_REPORT 마지막 절을 따른다. 소스50·후보37구현/82미구현·엄격한 전체 인증0이다.

## 로컬 검증 완료 체크포인트

전체509/37파일·type/lint/build·독립oracle3종, 전체브라우저72성공/12기존생략+새가이드2(고유74), 네 플랫폼spec의Firefox/WebKit34/34, 최종도감2/2가 통과했다. 후속10/10은 기존8을 포함해 중복 집계하지 않는다. 이번 원자료는 platform50, 상세/진단·배포는 SESSION_REPORT 마지막 절이다. 공개50개 배포는 아직 대기다.

## 순차3개 통합의 검증 — 53개 소스

안정50개 원문은 sessions/platform50/VALIDATION.md에 보존했다. 새3개를 포함한 타입·ESLint·build·전체532/39파일, 독립60원본/180공식 결과 재생성, 전체브라우저78성공/12기존 조건부 생략·순차4/4·후속동일4/4·다섯 플랫폼 spec Firefox/WebKit38/38이 통과했다. 최초529/3교재 규격 실패와 수정 후532/0은 platform53에 구분한다. 후속4개를 전체78개에 다시 더하지 않는다. 1과1e308의 실제 거리 그래프 배율 불변도 검사했다.

거리 후보는 판단 전, assign 대표는 갱신 후라는 표시를 보완했다. 실제 phase별 후보 거리·배정 집합 평균/SSE·유보/강제 생성·checkpoint/역진·원본/표시/seed 불변·단일/동일/경계·q>n/TTSASq무시·수치/자원 실패를 검사한다. 완전 인증0·소스53/후보40·79미구현이며 최종main/CI/Pages는 SESSION_REPORT 마지막 확정 절을 따른다.
