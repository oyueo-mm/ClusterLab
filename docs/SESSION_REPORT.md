# 통합 확장 보고서 — 50개 엔진 개발 단위

> 최신 체크포인트: 소스50개(기존13+후보37), 미구현82개, 완전 인증0. 로컬 type/lint/build·단위509/37파일·독립oracle3종·Chromium/mobile 고유74성공/12기존생략·네 플랫폼spec Firefox/WebKit34/34가 확정됐다. main/CI/Pages는 아직 대기다. 이하 중간 기록보다 SESSION_REPORT 마지막 확정 절을 우선한다.

전체 마스터 목표는 **미완료**다. 직전 안정44개/후보31개 구현 기록은 [sessions/platform44/SESSION_REPORT.md](sessions/platform44/SESSION_REPORT.md)에 원문 보존했다. 현재 브랜치는 `feat/constraints-mixtures-and-overlap`, 기준 main826001d/제품fd78886이다. 아래 진행 중 표시와 마지막 확정 절을 구분한다.

## 1. 개발 개요·정확한 집계

현재 소스 **50개 실행 엔진 = 기존13 + 신규 후보37**, 후보119개 중 **82개 미구현**이다. 엄격한 마스터 완전 구현 인증은 **0개(미인증)**다. 119개별 실제 상태·분류·입출력·관련 문서는 [ALGORITHM_REGISTRY](ALGORITHM_REGISTRY.md)에 있고 candidates.json의 번호·이름·순서를 보존한다. 이름만 등록한 후보를 구현으로 세지 않는다.

이번6개는 COP-KMeans(후보23), Bernoulli Mixture86, Poisson Mixture89, Multinomial Mixture85, Walktrap55, Clique Percolation60이다. PCKMeans24와 COP23을 혼동하지 않는다. COP는 hard 제약 변형, 세 혼합은 분포별 모델 계열, Walktrap/CPM은 그래프 군집화다. 기존 SOM/LVQ/NG/GNG의 관련 학습법 분류를 유지한다.

## 2. 아키텍처·기존 알고리즘 보존

레지스트리 lazy loader·Worker·기존 Point API와 Dataset union을 함께 유지했다. 신규 입력/출력은 공통 validator와 nativeResult에 연결한다. 알고리즘별 source/examplePreset·지원 입력·가이드 이동·통계도 registry를 사용한다. 의존성/워크플로를 추가하지 않았다.

[legacy-source-audit](platform50/legacy-source-audit.json)의 **20파일**은4ac46eb 기준 Git clean-filter blob과 동일하다: 기존13 모듈, presets32개, HomeDemos, v03/v04CSS, workflow, package/lock. Windows CRLF를 정규화해 비교한다. 이 감사는 수학 전수 재감사를 대신하지 않으며 실제 UI 회귀를 별도로 실행한다.

## 3. 원본 데이터·제한 제거·대량 처리

기존 ND/범주/혼합/가중 그래프/행렬/시계열/스트림 원본 처리를 보존하고 constrained를 실제 실행·편집 가능하게 했다. ML/CL 테이블은 원본행1기반 UI/0기반 JSON, 희소 관계·delta Undo/Redo다. 이진/Poisson/Multinomial/제약의 시드·생성 파라미터를 저장하는 네 생성기를 추가했다. 모든 원본 특성으로 계산하고 표시 좌표와 분리한다.

600개 또는 새 전역 고정 개수 상한은 없다. 실제 차원·간선·클릭/행렬 출력·Trace의 바이트 예산을 사전/증분 검사한다. 표/Canvas의 표시 창과 요약 Trace는 계산 표본화가 아니다. 자원·수치 실패는 명시적 오류이며 일부 결과를 전체 성공으로 숨기지 않는다. 대형 파일 청크 파서·무한 스트림 UI·typed 비교는 미완료다.

## 4. 실제 계산·Trace·새 시각화

- COP: ML Union–Find closure/성분 CL, 원본행 pointwise 거리순 greedy 검사/할당, 실제 전체ND 평균·SSE, hard 거부 witness/활성K/빈 중심/종료 이유. greedy 실패는 전역 불가능성 증명이 아니다. 관계선과 실제ND 중심·후보·성분 표를 연결한다.
- 이산3모델: 각 분포의 실제 log PMF·log-sum-exp E-step·무prior ML M-step·현재 모수 재평가·정규화상수 포함 전체LL. θ0/1·λ0·π0·전체0행·빈 성분·한도 종료를 구분한다. 책임도는 확률적 사후이며 퍼지 소속도로 부르지 않는다. 실제 분포/카운트/모수/사후행렬/가중합을 표시한다.
- Walktrap: 전체 P^t 행 확률, 인접 Ward 후보 거리·증가량, 실제 병합 forest·원본Q 최고 cut. artificial loop는 보행에만 쓰고 원본Q와 구분한다. 전용 확률/후보 표와 실제 자식·부모 SVG/덴드로그램·선택 수준을 보여준다. 세로 위치는 병합 순서다.
- CPM: 모든 k-clique·공유(k−1)face 연결 성분·원본 노드 합집합/중첩 소속, 미소속을 보존한다. −1은 통계적 노이즈가 아니며 목적함수 없음으로 표시한다. k는 군집 수가 아니다.

Recorder delta/checkpoint/역진을 유지하고 새 불변 관계/행렬 참조를 공유한다. 중간 숫자·사건은 실제 계산 상태이며 위치/색 보간만 시각 효과다. reduced-motion을 따른다. 취소는 Worker terminate다. 모든 상세 산술 이벤트의 무한 기록·60FPS 보장은 하지 않는다.

## 5. 도감·가이드·실제 미니 실험

50엔진과119후보 상태를 검색·계열·입력·구현/검증 필터로 구분한다. 새6개 수학적 정의·수식/손계산·파라미터·복잡도·실패·관련 방법·참고문헌과 원본 Dataset 기반 Worker mini를 연결한다. 이산모델을 가우시안 타원 또는 K-Means 래퍼로 대체하지 않았다. 입력이 다른 비교 경로는 비활성화한다. [research/CONSTRAINED](research/CONSTRAINED.md), [DISCRETE_MIXTURES](research/DISCRETE_MIXTURES.md), [GRAPH_FOLLOWUP](research/GRAPH_FOLLOWUP.md)에 직접 원문/공식 자료 접근 범위와 실제 실행 정의가 있다.

## 6. 단위·독립 검증·성능

타입·ESLint·프로덕션 빌드와 전체 **Vitest509/509·37파일** 통과. [unit-final](platform50/unit-final.json). 새 oracle3개를 실제 재생성했다: COP NumPy8사례/27 feasible labeled partitions, 혼합 NumPy/SciPy3단계/6seeded EM, Walktrap NumPy/igraph5사례·CPM NetworkX273입력. fixture 사례를 테스트 개수에 중복 합산하지 않는다. 검증용 라이브러리를 제품에 포함하거나 코드를 복사하지 않았다.

원자료 [constrained-performance](research/constrained-performance.json), [discrete-performance](research/discrete-mixtures-performance.json), [graph-performance](research/graph-followup-performance.json), [환경](platform50/environment.json). Node24/Windows x64의 단일 관측이며 heap delta는 peak RAM/FPS가 아니다. COP100k 전체3D·Poisson100k 전체3D, Walktrap1000 path/CPM10000 path 등을 측정했다. CPM clique 없는 path의 빠른 시간을 조밀 지수출력 성능으로 확대하지 않는다. Walktrap dense n²와 Trace 예산 한계를 공개한다. 정확한 시간·이벤트/Trace 바이트는 PERFORMANCE와 원자료를 따른다.

## 7. 브라우저·회귀·배포 진행 상태

신규4시나리오×Chromium/mobile **8/8 통과**. 실제 Worker 원본·수치 변화·역재생·hard 오류/greedy 실패 복구·이산 support/경계/LL·native JSON·Walktrap 행확률/Ward/Q·CPM 중첩/미소속·1000행/숨은 마지막 특성·7폭을 검사했다. 최초 **4성공/4실패**는 추가 관계 기본값을 가정한 테스트와 접힌 SVG 접근 문제로, 수정 후8/8이다. 첫 실행과 수정 후 원자료를 platform50에 각각 보존한다.

전체 Chromium/mobile 기존 회귀, Firefox/WebKit 세 플랫폼 spec, 안정 커밋/main/Actions/Pages/공개 확인은 현재 진행 중이다. **직전 공개44개 배포 성공을 새50개 성공으로 세지 않는다.** 최종 결과는 이 파일 마지막 확정 절에만 추가한다. 공개 site는 https://oyueo-mm.github.io/ClusterLab/ 이다.

## 8. 주요 파일·미완료·재개

새 엔진6모듈과 discreteMixtureCommon, constraintTypes/mixtureTypes, native datasetExecution, registry/resources/trace/types, ConstraintEditor/ConstraintAnalysis/DiscreteMixtureAnalysis/CommunityAnalysis, StructuredLab/structuredPresets, 신규 교재3개/extensionDetails, 독립 스크립트3개/fixture3개, 신규 단위5파일/브라우저spec를 추가·통합했다. 전체 파일은 git show --stat로 확인한다.

후보82개 실제 구현·119개 원문 전수 조사·모든 알고리즘의 큰 데이터/FPS/장시간 메모리, 추가 시각화/typed 비교/지표·3D/PCA·청크 parser/transferable·Worker pool/계산 pause·증분 스트림 UI가 남아 있다. 전체 완료를 주장하지 않는다. 재개는 [CONTINUE](CONTINUE.md)와 [PROGRESS](PROGRESS.md), 다음 연구 큐에서 이어가며 같은6개를 다시 개발하지 않는다. 컨텍스트 한계 시 검증된 결과만 커밋하고 마지막 실제 SHA/테스트/배포를 기록한다.

## 로컬 통합 검증 확정 — main 반영 전

최종 타입·ESLint·build·Vitest509/509(37파일), 새 독립 oracle3종이 통과했다. 전체 Chromium/mobile72성공·12기존 조건부 생략·0실패에 신규6가이드 전달 시나리오2개를 더해 **고유74구성 성공**이다. 후속10/10은 기존8개 재검사+새2개이며 중복 합산하지 않는다. Firefox/WebKit의 platform/next-platform/constraints-models/model-guides 네 spec **34/34**가 통과했다. 모든 legacy 테스트의 cross 검증은 아니다. 최종 도감 메타데이터 smoke2/2도 같은 도감 사례의 반복이다.

browser-full.json/log, browser-guides.json/log, browser-cross.json/log, catalog-final.json/log와 실제 Bernoulli/Walktrap desktop/mobile PNG를 platform50에 보존했다. 가이드 중간 실행의 부정확한 접이식 패널 대기는 제품을 바꾸지 않고 test를 보완했고, 중단 로그/JSON 미flush 사실은 browser-guide-diagnostic.md/log에 구분했다. 중단 실행을 완결된 성공으로 세지 않는다. source50·후보37/82미구현·완전인증0이며 main/Actions/Pages는 다음 관문이다.

## 레지스트리 중복 보완

별도 다음 개발 트리의 공통 인터페이스 점검에서 COP-KMeans가 structuredAlgorithms 배열에 두 번 들어가 제약 선택 항목이 중복되는 것을 발견했다. 첫 중복만 제거하고 목록 고유성 단위 단언과 실제 COP option 개수1 브라우저 단언을 추가했다. 알고리즘의 수학·Trace·원본 데이터는 변경하지 않았다. lint/build(타입 포함), 전체509/37파일, 실제 COP 편집·실패복구 Chromium/mobile2/2가 다시 통과했다(unit-registry-final, browser-registry-final). 원격 최종 제품은 이 보완 커밋의 후속 Actions를 따른다. 앞선 f98629a의 검증/배포와 혼동하지 않는다.

다음 BSAS/MBSAS/TTSAS 개발은 .local/sequential-worktree의 feat/sequential-clustering에 격리해 진행 중이며, 이50개 구현·배포 수에는 더하지 않는다.
