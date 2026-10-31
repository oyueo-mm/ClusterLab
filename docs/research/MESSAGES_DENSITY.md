# Affinity Propagation / Density Peaks 검증 기록

2026-10-31. 실제 계산·Trace·독립 수치 검산용 구현. 공통 UI·레지스트리 통합과 브라우저 검사는 상위 작업에서 수행한다.

## Affinity Propagation

Frey & Dueck, *Clustering by Passing Messages Between Data Points*, Science 315 (2007), 972–976. [원문](https://utstat.utoronto.ca/reid/sta414/frey-affinity.pdf)의 1–2쪽 R/A 갱신, 대각 availability, damping, exemplar 판정을 확인했다. [공식 scikit-learn API](https://scikit-learn.org/stable/modules/generated/sklearn.cluster.AffinityPropagation.html)와 검증 패키지 1.7.2를 사용했다.

원본 N차원 수치 벡터 전체의 음의 제곱거리 유사도를 사용한다. preference는 실제 대각 유사도, damping은 [0.5,1), convergenceWindow는 exemplar 집합의 연속 안정 횟수다. 메시지는 실수 점수이며 확률·퍼지 소속도가 아니다. 완전 동률은 명시적 해석 분기, 일반 동률은 인덱스 우선이다. 최종 관측 exemplar를 군집 내 유사도 합으로 정제한다. 메시지 한도 종료는 `converged=false`, exemplar가 전혀 없으면 오류다.

검증: 독립 NumPy의 첫 R/A를 소수 11자리 비교하고, 3D 6점의 최종 분할과 실제 exemplar IDs를 sklearn 1.7.2와 비교했다. 부호/대각 수식 검산, 실제 메시지 순서, 결정성, 모든 Trace 단계의 역복원, display 좌표와 독립인 원본 특성 계산을 확인했다. 3D 데이터의 화면 점을 모두 동일하게 둬도 실제 특성으로 두 군집을 얻는다.

## Density Peaks / CFSFDP

Rodriguez & Laio, Science 344 (2014), 1492–1496, DOI [10.1126/science.1242072](https://doi.org/10.1126/science.1242072). 논문 PDF 직접 열람 제한은 남아 있다. [원저자의 자료](https://people.sissa.it/~laio/Research/Clustering_source_code/cluster_dp.tgz)를 직접 읽어 Gaussian/cutoff, 밀도 정렬·부모 탐색, 최상위 δ, halo 절차를 확인했다. 아카이브 SHA256: `be45f3402bc2af363207e7364e643b5250e2f1f226e7f95d240214595310ac14`.

원저자 코드처럼 정렬 순위가 앞선 점을 부모 후보로 사용하고 동밀도는 인덱스로 순서를 정한다. 이는 엄밀한 높은 밀도 관계와 같은 뜻이 아니다. 최고 순위 δ는 나머지 δ의 최댓값이다. 중심 선택은 원문의 수동 사각형 선택 대신 최고 순위 루트와 γ=ρδ 상위 최대 K개 위치라는 명시적 변형이다. 동일 위치를 중복 중심으로 선택하지 않는다. halo는 별도로 반환하며 분할 레이블을 조용히 덮어쓰지 않는다.

Gaussian·cutoff 두 커널 모두 독립 NumPy의 ρ/δ/부모/γ/선택 중심/분할/halo와 비교했다. 동일 좌표·평탄 밀도·dc 제곱 underflow/overflow·경계 halo·정확한 역복원도 검사한다. 원본 코드는 제품에 복사하거나 저장소에 재배포하지 않았다.

## 재현과 한계

`python scripts/messages_density_reference.py`는 별도 `.local/spectral-reference-runtime`의 NumPy 2.5.4, SciPy 1.18.1, scikit-learn 1.7.2로 fixture를 생성한다. Python 3.12.10. 제품 런타임 의존성은 없다. `npx vitest run src/engine/messages-density.test.ts`로 비교한다.

두 방법 모두 정확 dense 거리/메시지에 O(n²) 저장 공간을 사용한다. 전체 점 계산이며 표본 계산은 없다. 상세 Trace에는 바이트 예산을 적용한다. 고유한 해·전역 최적·임의 크기의 데이터 실행·모든 preference의 AP 수렴을 보장하지 않는다. AP는 precomputed arbitrary similarity나 sparse graph 입력을 아직 제공하지 않는다. DP의 사용자 지정 사각형 중심 선택 UI도 아직 없으며, top-gamma K 변형으로 표시해야 한다.


## 통합 검증 기록

부모 통합 작업에서 25개 엔진의 타입/ESLint/production build, 전체 247개 단위 검사를 통과했다. 이 문서의 엔진은 실제 production Worker·전용 분석·되감기와 ND/그래프 해당 기능을 Chromium/mobile 및 Firefox/WebKit 신규 플랫폼 테스트로 확인했다. 최종 전체 회귀·원격 배포는 SESSION_REPORT에서 별도로 확정한다.
