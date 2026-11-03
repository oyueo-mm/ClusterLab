import type { DatasetDefinition, Recommendation } from "./recommendations";
import { random } from "../engine/math";
const variants = [
  [
    "mpck-anisotropic",
    "축 방향 분산이 다른 군집",
    "같은 중심 거리에서도 실제 학습한 대각 가중치가 달라집니다.",
  ],
  [
    "mpck-scaled",
    "단위가 다른 4차원",
    "작은 축과 큰 축의 역분산 가중치를 비교합니다.",
  ],
  [
    "mpck-conflict",
    "거리와 감독의 유한 충돌",
    "ML 위반 비용은 두 metric 평균, CL은 전체 최대쌍을 사용합니다.",
  ],
  [
    "mpck-singular",
    "상수 축·명시 조건화 한계",
    "α를0으로 바꾸면 특이 갱신 오류, 양수에서는 근사 조건화가 표시됩니다.",
  ],
] as const;
export function registerMpckDatasets(
  registry: Record<string, DatasetDefinition>,
) {
  for (const [id, name, description] of variants)
    registry[id] = {
      id,
      name,
      nameEn: id,
      description,
      kind: "constrained",
      seed: 42,
      count: id === "mpck-singular" ? 12 : 80,
      dimensions: id === "mpck-scaled" ? 4 : 2,
      generator: `original-${id}`,
      generate(seed, count, dimensions) {
        const rng = random(seed),
          n = Math.max(4, Math.trunc(count)),
          d = Math.max(1, Math.trunc(dimensions)),
          noise = () =>
            Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
        const values = Array.from({ length: n }, (_, i) =>
          Array.from({ length: d }, (_, j) => {
            if (id === "mpck-singular" && j === 0) return 0;
            const left = i < Math.ceil(n / 2),
              scale = id === "mpck-scaled" ? 10 ** (j - 2) : 1;
            return (
              scale *
              ((left ? -3 : 3) +
                (j % 2 === 0 ? (left ? 0.5 : 0.15) : left ? 0.15 : 0.5) *
                  noise())
            );
          }),
        );
        const mid = Math.ceil(n / 2),
          mustLink: [number, number][] =
            id === "mpck-conflict"
              ? [
                  [0, mid],
                  [1, 2],
                ]
              : [
                  [0, 1],
                  [mid, mid + 1],
                ],
          cannotLink: [number, number][] =
            id === "mpck-conflict" ? [[0, 3]] : [[0, mid]];
        return {
          kind: "constrained",
          data: { kind: "numeric", values },
          mustLink,
          cannotLink,
        };
      },
    };
}
export const mpckRecommendations: Recommendation[] = variants.map(
  ([datasetId, , observe], i) => ({
    datasetId,
    role: i === 0 ? "default" : i === 3 ? "limit" : "additional",
    count: i === 3 ? 12 : 80,
    purpose: observe,
    observe,
    params: {
      k: 2,
      iterations: 30,
      constraintPenalty: 0.001,
      metricConditioning: i === 3 ? 1e-6 : 0,
      tolerance: 1e-6,
      metricTolerance: 1e-6,
    },
  }),
);
