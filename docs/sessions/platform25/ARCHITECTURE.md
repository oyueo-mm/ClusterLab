# 현재 아키텍처

2026-10-31. [직전 구조](sessions/foundation/ARCHITECTURE.md)와 기존 버전 문서를 보존했다.

## 앱과 데이터

App은 기존 홈/실험실/데이터/비교/가이드/도감을 유지하며 lazy `#structured`를 추가한다. 홈은 legacyAlgorithms 13개와 11개 데이터셋, 프리셋 32개·디자인·폰트·편집 제스처를 유지한다.

`dataset.ts`는 numeric/categorical/mixed/graph/matrix/timeseries/stream/constrained union이다. numeric은 모든 원본 특성, graph는 노드 ID와 실제 가중 간선이다. displayPoints의 축 투영/원형 배치는 표시 전용이며 계산은 numericRows의 모든 차원 또는 원래 간선을 사용한다. 표시 변경으로 수학적 입력이 달라지지 않는다.

`datasetValidation.ts`는 unknown JSON의 직사각형·유한 값·차원/이름·노드 고유성·간선 끝점·시간 순서·제약 모순을 검사한다. 스키마 유효성과 실행 호환성은 구분한다. [형식과 지원 범위](DATA_FORMATS.md)를 따른다.

`datasetExecution.ts`는 지원 여부→입력/파라미터/자원 검사→동적 로더→계산을 연결한다. runDataset은 partition/computedRows/sourceDimensions/trace를 반환한다. 제품 Worker도 같은 준비 단계와 원본 Dataset을 엔진 네 번째 인수로 전달한다. 기존 Point[] 계약을 유지한다.

## 실행

registry의 25개 loader는 선택 모듈만 import한다. parameters 스키마는 UI/검증 공통이다. algorithmDetails에 신규 논문·검증·복잡도·Trace·시각화·한계가 있다. 기존 메타데이터 전수 감사는 남아 있다. run.ts는 정적 동기 테스트 API이며 제품 Worker가 import하지 않는다.

algorithmDefaults는 AP 반복 200회와 PAM/ROCK 기존 기본값을 관리한다. 신경 가스의 결과는 BMU 양자화이며 자동 커뮤니티 추출로 설명하지 않는다. 관련 학습법 분류와 프로토타입 지표 적용 조건을 표시한다.

resources는 실제 알고리즘별 비용을 예측한다. 작업 공간 256MiB·Trace 64MiB는 실행 정책이며 가용 RAM 측정이나 peak 보장이 아니다. ND 원본과 JSON 파싱 공간도 추정한다. 새 전역 점 수 상한은 없다. O(n²) 엔진은 위험한 할당 전에 오류를 반환한다.

useExperiment는 Dataset을 캐시 키에 포함하고 세대 ID로 stale 결과를 거부한다. 취소/페이지 이동은 Worker.terminate()로 실제 중단한다. 진행 메시지는 단계·실제 기록 수다. 계산 pause/resume·청크 실행·Worker pool은 미구현이며 재생 일시정지와 구별한다.

## Trace와 렌더링

immutable patch/undo·희소 label delta·중심 delta·48이벤트 checkpoint를 유지한다. 조밀한 레이블 변경은 먼저 개수를 세어 버려질 대량 delta 객체 생성을 피한다.

analysisDelta는 바뀐 필드 before/after만 저장한다. 동일 W/S/L/고유벡터는 공유하며 내용 비교·복사로 호출자의 mutation으로 과거 상태가 바뀌지 않게 한다. kind 전환의 필드 제거와 역복원을 검증한다. 예산 초과는 명시적 실패다. JSON 직렬화는 공유 참조를 풀기 때문에 retained heap과 다르다.

AlgorithmAnalysis는 W/L/고유벡터·AP S/R/A·rho/delta/parent/halo·축소 대표점·뉴런 순위/오차/간선 나이·배치 방문수·medoid 표본/제안/전체 비용을 표시한다. 행렬은 접힌 상태로 시작하고 펼친 부분만 10×10 페이지로 표시한다. 계산은 전체 행렬이다. Spectral은 전체 K축으로 학습하고 화면은 첫 두 축만 보여준다. 실제 임베딩 중심 이동을 보간한다.

Canvas는 안정 뉴런 ID와 실제 간선·CURE 대표점을 그린다. 점/간선은 viewport LOD를 적용하고 표시/전체 수를 알린다. 관측점 exemplar는 표시 축으로 재투영한다. 보간은 실제 중간 계산과 구분하며 reduced-motion을 따른다.

## 남은 병목

기존 최대 100작업 splice delta Undo/Redo와 CSV/JSON을 유지한다. 전체 교체/복원은 O(n)일 수 있다. 새 구조형 편집은 JSON 원문·파일 입출력·축 선택이며 그래프 드래그/3D 회전/속성 표/구조형 Undo/비교는 아직 없다.

Worker 메시지는 object clone이다. TypedArray transferable·스트리밍 파서·희소 고유해·GPU/WASM은 미도입이다. 모든 기존 엔진의 대형 배열·거리 연산을 해결한 상태가 아니다. 장시간 누수·peak·대규모 브라우저 전송/렌더링은 추가 과제다.
