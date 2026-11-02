import type { Algorithm, Params, Point } from "./types";
import { algorithmDefaults, legacyAlgorithms } from "./types";
import type { Dataset } from "./dataset";
import type { Recorder } from "./trace";
import type { ExperimentPreset } from "../data/structuredPresets";
import { algorithmDetails, type AlgorithmDetail } from "./algorithmDetails";
import { fields } from "./parameters";
import { algorithmFamilies } from "../data/algorithmFamilies";
export type Engine = (
  p: Point[],
  o: Params,
  r: Recorder,
  input?: Dataset,
) => void;
const koreanNames: Record<Algorithm, string> = {
  "K-Means": "K-평균",
  DBSCAN: "밀도 기반 공간 군집화",
  HDBSCAN: "계층적 밀도 기반 군집화",
  AGNES: "응집형 계층 군집화",
  DIANA: "분할형 계층 군집화",
  SOM: "자기조직화지도",
  LVQ: "학습 벡터 양자화",
  OPTICS: "밀도 기반 점 순서화",
  PAM: "메도이드 주변 분할",
  ROCK: "범주형 링크 군집화",
  GMM: "가우시안 혼합 모형",
  BIRCH: "CF 트리 기반 군집화",
  "Mean Shift": "평균 이동",
  "Fuzzy C-Means": "퍼지 C-평균",
  "Possibilistic C-Means": "가능성 C-평균 (PCM)",
  "Bisecting K-Means": "이분할 K-평균",
  "Spectral Clustering": "스펙트럴 군집화",
  "Affinity Propagation": "친화도 전파",
  "Density Peaks / CFSFDP": "밀도 봉우리 군집화",
  CURE: "대표점 축소 계층 군집화",
  "Neural Gas": "뉴럴 가스",
  "Growing Neural Gas": "성장 뉴럴 가스",
  "K-Medians": "좌표별 K-중앙값",
  "Mini-Batch K-Means": "미니배치 K-평균",
  CLARA: "표본 기반 메도이드 군집화",
  CLARANS: "무작위 이웃 메도이드 탐색",
  "X-Means": "베이즈 정보 기준 자동 K-평균",
  "G-Means": "정규성 검정 자동 K-평균",
  "Dip-Means": "단봉성 검정 자동 K-평균",
  "DP-Means": "군집 수 벌점 K-평균",
  Louvain: "루뱅 커뮤니티",
  Leiden: "레이던 커뮤니티 정제",
  "Label Propagation": "레이블 전파 커뮤니티",
  "Girvan–Newman": "간선 매개 중심성 분할",
  "Markov Clustering (MCL)": "마르코프 군집화",
  "K-Modes": "범주형 K-최빈값",
  "K-Prototypes": "혼합형 K-프로토타입",
  CLIQUE: "격자 부분공간 군집화",
  PROCLUS: "투영 부분공간 군집화",
  DenStream: "시간 감쇠 밀도 스트림",
  Bimax: "이진 행렬 최대 이중군집",
  "Cheng–Church Biclustering": "평균 제곱 잔차 이중군집",
  "K-Shape": "시계열 형태 군집화",
  "Greedy Modularity (CNM)": "탐욕 모듈성 병합",
  "Fluid Communities": "유동 커뮤니티",
  "COP-KMeans": "하드 제약 K-평균",
  PCKMeans: "쌍별 제약 K-평균",
  "Bernoulli Mixture": "베르누이 혼합모델",
  "Poisson Mixture": "포아송 혼합모델",
  "Multinomial Mixture": "다항 카운트 혼합모델",
  Walktrap: "확률보행 계층 커뮤니티",
  "Clique Percolation": "클리크 퍼콜레이션 중첩 커뮤니티",
  BSAS: "기본 순차 군집화",
  MBSAS: "두 단계 순차 군집화",
  TTSAS: "두 임계값 순차 군집화",
};
export const loaders: Record<Algorithm, () => Promise<Engine>> = {
  "K-Means": () => import("./algorithms/kmeans").then((m) => m.kmeans),
  DBSCAN: () => import("./algorithms/dbscan").then((m) => m.dbscan),
  HDBSCAN: () => import("./algorithms/hdbscan").then((m) => m.hdbscan),
  AGNES: () => import("./algorithms/agnes").then((m) => m.agnes),
  DIANA: () => import("./algorithms/diana").then((m) => m.diana),
  SOM: () => import("./algorithms/som").then((m) => m.som),
  LVQ: () => import("./algorithms/lvq").then((m) => m.lvq),
  OPTICS: () => import("./algorithms/optics").then((m) => m.optics),
  PAM: () => import("./algorithms/pam").then((m) => m.pam),
  ROCK: () => import("./algorithms/rock").then((m) => m.rock),
  GMM: () => import("./algorithms/gmm").then((m) => m.gmm),
  BIRCH: () => import("./algorithms/birch").then((m) => m.birch),
  "Mean Shift": () => import("./algorithms/meanshift").then((m) => m.meanshift),
  "Fuzzy C-Means": () => import("./algorithms/fuzzy").then((m) => m.fuzzy),
  "Possibilistic C-Means": () => import("./algorithms/pcm").then((m) => m.pcm),
  "Bisecting K-Means": () =>
    import("./algorithms/bisecting").then((m) => m.bisecting),
  "Spectral Clustering": () =>
    import("./algorithms/spectral").then((m) => m.spectral),
  "Affinity Propagation": () =>
    import("./algorithms/affinity").then((m) => m.affinity),
  "Density Peaks / CFSFDP": () =>
    import("./algorithms/densitypeaks").then((m) => m.densitypeaks),
  CURE: () => import("./algorithms/cure").then((m) => m.cure),
  "Neural Gas": () => import("./algorithms/neuralgas").then((m) => m.neuralgas),
  "Growing Neural Gas": () =>
    import("./algorithms/growingneuralgas").then((m) => m.growingneuralgas),
  "K-Medians": () => import("./algorithms/kmedians").then((m) => m.kmedians),
  "Mini-Batch K-Means": () =>
    import("./algorithms/minibatch").then((m) => m.minibatch),
  CLARA: () => import("./algorithms/clara").then((m) => m.clara),
  CLARANS: () => import("./algorithms/clarans").then((m) => m.clarans),
  "X-Means": () => import("./algorithms/xmeans").then((m) => m.xmeans),
  "G-Means": () => import("./algorithms/gmeans").then((m) => m.gmeans),
  "Dip-Means": () => import("./algorithms/dipmeans").then((m) => m.dipmeans),
  "DP-Means": () => import("./algorithms/dpmeans").then((m) => m.dpmeans),
  Louvain: () => import("./algorithms/louvain").then((m) => m.louvain),
  Leiden: () => import("./algorithms/leiden").then((m) => m.leiden),
  "Label Propagation": () =>
    import("./algorithms/labelpropagation").then((m) => m.labelpropagation),
  "Girvan–Newman": () =>
    import("./algorithms/girvannewman").then((m) => m.girvannewman),
  "Markov Clustering (MCL)": () =>
    import("./algorithms/mcl").then((m) => m.mcl),
  "K-Modes": () => import("./algorithms/kmodes").then((m) => m.kmodes),
  "K-Prototypes": () =>
    import("./algorithms/kprototypes").then((m) => m.kprototypes),
  CLIQUE: () => import("./algorithms/clique").then((m) => m.clique),
  PROCLUS: () => import("./algorithms/proclus").then((m) => m.proclus),
  DenStream: () => import("./algorithms/denstream").then((m) => m.denstream),
  Bimax: () => import("./algorithms/bimax").then((m) => m.bimax),
  "Cheng–Church Biclustering": () =>
    import("./algorithms/chengchurch").then((m) => m.chengchurch),
  "K-Shape": () => import("./algorithms/kshape").then((m) => m.kshape),
  "Greedy Modularity (CNM)": () =>
    import("./algorithms/cnm").then((m) => m.cnm),
  "Fluid Communities": () => import("./algorithms/fluid").then((m) => m.fluid),
  "COP-KMeans": () => import("./algorithms/copkmeans").then((m) => m.copkmeans),
  PCKMeans: () => import("./algorithms/pckmeans").then((m) => m.pckmeans),
  "Bernoulli Mixture": () =>
    import("./algorithms/bernoulli").then((m) => m.bernoulli),
  "Poisson Mixture": () =>
    import("./algorithms/poisson").then((m) => m.poisson),
  "Multinomial Mixture": () =>
    import("./algorithms/multinomial").then((m) => m.multinomial),
  Walktrap: () => import("./algorithms/walktrap").then((m) => m.walktrap),
  "Clique Percolation": () =>
    import("./algorithms/cliquepercolation").then((m) => m.cliquepercolation),
  BSAS: () => import("./algorithms/bsas").then((m) => m.bsas),
  MBSAS: () => import("./algorithms/mbsas").then((m) => m.mbsas),
  TTSAS: () => import("./algorithms/ttsas").then((m) => m.ttsas),
};
export const structuredAlgorithms = [
  "Spectral Clustering",
  "Affinity Propagation",
  "Density Peaks / CFSFDP",
  "X-Means",
  "G-Means",
  "Dip-Means",
  "DP-Means",
  "Louvain",
  "Leiden",
  "Label Propagation",
  "Girvan–Newman",
  "Markov Clustering (MCL)",
  "K-Modes",
  "K-Prototypes",
  "CLIQUE",
  "PROCLUS",
  "DenStream",
  "Bimax",
  "Cheng–Church Biclustering",
  "K-Shape",
  "Greedy Modularity (CNM)",
  "Fluid Communities",
  "COP-KMeans",
  "PCKMeans",
  "Bernoulli Mixture",
  "Poisson Mixture",
  "Multinomial Mixture",
  "Walktrap",
  "Clique Percolation",
  "BSAS",
  "MBSAS",
  "TTSAS",
  "Possibilistic C-Means",
] as const;
export const communityAlgorithms: readonly Algorithm[] = [
  "Louvain",
  "Leiden",
  "Label Propagation",
  "Girvan–Newman",
  "Markov Clustering (MCL)",
  "Greedy Modularity (CNM)",
  "Fluid Communities",
  "Walktrap",
  "Clique Percolation",
];
/** Native matrix/time-series engines cannot consume the point editor input. */
export function supportsLegacyPoints(algorithm: Algorithm) {
  return ![
    "Possibilistic C-Means",
    "Bimax",
    "Cheng–Church Biclustering",
    "K-Shape",
    "COP-KMeans",
    "PCKMeans",
    "Bernoulli Mixture",
    "Poisson Mixture",
    "Multinomial Mixture",
    "BSAS",
    "MBSAS",
    "TTSAS",
  ].includes(algorithm);
}
export function supportsDataset(algorithm: Algorithm, kind: Dataset["kind"]) {
  if (kind === "constrained")
    return algorithm === "COP-KMeans" || algorithm === "PCKMeans";
  if (kind === "categorical") return algorithm === "K-Modes";
  if (kind === "mixed") return algorithm === "K-Prototypes";
  if (kind === "stream") return algorithm === "DenStream";
  if (kind === "matrix")
    return algorithm === "Bimax" || algorithm === "Cheng–Church Biclustering";
  if (kind === "timeseries") return algorithm === "K-Shape";
  if (kind === "graph")
    return (
      algorithm === "Spectral Clustering" ||
      communityAlgorithms.includes(algorithm)
    );
  return (
    kind === "numeric" &&
    structuredAlgorithms.some((a) => a === algorithm) &&
    ![
      "K-Modes",
      "K-Prototypes",
      "DenStream",
      "Bimax",
      "Cheng–Church Biclustering",
      "K-Shape",
      "COP-KMeans",
      "PCKMeans",
    ].includes(algorithm)
  );
}
export const registry = Object.fromEntries(
  Object.keys(loaders).map((name) => {
    const id = name as Algorithm;
    return [
      id,
      {
        id,
        name: id,
        koreanName: koreanNames[id],
        family: algorithmFamilies[id],
        classification: [
          "Bernoulli Mixture",
          "Poisson Mixture",
          "Multinomial Mixture",
        ].includes(id)
          ? "model-family"
          : ["LVQ", "SOM", "Neural Gas", "Growing Neural Gas"].includes(id)
            ? "related-learning"
            : [
                  "Bisecting K-Means",
                  "K-Medians",
                  "Mini-Batch K-Means",
                  "CLARA",
                  "CLARANS",
                  "Density Peaks / CFSFDP",
                  "X-Means",
                  "G-Means",
                  "Dip-Means",
                  "K-Modes",
                  "K-Prototypes",
                  "Leiden",
                  "MBSAS",
                  "TTSAS",
                ].includes(id)
              ? "variant"
              : "algorithm",
        input:
          id === "COP-KMeans" || id === "PCKMeans"
            ? "constrained"
            : id === "Bimax" || id === "Cheng–Church Biclustering"
              ? "matrix"
              : id === "K-Shape"
                ? "timeseries"
                : id === "K-Modes"
                  ? "categorical"
                  : id === "K-Prototypes"
                    ? "mixed"
                    : id === "DenStream"
                      ? "stream"
                      : structuredAlgorithms.some((a) => a === id)
                        ? id === "Spectral Clustering" ||
                          communityAlgorithms.includes(id)
                          ? "numeric-or-graph"
                          : "numeric-nd"
                        : id === "ROCK"
                          ? "categorical-tokens"
                          : id === "LVQ"
                            ? "labeled-points2d"
                            : "points2d",
        output: ["BSAS", "MBSAS", "TTSAS"].includes(id)
          ? "sequential-partition"
          : id === "COP-KMeans" || id === "PCKMeans"
            ? "constrained-partition"
            : [
                  "Bernoulli Mixture",
                  "Poisson Mixture",
                  "Multinomial Mixture",
                ].includes(id)
              ? "mixture"
              : id === "Bimax" || id === "Cheng–Church Biclustering"
                ? "biclustering"
                : id === "K-Shape"
                  ? "timeseries-partition"
                  : id === "PROCLUS"
                    ? "projected-partition"
                    : id === "CLIQUE"
                      ? "subspaces"
                      : id === "DenStream"
                        ? "stream-summary"
                        : communityAlgorithms.includes(id)
                          ? "communities"
                          : id === "Possibilistic C-Means"
                            ? "typicalities-and-centers"
                            : id === "Fuzzy C-Means"
                              ? "memberships-and-partition"
                              : id === "Bisecting K-Means"
                                ? "partition-and-split-tree"
                                : "algorithm-state",
        capabilities: {
          autoK: [
            "DBSCAN",
            "HDBSCAN",
            "OPTICS",
            "Mean Shift",
            "Affinity Propagation",
            "Growing Neural Gas",
            "X-Means",
            "G-Means",
            "Dip-Means",
            "DP-Means",
            "BSAS",
            "MBSAS",
            "TTSAS",
            "Louvain",
            "Leiden",
            "Label Propagation",
            "Markov Clustering (MCL)",
            "CLIQUE",
            "DenStream",
            "Greedy Modularity (CNM)",
            "Walktrap",
            "Clique Percolation",
          ].includes(id),
          noiseLabels: [
            "DBSCAN",
            "HDBSCAN",
            "OPTICS",
            "CLIQUE",
            "PROCLUS",
            "DenStream",
          ].includes(id),
          hierarchical: [
            "AGNES",
            "DIANA",
            "HDBSCAN",
            "CURE",
            "Bisecting K-Means",
            "Louvain",
            "Leiden",
            "Girvan–Newman",
            "Greedy Modularity (CNM)",
            "Walktrap",
          ].includes(id),
          overlap: [
            "CLIQUE",
            "Markov Clustering (MCL)",
            "Bimax",
            "Cheng–Church Biclustering",
            "Clique Percolation",
          ].includes(id),
        },
        details: algorithmDetails[id],
        parameters: fields[id],
        defaults: algorithmDefaults(id),
        unassignedLabel: ["BSAS", "MBSAS", "TTSAS"].includes(id)
          ? "미할당"
          : id === "Clique Percolation"
            ? "미소속"
            : "노이즈",
        examplePreset: (id === "COP-KMeans" || id === "PCKMeans"
          ? "constrained"
          : id === "Bernoulli Mixture"
            ? "bernoulli"
            : id === "Poisson Mixture"
              ? "poisson"
              : id === "Multinomial Mixture"
                ? "multinomial"
                : id === "K-Modes"
                  ? "categorical"
                  : id === "K-Prototypes"
                    ? "mixed"
                    : id === "DenStream"
                      ? "stream"
                      : id === "Bimax" || id === "Cheng–Church Biclustering"
                        ? "matrix"
                        : id === "K-Shape"
                          ? "timeseries"
                          : communityAlgorithms.includes(id)
                            ? "graph"
                            : "numeric") as ExperimentPreset,
        resetParametersOnSelect: ![
          ...legacyAlgorithms,
          "Fuzzy C-Means",
          "Bisecting K-Means",
        ].some((a) => a === id),
        seeded: ![
          "DBSCAN",
          "AGNES",
          "DIANA",
          "OPTICS",
          "HDBSCAN",
          "ROCK",
          "Mean Shift",
          "CURE",
          "Density Peaks / CFSFDP",
          "Greedy Modularity (CNM)",
          "Girvan–Newman",
          "Markov Clustering (MCL)",
          "CLIQUE",
          "Bimax",
          "DP-Means",
          "DenStream",
          "Walktrap",
          "Clique Percolation",
          "BSAS",
          "MBSAS",
          "TTSAS",
        ].includes(id),
        backend: "typescript-worker",
        parallelism: "independent-jobs",
        implementation: "implemented",
        validation:
          algorithmDetails[id]?.validation ??
          (id === "Fuzzy C-Means" || id === "Bisecting K-Means"
            ? "analytical-tests"
            : "v0.6-regression"),
        limitations:
          "2D engine; resource preflight and bounded detailed trace. No automatic approximation.",
        references:
          id === "Fuzzy C-Means"
            ? ["https://doi.org/10.1016/0098-3004(84)90020-7"]
            : id === "Bisecting K-Means"
              ? [
                  "https://scikit-learn.org/stable/modules/generated/sklearn.cluster.BisectingKMeans.html",
                ]
              : [],
        ...(algorithmDetails[id]
          ? {
              references: algorithmDetails[id]!.references,
              limitations: algorithmDetails[id]!.limitations,
            }
          : {}),
        load: loaders[id],
      },
    ];
  }),
) as Record<
  Algorithm,
  {
    capabilities: {
      autoK: boolean;
      noiseLabels: boolean;
      hierarchical: boolean;
      overlap: boolean;
    };
    details?: AlgorithmDetail;
    id: Algorithm;
    name: string;
    koreanName: string;
    family: string;
    classification: string;
    input: string;
    output: string;
    parameters: (typeof fields)[Algorithm];
    defaults: Params;
    unassignedLabel: string;
    examplePreset: ExperimentPreset;
    resetParametersOnSelect: boolean;
    seeded: boolean;
    backend: string;
    parallelism: string;
    implementation: string;
    validation: string;
    limitations: string;
    references: string[];
    load: () => Promise<Engine>;
  }
>;
