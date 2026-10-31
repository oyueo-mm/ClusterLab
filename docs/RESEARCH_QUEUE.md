# 후속 엔진 조사 메모 — 원문 조사 진행 중

2026-10-31, 원격 브라우저 검증 대기 중 확인한 1차 자료다. 아래 메모만으로 후보의 원문·정의 전수 조사나 구현 완료 상태를 상향하지 않는다. `candidates.json`의 117개 미구현 상태는 유지한다. 원문 코드를 제품에 복사하지 않는다.

## 후보 49 Affinity Propagation

Frey & Dueck, *Clustering by Passing Messages Between Data Points*, Science 315 (2007), 972–976. [원문 PDF](https://utstat.utoronto.ca/reid/sta414/frey-affinity.pdf), 1–2쪽 메시지 정의와 갱신 및 damping을 확인했다.

입력은 유사도 s(i,k), 대각은 preference. 좌표에서 쓰려면 비대각 유사도를 음의 제곱거리로 정의한 변환을 명시한다. 실수 responsibility와 availability는 퍼지 소속도 행렬과 별개의 메시지다. r(i,k)=s(i,k)−max_{l≠k}[a(i,l)+s(i,l)], 비대각 a(i,k)=min(0,r(k,k)+Σ_{l∉{i,k}}max(0,r(l,k))). 대각 availability와 메시지 damping, 최종 exemplar consistency, 동률 및 진동을 추가로 검산해야 한다.

예정 Trace는 유사도 구성→responsibility 갱신→availability 갱신→exemplar 판단이며, preference로 군집 수가 달라지는 것을 표시한다. dense 메시지 행렬의 실제 바이트를 사전 추정해야 한다. 아직 엔진/전용 시각화/독립 수치 fixture 없음.

## 후보 39 CURE

Guha, Rastogi & Shim, *CURE: An Efficient Clustering Algorithm for Large Databases*, SIGMOD 1998, 73–84. [원문 PDF](https://www2.cs.sfu.ca/CourseCentral/459/han/papers/guha98.pdf), 대표점 선택·축소·병합, 3–5쪽을 확인했다.

한 평균 대신 흩어진 여러 대표점을 선택한 뒤 평균 쪽으로 축소한다. 군집 간 거리는 서로 다른 군집의 대표점 쌍 중 최소 거리다. 병합 후 대표점을 다시 선택해야 하며 단순 centroid linkage로 대체하면 안 된다. 대표점 축소는 q′=q+α(μ−q)로 구현할 수 있다. 모든 점에서 대표점을 재선택하는 기본 절차와 부모 대표점만 사용하는 개선 절차를 구분해야 한다.

논문의 확장 전략에는 random sampling/partitioning이 포함된다. 전체 데이터의 계층 병합과 표본 기반 대형 실행을 동일한 정확 모드로 표시하면 안 된다. 먼저 소규모 전체 데이터 버전을 수치 검산하고, 원문 표본 모드를 별도 명시적 옵션으로 검토한다. 대표점 선택→축소→최근접 쌍 병합을 실제 Trace로 기록할 계획이다. 아직 엔진 없음.

## 후보 48 Spectral Clustering

Ng, Jordan & Weiss, *On Spectral Clustering: Analysis and an algorithm*, NIPS 14, 회의 2001/권 출판 2002. [공식 논문 페이지](https://papers.nips.cc/paper/2092-on-spectral-clustering-analysis-and-an-algorithm). PDF는 접근했으나 텍스트 인코딩이 깨져 해당 문서의 수식을 추출 검증하지 못했다. 원문 수식 재확인, Shi–Malik 계열과의 구분, 라플라시안 선택/고유값 순서/행 정규화/고립 노드 처리/중복 고유값의 불변성 검증이 다음 단계다. 최종 임베딩을 K-Means에 입력하는 것만으로 고유분해가 구현되었다고 간주하지 않는다.

## 후보 27 Density Peaks / CFSFDP

Rodriguez & Laio, *Clustering by fast search-and-find of density peaks*, Science 344 (2014), 1492–1496, DOI 10.1126/science.1242072. [저자 소속기관 기록](https://iris.sissa.it/handle/20.500.11767/14183)에서 서지·초록 확인. 원문 PDF는 기관 기록에서 비공개로 표시된다. ρ/δ 정의·cutoff/Gaussian kernel 선택·density 동률·가장 높은 밀도점·중심 선택·halo 처리를 원문 또는 저자 구현으로 확인해야 한다. 아직 엔진 없음.
