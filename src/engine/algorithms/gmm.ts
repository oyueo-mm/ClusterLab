import type { Point, Params, Center } from "../types";
import { Recorder } from "../trace";
import { initialize } from "./kmeans";
import { argmin, sum } from "../math";
const reg = 1e-6;
export function logGaussian(p: Point, c: Center) {
  const [a, b, d] = c.cov!;
  const det = Math.max(a * d - b * b, 1e-18),
    x = p.x - c.x,
    y = p.y - c.y;
  return (
    -Math.log(2 * Math.PI) -
    0.5 * Math.log(det) -
    (0.5 * (d * x * x - 2 * b * x * y + a * y * y)) / det
  );
}
export function gmm(p: Point[], o: Params, r: Recorder) {
  const k = Math.min(o.k, p.length);
  let centers: Center[] = initialize(p, k, o.seed, o.initialization).map(
    (c) => ({ ...c, cov: [0.04, 0, 0.04], weight: 1 / k }),
  );
  r.emit(
    "initialize",
    "양의 정부호 공분산과 혼합계수로 Gaussian을 초기화합니다.",
    { centers },
  );
  let previous = -Infinity;
  for (let it = 0; it < o.iterations; it++) {
    let ll = 0;
    const responsibilities = p.map((v) => {
      const logs = centers.map(
          (c) => Math.log(Math.max(c.weight!, 1e-300)) + logGaussian(v, c),
        ),
        m = Math.max(...logs),
        z = sum(logs.map((l) => Math.exp(l - m))),
        den = m + Math.log(z);
      ll += den;
      return logs.map((l) => Math.exp(l - den));
    });
    r.emit(
      "expectation",
      `E-step: log-sum-exp로 소속 확률을 정규화합니다. log L=${ll.toFixed(3)}`,
      {
        responsibilities,
        labels: responsibilities.map((row) => argmin(row.map((v) => -v))),
        focus: [],
        metric: [...r.state.metric, ll],
        metricName: "Log likelihood",
      },
      { logLikelihood: ll },
    );
    centers = centers.map((old, j) => {
      const w = responsibilities.map((row) => row[j]),
        nk = sum(w);
      if (nk < 1e-8) return { ...old, weight: 1e-8 };
      const x = sum(p.map((v, i) => w[i] * v.x)) / nk,
        y = sum(p.map((v, i) => w[i] * v.y)) / nk;
      let a = sum(p.map((v, i) => w[i] * (v.x - x) ** 2)) / nk + reg,
        d = sum(p.map((v, i) => w[i] * (v.y - y) ** 2)) / nk + reg;
      const b =
        o.covariance === "full"
          ? sum(p.map((v, i) => w[i] * (v.x - x) * (v.y - y))) / nk
          : 0;
      if (o.covariance === "spherical") a = d = (a + d) / 2;
      return { x, y, cov: [a, b, d], weight: nk / p.length };
    });
    const total = sum(centers.map((c) => c.weight!));
    centers = centers.map((c) => ({ ...c, weight: c.weight! / total }));
    r.emit(
      "maximization",
      "M-step: 평균·공분산·혼합계수를 갱신합니다. 공분산 대각에 10⁻⁶ 정규화를 더합니다.",
      { centers },
    );
    if (Math.abs(ll - previous) < 1e-7) break;
    previous = ll;
  }
  // Final responsibilities must correspond to the final parameters.
  const resp = p.map((v) => {
    const logs = centers.map(
        (c) => Math.log(Math.max(c.weight!, 1e-300)) + logGaussian(v, c),
      ),
      m = Math.max(...logs),
      z = sum(logs.map((x) => Math.exp(x - m)));
    return logs.map((x) => Math.exp(x - m) / z);
  });
  r.emit("finish", "최종 Gaussian 파라미터로 소속 확률을 다시 계산합니다.", {
    responsibilities: resp,
    labels: resp.map((row) => argmin(row.map((x) => -x))),
  });
}
