export interface SymmetricEigen {
  values: number[];
  /** Row-major matrix: vectors[i][j] is coordinate i of eigenvector j. */
  vectors: number[][];
  residual: number;
  sweeps: number;
}

/** Cyclic Jacobi diagonalization of a real symmetric matrix; no external runtime. */
export function symmetricEigen(
  matrix: number[][],
  tolerance = 1e-10,
  maxSweeps = 80,
  onSweep?: (sweep: number, maximumOffDiagonal: number) => void,
): SymmetricEigen {
  const n = matrix.length;
  if (
    !n ||
    matrix.some(
      (row) => row.length !== n || row.some((v) => !Number.isFinite(v)),
    )
  )
    throw new Error("고유해 입력은 유한한 실수 정방 행렬이어야 합니다.");
  if (
    !(tolerance > 0 && tolerance < 1) ||
    !Number.isInteger(maxSweeps) ||
    maxSweeps < 1
  )
    throw new Error("고유해 허용오차와 최대 sweep을 확인하세요.");
  let scale = 0;
  matrix.forEach((row) =>
    row.forEach((value) => {
      scale = Math.max(scale, Math.abs(value));
    }),
  );
  scale ||= 1;
  let norm = 0;
  matrix.forEach((row, i) =>
    row.forEach((value, j) => {
      norm = Math.hypot(norm, value / scale);
      if (Math.abs(value / scale - matrix[j][i] / scale) > 1e-12)
        throw new Error("고유해 입력 행렬이 대칭이 아닙니다.");
    }),
  );
  if (!Number.isFinite(norm))
    throw new Error("수치 불안정: 행렬 크기가 유한하지 않습니다.");
  // Scaling prevents an absolute stopping threshold from erasing the entire
  // structure of an unnormalized graph whose weights are uniformly tiny.
  const a = matrix.map((row) =>
    Float64Array.from(row, (value) => value / scale),
  );
  const v = Array.from({ length: n }, (_, i) =>
    Float64Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
  const threshold = (tolerance * Math.max(1, norm)) / n;
  let converged = false,
    sweeps = 0;
  for (; sweeps < maxSweeps; sweeps++) {
    for (let p = 0; p < n - 1; p++)
      for (let q = p + 1; q < n; q++) {
        const b = a[p][q];
        if (Math.abs(b) <= threshold) continue;
        const tau = (a[q][q] - a[p][p]) / (2 * b);
        const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.hypot(1, tau));
        const c = 1 / Math.hypot(1, t),
          s = t * c;
        a[p][p] -= t * b;
        a[q][q] += t * b;
        a[p][q] = a[q][p] = 0;
        for (let i = 0; i < n; i++) {
          if (i !== p && i !== q) {
            const ip = a[i][p],
              iq = a[i][q];
            a[i][p] = a[p][i] = c * ip - s * iq;
            a[i][q] = a[q][i] = s * ip + c * iq;
          }
          const ip = v[i][p],
            iq = v[i][q];
          v[i][p] = c * ip - s * iq;
          v[i][q] = s * ip + c * iq;
        }
      }
    let maximum = 0;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        maximum = Math.max(maximum, Math.abs(a[i][j]));
    onSweep?.(sweeps + 1, maximum * scale);
    if (maximum <= threshold) {
      converged = true;
      sweeps++;
      break;
    }
  }
  if (!converged)
    throw new Error(
      `고유해 수렴 실패: ${maxSweeps}회 Jacobi sweep 한도에 도달했습니다.`,
    );
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (i, j) => a[i][i] - a[j][j] || i - j,
  );
  const scaledValues = order.map((i) => a[i][i]);
  const values = scaledValues.map((value) => value * scale);
  if (values.some((value) => !Number.isFinite(value)))
    throw new Error("수치 불안정: 고유값이 유한하지 않습니다.");
  const vectors = v.map((row) => order.map((j) => row[j]));
  // A sign convention improves reproducibility, but a repeated eigenspace still
  // has no unique basis. Validate its projector, not coordinate-wise signs.
  for (let j = 0; j < n; j++) {
    let largest = 0;
    for (let i = 1; i < n; i++)
      if (Math.abs(vectors[i][j]) > Math.abs(vectors[largest][j])) largest = i;
    if (vectors[largest][j] < 0)
      for (let i = 0; i < n; i++) vectors[i][j] *= -1;
  }
  let error = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      let av = 0;
      for (let k = 0; k < n; k++) av += (matrix[i][k] / scale) * vectors[k][j];
      error = Math.hypot(error, av - scaledValues[j] * vectors[i][j]);
    }
  const residual = scale >= 1 / norm ? error / norm : error * scale;
  if (!Number.isFinite(residual) || residual > tolerance * 10)
    throw new Error(`고유해 잔차 검증 실패: 상대 Frobenius 잔차 ${residual}`);
  return { values, vectors, residual, sweeps };
}
