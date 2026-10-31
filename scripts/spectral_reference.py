"""Independent spectral oracle (NumPy eigh + scikit-learn), verification only.

Run python scripts/spectral_reference.py. Optional local runtime is automatically
selected from .local/spectral-reference-runtime; no Python dependency in product.
Definitions: Ng/Jordan/Weiss (NIPS14); von Luxburg (2007), Sections 2--4.
"""
from pathlib import Path
import json
import sys
import warnings

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / ".local/spectral-reference-runtime"
if RUNTIME.exists():
    sys.path.insert(0, str(RUNTIME))

import numpy as np
import scipy
import sklearn
from sklearn.cluster import KMeans, SpectralClustering


def graph_matrix(n, edges):
    w = np.zeros((n, n))
    for i, j, weight in edges:
        w[i, j] += weight
        w[j, i] += weight
    return w


def numeric_matrix(x, affinity, gamma, neighbors):
    d = ((x[:, None, :] - x[None, :, :]) ** 2).sum(axis=2)
    if affinity == "rbf":
        w = np.exp(-gamma * d)
        np.fill_diagonal(w, 0)
        return w
    w = np.zeros_like(d)
    for i in range(len(x)):
        # Explicit index tie-breaking matches the specified union-kNN contract.
        candidates = [j for j in range(len(x)) if i != j]
        for j in sorted(candidates, key=lambda j: (d[i, j], j))[:neighbors]:
            w[i, j] = w[j, i] = 1
    return w


rows = [[0, 0, v] for v in [0, 0.1, 0.2, 0.3, 2, 2.1, 2.2, 2.3]]
edge_list = [[i, i + 1, weight] for i, weight in enumerate([1.2, 0.8, 1, 0.03, 1, 0.9, 1.1])]
cases = [
    {"name": "all-three-features-rbf", "values": rows, "affinity": "rbf", "gamma": 3, "neighbors": 2, "normalized": True, "k": 2},
    {"name": "symmetric-union-knn-disconnected", "values": rows, "affinity": "knn", "gamma": 3, "neighbors": 2, "normalized": True, "k": 2},
    {"name": "weighted-graph-normalized", "nodes": 8, "edges": edge_list, "normalized": True, "k": 2},
    {"name": "weighted-graph-unnormalized", "nodes": 8, "edges": edge_list, "normalized": False, "k": 2},
    {"name": "isolated-node-with-two-components", "nodes": 7, "edges": [[0, 1, 1], [1, 2, 1], [2, 0, 1], [3, 4, 1], [4, 5, 1], [5, 3, 1]], "normalized": True, "k": 3},
]
for case in cases:
    w = numeric_matrix(np.asarray(case["values"]), case["affinity"], case["gamma"], case["neighbors"]) if "values" in case else graph_matrix(case["nodes"], case["edges"])
    d = w.sum(axis=1)
    if case["normalized"]:
        inverse = np.divide(1, np.sqrt(d), out=np.zeros_like(d), where=d > 0)
        lap = np.diag((d > 0).astype(float)) - inverse[:, None] * w * inverse[None, :]
    else:
        lap = np.diag(d) - w
    eigenvalues, eigenvectors = np.linalg.eigh(lap)
    u = eigenvectors[:, :case["k"]]
    embedding = u.copy()
    if case["normalized"]:
        embedding /= np.linalg.norm(embedding, axis=1, keepdims=True)
    labels = KMeans(n_clusters=case["k"], n_init=20, random_state=42, tol=1e-12).fit_predict(embedding)
    case.update(adjacency=w.tolist(), degrees=d.tolist(), laplacian=lap.tolist(), eigenvalues=eigenvalues.tolist(), projector=(u @ u.T).tolist(), embeddingDistances=(((embedding[:, None] - embedding[None, :]) ** 2).sum(axis=2)).tolist(), labels=labels.tolist())
    if case["normalized"]:
        with warnings.catch_warnings(record=True) as captured:
            scipy_labels = SpectralClustering(n_clusters=case["k"], affinity="precomputed", eigen_solver="arpack", assign_labels="kmeans", n_init=20, random_state=42, eigen_tol=1e-10).fit_predict(w)
        case["sklearnSpectralLabels"] = scipy_labels.tolist()
        case["sklearnWarnings"] = [str(item.message) for item in captured]

out = {"versions": {"numpy": np.__version__, "scipy": scipy.__version__, "sklearn": sklearn.__version__}, "method": "NumPy eigh; sklearn KMeans on NJW embedding; separate sklearn SpectralClustering normalized comparison (degree scaling differs on general inputs)", "cases": cases}
target = ROOT / "src/engine/fixtures/spectral-reference.json"
target.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {target.name}, {len(cases)} cases; versions={out['versions']}")
