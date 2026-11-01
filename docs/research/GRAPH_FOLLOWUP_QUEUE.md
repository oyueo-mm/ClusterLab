# 그래프 후속 후보 — 원문 확인과 구현 준비 메모

2026-11-01. `main a81a931`의 제품 소스를 동결한 상태에서 작성한 **부분 조사 메모**다. 새 엔진·Trace·교재·브라우저 검증을 추가한 문서가 아니다. 기존 Louvain/Leiden/Label Propagation/Girvan–Newman/MCL/CNM/Fluid 7개를 재구현하지 않는다. 후보 전체 등록표·실행 수·조사 완료 상태는 이 메모로 변경하지 않는다.

아래 7개 후보를 모두 유지한다. 원문에서 직접 확인한 정의, 앞으로 선택할 제품 범위, 공식 oracle의 존재, 이 환경에서 실제 실행한 smoke를 구분한다. 링크가 열린 사실은 논문 전체·코드 전체를 검토했다는 뜻이 아니다.

## 접근 및 준비 상태

| 후보 | 실제 열람 범위 | 현재 oracle 상태 | 남은 핵심 결정 |
|---|---|---|---|
| Chinese Whispers | Biemann2006 PDF §2.1–2.2/Fig1·고립점·동률·비수렴; 연구실 공식 저장소 README/라이선스 | 연구실 Java 실행 경로 확인, 미실행 | 기존 LPA와 가까운 변형 분류·정확한 동률/고립점/정지 규약 |
| Walktrap | Pons–Latapy2005 긴 원문 §1–4.3, 공식 igraph C/Python 계약 | 기존 igraph1.0.0에서 가중6노드 dendrogram smoke 실행 | loop 전이·격리/비연결·병합 동률·정확한 Ward delta oracle |
| Infomap | Rosvall–Bergstrom2008 본문·SI pp1–2의 map equation/flow/탐색, 현재 저자 문서·라이선스 | igraph1.0.0 공식 경로 smoke 및 독립 codelength 검산; 별도 infomap 모듈 없음 | 2008 2-level vs 현재 multilevel, teleportation/정지/flow 계약 |
| Clique Percolation | Palla et al.2005 HTML 정의·인접 clique 설명, 공식 NetworkX API | NetworkX3.6.1에서 중첩 삼각형 smoke 실행 | 정확한 clique 열거·지수 출력 예산·비가중 원본 계약 |
| BigCLAM | Yang–Leskovec2013 PDF §4–5 Eq1–4·threshold/초기화/K선택, SNAP 설명·라이선스 | 저자 SNAP bigclam 존재 확인, 실행/설치 안 함 | ε·시드 초기화·K·실제 line search·큰 gradient oracle |
| Stochastic Block Model | Holland et al.1983 PDF 정의·고정 block 추정 부분; Karrer–Newman2010 preprint §II–III; graph-tool 공식 모델 문서 | graph-tool 모듈 없음, 실행 안 함 | 모델 계열과 추론 알고리즘을 구체적으로 선택해야 함 |
| OSLOM | Lancichinetti et al.2011 §II.1–II.4 및 AppendixA/B 식·절 일부, PLOS 원문 | 저자 사이트 timeout, 실행 파일/라이선스 미확보 | 실제 null 분포·bootstrap/order correction·weighted/directed/계층까지 검증 |

사이트 접근 제한은 제외 사유가 아니다. Walktrap의 새 Python 도메인은 도구 접근 실패 후 `igraph.org/python/versions/latest`와 C 공식 문서로 확인했다. graph-tool cookbook은 timeout이었지만 공식 BlockState 문서는 열렸다. CFinder/oslom의 http/https 사이트는 이번 브라우징에서 timeout/접근 실패였다. OSLOM 원문은 PLOS와 arXiv HTML로 열렸다. 보충자료·저자 바이너리가 확보됐다고 표시하지 않는다.

## 현재 그래프 계약과 공통 준비

현재 `GraphDataset`은 실제 `nodes{id,position?}`, `edges{source,target,weight}`, `directed`다. 별도 vertex weight·hyperedge·state node·시간별 graph snapshot은 없다. 현재 실행 전 준비 단계는 directed 입력을 거부한다. 새 엔진이 방향을 지원하더라도 이 거부를 선택 엔진별 검증으로 분리하는 선행 변경이 필요하다. 현재 동결 단위에서 이 계약을 바꾸지 않는다.

`communityCommon`의 loop 대각은 차수 계산을 위해 2w다. 확률 전이의 대각 원소나 Bernoulli 관측을 그대로 뜻하지 않는다. 새 전이/통계 엔진이 이 자료를 그대로 재사용해 loop·병행 간선·실수 가중치를 잘못 계산하지 않도록 입력별 수학적 어댑터를 명시한다. numeric 입력을 지원하려면 전체 원본 차원 union-kNN 생성 비용/출처를 유지하고 비가중 방법에서는 생성된 단위 간선만 사용한다. 원본 가중 그래프를 사용자 모르게 이진화하지 않는다.

현재 communities 결과는 Q를 중심으로 구성돼 있다. 후속 모델은 description length/likelihood/significance가 목적이므로 Q로 덮어쓰지 않는다. memberships와 화면용 labels를 분리하고 실제 커뮤니티가 없는 노드·겹치는 소속을 보존한다. clique/친화도 요인/확률 block/flow/의미 있는 통계 검정의 Trace를 먼저 정의해야 한다. 모든 산술·전체 입력 계산과 기록 페이지/요약을 구분한다.

## Chinese Whispers (CW)

[Biemann (TextGraphs2006), 원문 PDF](https://aclanthology.org/W06-3812.pdf) §2.1/Fig1은 **가중 무방향** 그래프의 고유 초기 label→무작위 순회→즉시 갱신이다. 기본 수식은 다음과 같다.

\[
s_i(c)=\sum_{j\in N(i)}w_{ij}\mathbf1[z_j=c],\qquad
z_i\leftarrow\operatorname{randomArgmax}_c s_i(c).
\]

같은 최대 점수가 여러 개면 무작위 선택하며 현재 label을 자동 우선하지 않는다. 원문은 고립점을 미군집으로 남기고 동률로 형식적 수렴이 실패할 수 있음을 설명한다. weighted basic 외 degree downweighting/최종 soft 배분/mutation은 따로 명시해야 한다. 기본 한 패스 O(n+m)와 고정 패스 전체 O(T(n+m))를 무제한 수렴 시간 보장과 구분한다.

현재 LPA는 현재 label이 최대일 때 유지한다. 따라서 단순 별칭은 아니지만 동일 전파 계열과 매우 가깝다. **주요 변형/관련 구현으로 분류 검토**하고 단순 설정 복제를 새 독립 수학 엔진으로 부풀리지 않는다. 예를 들어 이웃 A가 2+1, B가3일 때 현재 A를 유지하는 LPA와 원문 CW의 무작위 tie가 달라진다. 이 단계별 차이를 작은 oracle로 검증해야 한다.

[연구실 공식 구현](https://github.com/uhh-lt/chinese-whispers)은 Apache-2.0, Java/Maven의 global/ego 실행을 문서화한다. 미실행이다. README의 `-N`은 노드별 간선 수를 제한하므로 oracle에 그대로 쓰면 원본을 자를 수 있다. 입력 전체 보존·무방향 양쪽 행·전역/ego 모드·순회/동률을 맞춘 검증 드라이버가 먼저 필요하다. 제품에 코드를 복사하지 않는다.

## Walktrap

[Pons & Latapy (2005), 긴 원문](https://arxiv.org/html/physics/0512106v1) §1은 모든 노드에 loop를 추가하고 비연결 그래프를 성분별 처리한다. §2–4는 다음 전이·거리·인접 Ward 병합을 정의한다.

\[
P=D^{-1}A,\quad P_C^{(t)}=|C|^{-1}\sum_{i\in C}P_i^{(t)},\quad
r_{CD}^2=\sum_v\frac{(P_{Cv}^{(t)}-P_{Dv}^{(t)})^2}{d(v)},
\]
\[
\Delta\sigma(C,D)=\frac{|C||D|}{n(|C|+|D|)}r_{CD}^2.
\]

실제 간선으로 이웃인 군집 중 Δσ가 최소인 쌍만 합친다. 병합 기준은 ΔQ가 아니며 덴드로그램에서 Q가 좋은 cut을 선택하는 단계와 다르다. 출력은 비중첩 계층이다. 직접 exact 전이를 계산할지 원문 근사 random walk를 쓸지 구분하고, 첫 구현은 전자와 실제 byte 검사로 시작하는 것이 합리적이다. 희소 입력이라고 전체 Pᵗ/거리 공간이 선형인 것은 아니다.

[공식 igraph C 계약](https://igraph.org/c/html/latest/igraph-Community.html#igraph_community_walktrap)은 저자 C++ 구현 사용·양의 가중치·고립점 unit-loop를 설명하지만 **방향을 무시**한다. 제품은 방향 입력을 먼저 거부해야 한다. 추가 loop와 원래 loop의 중첩 규약/전이 대각은 상세 oracle를 더 만들어 확인한다. 독립 NumPy의 Pᵗ/모든 Ward 후보와 실제 merges를 비교하고 동률은 등가 집합으로 검증한다. [Python API](https://igraph.org/python/versions/latest/api/igraph.Graph.html#community_walktrap)의 steps=4/최대-Q cut을 smoke했다. GPL igraph는 검증 전용으로 유지한다.

## Infomap

[Rosvall & Bergstrom (PNAS2008), 본문+SI](https://www.mapequation.org/assets/publications/RosvallBergstromPNAS2008Full.pdf)의 기본 2-level 모델은 가중·방향 flow의 **비중첩** 분할을 찾는다. 고차/메모리 그래프의 물리 노드 중첩은 별도 모델이다.

\[
L(M)=qH(Q)+\sum_c p_c^\circlearrowright H(P_c),\quad
q=\sum_c q_c,\quad p_c^\circlearrowright=q_c+\sum_{i\in c}\pi_i.
\]

π는 정상 방문 빈도, q_c는 군집 이탈율이며 단위는 bits/step이다. 무방향 연결 그래프는 π_i=d_i/(2m), q_c=cut(c)/(2m)로 직접 검산할 수 있다. 방향 그래프는 sink·teleportation·정상분포 잔차·recorded/unrecorded 선택을 명시해야 한다. 현재 저자 기본 옵션과2008 greedy+annealing을 같은 알고리즘 실행이라고 혼용하지 않는다. 계층·시도 수·seed·수렴·목적값을 기록한다.

[현행 저자 Python 문서](https://mapequation.org/infomap-python-docs/api/infomap.html)는2.16.0, 기능별 문서는2.15.1 표시도 관측됐다. 실제 oracle에 사용할 설치 버전/flow/two_level을 고정해야 한다. `infomap` 모듈은 현재 미설치지만 기존 igraph1.0.0의 community_infomap은 실행했다. [공식 C 문서](https://igraph.org/c/html/latest/igraph-Community.html#igraph_community_infomap)는1.0부터 저자 라이브러리 사용을 명시한다. [저자 저장소](https://github.com/mapequation/infomap)는 GPLv3-or-later 및 별도 비copyleft 협의라는 dual license다. 제품 의존성 도입은 별도 크기·라이선스 검토이며 이번에는 하지 않았다.

## Clique Percolation (CPM)

[Palla, Derényi, Farkas & Vicsek (Nature2005), 원문 HTML](https://arxiv.org/html/physics/0506133v1)의 기본 k-clique community는 k개 완전 부분그래프를 노드로 하는 보조 그래프의 연결 성분이다. 두 k-clique가 **k−1개 원본 노드**를 공유할 때 이웃이다.

\[
\mathcal K_k=\{S\subseteq V:|S|=k,\;G[S]\text{ complete}\},\quad
S\sim T\iff |S\cap T|=k-1.
\]

보조 성분에 속한 clique들의 원본 노드 합집합을 반환한다. 다른 성분의 원본 노드는 겹칠 수 있고 k-clique에 없는 노드는 미소속이다. k는 요청 군집 수가 아니다. 기본 CPM은 단순 비가중 무방향이며 weighted CPMw/방향 확장을 자동으로 지원한다고 하지 않는다. 원본 weight≠1/방향/loop·중복 처리 정책을 먼저 정한다.

[공식 NetworkX API](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.kclique.k_clique_communities.html)는 node-set 목록을 반환한다. 웹 stable은3.7, 실제 smoke는3.6.1이다. 가중치를 읽지 않는 oracle이므로 unit graph만 전달한다. 구현 검증은 모든 작은 부분집합의 완전성+clique 인접 BFS 전수 열거와 비교한다. 최대 clique 수·k부분집합·소속 크기의 실제 byte 예산 초과 시 오류를 내고 일부만 반환하지 않는다. NetworkX는 BSD-3-Clause다. CFinder는 공식 접근 timeout이므로 바이너리 사용 조건을 확정하지 않았다.

## BigCLAM

[Yang & Leskovec (WSDM2013), 저자 PDF](https://cs.stanford.edu/~jure/pubs/bigclam-wsdm13.pdf) §4–5의 관측은 **이진 무방향** 간선이다. 잠재 강도와 원본 실수 가중치를 혼동하지 않는다. F≥0는 합1 확률·퍼지 소속도가 아닌 affiliation 강도다.

\[
p_{uv}=1-e^{-F_u^TF_v},\quad
\ell(F)=\sum_{\{u,v\}\in E}\log(1-e^{-F_u^TF_v})
-\sum_{\{u,v\}\notin E,\;u<v}F_u^TF_v,
\]
\[
\nabla_{F_u}\ell=\sum_{v\in N(u)}\frac{F_v}{e^{F_u^TF_v}-1}
-\sum_{v\notin N(u),\;v\ne u}F_v.
\]

실제 block coordinate projected gradient/백트래킹과 전체 F합을 이용한 nonedge 항을 구현해야 한다. 임의 NMF multiplicative update·KMeans로 대체하지 않는다. ε-background, δ=√(−log(1−ε)), 실제 초기 neighborhood·고정K/holdout 선택은 공개 정책으로 확정한다. 전체 비볼록 문제의 전역 최적을 주장하지 않는다.

[저자 SNAP 설명](https://snap.stanford.edu/snap/description.html)의 bigclam 예제와 [BSD 라이선스/일부 구성요소 조건](https://snap.stanford.edu/snap/license.html)을 확인했지만 로컬 snap 모듈/바이너리는 없고 실행하지 않았다. 다음 oracle는 NumPy 전체 pair likelihood·중심 유한차분 gradient·단일 수용 step 증가를 비교하고, 이후 고정 SNAP 버전의 출력/F/K정책을 비교한다. 실제 memberships/F/likelihood/line-search Trace와 중첩 결과 형식이 필요하다.

## Stochastic Block Model (SBM)

[Holland, Laskey & Leinhardt (1983), 원문 PDF](https://www.stat.cmu.edu/~brian/780/bibliography/04%20Blockmodels/Holland%20-%201983%20-%20Stochastic%20blockmodels%2C%20first%20steps.pdf)의 정의·추정 부분은 **고정된 사전 blocks**도 다룬다. SBM은 단일 군집화 반복법 이름이 아니라 생성모델 계열이다. Bernoulli simple/Poisson multigraph·degree correction·Bayesian MDL·mixed membership을 구분하고 실제 label 추론법을 택하기 전 엔진 완료로 셀 수 없다.

[Karrer & Newman (2010 preprint;2011 논문)](https://arxiv.org/html/1008.3926v1) §II–III의 Poisson 모델은 고정 K에서 profile 목적식과 실제 KL식 노드 이동/패스 내 best-state 복원을 제시한다.

\[
\mathcal L_0(g)=\sum_{rs}m_{rs}\log\frac{m_{rs}}{n_rn_s},\qquad
\mathcal L_{DC}(g)=\sum_{rs}m_{rs}\log\frac{m_{rs}}{\kappa_r\kappa_s}.
\]

논문 규약의 내부 m_rr는 반간선 수,0log0=0이고 omitted scale/상수와 정규화 log-likelihood를 구분한다. 실수 연결 강도를 Poisson 관측 정수 multiplicity로 조용히 해석하지 않는다. 비assortative block도 찾을 수 있어 modularity 분할과 다를 수 있다.

[공식 graph-tool BlockState](https://graph-tool.skewed.de/static/docs/stable/autosummary/graph_tool.inference.BlockState.html)는 기본 degree-corrected **microcanonical/MDL** 모델이라 위 canonical profile 점수와 바로 비교할 oracle가 아니다. [현재 공식 홈페이지](https://graph-tool.skewed.de/)는3.9/LGPLv3를 명시한다. 설치/실행하지 않았다. 추후 선택한 모델의 작은 모든 label 배정·원시 확률·전부 재계산한 이동 차이를 독립 NumPy로 먼저 검증하고, graph-tool을 쓰면 동일 모델/priors/정규화부터 맞춘다. 원본 블록 확률/카운트·우도/패스/불확실성 출력이 필요하다.

## OSLOM

[Lancichinetti, Radicchi, Ramasco & Fortunato (PLOS ONE2011)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0018961), [수식이 보이는 원문 HTML](https://arxiv.org/html/1012.2363v2) §II는 configuration null의 실제 내부 연결 분포→discrete tail의 무작위 bootstrap→순서 통계→cluster cleaning을 사용한다. 단순 modularity·일반 이항검정·현재 graphDegree를 넣은 임의 hypergeometric만으로 대체하면 OSLOM이 아니다.

\[
r(k_i^{in})=\sum_{j=k_i^{in}}^{k_i}p(j\mid i,C,G),\quad
\Omega_q(x)=\sum_{j=q}^{N-|C|}{N-|C|\choose j}x^j(1-x)^{N-|C|-j}.
\]

군집 점수에는 min_q Ω_q를 다시 보정하는 φ가 필요하다. 해당 Φ표/Monte Carlo와 AppendixA의 재귀·근사를 추가 검산해야 한다. 겹치는 cover·homeless·가지별 깊이가 다른 계층을 보존한다. weighted의 강도 tail 및 topology 결합, directed의 in/out 결합은 각각 다른 null 변수를 갖는다. 양의 임의 가중치를 unweighted count로 쓰지 않는다.

논문은 [저자 사이트](http://www.oslom.org/)를 안내하지만 이번 접근은 실패했고 코드 버전/빌드/라이선스/실행 oracle를 확보하지 못했다. PLOS 논문 CC-BY와 소프트웨어 배포 허가를 같다고 보지 않는다. 먼저 exact 작은 configuration 표본·tail 정규화·order-statistic 분포·고립/무의미 graph와 seed 통계를 독립 검증하고 저자 실행과 비교해야 한다. 이 장은 정의와 장애 요인을 확인한 메모이며 OSLOM 전체 구현 절차 감사 완료가 아니다.

## 실제 실행한 oracle smoke와 검산

제품 코드/fixture/테스트/패키지를 변경하지 않고 기존 검증용 `.local/community-reference-runtime`을 읽었다. Python은 `-B`, igraph RNG는 `random.Random(42)`로 설정했다. 실행 버전은 igraph1.0.0/NetworkX3.6.1이다. 별도 snap/infomap/chinese_whispers/graph_tool 모듈은 없었다.

공통 가중 그래프는 노드0..5, 삼각형(0,1,2)/(3,4,5)의6개 간선 weight1, 다리(2,3)의 weight0.1이다.

| 호출/독립 계산 | 실제 관측 |
|---|---|
| `g.community_walktrap(weights=weights,steps=4)` | merges [(4,5),(0,1),(3,6),(2,7),(8,9)]; 최대-Q cut labels [0,0,0,1,1,1], Q=0.4836065573770493 |
| `g.community_infomap(edge_weights=weights,trials=10)` | labels [0,0,0,1,1,1], codelength=1.7220390421334069 |
| 독립 stdlib edge/entropy 계산 | π=[2,2,2.1,2.1,2,2]/12.2, q₁=q₂=0.1/12.2; 2-level L=1.7220390421334066; 한 모듈 entropy=2.584576851106354 |
| `nx.community.k_clique_communities(h,3)` | h의 삼각형(0,1,2)/(2,3,4)에서 [{0,1,2},{2,3,4}]; 원본 노드2의 실제 중첩 보존 |

직접 entropy 계산은 `xlog(x)=x log₂x`, `L=xlog(Σq)−2Σxlog(q_c)−Σxlog(π_i)+Σxlog(q_c+Σ_{i∈c}π_i)`로 수행했다. 이것은 원본 map equation과 igraph 점수의 작은 수치 일치를 확인한 것이다. 새 제품 엔진이 없으므로 독립 engine 검증 통과·새 알고리즘 수 증가로 보고하지 않는다. stochastic 결과는 모든 seed/버전에 같은 분할을 보장하지 않는다.

## 다음 실제 구현 단위의 제안

1. Walktrap 또는 비가중 CPM부터 원본 정책/비용/전용 native 출력과 독립 중간 oracle를 확정한다. 실제 loop 전이·인접 Ward 병합 또는 실제 clique 연결/중첩을 Trace로 보여준다.
2. Infomap은 2-level undirected exact flow와 explicit objective부터 시작하되 저자 탐색법/수치 정책을 구체화한다. directed 지원은 공통 검증 변경·sink/teleportation 테스트를 동반해야 한다.
3. CW는 기존 LPA와 분류/동률 차이를 확정한 뒤 구현 여부를 결정한다. 이름만 추가하지 않는다. BigCLAM/SBM/OSLOM은 각각 우도 학습·모델 선택·통계적 null의 별도 vertical로 다룬다.
4. 각 엔진에서 계산→Trace/역재생→전용 시각화/가이드/실제 미니 실험→독립 oracle/단위→브라우저까지 확인한 뒤 실제 상태표를 갱신한다. 이 순서 제안은 다른 후보의 영구 제외가 아니다.

이번 파일만 추가했다. 후보 등록표·44엔진 제품 소스·기존 연구 문서·검증 카운트·배포 상태는 변경하지 않았다. 페이지 접근과 smoke 결과는 이 날짜의 관측이며 향후 구현 시작 시 사용 버전을 다시 고정한다.
