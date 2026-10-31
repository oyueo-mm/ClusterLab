"""Independent NumPy oracle for 2D L1 medians and shuffled-epoch mini-batches.

Same declared Mulberry32 seed/order, independent vectorized optimization.
No product code or third-party algorithm source is imported.
"""
import json
from pathlib import Path
import platform
import numpy as np


def random(seed):
    a = seed & 0xFFFFFFFF
    while True:
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((a ^ (a >> 15)) * (a | 1)) & 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61))) & 0xFFFFFFFF
        yield ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296


def shuffled(n, rng):
    ids = list(range(n))
    for i in range(n-1, 0, -1):
        j = int(next(rng) * (i+1))
        ids[i], ids[j] = ids[j], ids[i]
    return ids


def initialize(x, k, seed):
    ids, seen = [], set()
    for i in shuffled(len(x), random(seed)):
        key = tuple(x[i])
        if key not in seen:
            seen.add(key)
            ids.append(i)
        if len(ids) == k:
            break
    return x[ids].copy(), ids


x = np.array([[0, 0], [0, 2], [1, 1], [9, 8], [10, 10], [11, 9]], dtype=float)
seed, k, epochs, batch_size = 42, 2, 3, 2
centers, ids = initialize(x, k, seed)
initial = centers.copy()
previous = np.full(len(x), -1)
median_costs = []
for iteration in range(100):
    labels = np.abs(x[:, None] - centers[None, :]).sum(axis=2).argmin(axis=1)
    for j in range(k):
        if (labels == j).any():
            centers[j] = np.median(x[labels == j], axis=0)
    median_costs.append(float(np.abs(x-centers[labels]).sum()))
    if np.array_equal(previous, labels):
        break
    previous = labels.copy()
labels = np.abs(x[:, None] - centers[None, :]).sum(axis=2).argmin(axis=1)
median = {"centers": centers.tolist(), "labels": labels.tolist(), "objective": float(np.abs(x-centers[labels]).sum()), "history": median_costs}

centers = initial.copy()
counts = np.zeros(k, dtype=int)
rng = random(seed ^ 0x9E3779B9)
history = []
for epoch in range(epochs):
    order = shuffled(len(x), rng)
    for start in range(0, len(x), batch_size):
        batch = order[start:start+batch_size]
        assignments = ((x[batch, None]-centers[None, :])**2).sum(axis=2).argmin(axis=1)
        for j in range(k):
            members = x[np.asarray(batch)[assignments == j]]
            if len(members):
                centers[j] = (counts[j]*centers[j]+members.sum(axis=0))/(counts[j]+len(members))
                counts[j] += len(members)
        history.append({"batch": batch, "centers": centers.tolist(), "counts": counts.tolist(), "assignments": assignments.tolist()})
    labels = ((x[:, None]-centers[None, :])**2).sum(axis=2).argmin(axis=1)
mini = {"centers": centers.tolist(), "counts": counts.tolist(), "labels": labels.tolist(), "objective": float(((x-centers[labels])**2).sum()), "history": history, "batchSize": batch_size, "epochs": epochs}
result = {"provenance": {"python": platform.python_version(), "numpy": np.__version__, "method": "independent NumPy coordinate-wise np.median and grouped weighted means; common declared PRNG for initialization/order only", "sources": ["https://elki-project.github.io/releases/current/doc/elki/clustering/kmeans/KMediansLloyd.html", "https://www.eecs.tufts.edu/~dsculley/papers/fastkmeans.pdf"]}, "points": [{"x": float(v[0]), "y": float(v[1])} for v in x], "seed": seed, "k": k, "initialCenters": initial.tolist(), "initialIDs": ids, "kmedians": median, "minibatch": mini}
path = Path(__file__).resolve().parents[1] / "src/engine/fixtures/centroid-variants-reference.json"
path.write_text(json.dumps(result, indent=2)+"\n", encoding="utf-8")
print(f"Wrote {path.name}; L1={median['objective']}; MiniBatch SSE={mini['objective']}")
