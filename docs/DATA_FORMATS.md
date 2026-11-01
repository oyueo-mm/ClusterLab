# 데이터 형식과 실행 범위

> 최신 체크포인트: 소스50개(기존13+후보37), 미구현82개, 완전 인증0. 로컬 type/lint/build·단위509/37파일·독립oracle3종·Chromium/mobile 고유74성공/12기존생략·네 플랫폼spec Firefox/WebKit34/34가 확정됐다. main/CI/Pages는 아직 대기다. 이하 중간 기록보다 SESSION_REPORT 마지막 확정 절을 우선한다.

## 2026-11-01 현재 지원

직접 Dataset JSON과 `{"schema":"clusterlab.dataset/v1","data":...}` envelope를 받는다. 현재 소스 실행 엔진은50개(기존13+후보37, 미구현82, 완전 인증0)이며 아래는 원본 형식 실행의 실제 호환 목록이다. 안정44개 [당시 형식 문서](sessions/platform44/DATA_FORMATS.md)와 아래2026-10-31 기록을 보존한다. 새50개의 로컬 브라우저 통합·공개 배포는 검증 중이며 최종 범위는 SESSION_REPORT를 따른다.

| kind        | 필수 필드                                    | 원본으로 실제 실행하는 엔진                                                                                                                                     |
| ----------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| numeric     | values: number[][]                           | Spectral/AP/Density Peaks, X/G/Dip/DP-Means, Louvain/Leiden/LPA/Girvan–Newman/MCL/CNM/Fluid/Walktrap/CPM, CLIQUE/PROCLUS, Bernoulli/Poisson/Multinomial Mixture |
| graph       | nodes, edges, directed                       | Spectral 및 커뮤니티9개; 아래 속성 조건 적용                                                                                                                    |
| categorical | values: string[][]                           | K-Modes                                                                                                                                                         |
| mixed       | numeric: number[][], categorical: string[][] | K-Prototypes                                                                                                                                                    |
| matrix      | values: number[][]                           | Bimax, Cheng–Church Biclustering                                                                                                                                |
| timeseries  | series: {id,times,values}[]                  | K-Shape                                                                                                                                                         |
| stream      | samples: {time,values}[]                     | DenStream                                                                                                                                                       |
| constrained | data: numeric, mustLink/cannotLink: [i,j][]  | COP-KMeans의 실제 전체 ND hard 제약 계산                                                                                                                        |

모든 숫자는 유한해야 하며 각 직사각형 데이터의 행 길이는 같아야 한다. 이름/labels/display가 있으면 해당 행·차원 수와 일치해야 한다. numeric/categorical/mixed의 optional display와 그래프 position은 표시 전용이다. 수치 3D/ND 계산은 선택한 두 화면 축으로 축소되지 않는다. 범주형은 실제 문자열 불일치를 계산하며 범주 코드를 수치 거리로 사용하지 않는다.

### 하드 제약 원본과 COP 결과

```json
{
  "kind": "constrained",
  "data": {
    "kind": "numeric",
    "values": [
      [0, 0, 0],
      [0, 0, 0.2],
      [0, 0, 8],
      [0, 0, 8.2]
    ]
  },
  "mustLink": [
    [0, 1],
    [2, 3]
  ],
  "cannotLink": [[1, 2]]
}
```

JSON 관계는 **0부터 시작하는 원본 행 인덱스**다. ML만 전이 폐쇄를 만들며 CL은 ML 성분 사이에 유도하고 CL 자체를 전이시키지 않는다. 같은 ML 성분 내부 CL은 모순 오류다. COP은 순서대로 실제 허용 군집을 찾는 greedy 방법이므로 제약이 가능한 입력에서도 seed/행순서 때문에 실패할 수 있다. 이 오류를 전체 제약 불가능성 증명이나 성공 빈 분할로 바꾸지 않는다.

native `constrained-partition`은 `labels`, 전체 원본 차원의 `centroids`, `componentIds`, `componentCannotLink`, 실제 SSE `objective`, `activeK`, `converged`를 보존한다. 원본은1행도 실행할 수 있으며 K는1≤K≤n이다. 위 예제의 XY가 모두 같아도 실제 세 번째 축을 사용한다. 속성 표와 ML/CL 관계 편집·추가/삭제·JSON·Undo/Redo는 같은 constrained 원본을 갱신한다. PCK/MPCKMeans·Constrained Spectral은 아직 이 엔진으로 대신 지원하지 않는다. [수식·제한·검증](research/CONSTRAINED.md)

### 이산 확률 혼합의 numeric support

새 스키마를 만들지 않고 `NumericDataset.values`의 모든 열을 사용하지만 선택한 분포별 검증을 추가한다.

| 엔진                | 실제 관측과 모수                                                        | 경계·지원하지 않는 확장                                                                   |
| ------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Bernoulli Mixture   | 정확한0/1 bit vector, 성분 내 조건부 독립 θ∈[0,1]                       | θ0/1은 실제 ML 경계. 자동 이진화·일반 상관 Bernoulli·LCA의 다범주 확장은 없음             |
| Poisson Mixture     | 비음수 안전 정수 count, 조건부 독립 λ≥0                                 | λ0/x0의 질량1. 정수 반올림·노출시간 offset/회귀·zero-inflation 없음                       |
| Multinomial Mixture | 비음수 안전 정수 count vector, 안전한 실제 행합mᵢ를 조건으로 성분 θ 합1 | 행 길이는 서로 달라도 됨. m0 행도 보존. LCA·LDA·Dirichlet-multinomial·자동 smoothing 아님 |

예를 들어 `{"kind":"numeric","values":[[2,1,0],[0,3,1],[1,0,2],[0,0,0]]}`는 count 혼합 입력이지만 Bernoulli에는 부적합하다. 세 엔진 모두 support 내부 초기 모수와 무prior ML M-step을 구분한다. 가중치0 성분은 이전 유효 모수를 유지하고, Multinomial의 가중 count 총수0인 성분은 이전 profile을 유지한다. 식별 가능성을 보장하거나 강제로 K개 그룹을 만들지 않는다.

native `mixture`는 `method`, `labels`, `weights`, 원본 d차원 `parameters`, **모든 n×K** `responsibilities`, 정규화 상수를 포함한 전체 로그우도 합 `logLikelihood`, `support`, `converged`를 반환한다. posterior는 Bayes 확률이며 fuzzy membership이 아니다. M-step 후 새 모수로 실제 재평가하므로 native 모수와 posterior/LL가 일치한다. 원본 생성기는 각각 bit, Poisson count,20-trial Multinomial profile을 만들며 실제 seed·설정·전 차원·featureNames를 보존한다. [분포별 수식·수치 경계·독립 검증](research/DISCRETE_MIXTURES.md)

### 범주형·혼합형

```json
{
  "kind": "categorical",
  "values": [
    ["red", "circle"],
    ["blue", "square"]
  ],
  "featureNames": ["색", "모양"]
}
```

```json
{
  "kind": "mixed",
  "numeric": [
    [1, 0],
    [9, 1]
  ],
  "categorical": [["red"], ["blue"]]
}
```

mixed의 두 배열은 동일 행 수이고 각 배열은 고유 열 수를 유지한다. K-Prototypes는 모든 수치 열의 제곱거리와 gamma×모든 범주 열의 불일치를 합한다. 자동 표준화·자동 gamma·결측 대체는 없다. K-Modes/K-Prototypes의 실제 categoricalCenters/numericCenters/frequencies는 최종 state.analysis에 있다. 최상위 결과는 partition이다.

### 실제 그래프와 수치 입력의 그래프 변환

원본 그래프는 아래 기존 예제의 ID/간선 가중치를 사용한다. 별도 노드 가중치 필드는 지원하지 않으며 modularity 차수는 간선 가중치 합이다. 모든 현재 그래프 엔진은 방향·음수 가중치를 거부한다. 존재하는 노드에 대한 유효한 끝점과 유일 ID가 필요하다.

| 엔진                   | loop/중복                      | 추가 조건·가중치 의미                                                                                |
| ---------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Spectral               | loop 거부, 중복 합산           | 음이 아닌 유사도; K가 성분 수보다 작으면 오류                                                        |
| Louvain/Leiden/LPA/CNM | loop 보존, 중복 합산           | 실제 연결 강도; loop는 modularity 차수에 두 번 반영                                                  |
| MCL                    | loop 보존, 중복 합산           | 실제 loop에 단위 loop를 더해 열 정규화; 밀집 행렬 연산                                               |
| Girvan–Newman          | loop 거부, 중복 합산           | 양의 연결 강도를 최단 경로 길이 1/weight로 변환; 제거마다 재계산                                     |
| Fluid Communities      | loop·중복 거부                 | 연결·단순·무방향·모든 원본 weight=1; 요청 K≤n                                                        |
| Walktrap               | 원본 양의 loop 거부, 중복 합산 | canonical incident 평균 가중 인공 loop는 보행 전용. 원본 그래프 Q로 실제 Ward 계층 cut 선택; 밀집 n² |
| Clique Percolation     | loop·중복 거부                 | 원본 weight=1만 허용(0도 거부), 단순 무방향; k는 clique 크기이며 군집 수 아님                        |

numeric을 커뮤니티9개에 전달하면 모든 원본 차원의 유클리드 거리로 이진 **union-kNN**을 만든다. 변환 출처는 실제 Trace/화면에 표시한다. 전체 거리/정렬 비용이 있으며 raw sparse graph와 자원 요구량이 다르다. Fluid는 변환 그래프도 연결이어야 한다. 원본 간선 입력을 좌표 kNN으로 교체하지 않는다. Spectral은 자체 affinity/laplacian 설정을 사용한다.

커뮤니티 native output은 levels/objective/converged 및 해당하는 memberships다. MCL의 실제 중첩 소속과 Canvas의 지배 흐름 단일 레이블을 구분한다. LPA/Fluid의 표시 Q는 최적화 목적식이 아니다. Leiden의 유한 한 계층 iteration을 점근 최적성 인증으로 표시하지 않는다.

Walktrap에는 해당 native `dendrogram`·`selectedLevel`·Q의 해석을 나타내는 `objectiveName`이 추가된다. 최고Q는 계산한 Ward 계층 안에서 선택한 cut이며 모든 분할의 전역 최대Q가 아니다. CPM에는 실제 `communities`와 `memberships`가 있으며 둘 다 **커뮤니티별 원본 노드 목록**이다. 예를 들어 두 삼각형[0,1,2]/[2,3,4]와 고립 노드5는 두 커뮤니티를 반환하고 노드2는 둘에 속한다. 노드5는 삭제하지 않으며 Canvas label−1은 비소속이다. CPM에는 최적화 목적함수가 없고 통계적 noise 판정도 없다. k>n 또는 clique0개인 빈 cover는 정당한 완료 결과다. [실제 그래프 계약·독립 oracle](research/GRAPH_FOLLOWUP.md)

### 부분공간 결과

CLIQUE는 `kind:"subspaces"`와 전체 subspaces/memberships를 반환한다. PROCLUS는 `kind:"projected-partition"`과 `labels`, `medoids`, `dimensionsByCluster`, `influence`, `unboundedInfluence`, `objective`, `converged`를 반환하며 레지스트리의 출력 유형도 이 계약을 따른다. medoids는 원본 행 인덱스, dimensionsByCluster는 각 군집이 실제 선택한 원본 축, influence는 최종 outlier 판정 반경이다. objective는 outlier 태그 전 전체 평균 segmental 비용이다. 단일 군집은 비교할 다른 medoid가 없으므로 반경이 무제한이다. 분석/JSON의 유한 sentinel `Number.MAX_VALUE`와 native `unboundedInfluence:[true]`로 이 정책을 표시하며 null로 바꾸지 않는다. PROCLUS 분석 상태의 retainedCost와 native objective를 혼동하지 않는다.

### 행렬·이중군집

```json
{
  "kind": "matrix",
  "values": [
    [1, 1, 0],
    [1, 1, 1],
    [0, 1, 1]
  ],
  "rowNames": ["r0", "r1", "r2"],
  "columnNames": ["c0", "c1", "c2"]
}
```

Bimax는 실제 0/1만 허용하며 자동 이진화하지 않는다. minSize는 최소 행, minPts는 최소 열이다. 조건을 만족하는 모든 inclusion-maximal rectangle을 반환하며 출력이 지수적으로 늘면 자원 오류를 반환한다. Cheng–Church는 실제 double-centered MSR·삭제·원본 추가·선택적 행 부호·마스킹으로 탐색한다. bicluster의 residue는 부호를 적용한 원본 MSR, originalResidue는 부호 미적용 원본 MSR이다.

native output의 `biclusters[]`는 실제 rows/columns와 필요한 rowSigns를 보존한다. rowMemberships/columnMemberships는 중첩 가능한 양쪽 소속이며, 보조 Canvas labels는 행의 첫 소속일 뿐이다. rowSigns는 해당 bicluster.rows 순서에 대응한다. 모든 0 이진 행렬의 빈 결과는 정상 결과다.

### 시계열

```json
{
  "kind": "timeseries",
  "series": [
    { "id": "s0", "times": [0, 1, 2, 3], "values": [0, 1, 0, -1] },
    { "id": "s1", "times": [0, 1, 2, 3], "values": [0, 2, 0, -2] }
  ]
}
```

스키마는 각 계열의 고유 ID·동일 길이 times/values·엄격한 시간 증가를 검사한다. K-Shape는 추가로 모든 계열의 같은 길이 L≥2와 같은 균일 시간 grid를 요구한다. 자동 resampling·불규칙 시간 무시는 없다. population z-normalization, 모든 지연의 NCC와 zero padding, 실제 고유벡터 형태를 계산한다. 평탄 파형 정책과 빈 군집/국소해 한계는 [TIMESERIES.md](research/TIMESERIES.md)에 명시했다.

화면 점은 각 시계열의 평균/표준편차 배치다. 계산은 순서 있는 전체 L개 값이며 native timeseries-partition은 실제 centroids/shifts/objective/converged를 반환한다. times는 Trace의 실제 분석 상태에도 보존한다.

### 스트림

```json
{
  "kind": "stream",
  "samples": [
    { "time": 0, "values": [2, 3, 4] },
    { "time": 0, "values": [2, 3, 4] },
    { "time": 5, "values": [2, 3, 4] }
  ]
}
```

time은 감소하지 않는 실제 유한 시각이며 같은 시각의 여러 관측을 허용한다. 모든 values는 같은 원본 차원이다. DenStream은 시간 간격에 따른 감쇠·CF 병합/승격/pruning·macro를 계산한다. lambda/decayRate의 단위는 입력 time의 단위와 맞춰야 한다. 표현 해상도로 pruning 시계가 전진할 수 없는 timestamp는 오류다.

native stream-summary의 processed는 전체 처리 수, time은 마지막 실제 시각, microClusters는 현재 살아 있는 요약이다. `anchor`, `linearSum`, `squaredSum`의 두 합은 **anchor 상대** 가중 모멘트다. 원좌표 1차합은 LS+anchor×weight, 2차합은 SS+2×anchor×LS+anchor²×weight로 복원한다. historical labels는 현재 살아 있는 CF의 macro 소속이며 전체 과거 관측에 대한 정적 DBSCAN과 다르다. warm 초기 batch는 끝 시각에서 개수 가중치로 시작하는 공개 정책이다.

관측 1개 추가와 자동 유입이 가능하지만 현재 UI는 전체 prefix를 Worker에서 재계산한다. 무한 스트리밍 파일·네트워크 공급기나 영속 Worker CF 세션은 아직 없다.

### 편집·입출력·계산 범위

속성 표는 전체 원본 중 16행×8열, 그래프 간선은 16행씩 표시한다. 페이지 크기는 저장/계산 개수 상한이 아니다. 그래프 ID 변경은 관련 간선 ID를 함께 변경하고 가중치/끝점·추가/삭제를 검증한다. 시계열 값/ID는 표에서, 시간축·크기 변경은 JSON에서 함께 편집한다. Undo/Redo는 최대 100작업의 경로/배열 splice로 저장하며 희소 수정에서 전체 과거 데이터 복사를 피한다. 조밀 교체·복원 컨테이너는 여전히 O(n)일 수 있다.

선택한 엔진과 호환되지 않으면 실행을 거부하며 원본을 2D로 몰래 바꾸지 않는다. API의 kind는 native output.kind와 일치하고 computedRows/sourceDimensions, 행렬 computedColumns, 시계열 timeSeriesSteps로 원본 계산 범위를 반환한다. 원본 JSON 내보내기와 전체 계산 결과 내보내기를 구분한다. 현재 화면 결과 JSON은 algorithm/params/input/inputKind/computedRows/sourceDimensions/state/output을 포함한다. 모든 API 부가 필드를 화면 내보내기와 동일하다고 가정하지 않는다.

생성된 Dataset은 optional `provenance:{generator,seed,parameters}`에 실제 생성 설정을 보존한다. 기존 2D CSV/JSON은 유지하며 ND/범주/그래프/행렬/시계열의 공통 교환 형식은 현재 위 JSON이다. GraphML/GEXF·대형 파일 스트리밍·RFC 전체 CSV·PCA/회전형 3D는 미구현이다. 작업 공간/문자열의 바이트 정책을 검사하며 새 600개 또는 다른 전역 행 수 상한은 없다.

최신50개 소스의 마지막 전체 타입/lint/build·단위509개/37파일·신규 Python reference3개는 통과했다. 새 브라우저 통합은 첫 실행4통과/4실패 뒤 테스트 가정·접힌 분석 접근을 수정 중이므로 성공으로 표시하지 않는다. 이전44개 배포와 중간426/427·19개16시나리오 검증 기록은 [안정44개 문서](sessions/platform44/)에 보존한다. 새 전체 회귀·cross-browser·Actions/Pages는 별도 확정이 필요하다.

## 2026-10-31 형식 기록 (보존)

기존 2D CSV/JSON을 유지한다. `#structured`는 JSON 원본·파일 입출력을 지원하며 직접 Dataset 또는 아래 envelope를 받는다.

```json
{
  "schema": "clusterlab.dataset/v1",
  "data": {
    "kind": "numeric",
    "values": [
      [0, 0, 1],
      [0, 0, 9]
    ],
    "featureNames": ["x", "y", "z"]
  }
}
```

numeric values는 같은 길이의 유한 숫자 행이다. optional featureNames는 차원 수, labels/display는 행 수와 같아야 한다. display는 {x,y} 표시 좌표다. 3D/ND를 두 축으로 표시해도 계산은 모든 차원이다. PCA 자동 투영·회전형 3D는 아직 없다.

```json
{
  "kind": "graph",
  "directed": false,
  "nodes": [{ "id": "a", "position": { "x": 0.2, "y": 0.5 } }, { "id": "b" }],
  "edges": [{ "source": "a", "target": "b", "weight": 2 }]
}
```

ID는 유일하며 간선은 존재하는 노드를 가리킨다. position은 표시 전용이다. Spectral은 무방향·음이 아닌 가중치만 받으며 자기 루프를 거부하고 반복 무방향 간선은 합산한다. 방향 그래프를 조용히 무방향으로 바꾸지 않는다. K가 연결 성분 수보다 작으면 오류다.

| kind        | 필수 필드                                   | 실제 지원                                            |
| ----------- | ------------------------------------------- | ---------------------------------------------------- |
| numeric     | values: number[][]                          | Spectral/AP/Density Peaks의 전체 ND 계산             |
| graph       | nodes, edges, directed                      | Spectral 가중 무방향 그래프 계산                     |
| categorical | values: string[][]                          | 직사각형 검증만; 구조형 실행 미지원                  |
| mixed       | numeric, categorical                        | 동일 행 수/열 검증만                                 |
| matrix      | values                                      | 직사각형·optional rowNames/columnNames 검증만        |
| timeseries  | series: {id,times,values}[]                 | 길이·유한 값·시간 증가 검증만                        |
| stream      | samples: {time,values}[]                    | 시간 순서·동일 차원 검증만; 실제 유입 미구현         |
| constrained | data: numeric, mustLink/cannotLink: [i,j][] | 인덱스·Must-Link 추이 폐쇄와 Cannot-Link 모순 검사만 |

기존 Point[] 실험실은 25개 엔진과 ROCK의 categorical tokens/LVQ label을 보존한다. 구조형 categorical과 기존 ROCK 표현을 자동 변환하지 않는다. 결과 JSON에는 원본과 실제 최종 상태/레이블이 포함된다. runDataset의 computedRows/sourceDimensions는 계산 범위를 나타낸다.

파싱 전 문자열/작업 공간 예측과 파싱 후 상세 검증을 한다. 현재 전체 문자열 방식으로 대형 파일 스트리밍·GraphML/GEXF·ND CSV·행렬/시계열 표준 형식은 후속 작업이다. 입력을 잘라 성공으로 처리하지 않는다.
