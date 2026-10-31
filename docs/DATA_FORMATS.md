# 데이터 형식과 실행 범위

기존 2D CSV/JSON을 유지한다. `#structured`는 JSON 원본·파일 입출력을 지원하며 직접 Dataset 또는 아래 envelope를 받는다.

```json
{"schema":"clusterlab.dataset/v1","data":{"kind":"numeric","values":[[0,0,1],[0,0,9]],"featureNames":["x","y","z"]}}
```

numeric values는 같은 길이의 유한 숫자 행이다. optional featureNames는 차원 수, labels/display는 행 수와 같아야 한다. display는 {x,y} 표시 좌표다. 3D/ND를 두 축으로 표시해도 계산은 모든 차원이다. PCA 자동 투영·회전형 3D는 아직 없다.

```json
{"kind":"graph","directed":false,"nodes":[{"id":"a","position":{"x":0.2,"y":0.5}},{"id":"b"}],"edges":[{"source":"a","target":"b","weight":2}]}
```

ID는 유일하며 간선은 존재하는 노드를 가리킨다. position은 표시 전용이다. Spectral은 무방향·음이 아닌 가중치만 받으며 자기 루프를 거부하고 반복 무방향 간선은 합산한다. 방향 그래프를 조용히 무방향으로 바꾸지 않는다. K가 연결 성분 수보다 작으면 오류다.

| kind | 필수 필드 | 실제 지원 |
|---|---|---|
| numeric | values: number[][] | Spectral/AP/Density Peaks의 전체 ND 계산 |
| graph | nodes, edges, directed | Spectral 가중 무방향 그래프 계산 |
| categorical | values: string[][] | 직사각형 검증만; 구조형 실행 미지원 |
| mixed | numeric, categorical | 동일 행 수/열 검증만 |
| matrix | values | 직사각형·optional rowNames/columnNames 검증만 |
| timeseries | series: {id,times,values}[] | 길이·유한 값·시간 증가 검증만 |
| stream | samples: {time,values}[] | 시간 순서·동일 차원 검증만; 실제 유입 미구현 |
| constrained | data: numeric, mustLink/cannotLink: [i,j][] | 인덱스·Must-Link 추이 폐쇄와 Cannot-Link 모순 검사만 |

기존 Point[] 실험실은 25개 엔진과 ROCK의 categorical tokens/LVQ label을 보존한다. 구조형 categorical과 기존 ROCK 표현을 자동 변환하지 않는다. 결과 JSON에는 원본과 실제 최종 상태/레이블이 포함된다. runDataset의 computedRows/sourceDimensions는 계산 범위를 나타낸다.

파싱 전 문자열/작업 공간 예측과 파싱 후 상세 검증을 한다. 현재 전체 문자열 방식으로 대형 파일 스트리밍·GraphML/GEXF·ND CSV·행렬/시계열 표준 형식은 후속 작업이다. 입력을 잘라 성공으로 처리하지 않는다.
