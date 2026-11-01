# COP-KMeans 실제 hard 제약 엔진

2026-11-01. COP-KMeans 한 개를 실제 원본 데이터·계산·Trace·전용 분석·교재·독립 수치 검증까지 개발한 기록이다. 새 엔진의 통합 브라우저·배포·공통 registry 결과는 부모 통합 보고서에서 별도로 확정한다. PCK/MPCK/Constrained Spectral은 이 엔진을 이름만 바꿔 추가하지 않았다.

## 원문과 구현 정의

Wagstaff, Cardie, Rogers & Schrödl, _Constrained K-means Clustering with Background Knowledge_, ICML2001 pp577–584. [원저자 PDF](https://wkiri.com/research/papers/wagstaff-kmeans-01.pdf)의 §3.1–3.2/Table1에서 ML closure, ML을 통한 CL 유도, 거리순 허용 군집, 이미 처리된 관계 검사와 할당 실패를 확인했다. 원문의 pointwise greedy 구조를 사용하며 전체 분할의 최적 탐색으로 바꾸지 않았다. [원저자 저장소](https://github.com/wkiri/cop-kmeans)는 확인 당시 코드 제공을 예고한 README·LICENSE·.gitignore만 있다. 실행 가능한 공식 oracle로 사용하지 않았다. 외부 코드를 제품으로 복사하거나 라이브러리를 추가하지 않았다.

실제 목적은 전체 원본의 SSE를 hard ML/CL을 만족하는 분할에서 평가하는 것이다. 거리 대신 soft 위반 비용을 넣는 PCK와 구분한다. ML만 전이 관계이며 CL 자체를 전이시키지 않는다. 원문 prose의 이미 할당된 다른 행을 따른다. 새 pass의 아직 미할당된 행을 곧바로 ML 위반이라고 해석하면 초기 실행 자체가 불가능해지는 문제를 피하도록, **매 pass 새 부분 할당에서 원본 행 순서대로 처리**하는 정책을 명시했다. 초기화·tie·반복 한도·빈 군집·허용오차가 원문에 완전히 고정된 것은 아니므로 아래 실행 정책을 공개한다.

## 실제 원본·희소 관계 계약

- `ConstrainedDataset {data:NumericDataset,mustLink,cannotLink}`가 반드시 필요하다. 원본1행 이상·표시 행 수 동일·모든 행 같은 양의 차원·유한 숫자를 검증한다. 입력의 모든 수치 열로 계산하며 표시 Point[]의 x/y나 저장된 정답 label로 군집을 계산하지 않는다. 원본을 성분 평균으로 축약하지 않는다.
- path compression/rank Union–Find로 ML 성분을 만든다. 원래 행마다 성분 ID를 저장하고 성분 간 CL 인접 관계로 유도 제약을 정확히 표현한다. closure의 n² 점 쌍을 만들지 않는다. ML 성분 내부 CL·잘못된 인덱스는 구체적인 입력 오류다.
- 원래 hard 쌍은 무방향으로 정규화·중복 제거하여 분석에 보존한다. 이진 hard 관계이므로 중복 방향이 새로운 비용을 추가하지 않는다. 성분 간 유도 CL은 별도 표다. ML self 관계는 자명하고 CL self는 모순이다.
- 정수 `1≤k≤n`, 양의 정수 iterations, 정수 seed, 유한 tolerance≥0이다. K가 feasible한지는 이 간단한 검증과 다르다. 성분 CL의 K-색칠 가능성 전체를 제품에서 증명하지 않는다.

## 실제 초기화·할당·평균·실패

시드 Mulberry32로 원본 행 하나를 균등 선택하고 이후 전체 원본 최근접 제곱거리 비례 K-Means++를 수행한다. D² 총합의 불필요한 overflow를 줄이도록 최대 D²로 동일하게 정규화한다. 실제 행 index는 중복 없이 정확히K개 고른다. 중복 좌표라도 CL이 서로 다른 군집을 요구할 수 있으므로 좌표가 같은 행을 버리지 않는다. 남은 모든 D²가0이면 남은 행 인덱스순으로 채운다. 각 선택이 실제 일어난 callback에서 initialize 이벤트를 남기며 초기 중심 prefix와 선택 원본 행이 실제 상태다.

각 pass에서 원본 행을 그대로 순회한다. 중심별 실제 제곱거리를 정렬하고 이미 할당된 같은 ML 성분이 있으면 그 label만 허용한다. 이미 배치된 CL 인접 성분의 label은 허용하지 않는다. 첫 허용 후보에 할당하며 그 뒤 후보를 검사했다고 표시하지 않는다. 거리 동률은 중심 index 순이다. 성분 내부 첫 행의 거리로 먼저 선택하는 pointwise 정책이므로 weighted component 평균을 먼저 배치하는 다른 변형과 구분한다.

후보가 모두 거부되면 실제 test/greedy-failure 사건과 부분 상태를 기록한 후 오류를 던진다. 원문의 빈 partition 의미를 플랫폼의 성공 빈 결과로 숨기지 않는다. **feasible 분할이 있어도 현재 순서·초깃값에서 실패할 수 있으며 전역 불가능성 증명이 아니다.** Worker는 현재 실패 부분 Trace를 전달하지 않으므로 제품 화면에는 오류가 표시되고 해당 실행을 완료 결과로 보여주지 않는다. 직접 Recorder 감사에서는 실패까지의 실제 상태·역복원을 검증한다.

전체 pass가 성공하면 원본 전체 차원별 평균을 계산한다. anchor 상대 합으로 불필요한 큰 좌표 합산을 줄이며 거리가 overflow/underflow하거나 평균/SSE가 유한하지 않으면 명시적 수치 오류다. 빈 군집은 이전 중심을 유지하고 activeK·emptyClusters로 실제 활성 수와 구분한다. 최종 SSE는 실제 hard-feasible label의 오차이며, 마지막에 무제약 최근접 할당을 수행하지 않는다. 같은 중심 좌표를 가진 서로 다른 hard 군집도 보존한다.

동일한 전체 label이면 labels-stable, 최대 원본 중심 이동이 tolerance 이하면 center-tolerance, 나머지는 iteration-limit이다. tolerance 종료를 정확한 고정점 증명으로 부르지 않는다. 평균 갱신은 고정 label의 SSE를 줄이지만 이 pointwise hard 재할당 전체의 보편적인 단조 감소·전역 최적은 주장하지 않는다.

## Trace·고유 시각화·교재

`ConstraintAnalysis`에는 실제 원본 ND centroids, 원래 canonical ML/CL, 행→ML 성분, 성분 크기·CL, 실제 검사 후보 prefix·거리·허용/거부 witness, 처리 행 수·부분 SSE·활성 K·빈 중심·종료 이유가 있다. 이미 처리된 witness는 ML closure를 통해 관계가 유도된 같은 성분의 행일 수 있으며 원래 직접 입력한 pair라고 오표시하지 않는다.

작은 데이터는 실제 initialize → pass reset → test → assign → move → finish를 기록한다. 큰 예상 Trace는 전체 행을 똑같이 계산하고 실제 pass 할당·평균 결과를 기록한다. 기록 생략 범위는 policy 문자열에 명시한다. 계산 표본화가 아니다. 불변 성분·관계·시드 metadata는 Recorder가 최초에 만든 불변 clone을 재사용하여 다음 사건마다 n/E 배열을 다시 저장하지 않는다. 테스트는 componentIds의 분석 delta 쓰기가1회인지 확인한다. 전체 Trace byte 예산 실패는 명시적 오류다.

전용 `ConstraintAnalysis` 화면은 원본 중심·실제 후보 검사·거부 witness·원래 ML/CL·closure 성분/유도 CL·행별 성분을 페이지로 확인한다. 모든 행/차원은 선택할 수 있고 표시 창만12행/8차원이다. 부모 Canvas는 원본 관계선을 연결한다. 선택한 원본 축에서 현재·다음 실제 중심 사이를 SVG로 시각 보간하며, 이는 중간 계산 상태가 아님을 명시한다. 실제 수치 표·허용/거부는 보간하지 않고 reduced-motion에서는 현재 실제 점을 유지한다.

교재는 hard 목적식·허용 집합·평균 유도, 손계산, 실패와 관련 방법, 복잡도·원문·실제3D mini를 제공한다. mini6행의 실제 SSE는0.2다. 별도 손계산 원본 [0,2,3,5], ML(0,3), CL(0,1)/(0,2)에서는 두 중심이 모두2.5여도 hard label을 구분해야 하며 SSE=13이다. mini와 손계산이 서로 다른 데이터임을 명시한다.

## 독립 수치·Trace 검증

`python scripts/constrained_reference.py`를 실제 실행했다. NumPy2.5.4, 제품 TS를 import하지 않는 검증 전용 코드다. PRNG 시드 규약만 공유하고 제품의 UF 대신 명시적 Floyd closure, 각 후보의 **모든 기존 행 pair 검사**, NumPy 평균·전체 SSE를 사용한다. 작은 fixture의 K^n 전체 label을 열거하여 **27개 feasible labeled partition**의 목적값을 계산했다. 레이블 순열로 같은 분할을 중복된 독립 알고리즘이나 테스트로 세지 않는다.

`src/engine/constrained.test.ts` **17/17 통과**. 독립8사례에는 3D/표시 불변·ML pointwise·feasible인데 greedy가 실패하는 path·K=2가 불가능한 CL triangle·동일좌표를CL로3분리·ML chain/CL 유도·1행·동일 중심 손계산이 있다. 그 밖에 actual mini, 매 실제 state의 할당 SSE, 시드·초기 선택 prefix, CL 비전이/중복 정규화·모순·경계·한도·빈 군집·잘못된 입력·수치/Trace 예산 실패, 전체 전진·역진·실제48-event checkpoint를 검증했다.8 fixture와27 label 사례를 테스트35개라고 부풀리지 않는다.

이번 소유 파일 ESLint는 통과했다. 전체 타입/레지스트리·전체 회귀·브라우저는 부모가 다른 동시 엔진과 함께 통합 중이므로 이 기록만으로 성공을 선언하지 않는다. 관련 없는 공유 파일의 통합 오류를 임의로 고치지 않았다.

## 복잡도·대량 데이터 관측

차원 d, 원본 n, 중심 K, 관계 E, ML 성분 c의 크기 s_c·CL 차수 q_c라 하면 seed O(nKd), 전처리 UF O((n+E)α(n))와 canonical 정렬 O(E log E), pass당 거리/정렬 O(nKd+nK log K), 관계 검사 상한 O(KΣ_c s_c q_c)다. 모든 성분 관계를 매 행 후보에서 검사하는 현재 구현 비용이며 원문 구현의 특정 가속을 차용해 더 낮게 표시하지 않는다. 원본·중심 O(nd+Kd), 성분/관계 O(n+E), 상세 Trace는 별도다. 새 전역 행 개수 상한은 없다.

실측 [constrained-performance.json](constrained-performance.json)은100/1,000/10,000/100,000행·3차원·K2·seed42의 엔진+Trace 단일 Node 관측이다. 모든 행 처리와 독립 전체 SSE·실제 활성 군집·metadata 공유를 확인했다. CPU/OS/Node/파라미터/생성식을 기록했다. 생성·Worker 전달·브라우저 렌더링/FPS·취소 지연은 포함하지 않으며 heap 증감은 peak/retained 메모리가 아니다. 고정된 희소 관계·잘 분리된 군집 사례이므로 높은 CL 차수·큰 K·모든 기기의 성능 보장이 아니다. 원본 데이터·Worker 전달 복사와 UI 파일 파싱·대형 편집의 전반 자원 검증은 부모 플랫폼 범위다.

## 남은 범위

soft weighted 제약·PCK/MPCK 실제 metric·Wang generalized spectral, 정확한 전역 feasible solver·재시작 정책·원저자 코드 실행 비교는 미구현이다. 현재 hard 스키마에 soft 이름만 붙이지 않는다. 부모의 관계 편집·선 시각화·도감/실험실·모바일/브라우저·Pages까지 검증한 뒤 제한 범위 실행 엔진 상태를 최종 반영한다. 전체 마스터의 완전 구현 인증과는 구분한다.
