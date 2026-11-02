import type { DatasetDefinition, Recommendation } from "./recommendations";
import { random } from "../engine/math";
const variants = [
  [
    "pck-separated",
    "일관된 연결·분리 군집",
    "원본 ND 분리 군집과 국소 ML/CL",
    0.5,
  ],
  [
    "pck-overlap",
    "겹치는 군집과 감독",
    "불명확한 거리에서 제약 비용의 영향",
    0.5,
  ],
  [
    "pck-leverage",
    "거리와 벌점의 선택",
    "멀리 떨어진 ML을 유한 비용으로 배정",
    4,
  ],
  [
    "pck-conflict",
    "기하 구조와 감독의 충돌",
    "일관된 관계여도 기하 구조와 충돌할 수 있음",
    0.02,
  ],
] as const;
export function registerPairwiseDatasets(
  registry: Record<string, DatasetDefinition>,
) {
  for (const [id, name, description] of variants)
    registry[id] = {
      id,
      name,
      nameEn: name,
      description,
      kind: "constrained",
      seed: 42,
      count: 120,
      dimensions: 4,
      generator: `pck-${id}`,
      generate(seed, count, dimensions) {
        const rng = random(seed),
          n = Math.max(1, Math.trunc(count)),
          d = Math.max(1, Math.trunc(dimensions)),
          half = Math.ceil(n / 2);
        const values = Array.from({ length: n }, (_, i) =>
          Array.from(
            { length: d },
            (_, j) =>
              (i < half ? 0 : id === "pck-overlap" ? 0.35 : 1.5) +
              (rng() - 0.5) * (id === "pck-overlap" ? 0.8 : 0.2) +
              j * 0.05,
          ),
        );
        const mustLink: [number, number][] = [],
          cannotLink: [number, number][] = [];
        if (n >= 4) {
          if (id === "pck-leverage" || id === "pck-conflict") {
            mustLink.push([0, n - 1]);
            cannotLink.push([0, 1]);
            if (id === "pck-conflict") mustLink.push([1, n - 2]);
          } else {
            mustLink.push([0, 1], [half, Math.min(n - 1, half + 1)]);
            cannotLink.push([0, half]);
          }
        } else if (n >= 2) cannotLink.push([0, n - 1]);
        return {
          kind: "constrained",
          data: { kind: "numeric", values },
          mustLink,
          cannotLink,
        };
      },
    };
}
export const pairwiseRecommendations: Recommendation[] = variants.map(
  ([datasetId, , observe, penalty], i) => ({
    datasetId,
    count: i === 3 ? 24 : 120,
    role: i === 0 ? "default" : i === 3 ? "limit" : "additional",
    purpose: observe,
    observe,
    params: { k: 2, constraintPenalty: penalty, iterations: 30 },
  }),
);
