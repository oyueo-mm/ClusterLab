# 아키텍처 — 2026-10-31 확장 기반

## 기존 구조 감사

React App.tsx가 홈/실험실/편집/비교/가이드를 전환한다. engine/types.ts는 Point, Params, State, Trace 계약, run.ts는 동기 테스트 API, worker.ts는 제품 계산 경계다. algorithms/에 기존 13개 수치 구현이 있다. animation/renderer.ts는 Canvas, useExperiment.ts는 Worker 생명주기와 재생, homeCycle.ts는 4개 Worker의 11개 데이터셋 순환을 맡는다. data/presets.ts의 32개 데이터셋은 해시 회귀 검증 대상이다. editor/는 히스토리/제스처이며 v03/v04 CSS와 기존 디자인을 유지한다. .github/workflows/deploy.yml의 기존 배포 workflow를 유지한다.

## 현재 구현

- algorithms/의 엔진 함수 계약: Point[], Params, Recorder → 실제 State 변화. 신규 fuzzy.ts, bisecting.ts.
- registry.ts: 실행 가능한 15개만 loader와 메타데이터 등록. Worker에서는 import()로 선택한 엔진만 로드. run.ts는 기존 테스트/독립 검증을 위한 정적 동기 API이므로 제품 Worker가 import하지 않는다.
- parameters.ts: 기존 Settings의 스키마를 엔진 계층으로 이동. UI/검증/등록에 공유. 공통 기본값과 기존 API를 보존. PAM의 기존 kmeans++ 기본값은 BUILD 별칭으로 유지.
- validation.ts: 입력·알고리즘별 활성 파라미터 검증. UI 상한과 수학적 입력 도메인은 동일하지 않으므로 max는 엔진 전체 제한으로 강제하지 않는다.
- resources.ts: 알고리즘별 작업 공간/연산량 추정. 기본 작업 공간 256MiB, 상세 Trace 64MiB 예산. 이는 기기 가용 RAM 측정이 아닌 실행 정책이며 정확한 peak 예측은 아니다. 점 수 고정 상한은 없다. 예산 초과는 명시적 실패다.
- worker.ts: 입력 검사→바이트 예산→동적 import→실제 계산→Trace. phase 및 실제 기록 이벤트 수 진행 메시지. 부분 Trace를 완료로 반환하지 않는다.
- useExperiment.ts: 요청 ID로 stale 응답 무시. 취소는 Worker.terminate()로 실제 계산 중단, 완료/페이지 변경 시 해제, 재시도. 계산 pause/resume 및 Worker pool은 아직 미구현. 재생 pause와 계산 pause를 혼동하지 않는다.
- trace.ts: immutable field patch + undo + 48개 이벤트마다 checkpoint. 희소 레이블 변경은 labelChanges delta, Mean Shift 기존 중심 delta 유지. 상태 복원 applyStep/stateAt로 앞뒤 동일. 예산을 검사하고 넘으면 실패. 원본 이벤트별 대형 배열 생성 비용은 모든 기존 엔진에서 해결되지 않았다.
- K-Means: 예상 기록량에 따라 점별 또는 반복별 실제 할당/중심 갱신 기록. 전체 계산 동일, 기록 세분도만 다름. FCM은 실제 U/목적함수/중심, Bisecting은 실제 분할/할당/평균/트리/SSE를 기록한다.
- editor/history.ts: 공통 prefix/suffix를 제외한 splice delta와 메타데이터 저장, 최대 100작업. 전체 데이터 교체는 실제 전체 변경만큼 저장한다. 복원 때 현재 배열 생성은 O(n), 데이터 객체는 공통 구간을 공유한다.
- renderer.ts: viewport 픽셀 밀도로 표시 stride 선택, 가시 영역 밖 점 culling. 계산 입력은 바꾸지 않음. 표시 표본 비율과 전체 입력 수를 Canvas에 표시. 인덱스 기반 균일 화면 표본이므로 편향 없는 통계 표본을 보장하지 않는다.
- Compare: 이차 연산량이 큰 실루엣은 연산량 정책으로 생략하고 UI 표시. 전체 비교 계산은 Worker에 남는다.
- Catalog.tsx: lazy 페이지. 실행 15개와 미조사 117개를 구분. 신규 후보 전체 119개는 candidates.json. 기본 검색/계열/입력/구현 필터만 구현. 고급 필터/즐겨찾기/최종 검증 배지 미완료.

## 아직 바꾸지 않은 계약과 한계

Point는 x/y 및 optional label/features를 유지한다. N차원·원본 그래프·행렬·시계열·스트림·제약은 아직 미지원이며 프로젝트 목표로 남는다. Worker 메시지는 object clone이며 TypedArray transferable은 아직 없다. 파일 가져오기는 전체 문자열 방식이며 스트리밍 파서가 아니다. 100만 점 Node 실행 성공을 브라우저 전체 파이프라인 보장으로 사용하지 않는다.

## 다음 공통 인터페이스

Discriminated Dataset union 및 ExecutionResult union을 추가하되 legacy Point adapter를 유지한다. 데이터 유형별 엔진 호환성/시각화 계약을 registry에 선언한다. Trace event payload를 숫자/그래프/행렬/학습용으로 확장하고 렌더러를 family plugin으로 나눈다. 원본 N차원 배열은 투영 좌표와 분리하고, 그래프 간선은 좌표 거리 대신 입력 관계를 유지한다. pause 가능한 generator/청크 엔진과 기기 자원 기반 Worker pool은 별도 회귀 기준 후 도입한다.
