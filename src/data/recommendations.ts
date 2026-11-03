import {
  algorithmDefaults,
  type Algorithm,
  type Params,
  type Point,
} from "../engine/types";
import { legacyDataset, type Dataset } from "../engine/dataset";
import {
  dataset,
  dataDefaults,
  presets,
  presetAliases,
  type PresetId,
} from "./presets";
import {
  makeExperimentPreset,
  type ExperimentPreset,
} from "./structuredPresets";
import {
  registerFpcmDatasets,
  fpcmRecommendations,
} from "./fpcmRecommendations";
import { random } from "../engine/math";
import {
  registerPairwiseDatasets,
  pairwiseRecommendations,
} from "./pairwiseRecommendations";
import {
  registerPossibilisticDatasets,
  possibilisticRecommendations,
} from "./possibilisticRecommendations";

export interface DatasetDefinition {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  kind: Dataset["kind"];
  seed: number;
  count: number;
  dimensions: number;
  generator: string;
  generate: (seed: number, count: number, dimensions: number) => Dataset;
}
export interface Recommendation {
  datasetId: string;
  /** Experiment size; thumbnail size is independently fixed. */
  count: number;
  role: "default" | "additional" | "limit" | "boundary";
  purpose: string;
  observe: string;
  params: Partial<Params>;
}
export const datasetRegistry: Record<string, DatasetDefinition> =
  Object.fromEntries(
    presets.map(([id, name, description]) => [
      id,
      {
        id,
        name,
        nameEn: presetAliases[id],
        description,
        kind: "numeric" as const,
        seed: 42,
        count: 120,
        dimensions: 2,
        generator: "legacy-preset",
        generate: (seed: number, count: number) =>
          legacyDataset(dataset(id, { ...dataDefaults, seed, count })),
      },
    ]),
  );
const structuredNames: Record<ExperimentPreset, [string, string]> = {
  numeric: ["다차원 분리 군집", "Multidimensional groups"],
  categorical: ["범주형 속성 집단", "Categorical profiles"],
  mixed: ["수치·범주 혼합 집단", "Mixed profiles"],
  graph: ["연결 커뮤니티", "Linked communities"],
  matrix: ["이진 블록 행렬", "Binary blocks"],
  timeseries: ["위상·스케일 파형", "Shifted waveforms"],
  stream: ["등장·소멸 스트림", "Emerging streams"],
  constrained: ["연결·분리 제약", "Pairwise constraints"],
  bernoulli: ["이진 응답 집단", "Binary responses"],
  poisson: ["발생 빈도 집단", "Poisson counts"],
  multinomial: ["문서 구성 카운트", "Multinomial profiles"],
};
registerPairwiseDatasets(datasetRegistry);
registerPossibilisticDatasets(datasetRegistry);
registerFpcmDatasets(datasetRegistry);
for (const [kind, [name, nameEn]] of Object.entries(structuredNames)) {
  for (const variant of ["base", "ambiguous", "boundary"] as const) {
    const id = `${kind}-${variant}`;
    datasetRegistry[id] = {
      id,
      name:
        name +
        (variant === "base"
          ? ""
          : variant === "ambiguous"
            ? " · 모호한 구조"
            : " · 경계 실험"),
      nameEn,
      description:
        variant === "base"
          ? "원본 형식과 전체 특성을 사용하는 시드 기반 예제"
          : variant === "ambiguous"
            ? "구조를 약화했을 때의 배정과 파라미터 민감도를 관찰합니다."
            : "중복·연결·순서·잡음의 영향을 확인합니다.",
      kind: ["bernoulli", "poisson", "multinomial"].includes(kind)
        ? "numeric"
        : (kind as Dataset["kind"]),
      seed: 42,
      count: kind === "stream" ? 48 : 24,
      dimensions: kind === "matrix" ? 8 : 4,
      generator: `structured-${kind}-${variant}`,
      generate(seed, count, dimensions) {
        const data = makeExperimentPreset(
          kind as ExperimentPreset,
          count,
          dimensions,
          seed,
        );
        if (variant === "base") return data;
        const rng = random(seed + 17);
        if (data.kind === "graph") {
          const n = data.nodes.length;
          // Add real cross-community edges; preserve weights and node identities.
          for (let i = 0; i < n / 2; i++) {
            const source = data.nodes[i].id,
              target = data.nodes[(i + Math.ceil(n / 2)) % n].id;
            if (
              !data.edges.some(
                (e) =>
                  (e.source === source && e.target === target) ||
                  (e.target === source && e.source === target),
              )
            )
              data.edges.push({
                source,
                target,
                weight: variant === "boundary" ? 5 : 1,
              });
          }
        } else if (data.kind === "categorical") {
          data.values = data.values.map((row, i) =>
            row.map((v, j) =>
              (variant === "boundary" ? i % 3 === 0 : j === 0)
                ? `공유-${j}`
                : v,
            ),
          );
        } else if (data.kind === "mixed") {
          data.numeric = data.numeric.map((row) =>
            row.map((v) => v * (variant === "boundary" ? 100 : 0.03)),
          );
          data.categorical = data.categorical.map((_, i) => [
            i % 2 ? "교차-A" : "교차-B",
            "공유 속성",
          ]);
        } else if (data.kind === "matrix") {
          data.values = data.values.map((row, i) =>
            row.map((v, j) =>
              variant === "boundary" ? (i + j) % 2 : rng() < 0.18 ? 1 - v : v,
            ),
          );
        } else if (data.kind === "timeseries") {
          data.series = data.series.map((s, i) => ({
            ...s,
            values: s.values.map((v, j) =>
              variant === "boundary"
                ? j === i % s.values.length
                  ? 8
                  : 0
                : v + (rng() - 0.5) * 1.5,
            ),
          }));
        } else if (data.kind === "stream") {
          data.samples = data.samples.map((s, i) => ({
            ...s,
            time: variant === "boundary" ? s.time * 5 : s.time,
            values: s.values.map((v) =>
              variant === "ambiguous" ? v + i / count : v,
            ),
          }));
        } else if (data.kind === "constrained") {
          // Feasible but geometrically inconvenient hard constraints, never contradictory metadata.
          data.mustLink = [];
          data.cannotLink = [[0, 1]];
          if (variant === "boundary")
            data.data.values = data.data.values.map((row) =>
              row.map((v) => v * 0.01),
            );
        } else if (data.kind === "numeric") {
          if (["bernoulli", "poisson", "multinomial"].includes(kind)) {
            data.values = data.values.map((row, i) =>
              variant === "boundary"
                ? row.map(() => 0)
                : i % 3 === 0
                  ? [...data.values[0]]
                  : row,
            );
          } else {
            data.values = data.values.map((row, i) =>
              variant === "boundary"
                ? [...data.values[i % 2]]
                : row.map((v) => v + (rng() - 0.5) * 4),
            );
          }
        }
        data.provenance = {
          generator: id,
          seed,
          parameters: { count, dimensions, variant },
        };
        return data;
      },
    };
  }
}
datasetRegistry.subspaces = {
  id: "subspaces",
  name: "관련 차원이 다른 부분공간",
  nameEn: "Cluster-specific subspaces",
  description: "앞쪽 또는 뒤쪽 축에서만 조밀한 두 집단과 무관 차원",
  kind: "numeric",
  seed: 42,
  count: 48,
  dimensions: 6,
  generator: "subspaces-v1",
  generate(seed, count, dimensions) {
    const rng = random(seed);
    return {
      kind: "numeric",
      values: Array.from({ length: count }, (_, i) =>
        Array.from({ length: Math.max(4, dimensions) }, (_, j) =>
          (i < count / 2 ? j < 2 : j >= 2 && j < 4)
            ? (i < count / 2 ? 0.2 : 0.8) + rng() * 0.04
            : rng(),
        ),
      ),
      provenance: {
        generator: "subspaces-v1",
        seed,
        parameters: { count, dimensions: Math.max(4, dimensions) },
      },
    };
  },
};
datasetRegistry.ordered = {
  id: "ordered",
  name: "순서와 두 임계값",
  nameEn: "Ordered threshold bridge",
  description: "먼저 본 대표점에 따라 배정·유보·재방문이 달라지는 원본 순서",
  kind: "numeric",
  seed: 42,
  count: 12,
  dimensions: 3,
  generator: "ordered-threshold-v1",
  generate(_seed, count, dimensions) {
    return {
      kind: "numeric",
      values: Array.from({ length: count }, (_, i) =>
        Array.from({ length: dimensions }, (_, j) =>
          j === 0 ? [0, 0.6, 1.2, 3, 3.6, 4.2][i % 6] : 0,
        ),
      ),
    };
  },
};

// Every runnable engine must explicitly declare its learning goals and examples.
type Spec = [string, string, string, string, string, Partial<Params>?];
const specifications: Record<Algorithm, Spec> = {
  "Fuzzy Possibilistic C-Means": [
    "fpcm-separated",
    "fpcm-overlap",
    "fpcm-replicated",
    "행 U·열 T",
    "전체 원본 정규화와 표본 복제 영향",
    { k: 2 },
  ],
  "Possibilistic C-Means": [
    "pcm-separated",
    "pcm-outliers",
    "pcm-coincident",
    "원본 ND 독립 전형성",
    "합1 제약과 군집별 양수 척도를 구분합니다.",
    { k: 2 },
  ],
  PCKMeans: [
    "pck-separated",
    "pck-overlap",
    "pck-conflict",
    "거리와 유한 제약 비용",
    "위반 개수와 위반 비용은 다릅니다.",
    { k: 2 },
  ],
  "K-Means": [
    "blobs",
    "anisotropic",
    "circles",
    "평균 중심과 SSE 감소",
    "동심원은 중심까지의 거리만으로 분리하기 어렵습니다.",
  ],
  DBSCAN: [
    "moons",
    "outliers",
    "density",
    "ε 이웃과 핵심점 연결",
    "고정 ε로 밀도가 다른 집단을 동시에 분리하기 어렵습니다.",
    { epsilon: 0.075, minPts: 4 },
  ],
  HDBSCAN: [
    "density",
    "unequal",
    "bridge",
    "상호 도달 거리와 밀도 계층",
    "연결 다리가 계층과 안정성 선택에 주는 영향을 비교합니다.",
  ],
  OPTICS: [
    "density",
    "moons",
    "gradient",
    "도달 가능 거리와 군집 추출",
    "연속 밀도에서 추출 임계값의 영향을 관찰합니다.",
  ],
  AGNES: [
    "blobs",
    "elongated",
    "bridge",
    "거리와 linkage에 따른 병합",
    "다리 데이터에서 chaining과 linkage 차이를 확인합니다.",
  ],
  DIANA: [
    "unequal",
    "blobs",
    "overlap",
    "최대 직경과 분리 집합",
    "겹치는 집단에서 분할 경계가 모호해집니다.",
  ],
  PAM: [
    "outliers",
    "blobs",
    "circles",
    "실제 관측 medoid와 swap",
    "메도이드 기반 볼록 분할의 한계를 관찰합니다.",
  ],
  CLARA: [
    "blobs",
    "outliers",
    "satellite",
    "표본 medoid와 전체 비용 평가",
    "작은 위성 집단이 표본에 포함되는지 시드로 비교합니다.",
  ],
  CLARANS: [
    "blobs",
    "unequal",
    "satellite",
    "무작위 이웃 탐색과 medoid 비용",
    "작은 집단과 제한된 탐색 예산의 영향을 비교합니다.",
  ],
  GMM: [
    "anisotropic",
    "overlap",
    "rings",
    "공분산·혼합비·E/M 단계",
    "고리 구조는 타원 정규분포 가정과 맞지 않습니다.",
  ],
  "Fuzzy C-Means": [
    "overlap",
    "blobs",
    "outliers",
    "경계점의 연속적인 소속도",
    "이상치와 퍼지 지수가 중심에 미치는 영향을 확인합니다.",
  ],
  "Bisecting K-Means": [
    "unequal",
    "four",
    "circles",
    "SSE 기준 반복 이분할",
    "국소적인 이분할이 비볼록 구조를 분리하지 못할 수 있습니다.",
  ],
  "K-Medians": [
    "outliers",
    "blobs",
    "circles",
    "L1 거리와 좌표별 중앙값",
    "좌표 축과 비볼록 구조의 영향을 비교합니다.",
  ],
  "Mini-Batch K-Means": [
    "blobs",
    "unequal",
    "overlap",
    "배치별 중심의 증분 변화",
    "배치 크기와 겹치는 집단의 오차를 비교합니다.",
  ],
  "Mean Shift": [
    "blobs",
    "density",
    "bridge",
    "대역폭 내 밀도 모드 이동",
    "대역폭에 따라 서로 다른 모드가 합쳐집니다.",
  ],
  BIRCH: [
    "blobs",
    "unequal",
    "elongated",
    "CF 요약과 임계 반경",
    "구형 요약이 길쭉한 집단에 주는 영향을 봅니다.",
  ],
  ROCK: [
    "categorical",
    "categorical-noisy",
    "categorical-noisy",
    "범주 토큰의 공통 이웃 링크",
    "범주 잡음이 많아질 때 링크가 약해집니다.",
    { threshold: 0.5 },
  ],
  CURE: [
    "elongated",
    "unequal",
    "bridge",
    "다중 대표점과 축소·병합",
    "근접 집단과 다리에서 대표점 수·축소율을 비교합니다.",
  ],
  SOM: [
    "grid",
    "blobs",
    "outliers",
    "격자 위상과 이웃 뉴런 이동",
    "외딴 관측에서 위상과 양자화 오차를 살펴봅니다.",
  ],
  LVQ: [
    "labeled",
    "labeled-overlap",
    "labeled-overlap",
    "정답 클래스에 따른 대표점 학습",
    "겹치는 클래스의 지도 분류 경계를 관찰합니다.",
  ],
  "Neural Gas": [
    "rings",
    "blobs",
    "outliers",
    "거리 순위에 따른 뉴런 갱신",
    "BMU 분할과 군집 추출을 구분하고 이상치 영향을 확인합니다.",
  ],
  "Growing Neural Gas": [
    "moons",
    "rings",
    "outliers",
    "오차 기반 뉴런 삽입과 간선 노화",
    "이상치에서 뉴런 예산과 간선 제거를 관찰합니다.",
  ],
  "Spectral Clustering": [
    "circles",
    "moons",
    "bridge",
    "유사도 그래프와 고유벡터 임베딩",
    "연결 척도와 이웃 수에 따라 그래프 분할이 달라집니다.",
    { k: 2 },
  ],
  "Affinity Propagation": [
    "blobs",
    "unequal",
    "overlap",
    "책임·가용성 메시지와 대표점 선택",
    "선호도·감쇠에 따른 대표점 수와 수렴 상태를 확인합니다.",
  ],
  "Density Peaks / CFSFDP": [
    "density",
    "moons",
    "uniform",
    "ρ–δ 결정 그래프와 상위 밀도 부모",
    "뚜렷한 밀도 봉우리가 없을 때 중심 선택을 비교합니다.",
  ],
  "X-Means": [
    "numeric-base",
    "numeric-ambiguous",
    "numeric-boundary",
    "BIC에 따른 분할 후보 수용",
    "중복 관측에서 분산 바닥과 모델 선택을 관찰합니다.",
  ],
  "G-Means": [
    "numeric-base",
    "numeric-ambiguous",
    "numeric-boundary",
    "정규성 검정과 분할",
    "작은 분산·중복에서 검정 가능성과 분할 정지를 확인합니다.",
  ],
  "Dip-Means": [
    "numeric-base",
    "numeric-ambiguous",
    "numeric-boundary",
    "단봉성 검정과 분할",
    "동률과 중복 거리에서 검정의 한계를 확인합니다.",
  ],
  "DP-Means": [
    "numeric-base",
    "numeric-ambiguous",
    "numeric-boundary",
    "거리 벌점과 새 중심 생성",
    "λ와 데이터 척도를 바꿔 중심 수를 비교합니다.",
  ],
  Louvain: [
    "graph-base",
    "graph-ambiguous",
    "graph-boundary",
    "모듈성 이득과 커뮤니티 축약",
    "강한 교차 간선이 분할과 해상도에 미치는 영향을 봅니다.",
  ],
  Leiden: [
    "graph-base",
    "graph-ambiguous",
    "graph-boundary",
    "국소 이동·정제·축약",
    "약한 커뮤니티에서 정제 과정과 목적값을 비교합니다.",
  ],
  "Label Propagation": [
    "graph-base",
    "graph-ambiguous",
    "graph-boundary",
    "이웃 레이블의 전파",
    "교차 연결과 순서에 따른 레이블 합쳐짐을 확인합니다.",
  ],
  "Girvan–Newman": [
    "graph-base",
    "graph-ambiguous",
    "graph-boundary",
    "간선 매개중심성 재계산과 제거",
    "교차 간선 가중치가 최단 경로에 주는 영향을 봅니다.",
  ],
  "Markov Clustering (MCL)": [
    "graph-base",
    "graph-ambiguous",
    "graph-boundary",
    "전이 행렬 확장과 팽창",
    "팽창 지수와 약한 커뮤니티에서 흐름 집중을 비교합니다.",
  ],
  "Greedy Modularity (CNM)": [
    "graph-base",
    "graph-ambiguous",
    "graph-boundary",
    "최대 모듈성 이득의 탐욕 병합",
    "강한 교차 연결에서 탐욕 경로와 선택 계층을 봅니다.",
  ],
  "Fluid Communities": [
    "graph-base",
    "graph-ambiguous",
    "graph-ambiguous",
    "커뮤니티 밀도와 국소 경쟁",
    "연결이 모호할 때 지정 K와 순서의 영향을 관찰합니다.",
  ],
  Walktrap: [
    "graph-base",
    "graph-ambiguous",
    "graph-boundary",
    "확률보행 거리와 계층 병합",
    "보행 길이와 교차 가중치에 따른 계층을 비교합니다.",
  ],
  "Clique Percolation": [
    "graph-base",
    "graph-ambiguous",
    "graph-ambiguous",
    "완전 부분그래프의 인접과 중첩",
    "연결이 있어도 k-clique가 없으면 미소속일 수 있습니다.",
  ],
  "K-Modes": [
    "categorical-base",
    "categorical-ambiguous",
    "categorical-boundary",
    "불일치 거리와 속성 최빈값",
    "공유 속성과 범주 잡음에서 중심 토큰을 비교합니다.",
  ],
  "K-Prototypes": [
    "mixed-base",
    "mixed-ambiguous",
    "mixed-boundary",
    "수치 거리와 범주 불일치의 균형",
    "수치 척도와 γ의 상대 크기가 배정을 바꿉니다.",
  ],
  CLIQUE: [
    "subspaces",
    "numeric-base",
    "numeric-ambiguous",
    "차원별 조밀한 격자와 부분공간",
    "무관 차원·격자 해상도·밀도 문턱을 비교합니다.",
  ],
  PROCLUS: [
    "subspaces",
    "numeric-base",
    "numeric-ambiguous",
    "대표점별 관련 차원 선택",
    "목표 차원 수와 잡음에서 선택 차원을 확인합니다.",
  ],
  Bimax: [
    "matrix-base",
    "matrix-ambiguous",
    "matrix-boundary",
    "모든 셀이 1인 이중군집",
    "불완전 블록과 체커보드에서 조합 폭증·최소 크기를 비교합니다.",
  ],
  "Cheng–Church Biclustering": [
    "matrix-base",
    "matrix-ambiguous",
    "matrix-boundary",
    "행·열 평균과 평균제곱잔차",
    "잔차 문턱과 행·열 제거가 블록에 주는 영향을 확인합니다.",
  ],
  "K-Shape": [
    "timeseries-base",
    "timeseries-ambiguous",
    "timeseries-boundary",
    "z 정규화·위상 정렬·형태 중심",
    "잡음·충격 파형에서 상관 거리와 정렬을 비교합니다.",
  ],
  DenStream: [
    "stream-base",
    "stream-ambiguous",
    "stream-boundary",
    "시간 감쇠·잠재/이상 미소군집",
    "긴 공백과 드리프트에서 미소군집 소멸을 확인합니다.",
  ],
  "COP-KMeans": [
    "constrained-base",
    "constrained-ambiguous",
    "constrained-boundary",
    "must-link 성분과 cannot-link 배정",
    "가까운 점의 분리 제약과 greedy 배정 가능성을 봅니다.",
  ],
  "Bernoulli Mixture": [
    "bernoulli-base",
    "bernoulli-ambiguous",
    "bernoulli-boundary",
    "이진 응답의 모수와 사후확률",
    "모두 0인 관측에서 확률 경계와 성분 구분을 봅니다.",
  ],
  "Poisson Mixture": [
    "poisson-base",
    "poisson-ambiguous",
    "poisson-boundary",
    "발생률과 로그우도의 EM",
    "0 카운트에서 발생률 경계와 성분 소실을 봅니다.",
  ],
  "Multinomial Mixture": [
    "multinomial-base",
    "multinomial-ambiguous",
    "multinomial-boundary",
    "행합 조건부 구성 확률",
    "빈 문서에서 정보량과 사후확률의 의미를 확인합니다.",
  ],
  BSAS: [
    "ordered",
    "numeric-base",
    "numeric-ambiguous",
    "한 번의 순회와 배정 즉시 대표 이동",
    "입력 순서를 바꾸면 결과가 달라질 수 있습니다.",
    { threshold: 1, maxClusters: 5 },
  ],
  MBSAS: [
    "ordered",
    "numeric-base",
    "numeric-ambiguous",
    "seed 선택과 두 번째 pass 배정",
    "첫 pass의 유보와 seed 중복 계산 여부를 확인합니다.",
    { threshold: 1, maxClusters: 5 },
  ],
  TTSAS: [
    "ordered",
    "numeric-base",
    "numeric-ambiguous",
    "두 경계 사이의 유보와 재방문",
    "무진전 뒤 다음 pass에서 대표를 생성하는 시점을 봅니다.",
    { threshold: 0.4, upperThreshold: 1 },
  ],
};
/** Sizes reflect exact engine cost, input type and the educational purpose. */
export function recommendationCount(
  algorithm: Algorithm,
  id: string,
  role: Recommendation["role"],
): number {
  const meta = datasetRegistry[id];
  if (algorithm === "Fuzzy Possibilistic C-Means")
    return role === "limit" ? 24 : 120;
  if (algorithm === "Possibilistic C-Means") return role === "limit" ? 24 : 160;
  if (id.startsWith("ordered")) return 12;
  // Preserve small duplicate/zero/constraint counterexamples for hand inspection.
  if (id.includes("boundary") && ["numeric", "constrained"].includes(meta.kind))
    return 24;
  if (meta.kind === "graph")
    return algorithm === "Girvan\u2013Newman"
      ? 32
      : ["Walktrap", "Markov Clustering (MCL)"].includes(algorithm)
        ? 40
        : 48;
  if (meta.kind === "matrix") return 64;
  if (meta.kind === "timeseries") return 40;
  if (meta.kind === "stream") return 300;
  if (meta.kind === "categorical" || meta.kind === "mixed") return 160;
  if (meta.kind === "constrained") return role === "limit" ? 24 : 120;
  const costs: Partial<Record<Algorithm, number>> = {
    AGNES: 60,
    DIANA: 80,
    PAM: 80,
    ROCK: 80,
    CURE: 60,
    "Spectral Clustering": 64,
    "Affinity Propagation": 64,
    "Dip-Means": 60,
    HDBSCAN: 160,
    OPTICS: 180,
    DBSCAN: 200,
    "Density Peaks / CFSFDP": 160,
    "Mean Shift": 160,
    "Neural Gas": 200,
    "Growing Neural Gas": 200,
    TTSAS: 160,
  };
  return costs[algorithm] ?? 240;
}
export const recommendations = Object.fromEntries(
  Object.entries(specifications).map(
    ([algorithm, [primary, extra, limit, purpose, observe, params = {}]]) => {
      if (algorithm === "Fuzzy Possibilistic C-Means")
        return [algorithm, fpcmRecommendations];
      if (algorithm === "PCKMeans") return [algorithm, pairwiseRecommendations];
      if (algorithm === "Possibilistic C-Means")
        return [algorithm, possibilisticRecommendations];
      const alternateId = `${primary}-alternate`;
      if (!datasetRegistry[alternateId])
        datasetRegistry[alternateId] = {
          ...datasetRegistry[primary],
          id: alternateId,
          name: `${datasetRegistry[primary].name} · 다른 표본`,
          seed: 137,
          description:
            "같은 가정에서 시드와 표본이 바뀔 때 결과의 안정성을 비교합니다.",
        };
      return [
        algorithm,
        [
          {
            datasetId: primary,
            role: "default",
            purpose,
            observe,
            params,
            count: 0,
          },
          {
            count: 0,
            datasetId: extra,
            role: "additional",
            purpose: `${purpose} · 다른 구조 비교`,
            observe,
            params,
          },
          {
            count: 0,
            datasetId: alternateId,
            role: "additional",
            purpose: `${purpose} · 표본 안정성`,
            observe: "시드 42와 137에서 실제 결과·목적값·Trace를 비교합니다.",
            params,
          },
          {
            count: 0,
            datasetId: limit,
            role: "limit",
            purpose: "가정과 한계 실험",
            observe,
            params,
          },
        ],
      ];
    },
  ),
) as Record<Algorithm, Recommendation[]>;
for (const [algorithm, entries] of Object.entries(recommendations))
  for (const entry of entries)
    entry.count = recommendationCount(
      algorithm as Algorithm,
      entry.datasetId,
      entry.role,
    );

export function generateForRecommendation(
  algorithm: Algorithm,
  entry = recommendations[algorithm][0],
  options: Partial<{ seed: number; count: number; dimensions: number }> = {},
): Dataset {
  return generateRecommended(entry.datasetId, {
    count: entry.count,
    ...options,
  });
}
export const recommendedAlgorithms = (datasetId: string) =>
  (Object.keys(recommendations) as Algorithm[]).filter((a) =>
    recommendations[a].some((r) => r.datasetId === datasetId),
  );
export function recommendationParams(
  algorithm: Algorithm,
  entry: Recommendation,
): Params {
  return { ...algorithmDefaults(algorithm), ...entry.params };
}
export function generateRecommended(
  id: string,
  options: Partial<{ seed: number; count: number; dimensions: number }> = {},
): Dataset {
  const meta = datasetRegistry[id];
  if (!meta) throw new Error(`등록되지 않은 데이터셋: ${id}`);
  return meta.generate(
    options.seed ?? meta.seed,
    options.count ?? meta.count,
    options.dimensions ?? meta.dimensions,
  );
}
export function recommendedPoints(id: string): Point[] {
  const data = generateRecommended(id);
  if (data.kind !== "numeric" || !data.display)
    throw new Error("이 추천은 원본 데이터 실험실에서 열어야 합니다.");
  return data.display;
}
export type LegacyPreset = PresetId;
