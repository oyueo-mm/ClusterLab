"""Independent NumPy exhaustive tiny-data oracle for CLARA/CLARANS validation.

The product algorithms are not imported. Exhaustive enumeration is used only on
six verification points, never as a browser implementation or precomputed result.
Run: python scripts/medoid_variants_reference.py
"""
from itertools import combinations
import json
from pathlib import Path
import numpy as np

points = np.array([[0., 0.], [.1, 0.], [.2, 0.], [.8, 0.], [.9, 0.], [1., 0.]])
distances = np.sqrt(np.sum((points[:, None, :] - points[None, :, :]) ** 2, axis=2))
costs = {','.join(map(str, medoids)): float(np.min(distances[:, medoids], axis=1).sum()) for medoids in combinations(range(len(points)), 2)}
best = min(costs, key=costs.get)
medoids = list(map(int, best.split(',')))
result = dict(oracle=f"Independent NumPy {np.__version__}; exhaustive all 15 pairs", points=points.tolist(), k=2, costs=costs, optimum=costs[best], bestMedoids=medoids, partition=np.argmin(distances[:, medoids], axis=1).tolist())
target = Path(__file__).resolve().parents[1] / 'src/engine/fixtures/medoid-variants-reference.json'
target.write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
print(f"Wrote {target.name}: exact verification optimum {result['optimum']}, observed medoids {medoids}")
