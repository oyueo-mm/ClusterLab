## 2차 확장 현재 상태

소스57엔진·228추천·75미구현·엄격 인증0. FPCM1997 U행/T열 정규화와 MPCKMeans2004 multiple diagonal을 원본 ND·실제 Trace·독립 NumPy/SciPy로 연결했다. 기존55엔진·220추천은 보존했다. 계약·실제 검증 및 공개 배포 상태는 [2차 보고서](ALGORITHM_EXPANSION_2_REPORT.md)를 따른다. 아래는 이전 기록이다.

## 2026-11-03 1차 확장 — 55개 엔진 공개 배포·최종 검증 완료

제품 main `32dc4cfa634bc181f27f408ff49dc48d81d014a0`의 [Actions/Pages](https://github.com/oyueo-mm/ClusterLab/actions/runs/41513054284) validate·deploy가 성공했다. **55엔진·220추천·77미구현·엄격 원문 완전 인증0**이다. 로컬과 원격 모두 타입·ESLint·빌드·Vitest694/694·48파일, 전체 Chromium/mobile130통과/14기존조건부생략/0실패다. 공개 사이트19통과/1기존중복생략, 신규8추천×2화면16계산/되감기,6폭×2엔진·표본 클릭·리사이즈 무재계산15검사를 확인했다. 공개 HTML/JS/CSS 해시도 로컬 빌드와 동일하다.

PCK `bed5b79` → PCM `98b77b3` → 기존 구조형 기본값 복원 `daa6b2e` → 교재/추천 검증 `926b14e` → 통합·실측 `32dc4cf` 순서로 개발했다. [최종 확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md), [배포 명세](extension-55/release.json), [로컬 전체](extension-55/browser-local.json), [공개](extension-55/browser-public.json), [CI](extension-55/ci-summary.json)를 따른다. 아래 검증 중/54개/53개 표기는 과거 기록이다.

원본 ND·유한 제약 비용 PCK와1993 고정 척도·비정규화 전형성 PCM을 실제 Trace·분석·추천·가이드/미니·독립 NumPy와 연결했다. 기존53엔진 수학 소스·32프리셋·홈,212추천/생성636건,119후보 이름/순서를 보존했다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/`c4d6a7d`를 보존했다. R ppclust 실행·1993 원문 전체 인증·실물 휴대전화·최대 GPU/Worker 메모리는 미검증이다. 후속 FPCM·MPCKMeans 등77후보는 별도 미완료이며 이번 세션에서 추가하지 않는다.

## 2026-11-03 PCKMeans·PCM 확장 — 로컬 55개 통합 검증 중

PCKMeans 안정 커밋 `bed5b79` 이후 PCM을 순차 구현했다. 실행 엔진 **55개**, 기존119후보 중42개 연결·**77개 미구현**, 추천 **220구성**(기존212+각4), 엄격 원문 완전 인증 **0개**다. 기존53개 엔진 수학 로직과32프리셋을 보존한다. [이번 확장 보고서](ALGORITHM_EXPANSION_1_REPORT.md)와 [PCKMeans](research/PCKMEANS.md)·[PCM](research/PCM.md)의 범위·수치 정책을 우선한다.

PCM은 원본 전체 ND에서 별도 FCM 초기화·양수 고정 Ω·1993 목적·독립 전형성·로그 가중 평균을 실제 계산한다. NumPy 직접 거듭제곱 oracle14사례(13성공/영분산 자동척도 오류1), 수식 손계산과 전체 중간 AO·최종 결과·Trace 역진/seek를 검산했다. R ppclust 실행 비교와1993 원문 전체 인증은 하지 않았다. 2005 원저자 재서술의 식과 공식 매뉴얼을 대조했으며 제품에 라이브러리 소스를 복사하지 않았다.

현재 전체 Vitest **694/694·48파일**, 타입·ESLint·빌드 통과. 기존212추천 및 생성636건은 `f615923`과 동일하다. Node PCM100/1000/10000행(d4,K3) 실제 계산+Recorder13.37/46.32/193.98ms, Trace46이벤트·347256/2674654/4662828추정바이트를 관측했다(단일 실행, Worker/렌더 제외). 전체 브라우저·Actions·공개 배포는 아직 검증 중이다. 다른 `.local/sequential-worktree`/`feat/sequential-clustering`/`c4d6a7d`를 보존한다. 아래 과거 체크포인트는 당시 결과다.

# 데이터 형식과 실행 범위 — 53개 개발 트리

UI 개편의 추천 목록은 [DATASET_RECOMMENDATIONS](DATASET_RECOMMENDATIONS.md)와 [기계 판독 목록](ui-datasets/dataset-inventory.json)에 있다. **기존 원본 Dataset/v1 및 Point[]의 계산 의미는 변경하지 않았다.** ROCK의 Point.features와 LVQ의 정답 label도 보존한다. 53개 각각에 기본1·추가2·한계1, 시드/생성 크기/유형/관찰 목적/추천 파라미터를 연결한다. 추천 설정은 명시적 opt-in이다. 사용자 편집은 추천보다 우선하며, 호환되는 점 입력은 ID 경로의 `?input=points`로 계산 의미를 유지한다. 원본 입력과 호환되지 않는 엔진 전환은 기존 원본을 지우지 않고 대체 추천을 안내한다. 큰 원본은 localStorage에 직렬화하지 않고 IndexedDB에 저장한다.

자동 추천 기본값과 명시적으로 선택/편집한 원본은 구분한다. 기본값만 알고리즘에 맞춰 자동 전환하며 사용자 원본은 유지한다. 소유 정보는 IndexedDB의 점 스냅샷 메타데이터 및 원본 자동저장 v2 envelope에 데이터와 함께 저장하므로 localStorage 차단에도 복원된다. 기존 소유 메타데이터 없는 저장 기록은 보수적으로 사용자 데이터로 이관한다. 이 내부 저장 포장은 외부 Dataset/v1 입출력과 엔진에 전달하는 원본을 바꾸지 않는다.

> 최종 공개 체크포인트:53개(기존13+후보40), 미구현79개, 완전 인증0. 제품main fc5cc15·Actions41305149245 validate/Pages 성공. 원격532/39파일·전체브라우저78통과/12기존생략, 로컬 다섯 spec cross38/38, 공개4브라우저8/8. 아래 중간 기록보다 SESSION_REPORT 마지막 확정 절을 우선한다.

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
