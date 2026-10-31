# 범주·부분공간·스트림 후속 원문 메모

2026-10-31. 아래 후보는 모두 **미구현**이다. 논문 일부/서지 확인만 기록하며 candidates.json의 정식 조사·구현 단계를 자동 상향하지 않는다.

## 후보 8 K-Modes / 9 K-Prototypes

Huang, Extensions to the k-Means Algorithm for Clustering Large Data Sets with Categorical Values, Data Mining and Knowledge Discovery 2, 283–304 (1998), [출판사 원문 페이지](https://link.springer.com/article/10.1023/A:1009769707641). 서지·초록은 읽었지만 본문은 구독 제한이다. K-Modes는 단순 일치 비유사도·빈도 기반 최빈값 갱신, K-Prototypes는 수치/범주 결합 비유사도라는 정의를 확인했다. 1997 초기 논문과 1998 확장 관계, 혼합 가중치·초기화·온라인/배치 갱신 순서·동률/빈 군집은 추가 원문 확인이 필요하다. 범주를 임의 수치로 인코딩한 Euclidean K-Means로 대신하지 않는다. 현재 CategoricalDataset/MixedDataset 계약을 실제 엔진·표 편집·원본 출력과 연결해야 한다.

## 후보 35 DenStream

Cao, Ester, Qian & Zhou, Density-Based Clustering over an Evolving Data Stream with Noise, SDM 2006, [저자 PDF](https://www.cs.sfu.ca/~ester/papers/SDM2006.DenStream.final.pdf). §3–4의 CF·시간 감쇠·Merging Algorithm 1·pruning Algorithm 2를 확인했다. CF1/CF2/weight를 시간 간격에 따라 2^(−λΔt)로 감쇠하고, 새 점은 먼저 가장 가까운 potential micro-cluster, 실패하면 outlier micro-cluster에 반경 조건으로 병합한다. 가중치가 βμ를 넘으면 승격한다. outlier의 생성 시각을 보존해 주기적 ξ 기준으로 제거한다. βμ>1·log 밑·경계 부등호·시각 단위·반경 제곱합·초기 DBSCAN·오프라인 최종 군집 추출은 구현 전 독립 검산이 필요하다. 2D 점에 순서를 붙이는 재생으로 실제 스트림 기능을 대신하지 않는다.

## 후보 64 CLIQUE

Agrawal, Gehrke, Gunopulos & Raghavan, Automatic Subspace Clustering of High Dimensional Data for Data Mining Applications, SIGMOD 1998, [논문 PDF](https://www2.cs.sfu.ca/CourseCentral/459/han/papers/agrawal98.pdf), §2–3을 읽었다. 축별 격자의 dense unit, projection 단조성에 따른 Apriori 후보 생성/제거, 같은 부분공간에서 면을 공유하는 unit의 연결 성분, DNF 영역 설명을 구분한다. 고차원 원본의 서로 다른 부분공간 결과를 반환해야 하며 2D 격자 하나로 대체하면 안 된다. 후보 수는 높은 부분공간 차원에 지수적으로 커질 수 있다. MDL pruning과 DNF 비중복 cover는 별도 절차이므로 누락한 구현을 전체 원문과 같다고 표시하지 않는다. 임계 selectivity의 분모와 경계 interval, 상수 축, 중첩 소속, 최소 설명을 추가 검산한다.

## 후보 68 PROCLUS

Aggarwal, Procopiuc, Wolf, Yu & Park, Fast Algorithms for Projected Clustering, SIGMOD 1999, [학회 원문 PDF](https://sigmodrecord.org/?download_id=6956&smd_process_download=1). §2와 Figures 2–4의 초기 medoid 후보·locality·dimension 선택·반복/정제 구조를 확인했다. 할당은 각 medoid의 선택 차원 D에 대한 Σ_(j∈D)|x_j−m_j|/|D|인 Manhattan segmental distance다. 평균 locality 차원 거리의 표준화 값을 사용하고 전체 Kℓ 차원 선택과 군집별 최소 차원 조건을 함께 다룬다. 목적 평가의 centroid와 할당 medoid를 혼동하지 않는다. 최종 influence 범위에 따른 outlier 단계도 있다. 두 축 투영 후 PAM으로 대신하지 않는다. 원문 전체 경계/표본·초기화/0표준편차/ℓ와 총차원의 제약·종료를 더 확인하고 독립 고차원 수치 fixture가 필요하다.

현재 저장소는 각 데이터 스키마만 보유하며 위 엔진/전용 편집/수치 oracle는 아직 없다. 외부 코드 복사 없이 원문 정의·구현 라이선스와 실측 자원을 확인한 뒤 개발한다.
