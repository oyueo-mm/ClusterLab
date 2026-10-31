import type { Center, Params, Point } from "../types";
import type { Recorder } from "../trace";
import { random, sq } from "../math";

/** Squared-distance form of Bezdek's constrained membership minimizer. */
export function memberships(points: Point[], centers: Center[], m: number) {
  return points.map((p) => {
    const ds = centers.map((c) => sq(p, c));
    if (ds.some((d) => !Number.isFinite(d)))
      throw new Error(
        "수치 불안정: 퍼지 거리 제곱이 유한하지 않습니다. 좌표 스케일을 조정하세요.",
      );
    const zeros = ds.filter((d) => d === 0).length;
    if (zeros) return ds.map((d) => (d === 0 ? 1 / zeros : 0));
    // Log normalization avoids overflow near m=1 and for widely separated data.
    const logs = ds.map((d) => -Math.log(d) / (m - 1));
    const max = Math.max(...logs);
    const weights = logs.map((v) => Math.exp(v - max));
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map((v) => v / sum);
  });
}
export function fuzzy(points: Point[], o: Params, r: Recorder) {
  const k = Math.min(o.k, points.length),
    rng = random(o.seed);
  let u = points.map(() => {
    const row = Array.from({ length: k }, () =>
      Math.max(Number.EPSILON, rng()),
    );
    const sum = row.reduce((a, b) => a + b, 0);
    return row.map((v) => v / sum);
  });
  r.emit(
    "initialize",
    "시드 기반 소속도 초기화: 각 행 합은 1이며 확률이 아닙니다.",
    { responsibilities: u },
  );
  let converged = false;
  for (let it = 0; it < o.iterations; it++) {
    const centers = Array.from({ length: k }, (_, j) => {
      let weight = 0,
        x = 0,
        y = 0;
      points.forEach((p, i) => {
        const w = u[i][j] ** o.fuzziness;
        weight += w;
        x += w * p.x;
        y += w * p.y;
      });
      if (!(weight > 0))
        throw new Error("수치 불안정: 퍼지 성분의 가중치가 0입니다.");
      const center = { x: x / weight, y: y / weight, id: j };
      if (!Number.isFinite(center.x) || !Number.isFinite(center.y))
        throw new Error("수치 불안정: 퍼지 중심이 유한하지 않습니다.");
      return center;
    });
    r.emit("move", `${it + 1}회: u^m 가중평균으로 중심 갱신`, { centers });
    const next = memberships(points, centers, o.fuzziness);
    let delta = 0,
      objective = 0;
    points.forEach((p, i) =>
      next[i].forEach((v, j) => {
        delta = Math.max(delta, Math.abs(v - u[i][j]));
        objective += v ** o.fuzziness * sq(p, centers[j]);
      }),
    );
    u = next;
    r.emit(
      "assign",
      `${it + 1}회: 거리 기반 퍼지 소속도 갱신 (확률 아님)`,
      {
        responsibilities: u,
        labels: u.map((row) => row.indexOf(Math.max(...row))),
        metric: [...r.state.metric, objective],
        metricName: "Fuzzy objective J_m",
      },
      { objective, delta },
    );
    if (delta <= o.tolerance) {
      converged = true;
      break;
    }
  }
  r.emit(
    "finish",
    converged
      ? "소속도 변화가 허용오차 이하로 수렴했습니다."
      : "반복 한도에 도달했습니다. 수렴을 보장하지 않습니다.",
    {},
    { converged: String(converged) },
  );
}
