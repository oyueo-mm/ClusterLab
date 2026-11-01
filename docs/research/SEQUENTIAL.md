# BSAS·MBSAS·TTSAS 실제 순차 군집화

2026-11-01. 안정50개 제품(da10d21/문서d6e4e0d)에서 별도 feat/sequential-clustering 작업 트리로 이어간 실제 개발 기록이다. 새3개의 전체 브라우저·배포는 부모 SESSION_REPORT 마지막 결과를 따른다. 실제 모델과 단순 별칭을 구분한다.

## 정의·원문 열람 범위·독립 구현

- BSAS: Basic Sequential Algorithmic Scheme. 입력 순서대로 최근접 대표의 거리와 최대 군집 수 q로 생성/배정하며 배정 즉시 실제 산술평균을 갱신한다.
- MBSAS: Modified Basic Sequential Algorithmic Scheme. 첫 pass는 대표가 될 seed만 생성하고 다른 행은 유보한다. seed 탐색 중 평균은 움직이지 않는다. 두 번째 pass에서 유보한 행만 원래 순서로 배정하며 매번 평균을 갱신한다. 이미 seed인 행을 다시 세지 않는다.
- TTSAS: Two-Threshold Sequential Algorithmic Scheme. 하한 안의 행은 배정, 상한 밖의 행은 생성, 그 사이는 유보하고 다시 검사한다. q는 사용하지 않는다. 직전 pass의 배정 진전이0이면 다음 pass의 첫 pending 행으로 새 대표를 만든다. 최초 pass도 이 규칙을 사용한다.

정의는 공식 PyClustering0.10.1 [BSAS 문서](https://pyclustering.github.io/docs/0.10.1/html/db/d8b/classpyclustering_1_1cluster_1_1bsas_1_1bsas.html), [BSAS source](https://pyclustering.github.io/docs/0.10.1/html/df/d50/bsas_8py_source.html), [MBSAS source](https://pyclustering.github.io/docs/0.10.1/html/d1/db8/mbsas_8py_source.html), [TTSAS 문서](https://pyclustering.github.io/docs/0.10.1/html/df/db9/classpyclustering_1_1cluster_1_1ttsas_1_1ttsas.html)와 실제 설치한0.10.1.2 Python 모듈을 확인했다. 공식 문서 일부의 Manhattan 기본값 설명과 Python의 실제 Euclidean 기본값이 다르므로 **제품·oracle 모두 Euclidean을 명시**한다. TTSAS 설명 prose의 less-than과 실제 Python의 d≤하한도 구분하여 실제 실행 분기를 채택한다.

공식 source는 Pattern Recognition(2009)을 인용한다. 이 원서 전체 본문은 이번에 확보·전수 열람하지 못했다. 순차 방법의 최초 논문 확인 완료로 표시하지 않는다. [Novikov2019 JOSS](https://joss.theoj.org/papers/10.21105/joss.01230)는 독립 검증 라이브러리의 논문이며 BSAS 최초 논문이 아니다. TTSAS source 웹 fetch 일부는 cache miss였으나 실제 설치 패키지의 해당 Python 메서드는 직접 읽었다. 웹문서0.10.1과 실행 패키지0.10.1.2를 동일 버전이라고 소급하지 않는다. 실행한 각 모듈의 SHA256은 fixture sources에 보존한다. 추측한 Git tag permalink 대신 열람 가능한 공식 문서와 실행 SHA를 구분한다.

제품은 이 수학적 규칙을 TypeScript로 독립 구현했다. 외부 코드·PyClustering 런타임은 제품에 포함하지 않았다. 검증 전용 설치0.10.1.2의 METADATA와 모듈 BSD-3-Clause 표기를 직접 확인했다. C++ core는 사용하지 않고 ccore=False와 명시적 Euclidean metric으로 실행했다.

## 실제 입력·대표·순서

모든 원본 수치 차원을 사용한다. 원본/표시 행 수가 같아야 하며 원본은 직사각형·양의 차원·유한 숫자다. 원래 행 순서를 유지하고 seed로 섞지 않는다. 정답 label이나 표시 좌표로 계산하지 않는다. 제품 UI는 native numeric 입력으로 제공하며 점 편집기와의 잘못된 비교를 비활성화한다. 두 차원도 numeric 원본으로 실행할 수 있다.

거리 d는 Euclidean norm이다. 제곱거리와 θ를 직접 비교하지 않는다. 최근접 동률은 먼저 생성된 대표다. BSAS/MBSAS의 θ≥0, 정수q≥1이며 q>n도 유효하다. q는 모형의 최대 군집 수이지 데이터 수 상한이 아니다. TTSAS는 0≤θ₁<θ₂이며 무관한 q를 사용하지 않는다.

배정 후 평균은 m'=m+(x−m)/(count+1)로 계산한다. 큰 공통 offset의 불필요한 상쇄를 줄이는 anchor 상대 갱신이며 동일한 산술평균이다. 거리·진단 SSE가 overflow/underflow하거나 유한하지 않으면 명시적 오류다. 무제약 마지막 nearest 재할당이나 Lloyd 반복을 덧붙이지 않는다.

## 실제 규칙과 손계산

BSAS 생성 조건은 d>θ이고 현재K<q다. 그 외는 최근접 대표에 배정한다. 입력 [0,1,2.5], θ2,q8은 1 배정 후 평균0.5가 되므로2.5도 거리2로 배정된다. 최종1군집/평균7/6/SSE19/6이다. 순서 [0,2.5,1]은2.5가 먼저 seed가 되어2군집이다.

MBSAS는 같은 입력에서 첫 pass의1을 유보하고0을 움직이지 않으므로2.5가 두 번째 seed다. 두 번째 pass에서1을0에 배정하여 최종 {0,1}/{2.5}, 평균[0.5,2.5], SSE0.5다. 같은 nearest 계산의 이름만 다른 래퍼가 아니다.

TTSAS는 d≤θ₁ 배정, d>θ₂ 생성, θ₁<d≤θ₂ 유보다. [0,1.5,1], 하한1/상한2에서1.5는 유보되지만1이 배정되어 평균0.5로 바뀐다. 두 번째 pass에서1.5는 거리1로 배정되어 최종 평균5/6/SSE7/6이다. [0,1.5]는 첫 pass의 seed 생성 다음 pass가 무진전이며 세 번째 pass에서 pending을 새 대표로 만든다. 이 실제 회차를 즉시 생성 한 번으로 줄여 애니메이션하지 않는다. TTSAS도 순서 영향을 완전히 제거하지 않는다.

## Trace·복원·시각화·native 결과

initialize→prototype/distance/assign/defer→visit→finish는 해당 알고리즘이 실제 수행한 순서다. 첫 seed나 무진전 forced seed에는 수행하지 않은 거리 검사를 만들지 않는다. MBSAS 첫 pass의 유보 행은 평균과 학습 수에 포함하지 않는다. processed는 고유하게 배정된 행 수, unassigned=n−processed, pass는 실제 순회 번호다. −1은 미처리/유보이며 통계적 노이즈가 아니다.

분석은 원본 sourceValues·ND centroids·실제 counts/prototypeCounts·현재 행과 모든 후보 거리·임계값/상한·판정·생성 ID·진단 SSE를 보존한다. 이 제품 정책에서는 실제 단위 가중치 배정 행으로 대표를 학습하므로 두 count가 같다. SSE는 배정된 집합의 오차를 나타내며 순차 절차가 매 단계 SSE를 감소시키거나 전체 분할을 최적화한다는 주장이 아니다. 완료는 모든 원본 행 배정을 뜻하며 Lloyd 고정점 인증이 아니다.

원본 불변 행렬은 Recorder가 최초 clone한 참조를 재사용하여 기록마다 전체를 다시 복사하거나 읽지 않는다. 바뀐 상태는 analysis delta·label delta·실제48이벤트 checkpoint를 사용한다. 큰 예상 기록은 첫/2의 거듭제곱 검사·pass와 최종 상태를 기록한다. 모든 원본 계산은 유지하고 개별 중간 사건의 생략을 policy에 표시한다. 상세 무한 이력은 주장하지 않는다.

SequentialAnalysis 전용 화면은 실제 거리와 임계값 SVG, 실제 판정 표, 입력 순서/배정·유보/ND 대표/두 count/진단 SSE를 표시한다. 모든 원본 행·특성·대표를 표시 창으로 탐색할 수 있다. 실제 현재→다음 대표의 위치만 보간하고 숫자·분기는 실제 상태다. reduced-motion에서는 보간하지 않는다. 원본 거리와 두 표시 축의 그림을 구분한다. native sequential-partition은 method/labels/centroids/counts/prototypeCounts/passes/unassigned/converged/assignedSSE를 반환한다.

## 독립 검증·테스트

scripts/sequential_reference.py를 실제 실행했다. NumPy2.5.4, PyClustering0.10.1.2이다. 공식 pure Python 모듈을 입력 deepcopy로 실행하여 seed 대표 리스트 alias가 검증 원본을 바꾸지 않도록 했다. 원래 값을 보존한 NumPy 평균·직접 모든 assigned-row SSE로 공식 대표도 별도로 검사한다. 제품 TS를 import하지 않는다.

12손계산/경계·동일좌표·단일행·실제3D와 난수 입력48개(차원1~5), 합계60원본×3방법=180공식 결과를 생성했다. 각 원본의 labels·대표·counts·NumPy SSE를 fixture에 보존한다. 이것을180개의 Vitest 함수로 세지 않는다.

sequential.test.ts 13개와 공개 lazy/native/스키마 통합4개가 통과했다. 실제 모든 기록 상태의 배정 평균/SSE·유보 witness·MBSAS2pass·TTSAS3pass·경계≤/>·동률·큰offset·동일/단일·q>n/TTSASq무시·잘못된 입력/수치·seed와 표시 불변·checkpoint/전진/역진·metadata1회·1201원본을 검사한다. 전체 첫 실행은529성공/신규가이드 최소절차3실패였고 실제 완료 검증 절차 보완 후 **532/532·39파일**로 통과했다. 수학 oracle 실패로 보고하지 않는다.

신규 Chromium/mobile4/4는 실제 번들 Worker3개·원본 순서·숨은3차원·실제유보/회차·전후·표시축 변경시 재계산 없음·native전체원본·1001행/마지막행·7폭·mini의 변경 파라미터/선택사건 전달을 확인했다. 전체 기존 회귀/cross/CI/Pages는 부모 보고서에서 추가 확정한다. 이 부분 결과만으로 완전 구현이라고 하지 않는다.

## 자원·대량 관측·한계

거리행렬 없이 작업 공간은 원본O(nd), 대표O(Kd), labels/계수O(n+K)다. BSAS/MBSAS O(nKd), K≤min(n,q). TTSAS 실제 재검사 수R에 대해 O(RKd), 최대2n pass의 보수 상한에서 최악 O(n³d)다. MBSAS 두 번째 pass는 미할당 행만 배정하지만 현재 제품은 원본 인덱스를 스캔해 확인한다.

내부 작업 byte 추정은 n(24d+128)+Kmax(48d+128)이며 BSAS/MBSAS Kmax=min(n,q), TTSAS Kmax=n이다. 작업256MiB·Trace64MiB 정책을 검사하고 일부 행을 버리지 않는다. 이 추정은 브라우저 가용RAM/GC peak가 아니다. 더 큰 정확 연산·기록은 실패할 수 있으며 자원 오류를 빈 성공으로 바꾸지 않는다. 새로운 전역 원본 개수 상한은 없다.

[sequential-performance.json](sequential-performance.json)은 Node24/Windows x64의100/1000/10000/100000원본·3차원·2분리군집에서 각 방법의 실제 모든 행을 처리한 단일 관측이다. 생성식·장치·임계값·q·회차·이벤트·Trace추정·heap delta를 저장했다. 생성/Worker/Canvas/FPS·취소 지연·장시간 누수는 제외했다. TTSAS가 한 pass인 잘 분리된 사례의 시간을 다회 재방문 최악 성능으로 일반화하지 않는다. negative heap delta는 GC 영향이지 음수 메모리 요구량이 아니다.

## 재현

```powershell
# 이 개발 트리에서, 제품 의존성에는 포함하지 않는 검증 환경
python -m pip install --target .local/sequential-reference-runtime pyclustering==0.10.1.2 numpy==2.5.4
python -B scripts/sequential_reference.py
npm test -- src/engine/sequential.test.ts src/engine/sequential-integration.test.ts
```

기존 환경이 있으면 재설치하지 않는다. main50 기록과 새53소스·로컬/원격 검사 범위를 구분한다. 원서 전체 검토·다른 거리/대표점 변형·진짜 스트림 세션·더 큰 재방문/고차원·대형브라우저 peak/FPS는 미완료다. Leader/MBSAS/TTSAS를 이름만 바꿔 복제하거나 원래 방법과 다른 정책을 숨기지 않는다.
