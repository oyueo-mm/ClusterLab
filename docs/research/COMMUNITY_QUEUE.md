# 그래프 커뮤니티 엔진 후속 조사

2026-10-31. Louvain/Leiden은 **아직 미구현**이다. 현재 GraphDataset/Spectral을 기반으로 다음 세로 단위를 준비한다. 제품 상태/엔진 수는 올리지 않는다.

## 후보 50 Louvain

Blondel, Guillaume, Lambiotte & Lefebvre, Fast unfolding of communities in large networks (2008). [저자 arXiv v2](https://arxiv.org/html/0803.0476v2)의 §1–2를 읽었다. 가중 무방향 그래프의 모듈성 Q=Σ_ij[A_ij−k_i k_j/(2m)]1[c_i=c_j]/(2m)를 개선하는 순차 노드 이동과 커뮤니티 집약을 반복한다. 이동은 현재 커뮤니티에서 제거한 뒤 후보에 넣는 두 비용을 함께 계산한다. 집약된 내부 간선은 self-loop로 남겨야 한다. 이동 순서와 동률 규약을 기록한다. 관측된 희소 그래프 속도를 모든 입력의 선형 최악 시간으로 일반화하지 않는다.

후속 계약: 가중치 합/degree/loop의 2배 계수, 중복 간선 합산, 고립 노드·간선 없는 그래프·음수/방향 지원 여부를 명시한다. 각 이동의 직접 Q 차이와 증분식, 각 집약 단계의 원본 partition Q 보존을 독립 NumPy/NetworkX에 비교한다. 좌표가 아닌 실제 간선을 계산하고 계층의 원본 노드 매핑을 반환한다.

## 후보 51 Leiden

Traag, Waltman & van Eck, From Louvain to Leiden: guaranteeing well-connected communities (2019). [저자 arXiv v3](https://arxiv.org/html/1810.08473v3)의 §II–III 및 Appendix A/D의 관련 설명을 확인했다. local move, refinement, refined partition에 따른 집약의 세 단계이며 집약 초기 partition에는 refinement 전 관계를 보존한다. 단순 Louvain 후 연결 성분 분리는 Leiden이 아니다. 모듈성/CPM 목적과 resolution·노드 가중치·refinement 확률 규약을 구분해야 한다. 확률 refinement 때문에 한 번의 안정 iteration이 영구 정지 또는 전역 최적을 증명하지 않는다.

후속 구현 전 Appendix A.2 전체 절차·refinement 허용 조건·가중 그래프 일반화·증명 가정을 더 확인한다. 원저자 구현과 비교하고 연결성·반례·Q/CPM 계산·집약 보존·시드 Trace를 검증한다. 증명된 조건을 지키지 않은 단순 구현에 연결성 보장을 붙이지 않는다. 코드/라이선스 복사는 하지 않았다.

## 공통 개발 순서

1. community 결과에 원본 노드 label, level별 매핑, objective/수렴/시드 정보를 추가한다.
2. 희소 인접 자료구조와 바이트 예측을 설계한다. 모든 n² 행렬을 만들지 않는다.
3. 실제 remove/move/refine/aggregate 이벤트와 원본 노드/메타 노드 뷰를 함께 구현한다.
4. 작은 그래프 전수 Q 검산, 독립 NetworkX/저자 구현, production Worker·취소·시간 복원·브라우저를 검증한다.
5. 2D→그래프 변환을 제공하면 kNN/RBF 변환과 원본 간선 입력을 명확히 구분한다.
