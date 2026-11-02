import { ndSquared } from "./ndMath";
/** Stable Euclidean norm for center movement; core distances still use D². */
export function centerMovement(a: number[][], b: number[][]) {
  let maximum = 0;
  for (let h = 0; h < a.length; h++) {
    let norm = 0;
    for (let j = 0; j < a[h].length; j++)
      norm = Math.hypot(norm, a[h][j] - b[h][j]);
    maximum = Math.max(maximum, norm);
  }
  if (!Number.isFinite(maximum))
    throw new Error("수치 불안정: 원본 중심 이동이 유한하지 않습니다.");
  return maximum;
}
export const distancesSquared = (x: number[][], centers: number[][]) =>
  x.map((row) => centers.map((c) => ndSquared(row, c)));
/** FCM only: row-normalized memberships, including the exact zero-distance case. */
export function ndMemberships(distances: number[][], m: number) {
  if (!Number.isFinite(m) || m <= 1)
    throw new Error("FCM 지수 m은1보다 커야 합니다.");
  const logs = distances.map((row) => {
    const zeros = row.filter((v) => v === 0).length;
    if (zeros) return row.map((v) => (v === 0 ? -Math.log(zeros) : -Infinity));
    const raw = row.map((v) => -Math.log(v) / (m - 1)),
      max = Math.max(...raw),
      sum = raw.reduce((s, v) => s + Math.exp(v - max), 0);
    return raw.map((v) => v - max - Math.log(sum));
  });
  return { logs, memberships: logs.map((row) => row.map(Math.exp)) };
}
/** One cluster's relative weights; mathematical mass may round to zero, ratio stays valid. */
export function clusterWeights(
  logs: number[][],
  power: number,
  cluster: number,
) {
  let maximum = -Infinity;
  for (const row of logs) maximum = Math.max(maximum, row[cluster]);
  if (!Number.isFinite(maximum))
    throw new Error("수치 불안정: 실제 FCM 중심 가중치가 소실되었습니다.");
  const weights = logs.map((row) => Math.exp(power * (row[cluster] - maximum))),
    sum = weights.reduce((s, v) => s + v, 0),
    logMass = power * maximum + Math.log(sum);
  if (!Number.isFinite(logMass) || !Number.isFinite(sum) || !(sum > 0))
    throw new Error(
      "수치 불안정: 로그 유효 가중치가 표현 범위를 벗어났습니다.",
    );
  return { weights, sum, logMass, mass: Math.exp(logMass) };
}
export function logWeightedCenters(
  x: number[][],
  logs: number[][],
  power: number,
) {
  const masses: number[] = [],
    logMasses: number[] = [];
  const centers = logs[0].map((_, h) => {
    const { weights, sum, mass, logMass } = clusterWeights(logs, power, h);
    masses.push(mass);
    logMasses.push(logMass);
    const anchor = x[0],
      offset = anchor.map(() => 0);
    for (let i = 0; i < x.length; i++)
      for (let j = 0; j < anchor.length; j++)
        offset[j] += (weights[i] / sum) * (x[i][j] - anchor[j]);
    return anchor.map((v, j) => {
      const result = v + offset[j];
      if (!Number.isFinite(result))
        throw new Error("수치 불안정: ND 가중평균이 유한하지 않습니다.");
      return result;
    });
  });
  return { centers, masses, logMasses };
}
/** PCM1993 only: independent typicalities, never row/column normalized. */
export function pcmTypicalities(
  distances: number[][],
  scales: number[],
  eta: number,
) {
  if (
    !Number.isFinite(eta) ||
    eta <= 1 ||
    scales.some((v) => !Number.isFinite(v) || v <= 0)
  )
    throw new Error("PCM은 η>1과 모든 Ω_j>0이 필요합니다.");
  const logs = distances.map((row) =>
    row.map((distance, j) => {
      if (distance === 0) return 0;
      const h = (Math.log(distance) - Math.log(scales[j])) / (eta - 1),
        softplus =
          h > 0 ? h + Math.log1p(Math.exp(-h)) : Math.log1p(Math.exp(h)),
        value = -softplus;
      if (!Number.isFinite(value))
        throw new Error("수치 불안정: 전형성 로그가 유한하지 않습니다.");
      return value;
    }),
  );
  return { logs, typicalities: logs.map((row) => row.map(Math.exp)) };
}
export function pcmObjective(
  distances: number[][],
  logs: number[][],
  scales: number[],
  eta: number,
) {
  let distanceCost = 0,
    penaltyCost = 0;
  for (let i = 0; i < distances.length; i++)
    for (let h = 0; h < scales.length; h++) {
      const logT = logs[i][h];
      if (distances[i][h] > 0)
        distanceCost += Math.exp(eta * logT + Math.log(distances[i][h]));
      const logComplement = Math.log(-Math.expm1(logT));
      penaltyCost += Math.exp(Math.log(scales[h]) + eta * logComplement);
    }
  const objective = distanceCost + penaltyCost;
  if (!Number.isFinite(objective))
    throw new Error("수치 불안정: PCM 목적함수의 합이 유한하지 않습니다.");
  return { distanceCost, penaltyCost, objective };
}
