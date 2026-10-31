import type { Algorithm, Point, Params } from "./types";
import { fields } from "./parameters";
export function validateRun(
  algorithm: Algorithm,
  points: Point[],
  params: Params,
) {
  if (!fields[algorithm]) throw new Error("지원하지 않는 알고리즘입니다.");
  for (const f of fields[algorithm]) {
    const value = params[f.key];
    // v0.6 treats the shared kmeans++ default as PAM BUILD.
    if (
      algorithm === "PAM" &&
      f.key === "initialization" &&
      value === "kmeans++"
    )
      continue;
    if (
      f.options
        ? !f.options.includes(String(value))
        : typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < (f.min ?? -Infinity) ||
          ((f.step ?? 1) === 1 && !Number.isSafeInteger(value))
    )
      throw new Error(`파라미터 오류: ${f.label}`);
  }
  if (!Number.isSafeInteger(params.seed))
    throw new Error("시드는 유한한 정수여야 합니다.");
  if (points.length < 2) throw new Error("데이터는 2개 이상을 사용하세요.");
  if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    throw new Error("좌표는 유한한 숫자여야 합니다.");
  if (algorithm === "HDBSCAN" && params.minPts > points.length)
    throw new Error("min_samples는 데이터 수 이하여야 합니다.");
  if (
    algorithm === "AGNES" &&
    params.linkage === "ward" &&
    params.metric !== "euclidean"
  )
    throw new Error("Ward linkage는 Euclidean 거리만 지원합니다.");
}
