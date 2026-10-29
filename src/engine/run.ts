import { type Algorithm, type Point, type Params } from "./types";
import { Recorder } from "./trace";
import { kmeans } from "./algorithms/kmeans";
import { dbscan } from "./algorithms/dbscan";
import { optics } from "./algorithms/optics";
import { agnes } from "./algorithms/agnes";
import { diana } from "./algorithms/diana";
import { pam } from "./algorithms/pam";
import { gmm } from "./algorithms/gmm";
import { hdbscan } from "./algorithms/hdbscan";
import { som } from "./algorithms/som";
import { lvq } from "./algorithms/lvq";
import { rock } from "./algorithms/rock";
import { birch } from "./algorithms/birch";
import { meanshift } from "./algorithms/meanshift";
const engines = {
  "K-Means": kmeans,
  DBSCAN: dbscan,
  HDBSCAN: hdbscan,
  AGNES: agnes,
  DIANA: diana,
  SOM: som,
  LVQ: lvq,
  OPTICS: optics,
  PAM: pam,
  ROCK: rock,
  GMM: gmm,
  BIRCH: birch,
  "Mean Shift": meanshift,
};
export function run(algorithm: Algorithm, points: Point[], params: Params) {
  if (points.length < 2 || points.length > 600)
    throw new Error(
      "데이터는 2~600개를 사용하세요. 정밀 이벤트 기록을 위한 제한입니다.",
    );
  if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    throw new Error("좌표는 유한한 숫자여야 합니다.");
  if (algorithm === "HDBSCAN" && params.minPts > points.length)
    throw new Error("min_samples는 데이터 수 이하여야 합니다.");
  if (
    algorithm !== "Mean Shift" &&
    (params.k < 1 ||
      params.minPts < 2 ||
      params.branching < 2 ||
      params.iterations < 1)
  )
    throw new Error("파라미터 범위를 확인하세요.");
  if (
    algorithm === "AGNES" &&
    params.linkage === "ward" &&
    params.metric !== "euclidean"
  )
    throw new Error("Ward linkage는 Euclidean 거리만 지원합니다.");
  const start = performance.now(),
    r = new Recorder(points.length, algorithm);
  engines[algorithm](points, params, r);
  r.trace.elapsed = performance.now() - start;
  return r.trace;
}
