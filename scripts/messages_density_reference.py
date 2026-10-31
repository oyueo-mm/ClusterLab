"""Independent NumPy arithmetic and scikit-learn validation; no product imports.

Run after verification dependencies are installed in .local/spectral-reference-runtime:
  python scripts/messages_density_reference.py
Only the fixture is redistributed. No reference-library source is copied.
"""
import json
from pathlib import Path
import sys
import platform

ROOT = Path(__file__).resolve().parents[1]
runtime = ROOT / ".local/spectral-reference-runtime"
if runtime.exists():
    sys.path.insert(0, str(runtime))
import numpy as np
import scipy
import sklearn
from sklearn.cluster import AffinityPropagation

x = np.array([[0, 0, 0], [.03, .01, .02], [.08, .02, -.01], [1, 1, 2], [1.04, 1.02, 2.04], [1.08, .98, 2.01]], dtype=float)
d2 = ((x[:, None] - x[None, :]) ** 2).sum(axis=2)
s = -d2.copy()
np.fill_diagonal(s, -.1)
r = np.zeros_like(s)
a = np.zeros_like(s)
damping = .7
first_r = np.zeros_like(s)
for i in range(len(x)):
    for k in range(len(x)):
        other = np.delete(a[i] + s[i], k)
        first_r[i, k] = (1-damping) * (s[i, k] - other.max())
positive = np.maximum(first_r, 0)
np.fill_diagonal(positive, 0)
first_a = np.minimum(0, np.diag(first_r)[None, :] + positive.sum(axis=0)[None, :] - positive)
np.fill_diagonal(first_a, positive.sum(axis=0))
first_a *= 1-damping
model = AffinityPropagation(affinity="precomputed", damping=damping, preference=-.1, max_iter=200, convergence_iter=10, random_state=42).fit(-d2)

def density(kernel):
    dc = .25
    weights = np.exp(-d2/dc**2) if kernel == "gaussian" else (d2 < dc**2).astype(float)
    np.fill_diagonal(weights, 0)
    rho = weights.sum(axis=1)
    order = np.lexsort((np.arange(len(x)), -rho))
    dist = np.sqrt(d2)
    delta = np.zeros(len(x))
    parent = np.full(len(x), -1, dtype=int)
    for rank, i in enumerate(order[1:], start=1):
        prior = order[:rank]
        best = np.argmin(dist[i, prior])
        parent[i] = prior[best]
        delta[i] = dist[i, parent[i]]
    delta[order[0]] = delta.max()
    gamma = rho*delta
    candidates = np.lexsort((np.arange(len(x)), -rho, -gamma))
    centers = [int(order[0])]
    for i in candidates:
        if len(centers) == 2:
            break
        if all(d2[i, j] != 0 for j in centers):
            centers.append(int(i))
    labels = np.full(len(x), -1, dtype=int)
    labels[centers] = np.arange(len(centers))
    for i in order:
        if labels[i] < 0:
            labels[i] = labels[parent[i]]
    border = np.zeros(len(centers))
    for i in range(len(x)):
        for j in range(i+1, len(x)):
            if labels[i] != labels[j] and dist[i,j] <= dc:
                average = (rho[i]+rho[j])/2
                border[labels[i]] = max(border[labels[i]], average)
                border[labels[j]] = max(border[labels[j]], average)
    return dict(kernel=kernel, cutoff=dc, rho=rho.tolist(), delta=delta.tolist(), parent=parent.tolist(), gamma=gamma.tolist(), selected=centers, labels=labels.tolist(), halo=(rho<border[labels]).tolist())

result = {
    "provenance": {"python": platform.python_version(), "numpy": np.__version__, "scipy": scipy.__version__, "sklearn": sklearn.__version__, "method": "Independent vectorized NumPy R/A and density quantities plus sklearn AffinityPropagation 1.7.2 final partition; no TypeScript imports", "sources": ["https://utstat.utoronto.ca/reid/sta414/frey-affinity.pdf", "https://scikit-learn.org/stable/modules/generated/sklearn.cluster.AffinityPropagation.html", "https://people.sissa.it/~laio/Research/Clustering_source_code/cluster_dp.tgz"], "originalDPCArchiveSHA256": "be45f3402bc2af363207e7364e643b5250e2f1f226e7f95d240214595310ac14"},
    "values": x.tolist(), "similarities": s.tolist(), "firstResponsibility": first_r.tolist(), "firstAvailability": first_a.tolist(),
    "affinity": {"labels": model.labels_.tolist(), "exemplars": model.cluster_centers_indices_.tolist(), "iterations": model.n_iter_, "preference": -.1, "damping": damping},
    "density": [density("gaussian"), density("cutoff")],
}
out = ROOT / "src/engine/fixtures/messages-density-reference.json"
out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {out.name}; sklearn={sklearn.__version__}; AP labels={result['affinity']['labels']}")
