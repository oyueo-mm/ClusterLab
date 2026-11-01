# 추가 그래프 엔진 — Greedy Modularity(CNM) / Fluid Communities

2026-11-01. 두 엔진·수학 교재·전용 분석 화면이 작성됐고 독립 수치/Trace 검증을 수행했다. 제품 통합·브라우저·배포의 최종 상태는 부모 보고서를 따른다. 기존 그래프5개와 중복된 이름 등록이 아니다.

## Greedy Modularity(CNM)

Clauset, Newman & Moore (2004), [Finding community structure in very large networks](https://arxiv.org/html/cond-mat/0408187v2), §II를 확인했다. 실제 현재 군집 사이 가중치 W와 차수합 K로 ΔQ=W/m−2γK_AK_B/(2m)²를 평가하고 최대 개선 쌍을 통째로 병합한다. 단일 노드 이동 Louvain과 다르다. 이 구현은 **같은 greedy 목적함수/병합 선택을 sparse full scan으로 계산하는 변형**이며 원문의 heap 자료구조 가속은 구현하지 않았다. 원문 O(md log n)을 제품 복잡도로 표시하지 않는다. 제품은 최대 n−1개 병합, 각 O(n+m) 전체 스캔이다.

양의 개선1e−14 초과만 수용하며0gain은 더 세분된 분할을 유지한다. 음수 병합까지 이어지는 전체 덴드로그램이 아니라 greedy 최대 Q에서 종료한다. 순서는 개선값·원래 군집 쌍 ID로 결정하며 난수는 사용하지 않는다. 비음수 가중 무방향·중복 간선 합·self-loop·고립점을 보존한다. 수치 입력은 기존 communityCommon의 원본 전체 차원 union-kNN이다. 전역 최적이나 참 군집 수는 보장하지 않는다.

모든 원본 점/간선/후보를 실제 계산한다. 작은 데이터는 모든 후보/병합을 기록하고 예상 기록 바이트가 크면 첫 병합·2의 거듭제곱 병합 수·최종 상태의 실제 요약만 기록한다. 이것은 탐색 표본화가 아니다. 후보 표는 ΔQ이며 edge betweenness로 오표시하지 않는다.

## Fluid Communities

Parés et al. (2017), [Fluid Communities: A Competitive, Scalable and Diverse Community Detection Algorithm](https://arxiv.org/pdf/1703.09307), §3을 읽었다. 실제 d(c)=1/|c|와 자신·이웃의 ego-network 밀도 합을 계산한다. 현재 소속이 최대이면 유지하며 그렇지 않을 때 최대 후보를 시드 선택한다. 영향받은 두 유체 크기·밀도를 즉시 갱신하는 비동기 순서를 지킨다. singleton의 자기 밀도1과 현재 최대 유지가 K개 유체를 보존한다.

원문과 공식 [NetworkX asyn_fluidc](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.asyn_fluid.asyn_fluidc.html)의 입력 조건을 지킨다. **연결·단순·무방향·비가중**만 실행한다. 원본 weight≠1, loop, 중복 간선, 방향, 비연결, K>n을 명시적으로 거부하며 속성을 버리지 않는다. 수치 kNN도 실제 생성 그래프가 연결이어야 한다. 실제 미니 실험은 연결된 단위 가중치6노드 그래프를 사용한다.

제품은 원문의 argmax에 상대 machine-epsilon 동률 검사를 사용한다. NetworkX3.6.1의1e−4동률 문턱·Python PRNG와 다르므로 일반 그래프의 동일 분할을 주장하지 않는다. 미할당 초기 상태에는 Q를 미적용으로 표시한다. Q는 사후 관측 지표이며 최적화 목적이 아니다. 반복 한도에서 일부 미할당이면 오류, 전체 소속은 있으나 움직임이 남으면 converged=false다. 시드 노드·실제 크기/밀도·후보와 전체 패스를 기록하며 큰 예상 기록량에는 명시적 패스 요약을 사용한다.

## 독립 검증

`python scripts/graph_extra_reference.py`를 실제 실행했다. NumPy2.5.4, NetworkX3.6.1. 제품 TS를 import하지 않으며 생성 fixture 버전을 기록한다.

CNM은 단위 barbell, 가중 loop, path에서 NetworkX의 실제 최종 greedy 분할/Q와 모든 병합의 직접 Q 차이를 비교한다. 원본 그래프의 독립 라이브러리 Q를 매 후보마다 다시 계산하므로 제품의 증분/집계 공식을 검산할 수 있다.0gain 규약은 별도 손계산으로 확인한다.

Fluid은 PRNG/시드 순서라는 재현 계약만 공유한다. 수치 oracle는 NumPy의 ego 인접행렬×one-hot membership과 **매 판단 전체 bincount 재계산**을 사용한다. 제품의 즉시 증감 count 코드와 독립적으로 모든 노드의 실제 후보 합·이전/다음 레이블·크기·밀도를 비교했다. K=1/K=n의 분할은 NetworkX에도 비교했다. 모든 이벤트에서 K개 비어 있지 않은 유체와 count×density=1, 실제 레이블별 count를 검사한다.

`npx vitest run src/engine/graph-extra.test.ts`: **9/9 통과**. 시드/표시 좌표 불변, 실제 전진/역진·모든 수치 갱신, 지원 불가 입력·일부 미할당 실패를 포함한다. 기존 그래프5개22개와 합쳐 **31개 통과**다. 부모의 전체 테스트/브라우저 수에 중복 합산하지 않는다.

## 성능과 한계

`graph-extra-performance.json`은 실제 단위 가중 ring의100/1000노드 단일 Node 관측이다. CNM1000은 약85ms/23이벤트/Trace 추정2.03MB, Fluid1000은 **iterations=1000**에서 약61ms/386이벤트/2.79MB가 관측됐다. Fluid 기본100회에서는 이1000노드 ring의 전파가 완료되지 않아 명시적 미할당 오류였다. 필요한 반복 수를 모든 입력에 대해 보장하지 않는다. 데이터 생성·Worker 전송·브라우저 렌더링을 제외하며 전후 heap 차이는 peak가 아니다.

부족한 기능: 원문 CNM heap/ΔQ행 갱신 가속, 전체 음수 병합 덴드로그램, Fluid 가중/방향 확장·성분별 자동 K분배, 고속 근접 이웃, 장시간 메모리·100k/1M 실제 그래프·기기별 FPS. 새 전역 점 수 상한은 두지 않았다. 외부 코드 복사·제품 의존성 추가는 없고 NetworkX/NumPy는 검증 전용이다.
