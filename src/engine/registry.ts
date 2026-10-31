import type { Algorithm, Params, Point } from "./types";
import { defaults } from "./types";
import type { Dataset } from "./dataset";
import type { Recorder } from "./trace";
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
};
export const structuredAlgorithms = [
  "Spectral Clustering",
  "Affinity Propagation",
  "Density Peaks / CFSFDP",
] as const;
export function supportsDataset(algorithm: Algorithm, kind: Dataset["kind"]) {
  return kind === "numeric"
    ? structuredAlgorithms.some((a) => a === algorithm)
    : kind === "graph" && algorithm === "Spectral Clustering";
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
          "LVQ",
          "SOM",
          "Neural Gas",
          "Growing Neural Gas",
        ].includes(id)
          ? "related-learning"
          : [
                "Bisecting K-Means",
                "K-Medians",
                "Mini-Batch K-Means",
                "CLARA",
                "CLARANS",
                "Density Peaks / CFSFDP",
              ].includes(id)
            ? "variant"
            : "algorithm",
        input: structuredAlgorithms.some((a) => a === id)
          ? id === "Spectral Clustering"
            ? "numeric-or-graph"
            : "numeric-nd"
          : id === "ROCK"
            ? "categorical-tokens"
            : id === "LVQ"
              ? "labeled-points2d"
              : "points2d",
        output:
          id === "Fuzzy C-Means"
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
          ].includes(id),
          noiseLabels: ["DBSCAN", "HDBSCAN", "OPTICS"].includes(id),
          hierarchical: [
            "AGNES",
            "DIANA",
            "HDBSCAN",
            "CURE",
            "Bisecting K-Means",
          ].includes(id),
          overlap: false,
        },
        details: algorithmDetails[id],
        parameters: fields[id],
        defaults,
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
