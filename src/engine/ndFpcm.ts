import { ndMemberships, logWeightedCenters } from "./ndFuzzy";
export function fpcmTypicalities(distances: number[][], eta: number) {
  const columns = distances[0].map((_, j) => distances.map((row) => row[j])),
    normalized = ndMemberships(columns, eta);
  return {
    typicalities: distances.map((row, i) =>
      row.map((_, j) => normalized.memberships[j][i]),
    ),
    logs: distances.map((row, i) => row.map((_, j) => normalized.logs[j][i])),
  };
}
export function fpcmLogWeights(
  logU: number[][],
  logT: number[][],
  m: number,
  eta: number,
) {
  return logU.map((row, i) =>
    row.map((u, j) => {
      const a = m * u,
        b = eta * logT[i][j],
        maximum = Math.max(a, b);
      return maximum === -Infinity
        ? -Infinity
        : maximum + Math.log(Math.exp(a - maximum) + Math.exp(b - maximum));
    }),
  );
}
export function fpcmObjective(
  distances: number[][],
  logU: number[][],
  logT: number[][],
  m: number,
  eta: number,
) {
  let fuzzyCost = 0,
    typicalityCost = 0;
  distances.forEach((row, i) =>
    row.forEach((v, j) => {
      if (v > 0) {
        const d = Math.log(v);
        fuzzyCost += Math.exp(m * logU[i][j] + d);
        typicalityCost += Math.exp(eta * logT[i][j] + d);
      }
    }),
  );
  const objective = fuzzyCost + typicalityCost;
  if (!Number.isFinite(objective)) throw Error("FPCM 원본 목적함수 overflow.");
  return { fuzzyCost, typicalityCost, objective };
}
export const fpcmCenters = (
  x: number[][],
  logU: number[][],
  logT: number[][],
  m: number,
  eta: number,
) => logWeightedCenters(x, fpcmLogWeights(logU, logT, m, eta), 1);
