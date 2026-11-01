import type { AlgorithmDetail } from "./algorithmDetails";
import type { Algorithm } from "./types";
const sources = {
  BSAS: "https://pyclustering.github.io/docs/0.10.1/html/df/d50/bsas_8py_source.html",
  MBSAS:
    "https://pyclustering.github.io/docs/0.10.1/html/d1/db8/mbsas_8py_source.html",
  TTSAS:
    "https://pyclustering.github.io/docs/0.10.1/html/df/db9/classpyclustering_1_1cluster_1_1ttsas_1_1ttsas.html",
};
export const sequentialDetails: Partial<Record<Algorithm, AlgorithmDetail>> =
  Object.fromEntries(
    (Object.keys(sources) as (keyof typeof sources)[]).map((method) => [
      method,
      {
        timeComplexity:
          method === "TTSAS"
            ? "O(RKd), R=실제 재검사 수; 보수 최악 O(n³d)"
            : "O(nKd), K≤min(n,q); MBSAS 두 pass",
        spaceComplexity: "O(nd+Kd+n), 거리행렬 없음·Trace 별도 byte 예산",
        traceKinds: [
          "initialize",
          "prototype",
          "distance",
          "assign",
          ...(method === "BSAS" ? [] : ["defer"]),
          "visit",
          "finish",
        ],
        visualizations: [
          "원본 처리 순서",
          "실제 거리·임계값",
          "ND 대표 이동",
          "배정·유보·pass",
          "진단 SSE",
        ],
        validation: "independent-pyclustering",
        limitations: `${method === "TTSAS" ? "d≤하한 할당/d>상한 생성/나머지 유보. 직전 pass 무진전이면 첫 pending 생성. q 미사용." : method === "MBSAS" ? "첫 pass seed만 생성·나머지 유보, 두 번째 pass 유보 행만 배정·평균 갱신." : "한 pass·배정 즉시 평균 갱신·최대 군집 수 q."} 명시적 Euclidean·원본 순서·먼저 생성한 tie. 순서 불변/전역 최적/Lloyd 고정점 보장 없음. 공식 Python0.10.1.2와 비교. 원서 전체 열람 미완료.`,
        references: [
          sources[method],
          "https://joss.theoj.org/papers/10.21105/joss.01230",
        ],
      },
    ]),
  ) as Partial<Record<Algorithm, AlgorithmDetail>>;
