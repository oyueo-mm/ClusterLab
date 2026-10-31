import type { Algorithm, EventKind } from "./types";
export interface AlgorithmDetail {
  timeComplexity: string;
  spaceComplexity: string;
  traceKinds: EventKind[];
  visualizations: string[];
  validation: string;
  limitations: string;
  references: string[];
}
export const algorithmDetails: Partial<Record<Algorithm, AlgorithmDetail>> = {
  "Spectral Clustering": {
    timeComplexity: "O(n²d+n³+TnK²)",
    spaceComplexity: "O(n²+nK)",
    traceKinds: [
      "graph",
      "laplacian",
      "eigen",
      "embedding",
      "assign",
      "move",
      "finish",
    ],
    visualizations: ["원본 그래프", "행렬", "고유값", "임베딩 중심"],
    validation: "independent-sklearn",
    limitations:
      "밀집 Jacobi. K≥연결성분 수; 정규화/비정규화 및 원본 ND/무방향 양의 가중 그래프.",
    references: [
      "https://papers.nips.cc/paper/2092-on-spectral-clustering-analysis-and-an-algorithm",
      "https://arxiv.org/html/0711.0189v1",
      "https://scikit-learn.org/stable/modules/generated/sklearn.cluster.SpectralClustering.html",
    ],
  },
  "Affinity Propagation": {
    timeComplexity: "O(Tn²+n²d)",
    spaceComplexity: "O(n²)",
    traceKinds: ["initialize", "messages", "extract", "finish"],
    visualizations: ["유사도", "책임", "가용성 메시지"],
    validation: "independent-sklearn",
    limitations:
      "메시지 미수렴은 별도 표시, 대표점이 없으면 오류. 밀집 행렬; ND 원본.",
    references: [
      "https://utstat.utoronto.ca/reid/sta414/frey-affinity.pdf",
      "https://scikit-learn.org/stable/modules/generated/sklearn.cluster.AffinityPropagation.html",
    ],
  },
  "Density Peaks / CFSFDP": {
    timeComplexity: "O(n²d+n log n)",
    spaceComplexity: "O(n²)",
    traceKinds: ["density", "distance", "extract", "assign", "finish"],
    visualizations: ["ρ–δ 결정 그래프", "부모", "halo"],
    validation: "independent-numpy",
    limitations:
      "명시적 K 및 γ 순위 중심 선택 변형. 밀도 동률은 원저자 코드의 순위 규약. ND 원본.",
    references: [
      "https://doi.org/10.1126/science.1242072",
      "https://people.sissa.it/~laio/Research/Clustering_source_code/cluster_dp.tgz",
    ],
  },
  CURE: {
    timeComplexity: "O(n³c²), 현재 전수 쌍 검사",
    spaceComplexity: "O(nc), Trace 별도",
    traceKinds: [
      "initialize",
      "distance",
      "representatives",
      "merge",
      "finish",
    ],
    visualizations: ["원본 대표점", "축소 대표점", "병합 트리"],
    validation: "independent-numpy",
    limitations: "2D 전체 멤버 재선택 절차. 논문의 표본·분할 가속 미지원.",
    references: [
      "https://www2.cs.sfu.ca/CourseCentral/459/han/papers/guha98.pdf",
      "https://snu.elsevierpure.com/en/publications/cure-an-efficient-clustering-algorithm-for-large-databases/",
    ],
  },
  "Neural Gas": {
    timeComplexity: "O(EnK log K)",
    spaceComplexity: "O(n+K)",
    traceKinds: ["initialize", "rank", "prototype", "finish"],
    visualizations: ["거리 순위", "실제 뉴런 이동", "양자화 오차"],
    validation: "independent-numpy",
    limitations: "2D 경쟁 양자화. 최종 BMU는 별도 군집 추출 결과가 아님.",
    references: [
      "https://www.ks.uiuc.edu/Publications/Papers/paper.cgi?tbcode=MART93B",
      "https://www.demogng.de/JavaPaper/node16.html",
    ],
  },
  "Growing Neural Gas": {
    timeComplexity: "O(En(M log M + M²)), 간선 관리 포함",
    spaceComplexity: "O(n+M²)",
    traceKinds: [
      "initialize",
      "rank",
      "prototype",
      "connect",
      "insert",
      "finish",
    ],
    visualizations: ["뉴런", "간선 생성·노화·삭제", "오차 삽입"],
    validation: "independent-numpy",
    limitations:
      "2D, 1995 원문 연산 순서. BMU 출력; 간선 커뮤니티 추출 미지원.",
    references: [
      "https://www.cs.swarthmore.edu/~meeden/DevelopmentalRobotics/fritzke95.pdf",
      "https://www.demogng.de/JavaPaper/node19.html",
    ],
  },
  "K-Medians": {
    timeComplexity: "O(T(nK+n log n)), 현재 좌표 정렬",
    spaceComplexity: "O(n+K)",
    traceKinds: ["initialize", "assign", "move", "finish"],
    visualizations: ["L1 할당", "좌표별 중앙값", "거리합"],
    validation: "independent-numpy",
    limitations: "2D Lloyd형 L1 변형. 기하중앙값·K-Medoids와 구별.",
    references: [
      "https://elki-project.github.io/releases/current/doc/elki/clustering/kmeans/KMediansLloyd.html",
      "https://papers.nips.cc/paper/1260-clustering-via-concave-minimization",
    ],
  },
  "Mini-Batch K-Means": {
    timeComplexity: "O(EnK)",
    spaceComplexity: "O(n+K+b)",
    traceKinds: ["initialize", "assign", "move", "finish"],
    visualizations: ["실제 배치", "방문수", "중심", "전체 SSE"],
    validation: "independent-numpy",
    limitations:
      "2D, 비복원 epoch 순회 변형. 원문 iid 배치·sklearn 재할당 정책과 다름.",
    references: [
      "https://www.ra.ethz.ch/cdstore/www2010/www/p1177.pdf",
      "https://scikit-learn.org/stable/modules/generated/sklearn.cluster.MiniBatchKMeans.html",
    ],
  },
  CLARA: {
    timeComplexity: "O(R(Ts²K²+nK)), 현재 표본 PAM 검사",
    spaceComplexity: "O(n+s²)",
    traceKinds: ["initialize", "swap", "move", "assign", "extract", "finish"],
    visualizations: ["표본 PAM", "전체 거리 평가", "관측 대표점"],
    validation: "independent-numpy",
    limitations:
      "2D 표본 대표점 탐색. 전체 평가·할당; 전체 PAM 또는 전역 최적 보장 없음.",
    references: [
      "https://onlinelibrary.wiley.com/doi/10.1002/9780470316801.ch3",
      "https://stat.ethz.ch/R-manual/R-devel/library/cluster/html/clara.html",
    ],
  },
  CLARANS: {
    timeComplexity: "O((P+R)nK), P=실제 제안 수, R=재시작 수",
    spaceComplexity: "O(n+K)",
    traceKinds: ["initialize", "swap", "move", "visit", "extract", "finish"],
    visualizations: ["교환 제안·수용·거절", "전체 비용"],
    validation: "independent-numpy",
    limitations:
      "2D 무작위 이웃 탐색. 연속 거절 한도는 총 제안 횟수 상한이 아님.",
    references: [
      "https://www.vldb.org/conf/1994/P144.PDF",
      "https://cs.ecu.edu/dingq/CSCI6905/readings/CLARANS.pdf",
    ],
  },
};
