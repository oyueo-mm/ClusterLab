# Walktrap / Clique Percolation — 실제 계산·독립 검증

2026-11-01. 안정 44개 엔진 다음 개발 단위의 두 실제 엔진·전용 Trace·분석·수학 교재를 구현했다. [사전 조사 메모](GRAPH_FOLLOWUP_QUEUE.md)의 다른 후보는 그대로 미구현이며 이 파일로 원문 전수 조사/전체 마스터 완료를 선언하지 않는다. 제품 레지스트리·전체 회귀·브라우저·배포는 부모 통합에서 별도로 확정한다.

## Walktrap의 원문과 실행 정책

Pons & Latapy (2005), [Computing communities in large networks using random walks](https://arxiv.org/html/physics/0512106v1), §1–4의 loop·보행 전이·차수 보정 거리·인접 Ward·최고Q cut을 확인했다. 인공 loop가 있는 무방향 그래프에서 P=D⁻¹A, P_Cᵗ는 원본 구성원의 균일 평균이며 r²_CD=Σ_v(P_Cvᵗ−P_Dvᵗ)²/d_v다. 인접한 현재 군집만 후보로 보고 Δσ=|C||D|/(n(|C|+|D|))×r²가 최소인 쌍을 병합한다. Q가 최대 증가하는 CNM 병합과 다르다.

가중 확장의 실제 loop 정책은 [igraph에 보존된 저자 graph 어댑터](https://raw.githubusercontent.com/igraph/igraph/main/src/community/walktrap/walktrap_graph.cpp)의 수학적 입력 계약을 확인했다. 제품은 외부 소스를 복사하지 않고 위 확률/거리/평균 공식을 독립 TypeScript로 작성했다.

- 원본 방향·음수·비유한 가중치는 오류다. 0간선은 연결이 없으며 무방향 parallel 간선은 먼저 합산한다.
- **canonical 양의 간선**의 노드별 incident 가중치 평균을 인공 loop로 추가한다. 비가중이면1, 고립점도1이다. 이는 모든 노드에 단순히 전역 상수1을 더하는 가중 모델과 다르다.
- 원본 양의 self-loop는 명시적으로 거부한다. 현재 common의 loop2w 차수와 보행 전이 대각을 혼동하거나 저자 기존-loop 정책을 추정해서 지원하지 않는다. raw parallel을 그대로 전달한 igraph와 평균이 달라질 수 있으므로 독립 비교도 canonical graph로 맞춘다.
- 보행 차수는 원래 strength+인공 loop다. Q는 **인공 loop 없는 원본 canonical 그래프**에서 계산한다. 고립·비연결 성분을 강제로 합치지 않는다.

P⁰=I에서 전체 행의 희소 한 단계 전이를 반복 곱해 P¹…Pᵗ를 정확하게 계산한다. random walker 표본은 없다. 모든 인접 Ward 후보를 현재 구성원의 평균 벡터로 직접 평가하고 병합 뒤 새 평균을 크기로 가중해 갱신한다. 실제 자식ID/부모ID/구성원/Δσ/Q와 모든 수준 labels를 보존한다. 전체 계층의 가장 높은 Q cut을 반환하며 64×machine-epsilon 범위의 Q 동률은 더 세분된 수준을 유지한다. Ward의 부동소수점 동률은 계층 ID 순서다. 모든 분할의 전역 최적Q·참 군집 수는 보장하지 않는다.

[공식 igraph C 문서](https://igraph.org/c/html/1.0.0/igraph-Community.html#igraph_community_walktrap)는 저자 C++ 구현·양의 가중치·고립점·반환 계층/cut을 명시한다. 공식 라이브러리가 방향을 무시하는 동작을 제품은 입력 오류로 분리했다. main 소스 열람과 실제 설치된 igraph1.0.0 실행을 구분한다. 저자/igraph GPL 코드는 제품 의존성이나 복사한 구현으로 포함하지 않는다.

## Walktrap의 수치·Trace·시각화

손계산 path0—1—2, 단위 간선, t=1: 보행 차수 [2,3,2], P의 행은 [1/2,1/2,0], [1/3,1/3,1/3], [0,1/2,1/2]다. 인접0/1의 r²=17/216, Δσ=17/1296이다. 원래 인접하지 않은0/2는 후보가 아니다. 원본 Q는 singleton−3/8→한 병합−1/8→전체0이므로 최종 cut은 한 군집이다.

graph→walk→test→merge→extract→finish를 실제 순서로 기록한다. `walkIteration`은 현재 P의 지수, `walkSteps`는 요청 길이여서 처음 P⁰/중간 P¹을 최종 Pᵗ로 오표시하지 않는다. MCL의 열 확률 transition과 별도 `walkProbabilities` 행 확률을 사용한다. Ward 후보에는 실제 distance/increase가 있고 `objectiveName`은 Q가 cut 선택용임을 명시한다. 실제 덴드로그램·선택 수준도 native communities 결과에 보존한다.

전용 화면은 Pᵗ의 모든 원소를10×10 페이지로, 모든 Ward 후보를12쌍 페이지로 보여준다. 실제 자식/부모 SVG와 병합 표는12병합 표시 창으로 탐색한다. SVG 세로축은 실제 병합 **순서**이며 거리 축이 아니다. 선택 수준을 표시한다. 숫자는 실제 현재 단계이며 행렬 색 보간만 시각 효과이고 reduced-motion을 따른다. 큰 기록은 실제 첫/2의 거듭제곱 단계/마지막 요약이며 전체 보행·후보·계층 계산은 유지한다. 생략한 개별 상세 이벤트의 완전 재생은 주장하지 않는다.

## Clique Percolation의 원문과 실제 계산

Palla, Derényi, Farkas & Vicsek (2005), [원문 HTML](https://arxiv.org/html/physics/0506133v1)의 k-clique·k−1 인접·중첩 cover 정의를 확인했다. 크기 k의 완전 부분그래프가 보조 노드이며 원본 노드 k−1개를 공유하면 인접한다. 각 보조 연결 성분의 원본 노드 합집합이 커뮤니티다. 다른 성분은 k−2개 이하의 원본 노드를 공유할 수 있으므로 결과는 겹칠 수 있다.

기본 비가중 단순 무방향 CPM이다. 원본 weight≠1(0포함)·self-loop·중복·방향은 명시 오류이며 이진화/속성 삭제를 하지 않는다. 수치 입력은 모든 원본 차원의 명시적 이진 union-kNN으로 변환한다. k≥2는 clique 크기이며 군집 수가 아니다. k>n 또는 clique가 없는 경우 빈 cover가 정상 결과다.

증가하는 원본 ID 순서의 이웃 교집합 frontier를 명시적 스택으로 탐색해 **모든 k-clique**를 중복 없이 열거한다. 작은 실제 이웃 집합을 우선하는 교집합으로 희소 입력에 불필요한 전체 n² 탐색을 피한다. 각 clique에서 실제 k개의 (k−1)-face를 만들고, 같은 face를 가진 첫 clique와 연결해 union-find 성분을 계산한다. 같은 face의 완전한 pair 연결을 star로 바꿔도 연결 성분은 동일하다. 저장한 각 간선은 실제 공유 face를 가지며 일부 계산을 근사하는 star 표본이 아니다.

`cliques`, `cliqueLinks`, `cliqueComponents`, `communities`, `memberships`와 미소속 수를 보존한다. memberships는 현재 MCL과 같은 **커뮤니티별 원본 노드 목록** 계약이며 노드별 확률 행렬이 아니다. Canvas label은 첫 소속, −1은 k-clique 소속 없음이다. 통계적 noise 검정을 수행하지 않는다. objective 필수 공통 계약에는0을 넣되 objectiveName은 **목적함수 없음**이며 전용 화면은 Q 최적화로 표시하지 않는다.

graph→clique→percolate→extract→finish는 실제 새 완전 부분그래프와 공유 face/성분 갱신을 기록한다. SVG/표는 clique16개·구성원8열 표시 창과 그 창 내부 실제 연결을 그린다. 전체 계산/중첩을 유지하고 페이지/JSON에서 접근한다. 작은 노드0..4 두 삼각형{0,1,2}/{2,3,4}는 한 노드만 공유하므로 두 커뮤니티이며 노드2가 중첩된다. 삼각형{0,1,2}/{1,2,3}은 두 노드를 공유해 한 커뮤니티다. 고립된 노드5는 결과에서 삭제하지 않고 미소속으로 남는다.

## 실제 독립 oracle와 단위/통합 검증

`python -B scripts/graph_followup_reference.py`를 실제 실행했다. NumPy2.5.4, NetworkX3.6.1, igraph1.0.0이며 제품 코드를 import하지 않는다. 기존 검증용 `.local/community-reference-runtime`에서 igraph를 읽고 제품 package/lockfile 의존성은 추가하지 않았다.

- Walktrap5사례: 비대칭 가중 barbell, 가중 path의1단계, canonical parallel, 비연결/고립점, 손계산 unit path다. NumPy `matrix_power`로 전체 P¹..Pᵗ를 계산한다. 모든 비어 있지 않은 노드 부분집합에서 평균과 원본 행 SSE를 다시 계산해 모든 disjoint 인접 쌍의 Ward 변화/거리를 생성한다. 제품의 증분 평균 갱신 공식을 oracle로 복제하지 않는다.
- 모든 작은 원본 분할의 Q를 [NetworkX](https://networkx.org/documentation/stable/reference/algorithms/community.html)에서 전수 계산해 실제 각 이벤트의 Q와 집약 수준의 최고Q를 검산한다. 제품의 계층 경로/동률이 달라도 각 실제 후보와 선택이 oracle의 정확한 최소인지 확인한다. 다섯 사례의 최종 분할/Q·실제 병합 수는 설치된 저자 igraph Walktrap과 비교해 일치했다.
- CPM은4노드의 가능한64개 단순 그래프×k2/3/4,6노드 무작위40개×k3/4,중첩 손계산1개로 **273개 입력 사례**를 생성했다. Python의 모든 노드 조합 완전성 검사와 모든 clique쌍의 교집합 그래프를 만들고 [공식 NetworkX CPM](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.kclique.k_clique_communities.html)의 전체 cover와도 비교했다. 제품의 face-hash/union 구현과 다른 oracle다.

`npx vitest run src/engine/graph-followup.test.ts`는 **19개 테스트 통과**다. fixture 입력273개를 테스트273개라고 부풀리지 않는다. 기존 그래프7개 전용31개와 함께 **3파일50개 통과**를 확인했다. 이 수를 부모 전체 결과에 중복 합산하지 않는다. 전체 새 UI/기존 기능/공개 배포는 부모 검증 범위다.

검증에는 매 실제 Ward 후보·P행 합·원본 Q·최고 수준, 고립/빈 간선·원본 loop/방향/음수/다중/weight 오류, k2/k>n/미소속/중첩, 시드 불필요 결정성·원본3차원/표시 좌표 불변, 큰 공통 가중치1e±250, 행렬 입력 mutation 방어, 실제48이벤트 checkpoint/전후·임의 탐색/최종 상태 일치, 실제 typed 로더/교재 미니 실험/native 출력이 포함된다. complete18,k3의816개 clique에서는 요약 기록 정책에서도 모든 clique/소속/역재생을 검사한다. 701노드의 고립 suffix도 모든 레이블을 보존한다.

## 자원·성능·한계

Walktrap은 n²×192+n×512+m×192의 작업 추정을 할당 전에 검사한다. 전이 계산은 O(t n(n+m)), 모든 인접 후보의 직접 벡터 거리 재계산·정렬까지 보수적으로 O(t n(n+m)+n²m+nm log m)이다. 원문 heap/갱신 가속 시간 복잡도를 이 구현의 성능으로 표시하지 않는다. 그래프/후보 O(n+m), 확률/중간 행렬·전체 수준/덴드로그램 O(n²), Trace가 별도다.

CPM의 실제 clique 수 C는 지수적으로 증가할 수 있다. frontier 및 C×(256+128k+24k²)+256n+192m의 실제 clique/face/DSU/소속 바이트를 검사한다. 조합 수의 상계는 **기록 세분도 선택에만** 쓰고 sparse graph를 잠재 출력 상계로 거부하지 않는다. 일부 결과를 반환하고 전체 열거 성공이라고 표시하지 않는다. 기본256MiB 작업·64MiB Trace는 실행 정책이며 peak/가용RAM 측정이 아니다. 새로운 전역 입력/결과 개수 상한은 없다.

실제 Node 관측은 [graph-followup-performance.json](graph-followup-performance.json)에 보존했다. Walktrap path의100/300/1000노드, CPM path의100/1000/10000노드 및 complete18의816개3-clique다. 모든 해당 입력을 처리했다. CPM path는3-clique가 없는 쉬운 사례로 지수 결과·조밀 overlap의 보편 성능이 아니다. Walktrap1000은 약58.7MB 추정 Trace로64MiB 정책에 가깝다. 더 큰 상세/중간 행렬은 실패할 수 있다. heap delta는 peak가 아니고 GC로 음수가 될 수 있다. 입력/표시 점 생성·Worker 전송/렌더링/FPS/취소 지연은 제외했다.

```powershell
python -B scripts/graph_followup_reference.py
npx vitest run src/engine/graph-followup.test.ts src/engine/community.test.ts src/engine/graph-extra.test.ts
```

남은 과제: 브라우저 실제 신규2엔진·전용뷰/교재/모바일·전체 기존 회귀, 원격 Actions/Pages, heap/희소 Walktrap 가속과 큰 행렬 전송, 원본 loop 확장·방향 모델, CPMw/방향CPM, 대형 지수 출력/장시간 메모리·기기별FPS. 단일 Node 완료를 모든 기기·모든 규모의 성공/60FPS/완전 구현 인증으로 사용하지 않는다.
