# 데이터 형식과 실행 범위 — 53개 개발 트리

현재 소스53개(기존13+후보40), 미구현79개, 완전 인증0개다. 공개 안정50개 형식 원문은 [sessions/platform50/DATA_FORMATS.md](sessions/platform50/DATA_FORMATS.md)에 보존했다. 새3개의 최종 브라우저·배포는 SESSION_REPORT를 따른다.

## 원본 JSON

직접 Dataset 객체 또는 {"schema":"clusterlab.dataset/v1","data":...} envelope를 사용한다. 기존 Point CSV/JSON 가져오기·내보내기는 원래 편집 경로에서 보존한다. typed ND/그래프 등의 CSV/GraphML/GEXF 스트리밍 파서는 아직 없다.

| kind        | 필수 원본                                                              | 실행 범위                                               |
| ----------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| numeric     | values:number[][]                                                      | 레지스트리의 실제 ND 지원 엔진. 새BSAS/MBSAS/TTSAS 포함 |
| categorical | values:string[][]                                                      | K-Modes                                                 |
| mixed       | numeric:number[][],categorical:string[][]                              | K-Prototypes                                            |
| graph       | nodes:{id,position?}[],edges:{source,target,weight}[],directed:boolean | Spectral과 실제 커뮤니티9개, 속성 제약은 각 엔진별      |
| matrix      | values:number[][]                                                      | Bimax/Cheng–Church                                      |
| timeseries  | series:{id,times,values}[]                                             | K-Shape                                                 |
| stream      | samples:{time,values}[]                                                | DenStream                                               |
| constrained | data:numeric,mustLink:[i,j][],cannotLink:[i,j][]                       | COP-KMeans                                              |

숫자는 유한하고 각 직사각형 데이터의 행 길이는 같아야 한다. numeric의 featureNames/labels/display, 그래프 position, 행렬 rowNames/columnNames 등은 지정했다면 원본 수와 맞아야 한다. labels는 정답 메타데이터이고 새 비지도 엔진의 계산 입력으로 사용하지 않는다. optional display는 표시용이다.

```json
{
  "schema": "clusterlab.dataset/v1",
  "data": {
    "kind": "numeric",
    "featureNames": ["X", "Y", "원본 Z"],
    "values": [
      [0, 0, 0],
      [0, 0, 0.6],
      [0, 0, 1.2]
    ]
  }
}
```

이 세 행은 화면 X/Y가 같아도 원본 Z가 다르다. 순차 θ=1에서 입력 순서를 바꾸면 BSAS 결과가 달라질 수 있다. 모든 원본 차원을 계산하며 화면 축 선택으로 계산 차원을 바꾸지 않는다.

## 알고리즘별 support

Bernoulli는 정확0/1 product 관측, Poisson은 비음 안전 정수의 독립 count, Multinomial은 비음 안전 정수 count-vector와 안전한 행합을 조건화한다. 확률 벡터·범주 번호를 count로 조용히 변환하지 않는다.

COP의 JSON 관계 인덱스는0기반이고 표 UI는1기반이다. ML closure 내부 CL과 잘못된 인덱스는 모순 오류다. COP는 hard greedy이며 soft penalty나 전역 feasible solver가 아니다. 원본 숫자와 희소 관계를 실제 편집·delta Undo/Redo한다.

BSAS/MBSAS는 θ≥0, 정수q=maxClusters≥1이며 q>n도 허용한다. TTSAS는0≤threshold<upperThreshold이며 q를 사용하지 않는다. 원본 배열 순서를 그대로 처리하고 seed로 섞지 않는다. native sequential-partition은 labels/모든 원본 축의 centroids/counts/prototypeCounts/passes/unassigned/완료/assignedSSE다. 중간 −1은 유보·미처리이며 노이즈가 아니다. 완료는 순차 배정 종료이지 Lloyd 고정점 인증이 아니다.

원본 그래프는 자동 이진화하지 않는다. 현재 연결된 graph 엔진은 무방향을 지원하고 directed는 명시 오류다. 가중치·중복/loop·연결성 제약은 실제 엔진별로 검증한다. Fluid는 단순 연결 단위 그래프, CPM은 단순 unit/loopless 그래프, Walktrap은 양의 원본 간선과 별도 인공 loop 정책이다. numeric→kNN을 사용하는 방법은 그 변환을 명시하며 표시 좌표로 원본 그래프를 대체하지 않는다.

Bimax는 이진 행렬, Cheng–Church는 실제 수치 행렬이다. 결과는 실제 행·열 bicluster와 양쪽 소속을 보존한다. K-Shape는 같은 길이/규칙적인 시간격자와 원본 파형, DenStream은 실제 비감소 시각/동일 차원의 순차 유입을 검증한다. 구체적인 경계·수치 정책은 각 research 문서를 따른다.

## 입출력·크기·메타데이터

provenance는 generator·seed·실제 parameters를 보존한다. 생성기는 실제 난수 규약을, 고정 손계산 mini는 명시한 순서/값을 사용한다. ND/범주/혼합/그래프/행렬/시계열/스트림/제약·이산 count 생성기와 JSON 원본 편집을 제공한다. 표의 표시 창과 전체 저장 데이터는 다르며 모든 행·열을 탐색할 수 있다.

native 출력과 computedRows/sourceDimensions는 전체 계산 원본을 뜻한다. 화면 표본/LOD나 Trace 요약을 전체 입력의 일부 계산이라고 숨기지 않는다. 새 전역 데이터 개수 상한은 없으며 실행별 차원·간선·실제 출력·byte 예산을 검사한다. 현재 파일 입력은 전체 JSON 문자열이고 file.size 기반 추정 메모리를 사전 검사한다. 큰 파일 청크 파싱·자동 변환·무한 stream 세션은 미완료다.
