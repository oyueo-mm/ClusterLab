import type { DatasetDefinition, Recommendation } from "./recommendations";
import { random } from "../engine/math";
const variants = [
  [
    "pcm-separated",
    "분리된 수치 군집",
    "전체 ND FCM 기준과 독립 전형성을 비교합니다.",
  ],
  [
    "pcm-outliers",
    "희박한 원거리 이상치",
    "강제 소속도와 각 중심에 대한 낮은 전형성을 비교합니다.",
  ],
  [
    "pcm-unequal",
    "다른 크기·분산의 군집",
    "군집별 Ω와 유효 가중치를 비교합니다.",
  ],
  [
    "pcm-coincident",
    "같은 중심·전형성 합의 한계",
    "양수 수동 Ω에서 중복 중심과 행 합 K를 관찰합니다.",
  ],
] as const;
export function registerPossibilisticDatasets(
  registry: Record<string, DatasetDefinition>,
) {
  for (const [id, name, description] of variants)
    registry[id] = {
      id,
      name,
      nameEn: `PCM ${id}`,
      description,
      kind: "numeric",
      seed: 42,
      count: id === "pcm-coincident" ? 24 : 160,
      dimensions: 4,
      generator: `original-${id}`,
      generate(seed, count, dimensions) {
        const rng = random(seed),
          n = Math.max(1, Math.trunc(count)),
          d = Math.max(1, Math.trunc(dimensions)),
          noise = () =>
            Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
        if (id === "pcm-coincident")
          return {
            kind: "numeric",
            values: Array.from(
              { length: n },
              () => Array(d).fill(2) as number[],
            ),
          };
        const values = Array.from({ length: n }, (_, i) =>
          Array.from({ length: d }, (_, j) => {
            const outlier =
                id === "pcm-outliers" &&
                i >= n - Math.max(1, Math.floor(n * 0.05)),
              left = i < (id === "pcm-unequal" ? n * 0.65 : n / 2),
              center = outlier ? 10 : left ? -2 : 2,
              spread = outlier
                ? 0.4
                : id === "pcm-unequal"
                  ? left
                    ? 0.1
                    : 0.7
                  : 0.25;
            return center + spread * noise() + j * 0.03;
          }),
        );
        return { kind: "numeric", values };
      },
    };
}
export const possibilisticRecommendations: Recommendation[] = variants.map(
  ([datasetId, , observe], i) => ({
    datasetId,
    role: i === 0 ? "default" : i === 3 ? "limit" : "additional",
    count: i === 3 ? 24 : 160,
    purpose: observe,
    observe,
    params: {
      k: i === 3 ? 3 : 2,
      iterations: 100,
      warmIterations: 50,
      pcmScaleMode: i === 3 ? "manual" : "fcm",
      pcmScale: 1,
      scaleCoefficient: 1,
      typicalityExponent: 2,
    },
  }),
);
