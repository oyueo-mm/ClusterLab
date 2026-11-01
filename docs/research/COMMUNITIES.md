# 그래프 커뮤니티 5개 엔진 — 계산·검증 기록

2026-11-01. Louvain, Leiden, Label Propagation, Girvan–Newman, Markov Clustering(MCL)의 실제 엔진·Trace·교재·전용 분석 컴포넌트가 있다. 이 문서의 단위/수치 검증과 부모의 최종 UI·브라우저·배포 검증을 구분한다. 전수 마스터 완료 인증이 아니다.

## 입력 계약

- 실제 무방향 GraphDataset의 노드 ID·가중치를 사용한다. 중복 간선은 합산하고, 0가중 간선은 연결을 만들지 않는다. 방향/음수/비유한 가중치는 오류다.
- 숫자/기존 Point 입력은 **모든 원본 차원**으로 이진 union-kNN을 명시적으로 구성한다. 자기 이웃을 제외하고 거리 동률은 원본 인덱스로 정한다. 입력 좌표 자체를 실제 그래프라고 표시하지 않는다. 수치 입력 kNN은 현재 정확한 전수 거리/정렬이며 O(n²d+n²log n), 희소 출력이라고 이 생성 비용이 선형인 것은 아니다.
- 희소 adjacency에서 self-loop는 모듈성 차수에 두 번 반영한다. Louvain/Leiden/LPA/MCL은 실제 loop를 보존한다. GN은 self-loop를 명시적으로 거부한다.

## 원문과 실제 구현 범위

### Louvain

Blondel et al. (2008), [Fast unfolding of communities in large networks](https://arxiv.org/html/0803.0476v2), §2의 노드 이동/집약을 확인했다. 실제 ΔQ에는 현재 커뮤니티에서 제거하는 항과 새 커뮤니티에 넣는 항이 모두 들어간다. 단일 이동의 개선을 양수 1e−14 초과에서 수용한다. 이는 부동소수점 개선 문턱이며 임의 정밀도의 지역 최적을 보장하지 않는다. 이웃 군집과 가능한 빈 singleton을 후보로 보고, 시드 방문 순서로 지역 이동을 반복한다. 집약 시 원본 노드 매핑·중복 가중치·내부 loop를 보존하며 전후 Q를 검사한다. 반복 한도 종료에는 converged=false를 표시한다. 연결성/전역 최적은 보장하지 않는다.

### Leiden

Traag, Waltman & van Eck (2019), [From Louvain to Leiden](https://arxiv.org/html/1810.08473v3), Appendix A.2와 modularity 변환 설명을 확인했다. 실제 fast local queue, parent 커뮤니티 내부의 singleton refinement, refined 분할에 따른 집약을 수행한다. 집약 후 초기 분할은 refinement 전 부모 관계다. degree를 질량으로, resolution을 γ/(2m)로 사용한다. refinement 소스/대상의 연결 조건과 비음수 ΔH를 직접 검사하고 exp(ΔH/θ) 확률로 선택한다. 안정 계산을 위해 최대 gain을 뺀다. 병합되지 않은 singleton만 이동하며, 간선 없는 0gain 대상은 병합하지 않아 고립점을 유지한다.

실행은 **한 번의 계층 iteration**이다. 원문 점근 안정/부분집합 최적성을 유한 반복 결과에 붙이지 않는다. local/계층 예산이 부족하면 완료 결과 없이 오류다. 완료 전에 실제 원본 군집 연결성을 선형 스캔으로 검사하며 실패를 후처리로 고치지 않고 오류로 알린다. small graph는 각 실제 이동/refinement를 기록한다. 예상 n² 기록 바이트가 클 때 첫 이동/첫 refinement와 각 실제 완료 단계만 요약하며 계산 대상/순서/난수는 바꾸지 않는다.

### Label Propagation

Raghavan, Albert & Kumara (2007), [원문](https://arxiv.org/html/0709.2938v1)과 [NetworkX 공식 가중 확장](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.label_propagation.asyn_lpa_communities.html)을 확인했다. 실제 이웃 레이블별 가중 합, 비동기 갱신과 전체 합의 검사를 수행한다. 현재 레이블이 최대이면 유지하고, 아닌 경우 최대 후보 중 시드 선택한다. loop의 실제 가중치는 투표에 한 번 반영한다. 수렴 못 하면 실제 레이블과 converged=false다. 표시 Q는 관측 지표이며 최적화 목적이 아니다. 연결성/중첩/유일해 보장은 없다.

### Girvan–Newman

Girvan & Newman (2002), [원문](https://arxiv.org/html/cond-mat/0112110v1)의 반복 간선 제거와 [Brandes (2001)](https://snap.stanford.edu/class/cs224w-readings/brandes01centrality.pdf)의 dependency 누적을 확인했다. 각 제거 뒤 모든 시작점의 실제 최단 경로·동률 경로 수·간선 betweenness를 재계산한다. 이 제품에서 가중치는 **연결 강도**, 경로 길이는 1/weight라는 명시적 확장이다. 원래 비가중 GN과 구분한다. 최대 점수 동률은 간선 인덱스 순서다. 양의 부동소수점 경로 길이를 사용하며 정확한 동률 비교는 Number equality다. Dijkstra 최소값은 선형 추출이므로 한 점수 계산 O(n³+nm), 공간 O(n+m)다. K에서 계층을 추출하며 최적 Q 컷을 자동 선택하지 않는다. 원래 성분이 K보다 많으면 합치지 않는다.

### MCL

van Dongen, [A New Cluster Algorithm for Graphs, CWI INS-R9814 (1998)](https://ir.cwi.nl/pub/4604/04604D.pdf), Definition6 및 §5의 expansion/inflation을 확인했다. [Graph Clustering by Flow Simulation (2000)](https://ir.cwi.nl/pub/18026)은 학위논문 서지를 확인했다. 앞 보고서의 연도를 2000으로 오기하지 않는다. 일부 저자 매뉴얼 URL은403이었다.

실제 입력 loop에 단위 loop를 더하고 열 정규화, 정수 행렬 거듭제곱과 원소별 r승·열 정규화를 수행한다. 정확한 전체 밀집 연산이며 수치 pruning은 없다. tolerance는 최대 원소 변화와 attractor 지지 추출에 사용한다. 대각 attractor의 지지를 중복 제거하되 **겹치는 memberships를 보존**한다. Canvas labels는 지배 attractor 흐름의 표시 분할이다. 양의 유한 반복 잔여 전이와 수치 지지 문턱을 무한 극한의 정확한 support라 부르지 않는다. 미수렴/미포함 노드는 오류다. n² 작업 공간을 할당 전에 검사한다.

## 독립 수치 검증

`python scripts/community_reference.py`를 실제 실행했다. 제품 TypeScript를 import하지 않는다. NumPy2.5.4, NetworkX3.6.1, igraph1.0.0, 원저자 leidenalg0.12.0을 기록했다. Leiden/igraph는 무시된 `.local/community-reference-runtime`에만 설치하며 브라우저 번들/런타임 의존성에 추가하지 않는다.

검증 데이터는 약한 다리 두 삼각형, loop·중복·고립 노드, 가중 diamond다. NetworkX의 모든 작은 set partition Q를 전수 생성해 최적화된 결과뿐 아니라 모든 분할과 집약 Q를 검사한다. Louvain/Leiden의 알려진 고유 분할·Q를 NetworkX/저자와 비교한다. 대칭 diamond는 다른 동등 분할을 허용한다. Python과 TypeScript PRNG가 다르므로 모든 확률 그래프의 동일 분할은 주장하지 않는다.

NetworkX 가중 비정규화 edge betweenness와 각 GN 제거/추출 분할을 비교한다. NumPy 행렬곱·원소별 power로 MCL의 첫 expansion/inflation 및 수렴 행렬 전체를 비교한다. LPA의 분리 삼각형, 수치 투표와 합의 조건을 검산한다. 추가로 16 seed 가중 희소 그래프에서 Leiden 완료 군집의 연결성을 검사한다. 600노드(원래6+고립594) 요약 기록에서도 전체 레이블·개별 고립점·작은 성분 Q·역재생이 보존됨을 확인했다.

`npx vitest run src/engine/community.test.ts`: **22/22 통과**. 전진/역진/임의 탐색과100노드195개 실제 이벤트의 비어 있지 않은checkpoint, 시드, 표시 좌표 불변, 원본3차원 kNN, 잘못된 입력·동일/빈 간선·loop·음수/방향·명시적 실패·MCL 중첩 지지를 포함한다. 최종 부모 통합 테스트 수와 브라우저 결과는 부모 보고서에서 확정한다.

## 성능 관측과 저장

`community.test.ts`의 ring graph 관측은 `.local/community-performance.json`에 저장하며 이 개발 단위의 증거는 `community-performance.json`에 보존한다. Node/GC 전후 heap 차이는 peak가 아니고 입력 생성·Worker 전송·브라우저 렌더링을 제외한다. 타이밍을 통과 조건으로 사용하지 않는다.

희소 실제 입력100/1000노드에서 Louvain/LPA/Leiden을 측정했고 GN30, MCL50/100도 별도로 측정했다. Leiden1000의 상세 기록은 개발 중64MiB 예산에 실패해, 실제 계산은 유지하고 명시적 단계 요약으로 변경했다. 이후1000노드 약20ms·34이벤트·Trace 추정1.68MB가 관측됐다. 이는 일반 속도 향상/peak/60FPS 보장이 아니다. Louvain의1000점 상세 기록도 약33.5MB로, 더 큰 상세 Trace는 여전히 바이트 예산을 넘을 수 있다.

## 라이선스 및 남은 제한

외부 알고리즘 코드를 제품에 복사하지 않았다. 검증 패키지 설치 metadata에서 NetworkX BSD-3-Clause, leidenalg GPL-3.0-or-later, igraph GPL, texttable MIT를 확인했다. GPL 검증 런타임은 제품에 포함하지 않는다. 제품의 dependency/lockfile 변경은 없다.

제한: 방향/음수 커뮤니티 모델, CPM 선택 UI, 반복적인 Leiden 점근 수렴, 최적 모듈성 컷 자동 선택, fast/sparse MCL, heap Dijkstra, 고속 kNN, 100k/1M 실제 그래프 및 장시간 누수/peak/브라우저 FPS는 미구현·미검증이다. 결과를 빈 성공으로 감추지 않으며 부모의 도감/실험실/브라우저/배포까지 확인하기 전 전체 완전 구현으로 인증하지 않는다.

추가 수치 안정성 검사: 그래프 가중치를1e−300/1e300으로 스케일해도 Q와 알려진 분할을 보존하고, 큰 유한 resolution에서 중간 곱 overflow를 피하도록 비율을 먼저 계산했다. 표현 범위를 넘은 비유한 목적함수/변화량은 명시적 오류다.
