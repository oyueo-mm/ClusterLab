# K-Medians / Mini-Batch K-Means

2026-10-31. 두 엔진은 2D 전용이며 공통 레지스트리·UI는 상위 작업에서 연결한다.

## K-Medians

[ELKI KMediansLloyd](https://elki-project.github.io/releases/current/doc/elki/clustering/kmeans/KMediansLloyd.html)의 Lloyd형 정의를 확인했다. 관련 원문은 Bradley, Mangasarian & Street, [Clustering via Concave Minimization](https://papers.nips.cc/paper/1260-clustering-via-concave-minimization), NIPS 1996이다. 이 논문의 전체 bilinear/linear-programming 방법과 현재 Lloyd형 좌표 중앙값 엔진을 같은 계산법이라고 표시하지 않는다. 최초 k-median 문제의 역사 전체를 이 한 논문으로 단정하지 않는다.

Manhattan 할당과 좌표별 중앙값을 교대한다. 짝수 좌표 집합은 두 중간 값의 평균, 빈 군집은 이전 중심 유지. 서로 다른 관측 위치를 시드로 초기화한다. 전역 최적은 보장하지 않지만 각 교대 단계의 L1 비용은 증가하지 않는다. Euclidean 기하중앙값·관측점 medoid·평균 중심과 구분한다.

독립 NumPy `median`과 최종 중심·분할·L1 비용을 비교했다. 손계산 4점 K=1에서는 중앙값 중심 (1.5,1.5)의 비용 42, 평균 중심 (5.75,5.75)의 L1 비용 57을 확인한다.

## Mini-Batch K-Means

Sculley, *Web-Scale K-Means Clustering*, WWW 2010, 1177–1178, DOI 10.1145/1772690.1772862. [원문 미러](https://www.ra.ethz.ch/cdstore/www2010/www/p1177.pdf)에서 Algorithm 1을 읽어 배치 전체의 갱신 전 할당 캐시, 중심별 방문수, 역방문수 학습률을 확인했다. 저자 Tufts 주소는 403이었으며 접근 가능한 논문 미러를 사용했다.

이 엔진은 매 epoch 섞은 전체 점을 비복원 배치로 방문한다. 원문의 무작위 배치 추출과 구분되는 명시적 실행 변형이다. counts는 고유 점 개수가 아니라 누적 방문수다. 배치 학습 후 epoch 끝마다 전체 입력의 레이블/SSE를 평가한다. 전체 SSE의 단조 감소·Lloyd 고정점·전역 최적을 보장하지 않는다. sparse L1-ball projection, sklearn의 재할당/조기 종료는 미지원.

독립 NumPy의 군집별 가중 합으로 각 배치 중심·counts·할당, 최종 전체 SSE를 비교한다. PRNG/초기 순서만 공통 계약으로 재현하고 최적화 코드는 독립 구현했다. 손계산으로 갱신 전 중심 0/10에 배치 4/6을 먼저 할당하는 것이 온라인 재할당과 다름을 검산한다.

## 재현·자원

`python scripts/centroid_variants_reference.py` → `centroid-variants-reference.json` (Python 3.12.10, NumPy 2.5.4). `npx vitest run src/engine/centroid-variants.test.ts`. 제품 의존성 추가·외부 코드 복사 없음. 초기화와 배치 순서는 시드로 재현한다. 모든 점은 각 epoch에서 실제 방문하며 최종 평가는 전체 입력이다. 큰 예상 기록량은 명시적 첫 배치/epoch 요약으로 기록한다. 점 수 고정 상한은 없고, 계산/Trace 바이트 예산을 적용한다.


## 통합 검증 기록

부모 통합 작업에서 25개 엔진의 타입/ESLint/production build, 전체 247개 단위 검사를 통과했다. 이 문서의 엔진은 실제 production Worker·전용 분석·되감기와 ND/그래프 해당 기능을 Chromium/mobile 및 Firefox/WebKit 신규 플랫폼 테스트로 확인했다. 최종 전체 회귀·원격 배포는 SESSION_REPORT에서 별도로 확정한다.
