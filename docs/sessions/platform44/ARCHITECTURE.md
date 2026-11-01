# 현재 아키텍처

## 2026-11-01 재개 작업 — 현재 구조

현재 소스의 동적 실행 엔진은 **44개**다. 기존 13개와 신규 후보에 해당하는 31개를 구분하며, 119개 후보 중 88개는 아직 실행 엔진이 없다. 이 숫자는 실행 경로의 수이며 전체 마스터 검수 기준의 완전 구현 인증 수가 아니다. 이번 변경의 전체 브라우저·회귀·배포 검증은 진행 중이다. 아래 2026-10-31 절은 당시 구조를 보존한 기록이며 현재 지원 표는 [DATA_FORMATS.md](DATA_FORMATS.md)를 따른다.

### 원본 데이터와 표시

`Dataset` union과 기존 `Point[]` 계약을 함께 유지한다. 수치형·범주형·혼합형·그래프·행렬·시계열·스트림은 이제 원본 형식으로 실제 계산할 수 있다. constrained는 스키마와 제약 모순 검증만 있으며 실행 엔진은 없다. 모든 알고리즘이 모든 형식을 지원하는 구조가 아니다.

`supportsDataset`이 실제 호환 엔진만 허용하고 `prepareDataset`이 스키마·활성 파라미터·자원을 검사한다. `displayPoints`는 표시 축/범주 배치/그래프 좌표/시계열 평균·표준편차를 만들 뿐이다. 엔진은 네 번째 인수의 원본 Dataset으로 전체 특성, 범주 문자열, 간선, 행렬 셀, 순서 있는 파형, 실제 timestamp를 사용한다. 원본 그래프의 노드에는 ID와 표시 위치가 있으며 별도 노드 질량 필드는 없다. 가중 모듈성의 노드 질량은 실제 간선 차수에서 계산한다.

`runDataset`은 lazy loader를 사용하는 비동기 직접 API다. `run`은 같은 준비 단계와 네 번째 인수를 지원하는 동기 검증 API다. 제품은 Worker가 같은 준비 단계/loader를 호출한다. Worker의 완료 메시지는 Trace이며, API와 결과 내보내기는 최종 상태에서 `nativeResult`를 추출한다.

| 최종 결과 kind       | 수학적 출력                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| partition            | 원본 행/점에 대응하는 labels; Spectral도 이 계약을 유지                    |
| communities          | 실제 계층 levels·Q·수렴 정보; MCL의 중첩 memberships                       |
| subspaces            | CLIQUE의 실제 차원·구성원·격자/영역 및 전체 memberships                    |
| projected-partition  | PROCLUS의 labels·medoids·dimensionsByCluster·influence·objective·converged |
| biclustering         | Bimax/Cheng–Church의 행·열 biclusters와 양쪽 memberships                   |
| timeseries-partition | K-Shape의 전체 길이 형태·shift·실제 squared-SBD 목적값                     |
| stream-summary       | DenStream의 실제 시각·처리 수·살아 있는 micro-cluster CF                   |

API 최상위 kind는 output.kind와 같으며 computedRows는 표시 표본 수가 아닌 처리한 원본 행/노드/시계열 수다. sourceDimensions는 실제 특성 수이며 행렬에는 열 수, 시계열에는 파형 길이를 기록한다. 행렬의 computedColumns와 시계열의 timeSeriesSteps도 반환한다. PROCLUS의 선택 축/medoid/influence/비용은 전용 analysis와 native projected-partition에 보존한다. 범주형·혼합형 실제 중심은 전용 analysis에 있으며 최상위 결과는 partition이다.

### 레지스트리·실행·자원

44개 loader는 필요할 때 해당 모듈만 import한다. Params/parameters/algorithmDefaults가 실행 검증과 UI를 연결하며, 가이드는 실제 engine 및 필요할 때 experimentDataset을 지정한다. Bimax/Cheng–Church/K-Shape 미니 실험은 진짜 행렬/시계열, Fluid는 연결된 단위 가중치 그래프를 전달한다. legacy Point[]로 지원되지 않는 입력을 꾸며 실행하지 않는다.

Worker 취소는 terminate로 실제 계산을 중단하고, 세대 ID·원본 Dataset 캐시 키로 오래된 결과를 배제한다. 진행 보고는 준비 상태와 실제 기록 이벤트 수이며 산술 연산 전체의 완료 비율은 아니다. 계산 자체의 pause/resume·Worker pool은 아직 없다.

공통 작업 공간 256MiB/Trace 64MiB는 바이트 정책이다. 전역 행 개수 상한을 새로 두지 않는다. 실제 raw graph는 n과 m으로 희소 공간을 추정하고 numeric→union-kNN은 생성 비용을 별도로 반영한다. 화면 자원 안내도 실제 간선 수 m을 전달하도록 맞췄다. MCL은 n², G-Means는 원본 d², K-Shape는 파형 길이 L², CLIQUE/Bimax는 실제 탐색·출력 증가를 검사한다. 이 추정은 브라우저 가용 메모리나 GC peak의 측정값이 아니다. [PERFORMANCE.md](PERFORMANCE.md)의 관측과 구분한다.

### 실제 내부 Trace와 전용 시각화

Recorder의 patch/undo·희소 label/center 변화·48이벤트 checkpoint를 유지한다. analysisDelta는 변경 필드의 before/after를 기록하고 불변 원본/행렬/간선/계층은 공유한다. 원본 수치·범주·행렬·파형과 MCL transition이 매 이벤트 전체 복사되지 않도록 실제 불변성을 검사한다. 역진·체크포인트·최종 출력 일치를 단위 및 [typed-integration.test.ts](../src/engine/typed-integration.test.ts)에서 검증한다.

새 전용 분석은 자동 K의 국소 BIC/AD/dip/bootstrap/중심, 커뮤니티 ΔQ/refinement/집약/Brandes 점수/MCL 행렬/CNM 병합/Fluid 밀도, 범주 빈도·실제 prototype, CLIQUE 격자/영역·PROCLUS 축/medoid, DenStream 감쇠 CF, 행렬 잔차·이중 소속, K-Shape NCC/정렬/고유형태를 표시한다. Canvas의 색상 분할이 중첩/부분공간/이중군집 전체 결과를 대체하지 않는다.

행렬/수치 표는 페이지 표시, Canvas는 가시 영역/LOD, 그래프 계층은 표시 배치를 사용한다. 표시 생략과 전체 계산을 구분한다. 큰 입력은 실제 첫 이동/주요 단계/패스 요약 등 기록 세분도를 낮추며 생략된 모든 상세 이벤트를 되살릴 수 있다고 하지 않는다. 보간은 시각 효과이며 이산 계산의 실제 중간 상태로 표시하지 않는다. reduced-motion을 따른다.

### 구조형 표 편집·희소 Undo·스트림 유입

`DatasetEditor`는 전체 원본 중 16행×8열의 표시 창을 제공한다. 수치/범주/혼합/행렬 셀, 그래프 노드 ID·표시 좌표와 실제 간선 끝점/가중치, 스트림 시각·특성, 시계열 ID·값을 편집한다. ID 변경은 연결 간선에도 반영한다. 간선 추가/삭제와 노드 추가, 관측 추가가 있다. 행·열/시계열 시간축 같은 복합 구조 교체는 JSON 원문으로 한다. 회전형 3D·직접 그래프 드래그·모든 종류의 행/열 추가 UI는 없다.

`datasetHistory.ts`는 최대 100작업의 경로 기반 변경과 배열 splice를 저장한다. 희소 셀 수정은 수정 값만, 새 관측은 추가된 샘플만 보존하고 관련 없는 행 객체를 공유한다. 복원 시 변경 경로의 배열 컨테이너 복사는 O(n)일 수 있고, 조밀 교체/형식 변경은 전체 변경 배열을 보존할 수 있다. 완전한 O(1) 편집이나 디스크 영속 히스토리가 아니다. 기존 점 편집기의 제스처·히스토리는 별도 경로로 유지한다.

스트림 유입 컨트롤은 관측을 실제 timestamp로 추가한다. 현재 화면은 변경된 **전체 prefix를 Worker에서 재계산**한다. `DenStreamModel` 자체는 과거 관측을 보관하지 않는 온라인 CF 상태지만 화면의 파일/편집/되감기는 전체 샘플을 보존한다. 네트워크 무한 스트림이나 영속 Worker 증분 세션이 구현됐다고 표시하지 않는다.

### 남은 구조 과제

TypedArray/transferable, 파일 청크/스트리밍 파서, 영속 계산 세션, 희소/FFT 고유해, heap 기반 CNM/Dijkstra, fast kNN, 비교의 원본 다중 데이터 확장, 3D 회전, 방향/음수 그래프, constrained 실행은 미완료다. Leiden은 한 계층 iteration, MCL은 밀집 exact 연산, K-Shape는 직접 O(L²) NCC이며 각 연구 문서의 제한을 유지한다. 신규 UI의 전체 브라우저·대규모 전송·장시간 peak/누수·취소 지연·Pages 공개 확인은 검증 중이다.

### 재개 검증 현황 보완

독립 reference 생성 스크립트 7개를 통합 환경에서 다시 실행해 모두 성공했다. 전체 Vitest는 426/426 통과 후 PROCLUS native output의 독립 부분공간/influence 검증 1개를 추가해 개별 통과했다. 최종 전체 427개 재실행은 아직 확정하지 않는다. 신규 [next-platform.spec.ts](../tests/next-platform.spec.ts)의 8개 시나리오는 Chromium/mobile에서 16/16 통과했다. 실제 추가 19개 엔진 Worker, 원본 1,000행×12열 편집·전체 계산, 7개 폭을 포함한다. 캐시 적중 시 traceIsCurrent 판정 문제를 수정해 현재 Trace의 결과 내보내기가 정상 작동한다. 추가 가이드 이동 검사는 진행 중이며, 전체 기존 회귀·Firefox/WebKit·원격 배포는 미실행 상태다. 상세 검증 범위는 [VALIDATION.md](VALIDATION.md)를 따른다.

## 2026-10-31 구조 기록 (보존)

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

마지막 기본값 분기를 레지스트리의 resetParametersOnSelect로 옮겼다. 기존13개와 FCM/Bisecting의 공유 파라미터 정책은 유지하고, 이후 신규 엔진은 App 이름 목록을 반복 수정하지 않고 기본값 정책을 적용한다. native 입력 라우팅도 supportsLegacyPoints를 재사용한다. 타입/lint/build/전체428개와 raw 가이드 경로는 통과했다. 추가 기존10엔진 경로 검사1건에서 Worker 시작 오류가 있어 원인 확인 중이며, 해당 경로 성공은 아직 확정하지 않았다. 계산 엔진 소스는 a81a931과 동일하다.

최종 확정: fd78886의 단일 원격 전체64개 및 배포가 성공했다. 추가 로컬 실패와 순차 재검사·검사폴더 충돌 원인은 SESSION_REPORT에 구분해 보존한다. 이는 계산 엔진 변경이 아닌 입력 경로/기본값 레지스트리 보완이며, 공개 raw 가이드의 데이터/파라미터/이벤트와 호환성4구성도 최종 배포에서 확인했다.
