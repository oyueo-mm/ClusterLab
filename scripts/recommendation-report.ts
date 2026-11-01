import { writeFileSync } from "node:fs";
import { algorithms } from "../src/engine/types";
import { registry } from "../src/engine/registry";
import {
  datasetRegistry,
  recommendations,
  recommendationParams,
  recommendedAlgorithms,
} from "../src/data/recommendations";
const rows = algorithms.map((id) => {
  const entries = recommendations[id];
  return `| ${id} | ${datasetRegistry[entries[0].datasetId].name} | ${entries
    .filter((r) => r.role === "additional")
    .map((r) => datasetRegistry[r.datasetId].name)
    .join(
      " / ",
    )} | ${datasetRegistry[entries.find((r) => r.role === "limit")!.datasetId].name} | ${entries[0].purpose} |`;
});
writeFileSync(
  "docs/DATASET_RECOMMENDATIONS.md",
  `# 알고리즘별 학습 데이터셋\n\n실행 엔진 ${algorithms.length}개에 기본 1·추가 2·한계 1을 명시적으로 연결한다. 원본 생성은 기존 32개 프리셋 및 구조형 생성기를 재사용한다. 추가 표본은 시드137이며 대표 표본의 시드는42다. 추천 파라미터는 데이터 적용과 별개로 사용자가 선택한다. 실제 결과/정답 label은 하드코딩하지 않는다. 한계 설명은 고정된 결과의 보장이 아니라 관찰할 가정과 파라미터를 뜻한다.\n\n| 알고리즘 | 기본 추천 | 추가 추천 | 한계·경계 실험 | 학습 목적 |\n| --- | --- | --- | --- | --- |\n${rows.join("\n")}\n\n신규 엔진 통합: 엔진·입출력/파라미터·Trace/분석·교재를 등록하고 recommendations의 명시적 매핑을 추가한다. 필요하면 데이터 생성기를 등록한다. \`npx vite-node scripts/catalog-metadata.ts\`와 \`npx vite-node scripts/recommendation-report.ts\`로 가벼운 도감 메타데이터와 이 문서를 갱신하고 단위/브라우저 검증을 실행한다. 등록 누락 및 교재 요약 불일치는 자동 검사한다.\n`,
);
writeFileSync(
  "docs/ui-datasets/dataset-inventory.json",
  JSON.stringify(
    {
      datasets: Object.values(datasetRegistry).map(
        ({ generate: _generate, ...meta }) => ({
          ...meta,
          algorithms: recommendedAlgorithms(meta.id),
        }),
      ),
      algorithms: algorithms.map((id) => ({
        id,
        input: registry[id].input,
        recommendations: recommendations[id].map((r) => ({
          ...r,
          parameters: Object.fromEntries(
            registry[id].parameters.map((f) => [
              f.key,
              recommendationParams(id, r)[f.key],
            ]),
          ),
        })),
      })),
    },
    null,
    2,
  ) + "\n",
);
