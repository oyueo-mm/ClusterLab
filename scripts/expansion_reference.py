"""Independent vectorized numerical oracle, not product code. Python + NumPy.

Equations: Bezdek et al. (1984), DOI 10.1016/0098-3004(84)90020-7;
https://scikit-fuzzy.readthedocs.io/en/latest/_modules/skfuzzy/cluster/_cmeans.html
Shared PRNG only reproduces initial U; optimization is independent NumPy code.
Run: python scripts/expansion_reference.py
"""
import json
from pathlib import Path
import numpy as np


def mulberry(seed):
    a = seed
    while True:
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((a ^ (a >> 15)) * (1 | a)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        yield ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296


x = np.array([[0, 0], [0, 1], [1, 0], [8, 8], [8, 9], [9, 8]], dtype=float)
rng = mulberry(42)
u = np.array([[next(rng), next(rng)] for _ in x])
u /= u.sum(axis=1, keepdims=True)
for iteration in range(200):
    weights = u ** 2
    centers = weights.T @ x / weights.sum(axis=0)[:, None]
    d2 = ((x[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
    inverse = 1 / d2
    new = inverse / inverse.sum(axis=1, keepdims=True)
    delta = np.max(np.abs(new - u))
    u = new
    if delta <= 1e-10:
        break
result = {
    "oracle": f"independent NumPy {np.__version__} vectorized FCM, m=2, max delta <= 1e-10",
    "seed": 42,
    "points": [{"x": float(a), "y": float(b)} for a, b in x],
    "centers": centers.tolist(),
    "memberships": u.tolist(),
    "objective": float((u ** 2 * d2).sum()),
    "iterations": iteration + 1,
}
out = Path(__file__).resolve().parents[1] / "src/engine/fixtures/expansion-reference.json"
out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {out.name}; iterations={iteration + 1}; J={result['objective']:.12g}")
