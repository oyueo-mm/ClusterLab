# 플랫폼 확장 세션 보고서 — 2026-10-31

전체 마스터 목표는 **미완료**다. 이전 기반 세션은 sessions/foundation/SESSION_REPORT.md에 보존했다.

## 1. 개발 개요와 실제 엔진

이번 신규 10개는 Spectral Clustering, Affinity Propagation, Density Peaks / CFSFDP, CURE, Neural Gas, Growing Neural Gas, K-Medians, Mini-Batch K-Means, CLARA, CLARANS다. 계산·Trace·전용 분석·파라미터·수학 가이드/실제 Worker 실험·독립 수치·브라우저 경로를 통합했다. 기존 13개와 이전 FCM/Bisecting을 포함해 **25개 실행 엔진**이다.

## 2. 아키텍처와 기존 기능

동적 레지스트리/파라미터 스키마를 확장하고 Dataset union·런타임 검증·입출력·실행 호환성을 도입했다. Point[]는 보존했다. 기존 홈 네 데모·11라운드·13알고리즘, 32프리셋 해시, 편집 Undo/Redo/제스처, CSV/JSON, 최대 네 비교, 가이드·사이드바·폰트/디자인을 유지한다. 검증 결과는 아래와 VALIDATION을 따른다.

## 3. 119개 후보 상태와 분류

[119개별 전체 표](ALGORITHM_REGISTRY.md), 원본 src/data/candidates.json. 후보 중 12개 실제 실행, **107개 미구현**. 신규 10개와 별도로 관계만 조사한 8개는 새 엔진으로 세지 않았다. SLINK/CLINK/NN-chain, Bayesian/DP-GMM, Bernoulli/LCA, MFA/MPPCA 관계는 research/TAXONOMY.md를 따른다.

K-Medians/Mini-Batch/CLARA/CLARANS/DPC 중심 선택은 변형이라는 실행 범위를 명시한다. NG/GNG는 관련 프로토타입 학습이다. 119개 원문 전수 조사와 엄격한 마스터 완전 구현 인증은 아직 미완료다. **완전 구현 인증 0개(아직 미인증)**와 제한 범위에서 사용 가능한 엔진 25개를 구분한다. 이는 실제 계산 엔진이 없다는 뜻이 아니다.

## 4. 데이터와 제한 제거

ND 수치형 전체 원본 계산은 Spectral/AP/DPC, 실제 가중 무방향 그래프는 Spectral이다. 3D는 ND에 포함되지만 현재 축 선택 2D 표시이며 회전형 3D가 아니다. categorical/mixed/matrix/timeseries/stream/constrained는 타입·검증만 있다. [DATA_FORMATS](DATA_FORMATS.md)에 실제 지원을 명시한다.

이전 세션의 600개 제한 제거와 새 전역 상한 없음 원칙을 유지한다. 작업 공간/Trace 바이트 예산·ND/JSON 추정·위험한 밀집 할당 전 거부를 사용한다. 계산 데이터와 점/간선 표시 LOD를 구분하고 입력을 조용히 버리지 않는다. 전송/파일 처리는 아직 object clone/전체 문자열이다.

## 5. 성능과 Trace

[재현 가능한 관측](PERFORMANCE.md) 및 platform JSON. K-Means/Mini-Batch는 100~100만 전체 입력을 처리했다. Node 생성/전송/렌더링 제외·단일 실행·heap delta 비peak 한계를 유지한다. Spectral 10만 밀집 할당은 사전 거부한다. 모든 엔진의 백만 입력이나 60FPS를 보장하지 않는다.

Trace는 실제 이벤트, before/after field delta, 불변 행렬 공유, 희소 레이블/중심 delta, 48이벤트 checkpoint다. 순방향·역방향·임의 탐색을 검증한다. 조밀 레이블 갱신의 버려질 임시 객체를 제거했다. 예산 초과는 오류다.

## 6. 시각화·도감·가이드

실제 W/L/고유값/전체 고유벡터 페이지·임베딩 중심·S/R/A·rho–delta/parent/halo·CURE 대표점·뉴런 간선/나이·배치 counts·medoid 제안/전체 비용을 보여준다. 행렬은 펼친 부분을 페이징하며 전체 계산을 유지한다. 시각적 보간과 reduced-motion을 적용한다. 실험실 검색·도감 데이터/기능/검증 필터·실제 가이드 미니 실험을 연결했다.

## 7. 단위·독립 검증

최종 타입 검사·ESLint·프로덕션 빌드 통과. **247/247 테스트, 21파일** 통과. 기존 테스트를 삭제하지 않았으며 알고리즘 기본값/실제 엔진 수에 맞게 확장했다.

NumPy 2.5.4/SciPy 1.18.1/scikit-learn 1.7.2를 실제 검증용으로 실행했다. Spectral은 W/L/고유공간 투영/임베딩/분할, AP는 R/A와 sklearn 분할/exemplar, 다른 신규 엔진은 독립 수치·모든 medoid 쌍 비용·학습 갱신과 비교한다. seed·손계산·잘못된 입력·최종 비용·Trace 전후 복원을 검사한다. 모든 확률 입력에 항상 동일한 분할을 주장하지 않는다. CLARA 책 전체 등 원문 접근 제한은 research에 기록한다. 제품 런타임 의존성 추가·외부 코드 복사는 없다.

## 8. Playwright와 기존 회귀

신규 플랫폼 Chromium/mobile 6/6, Firefox/WebKit 6/6 통과. 각각 실제 신규 10개 Worker, 원본 3차원, 표시 축만 변경할 때 무재계산, 실제 간선 가중치 변경·행렬 페이지·7개 폭·지원 불가 입력 오류를 검사했다. 초기 선택자 실패와 수정 후 증거를 구분해 보존했다.

전체 회귀 최초 44통과/12조건부 생략/2선택자 실패 후 도감의 exact 검색 선택자를 수정했다. 검색 보강 검사에서 HTML option의 명시 value 속성이 없다는 테스트 가정도 의미 기반 option 선택자로 고쳤다. 최종 도감·플랫폼 18/18 통과(Chromium/mobile 12, Firefox/WebKit 6). 중복 실행을 제외한 Chromium/mobile 고유 구성은 **46통과/12조건부 생략**이다. 로컬 전체 단일 재실행이라고 주장하지 않으며 최초/수정 후 JSON을 platform에 보존한다. 12 skip은 기존 기기 조건이며 성공 수에 넣지 않는다.

## 9. 제한·주요 파일·후속 작업

신규 엔진의 세부 수학적/자원/추론 한계는 research의 다섯 문서 및 algorithmDetails에 있다. CURE 가속·희소 고유해·자동 DPC 중심·NG 커뮤니티 추출·sklearn 동일 Mini-Batch 정책은 미구현이다. AP 미수렴은 표시하며 exemplar 없는 실패를 감추지 않는다.

주요 수정: src/engine/{dataset*,algorithmDetails,linalg,trace,registry,types,parameters,resources,worker,run}, algorithms 신규10, fixtures, 독립 Python5, lessons 신규5, App/StructuredLab/AlgorithmAnalysis/Catalog/renderer/useExperiment, tests/platform 및 기존 회귀, docs. 기존 버전 기록을 보존했다.

107개 엔진·119개 전수 조사, 새 데이터 유형의 실제 엔진/전용 편집, 구조형 비교/Undo, 추가 지표, Worker pool/계산 pause/transferable/청크 파서, 장시간 peak·누수·대규모 브라우저 측정이 남아 있다. [CONTINUE](CONTINUE.md)의 명령으로 이어간다.

## 10. GitHub·Actions·Pages

시작 main f5777c1, 작업 브랜치 feat/graph-and-prototype-engines. 안정 소스 커밋/main 반영/원격 검증/공개 동작은 최종 확인 후 여기에 기록한다. 기존 배포 workflow를 유지하고 검증 전 배포 성공으로 표시하지 않는다.
