# 범주형·혼합·부분공간 엔진 구현 기록

2026-10-31 구현, 2026-11-01 재개 시 검증 기록 보완. 실제 구현 범위는 K-Modes, K-Prototypes, CLIQUE, PROCLUS 네 엔진이다. 공통 레지스트리/UI/브라우저 검증은 부모 통합 작업에서 확정한다.

## 원문·정의·라이선스

- Huang (1998), *Extensions to the k-Means Algorithm for Clustering Large Data Sets with Categorical Values*, [출판사](https://link.springer.com/article/10.1023/A:1009769707641). 서지와 초록을 확인했으며 본문은 구독 제한이다. 원문 완독으로 표시하지 않는다. K-Modes의 batch 갱신은 [klaR 공식 문서](https://uligges.r-universe.dev/klaR/doc/manual.html), K-Prototypes의 수치 제곱거리·범주 불일치와 평균·최빈값 정의는 구현 저자의 [R Journal 논문](https://journal.r-project.org/articles/RJ-2018-048/)으로 확인했다.
- Agrawal, Gehrke, Gunopulos & Raghavan (SIGMOD 1998), [CLIQUE 원문](https://www2.cs.sfu.ca/CourseCentral/459/han/papers/agrawal98.pdf) §2–3: strict selectivity, projection 단조성/Apriori, face 연결, DNF 최대 영역 성장·중복 제거를 확인했다.
- Aggarwal, Procopiuc, Wolf, Yu & Park (SIGMOD 1999), [PROCLUS 원문](https://sigmodrecord.org/?download_id=6956&smd_process_download=1) §2/Figures2–6: 표본·greedy 후보, locality, Z, Kℓ 축 제약, segmental 할당, centroid 품질, 정제와 influence outlier를 확인했다. [ELKI 공식 문서](https://elki-project.github.io/releases/current/doc/elki/clustering/subspace/PROCLUS.html)의 독립 구현 계약·서지도 참고했다.

제품은 독립 TypeScript 계산이다. 위 구현 코드를 복사하거나 새로운 제품 런타임 의존성을 추가하지 않았다. Python/NumPy는 검증 도구이며 제품 번들에 들어가지 않는다.

## 실제 계산·수학적 선택

K-Modes는 실제 범주 문자열의 불일치 개수 J를 최소화하도록 전체 batch 할당과 속성별 최빈값을 교대한다. 관측 범주 패턴에서 시드 초기화한다. 동률은 이전 할당/최빈값을 우선하고 빈 군집은 이전 벡터를 보존한다. 마지막 최근접 할당·비용을 다시 계산하며 한도 종료와 안정 수렴을 구분한다. 특정 원저자 초기화/온라인 순서와 같은 결과는 보장하지 않는다.

K-Prototypes는 모든 원본 수치 열의 제곱거리 + γ×실제 범주 불일치다. 수치 평균과 범주 최빈값을 따로 보존한다. γ≥0, 사용자가 명시한 단일 가중치를 사용한다. 자동 표준화·자동 γ·결측 처리·변수별 가중치는 미지원이다. 수치 overflow는 오류다. 두 엔진의 Canvas 중심은 표시 좌표 평균일 뿐 실제 범주형 프로토타입이 아니며 별도 분석 표·JSON에 실제 벡터가 있다.

CLIQUE는 모든 원본 축의 조합을 요청 최대 부분공간 차원까지 탐색하는 unpruned 변형이다. 관측 min/max의 같은 길이 격자를 사용하고 count/n **>** τ로 판정한다. 최대 관측값은 마지막 칸에 포함하며 상수 축은 하나의 점유 칸이다. Apriori 후보를 전체 입력에서 계수하고 같은 부분공간의 면 연결 성분을 찾는다. 대각선 접촉은 연결하지 않는다. 최대 직사각형 성장과 중복 제거로 실제 비중복 DNF cover를 만든다. 전역 최소 개수 cover와 같다고 하지 않는다. 원문의 선택적 MDL pruning·결측/지정 도메인 처리는 미지원이다. 전체 memberships/subspaces를 보존하고 Canvas label은 가장 높은 차원의 첫 소속만 표시한다.

PROCLUS는 실제 관측 표본 S와 farthest-first 후보 M에서 medoid 탐색을 수행한다. 후보마다 모든 원본에서 locality·Z를 계산하고 각 군집 최소 두 축, 전체 Kℓ개 축을 선택한다. 표준편차 0은 Z=0과 축 인덱스 동률로 처리한다. 할당은 군집별 평균 절대거리(segmental), 품질은 실제 군집 centroid에 대한 전체 평균 segmental 비용이다. 최선 해의 작은 군집 medoid를 교환하며 연속 미개선 한도로 종료한다. 정제는 locality 대신 실제 군집 구성원으로 재차원 선택 후 모든 medoid influence를 벗어난 점을 outlier로 표시한다. 한 군집 influence는 무한이다. 원본 차원 d≥2·2≤ℓ≤d가 필요하다. 최종 objective는 outlier 태그 전 전체 비용이며 retainedCost는 제외 후 비용/전체 n이다. 전역 최적/고정점 인증으로 표시하지 않는다.

## 독립 수치·Trace 검증

`python scripts/data_clustering_reference.py` → `src/engine/fixtures/data-clustering-reference.json`, NumPy **2.5.4** 실제 실행. 독립 NumPy 빈도/평균, 모든 부분공간 격자 전수 계수·연결 성분, 선언 locality의 PROCLUS Z/축/거리/품질, 소형 데이터의 모든 **30개 순서 있는 medoid 쌍**에 대한 locality/할당/정제/influence/outlier를 계산한다. TypeScript의 모든 실제 PROCLUS 후보 제안과 최종 정제를 이 전수 표와 비교한다. 특정 확률 탐색이 일반 데이터의 전역 최적이라는 주장은 하지 않는다.

전용 `data-clustering.test.ts` **19개** 통과: 수치 fixture, 실제 세 번째 범주/수치 차원 사용·표시 불변성, 동률/빈 군집, strict threshold/최댓값/대각 접촉, 빈 칸을 덮지 않는 DNF, 축 개수 제약, 잘못된 입력, 동일점/중복, 시드 재현성, 모든 전후 상태/48이벤트 checkpoint, 최종 실제 비용, 성능 관측. 제품 통합 후 전체 검증 결과는 부모 SESSION_REPORT를 따른다.

## 자원·성능

K-Modes O(TnKp), K-Prototypes O(TnK(q+p)); 원본·빈도표 O(n(q+p)+K(q+p)+빈도 수). CLIQUE는 최대 탐색 부분공간 차원에 지수 후보가 생길 수 있으며 실제 후보·소속·격자 바이트를 검사해 초과하면 명시적 실패한다. 새 전역 점 수 상한은 없다. PROCLUS는 실제 제안 P에 대해 O(PnKd+PKd log(Kd)), 초기 greedy O(ABK²d), 공간 O(nd+nK+Kd+AK)이며 전체 n² 거리 행렬은 없다. 부모 resources의 공통 사전 검사와 Trace 예산을 함께 적용한다.

`data-clustering.test.ts`의 단일 Node 관측을 `data-clustering-performance.json`에 보존한다. 각 엔진 1,000행이며 생성·Worker 복사·렌더링은 제외하고 heap delta는 peak가 아니다. 짧은 실행 시간은 모든 기기/장시간 성능 보장이 아니다. 브라우저 대형 입력·전송/그리기·장시간 peak는 추가 측정 대상이다.
