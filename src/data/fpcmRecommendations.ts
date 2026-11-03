import type { DatasetDefinition, Recommendation } from "./recommendations";
import { random } from "../engine/math";
const variants = [
  [
    "fpcm-separated",
    "U/T가 다른 분리 군집",
    "행 U와 열 T의 정규화를 비교합니다.",
  ],
  [
    "fpcm-overlap",
    "겹치는 퍼지 군집",
    "U의 상대성·T의 표본 간 경쟁을 관찰합니다.",
  ],
  [
    "fpcm-imbalanced",
    "다른 크기·밀도",
    "열 합1의 T와 표본 수 의존성을 확인합니다.",
  ],
  [
    "fpcm-replicated",
    "표본 복제·중복 중심 한계",
    "중복 점·T의 1/r 축소와 가중 영향의 차이를 관찰합니다.",
  ],
] as const;
export function registerFpcmDatasets(
  registry: Record<string, DatasetDefinition>,
) {
  for (const [id, name, description] of variants)
    registry[id] = {
      id,
      name,
      nameEn: id,
      description,
      kind: "numeric",
      seed: 42,
      count: id === "fpcm-replicated" ? 24 : 120,
      dimensions: 4,
      generator: `original-${id}`,
      generate(seed, count, dimensions) {
        const rng = random(seed),
          n = Math.max(1, Math.trunc(count)),
          d = Math.max(1, Math.trunc(dimensions)),
          noise = () =>
            Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
        return {
          kind: "numeric",
          values: Array.from({ length: n }, (_, i) =>
            Array.from({ length: d }, (_, j) => {
              if (id === "fpcm-replicated")
                return [0, 1, 4][i % 3] * (1 + j * 0.2);
              const left = i < n * (id === "fpcm-imbalanced" ? 0.75 : 0.5),
                center = (left ? -1 : 1) * (id === "fpcm-overlap" ? 0.5 : 2),
                spread =
                  id === "fpcm-overlap"
                    ? 0.7
                    : id === "fpcm-imbalanced"
                      ? left
                        ? 0.12
                        : 0.8
                      : 0.25;
              return center * (1 + j * 0.2) + spread * noise();
            }),
          ),
        };
      },
    };
}
export const fpcmRecommendations: Recommendation[] = variants.map(
  ([datasetId, , observe], i) => ({
    datasetId,
    role: i === 0 ? "default" : i === 3 ? "limit" : "additional",
    count: i === 3 ? 24 : 120,
    purpose: observe,
    observe,
    params: {
      k: 2,
      fuzziness: 2,
      typicalityExponent: 2,
      warmIterations: 30,
      iterations: 100,
      tolerance: 1e-6,
    },
  }),
);
