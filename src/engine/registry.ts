import type { Algorithm, Params, Point } from "./types";
import { defaults } from "./types";
import type { Recorder } from "./trace";
import { fields } from "./parameters";
import { algorithmFamilies } from "../data/algorithmFamilies";
export type Engine = (p: Point[], o: Params, r: Recorder) => void;
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
};
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
        classification:
          id === "LVQ" || id === "SOM"
            ? "related-learning"
            : id === "Bisecting K-Means"
              ? "variant"
              : "algorithm",
        input:
          id === "ROCK"
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
        ].includes(id),
        backend: "typescript-worker",
        parallelism: "independent-jobs",
        implementation: "implemented",
        validation:
          id === "Fuzzy C-Means" || id === "Bisecting K-Means"
            ? "analytical-tests"
            : "v0.6-regression",
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
        load: loaders[id],
      },
    ];
  }),
) as Record<
  Algorithm,
  {
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
