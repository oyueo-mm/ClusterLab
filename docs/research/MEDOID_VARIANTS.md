# CLARA / CLARANS 조사와 검증

2026-10-31. 2D Euclidean 관측점 medoid를 사용하며 평균 중심이나 제곱거리 SSE로 바꾸지 않는다.

## 근거와 열람 범위

Kaufman & Rousseeuw, Finding Groups in Data (1990)의 CLARA 장은 유료 접근으로 전체 원문을 직접 확인하지 못했다. 서지와 [공식 R cluster 문서](https://stat.ethz.ch/R-manual/R-devel/library/cluster/html/clara.html)의 표본 PAM·전체 평가·후속 표본 최선 medoid 포함을 확인했다. 원문 완독으로 표시하지 않는다.

Ng & Han의 [VLDB 1994 §3.2](https://www.vldb.org/conf/1994/P144.PDF)와 [2002 후속 논문](https://cs.ecu.edu/dingq/CSCI6905/readings/CLARANS.pdf)의 무작위 이웃 교환·수용 시 연속 거절 초기화·numlocal/maxneighbor를 확인했다.

## 실제 계산

CLARA는 reservoir 표본에서 PAM BUILD와 모든 단일 SWAP 비용 평가를 수행한다. 다음 표본은 이전 최선 medoid를 포함한다. 각 해는 **전체 n개**의 비제곱 거리합으로 비교하고 전체 레이블을 반환한다. 표본 탐색임을 밝히며 전체 PAM과 동일하거나 전역 최적이라고 하지 않는다. SWAP 한도와 지역 최적 종료를 구분한다.

CLARANS는 medoid/비medoid 무작위 교환을 전체 원본 거리합으로 평가하고 엄격한 개선만 수용한다. 수용하면 연속 거절 수를 초기화한다. 재시작 전체의 최선 해를 반환한다. 이웃 재방문이 가능하며 거절 한도가 모든 이웃 검사를 의미하지 않는다.

시드·관측 인덱스·표본·제안·수용·전체 비용을 기록하고 전후 복원한다. CLARA 공간 O(n+s²), CLARANS O(n+K)로 전체 n² 거리 행렬은 없다. CLARA naive 시간 O(R(s²K+TK²s²+nK)), CLARANS는 실제 제안 P와 재시작 R에 대해 O((P+R)nK)다. P는 R×maxNeighbors보다 커질 수 있다.

## 독립 검증

scripts/medoid_variants_reference.py가 NumPy로 6점 모든 medoid 쌍을 전수 평가한다. 제안별 비용·감소량·카운터·최선 해·전체 레이블을 독립 표와 비교한다. 0,0.1,0.2,0.8,0.9,1의 medoid 0.1/0.9 비용은 0.4다. 이 예제의 전역 최적을 일반 입력으로 확대하지 않는다.

medoid-variants.test.ts는 동일점/중복/K=n/잘못된 값/시드/전체 평가/Trace 복원을 검사하고 CLARA 10,000점·CLARANS 1,000점 관측을 쓴다. 보존 측정: docs/platform/medoid-performance.json. Python은 검증 전용이며 제품 의존성 추가·외부 코드 복사는 없다.


## 통합 검증 기록

부모 통합 작업에서 25개 엔진의 타입/ESLint/production build, 전체 247개 단위 검사를 통과했다. 이 문서의 엔진은 실제 production Worker·전용 분석·되감기와 ND/그래프 해당 기능을 Chromium/mobile 및 Firefox/WebKit 신규 플랫폼 테스트로 확인했다. 최종 전체 회귀·원격 배포는 SESSION_REPORT에서 별도로 확정한다.
