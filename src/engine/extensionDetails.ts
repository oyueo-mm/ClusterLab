import type { AlgorithmDetail } from "./algorithmDetails";
export const extensionDetails: Partial<
  Record<import("./types").Algorithm, AlgorithmDetail>
> = {
  PCKMeans: {
    timeComplexity:
      "O(E log E+(n+E)α(n)+TnK(d+최대 성분 CL 차수)); 상세 Trace 목적 재집계 비용 별도",
    spaceComplexity: "O(nd+nK+E+Kd), Trace 별도64MiB 예산",
    traceKinds: ["initialize", "test", "assign", "move", "finish"],
    visualizations: [
      "원본·유도 ML/CL",
      "후보 거리·벌점",
      "실제 ND 중심 이동",
      "목적함수·위반수",
    ],
    validation: "independent-numpy",
    limitations:
      "일관된 constrained 원본·전역 균일 유한 벌점. J=SSE+w·위반수 (SDM 비용 w_p=w/2). 시드 무작위 순서·ML 이웃 평균/전체 평균 perturbation·동률 유지·빈 중심 유지. 능동 질의/모순 감독/관계별 가중치 미지원; 전역 최적/hard 만족 보장 없음.",
    references: ["https://www.cs.utexas.edu/~ml/papers/semi-sdm-04.pdf"],
  },
  "COP-KMeans": {
    timeComplexity:
      "O(E log E+(n+E)α(n)+nKd+TnK(d+log K+최대 성분 CL 차수)), E=ML+CL",
    spaceComplexity: "O(nd+n+ML+CL+Kd), Trace 별도",
    traceKinds: ["initialize", "test", "assign", "move", "finish"],
    visualizations: [
      "실제 ML/CL 관계",
      "희소 전이 성분",
      "후보 허용·거절",
      "ND 중심·SSE",
    ],
    validation: "independent-numpy",
    limitations:
      "원본 순서 pointwise hard 제약 greedy. ML closure는 희소 성분으로 검사하며 성분 평균으로 축약하지 않음. 실패는 전역 불가능 증명 아님. 빈 중심 유지·kmeans++ 초기화. native constrained 입력.",
    references: [
      "https://wkiri.com/research/papers/wagstaff-kmeans-01.pdf",
      "https://github.com/wkiri/cop-kmeans",
    ],
  },
  "Bernoulli Mixture": {
    timeComplexity: "O(TnKd)",
    spaceComplexity: "O(nd+nK+Kd), Trace 별도",
    traceKinds: ["initialize", "expectation", "maximization", "finish"],
    visualizations: [
      "실제 성공 확률 θ",
      "Bayes 사후행렬",
      "유효 소속·가중합",
      "원본 sum log-likelihood",
    ],
    validation: "independent-numpy",
    limitations:
      "모든 원본 특성이 정확0/1인 product-Bernoulli 무prior ML EM. 조건부 독립 가정. 초기 interior와 학습 MLE 경계를 구분. 빈 성분·한도 종료/미수렴 명시. 전역 최적 보장 없음.",
    references: [
      "https://www.ee.columbia.edu/~dliang/files/em.pdf",
      "https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bernoulli.html",
    ],
  },
  "Poisson Mixture": {
    timeComplexity: "O(TnKd)",
    spaceComplexity: "O(nd+nK+Kd), Trace 별도",
    traceKinds: ["initialize", "expectation", "maximization", "finish"],
    visualizations: [
      "실제 Poisson 강도 λ",
      "이산 카운트 질량",
      "사후행렬",
      "정규화상수 포함 sumLL",
    ],
    validation: "independent-numpy",
    limitations:
      "비음의 안전 정수 카운트, product-Poisson 무prior ML EM. λ0/x0 경계 명시. exposure·과산포·zero inflation 모형/회귀 아님. 모든 열 계산, 전역 최적 보장 없음.",
    references: [
      "https://stat.ethz.ch/CRAN/web/packages/flexmix/vignettes/mixture-regressions.pdf",
      "https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson.html",
    ],
  },
  "Multinomial Mixture": {
    timeComplexity: "O(TnKd)",
    spaceComplexity: "O(nd+nK+Kd), Trace 별도",
    traceKinds: ["initialize", "expectation", "maximization", "finish"],
    visualizations: [
      "실제 구성 확률",
      "행별 원본 시행 수",
      "사후행렬",
      "multinomial 계수 포함 sumLL",
    ],
    validation: "independent-numpy",
    limitations:
      "각 행은 비음 안전 정수 카운트 벡터이며 행합으로 조건화. 단순 범주 번호/확률 벡터가 아님. 무prior ML EM, 전체0행 정보 부재·빈 성분·미수렴 명시. product-Poisson과 다른 정규화.",
    references: [
      "https://arxiv.org/pdf/cs/0606069",
      "https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.multinomial.html",
    ],
  },
  Walktrap: {
    timeComplexity:
      "직접 P^t O(tn(n+m)); 직접 Ward 후보 탐색·계층은 최대 O(n²m)",
    spaceComplexity: "O(n²+m), Trace 별도",
    traceKinds: ["graph", "walk", "merge", "extract", "finish"],
    visualizations: [
      "실제 t-step 행 확률",
      "Ward 증가·거리",
      "전체 덴드로그램",
      "최고 Q 수준",
    ],
    validation: "independent-igraph",
    limitations:
      "가중 무방향. 원본 양의 self-loop는 명시 거부, parallel합산 후 incident 평균 인공loop 정책. 원본 Q는 인공loop 제외. 직접 구현·heap 가속 없음. 전체 forest 후 최고Q cut, 동률 더 세분.",
    references: [
      "https://arxiv.org/html/physics/0512106v1",
      "https://igraph.org/c/html/1.0.0/igraph-Community.html#igraph_community_walktrap",
    ],
  },
  "Clique Percolation": {
    timeComplexity: "실제 k-clique 열거·공유(k−1)face에 비례; 최악 지수적",
    spaceComplexity: "O(n+m+실제 cliques·face·중첩 소속)",
    traceKinds: ["graph", "clique", "percolate", "extract", "finish"],
    visualizations: [
      "실제 완전 k-부분그래프",
      "공유 face 연결",
      "중첩 커뮤니티·미소속",
    ],
    validation: "independent-networkx",
    limitations:
      "단순 무방향·unit 가중치·loopless 원본 또는 명시적인 이진 union-kNN. weighted percolation 아님. 미소속−1은 통계 noise가 아님. 입력/결과를 개수로 자르지 않고 실제 바이트 예산 검사.",
    references: [
      "https://arxiv.org/html/physics/0506133v1",
      "https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.community.kclique.k_clique_communities.html",
    ],
  },
};
