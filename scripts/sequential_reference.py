"""Verification-only official PyClustering plus independent NumPy arithmetic.

Install pyclustering==0.10.1.2 into .local/sequential-reference-runtime.
No product code is imported and no external algorithm implementation is copied.
"""
import copy
import hashlib
import importlib.metadata
import inspect
import json
import os
from pathlib import Path
import random
import sys

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = Path(os.environ.get("CLUSTERLAB_SEQUENTIAL_REFERENCE_RUNTIME", ROOT / ".local/sequential-reference-runtime"))
sys.path.insert(0, str(RUNTIME))
import numpy as np
from pyclustering.cluster.bsas import bsas
from pyclustering.cluster.mbsas import mbsas
from pyclustering.cluster.ttsas import ttsas
from pyclustering.utils.metric import distance_metric, type_metric


def case(name, values, lower=1., upper=2., maximum=8):
    original = np.asarray(values, dtype=float)
    expected = {}
    for method, cls in [("BSAS", bsas), ("MBSAS", mbsas), ("TTSAS", ttsas)]:
        data = copy.deepcopy(values)  # Official representative lists alias seed rows.
        args = (lower, upper) if method == "TTSAS" else (maximum, lower)
        model = cls(data, *args, ccore=False,
                    metric=distance_metric(type_metric.EUCLIDEAN)).process()
        clusters = model.get_clusters()
        representatives = np.asarray(model.get_representatives(), dtype=float)
        labels = [-1] * len(values)
        means = []
        objective = 0.
        for cluster, members in enumerate(clusters):
            rows = original[members]
            mean = rows.mean(axis=0)
            means.append(mean.tolist())
            objective += float(((rows - mean) ** 2).sum())
            for i in members:
                assert labels[i] == -1
                labels[i] = cluster
        assert all(label >= 0 for label in labels)
        np.testing.assert_allclose(representatives, means, rtol=2e-14, atol=2e-14)
        expected[method] = dict(labels=labels, clusters=clusters,
                                centroids=representatives.tolist(),
                                counts=list(map(len, clusters)), objective=objective)
    return dict(name=name, values=values, threshold=lower,
                upperThreshold=upper, maxClusters=maximum, expected=expected)


def main():
    cases = [
        case("bsas-vs-mbsas-mean-timing", [[0.], [1.], [2.5]], 2., 3.),
        case("permuted-original-order", [[0.], [2.5], [1.]], 2., 3.),
        case("ttsas-revisit-after-moving-mean", [[0.], [1.5], [1.]], 1., 2.),
        case("ttsas-stalled-gray-force-next-pass", [[0.], [1.5]], 1., 2.),
        case("lower-boundary-included", [[0.], [1.]], 1., 2.),
        case("upper-boundary-deferred", [[0.], [2.]], 1., 2.),
        case("above-upper-creates", [[0.], [2.25]], 1., 2.),
        case("maximum-is-cluster-budget", [[0.], [10.], [20.], [30.]], 1., 2., 1),
        case("same-displayed-xy-real-third-axis", [[0., 0., 0.], [0., 0., 1.5], [0., 0., 1.]], 1., 2.),
        case("earliest-created-distance-tie", [[0.], [4.], [2.]], 1., 2.),
        case("duplicates-and-zero-lower", [[3., 7.]] * 6, 0., 1.),
        case("singleton", [[7., -2., 4.]], 0., 1.),
    ]
    rng = random.Random(38192)
    for i in range(48):
        d = 1 + i % 5
        values = [[rng.uniform(-4, 4) for _ in range(d)] for _ in range(2 + i % 13)]
        cases.append(case("random-nd-" + str(i), values,
                          .15 + .23 * (i % 7), 2. + .17 * (i % 9), 1 + i % 6))
    sources = {}
    official_docs = {
        "bsas": "https://pyclustering.github.io/docs/0.10.1/html/df/d50/bsas_8py_source.html",
        "mbsas": "https://pyclustering.github.io/docs/0.10.1/html/d1/db8/mbsas_8py_source.html",
        "ttsas": "https://pyclustering.github.io/docs/0.10.1/html/df/db9/classpyclustering_1_1cluster_1_1ttsas_1_1ttsas.html",
    }
    for cls in [bsas, mbsas, ttsas]:
        path = Path(inspect.getfile(cls))
        sources[cls.__name__] = dict(sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                                    source=official_docs[cls.__name__])
    output = dict(versions=dict(numpy=np.__version__, pyclustering=importlib.metadata.version("pyclustering")),
                  sources=sources,
                  provenance="Official pure Python ccore=False, explicit Euclidean, deepcopy source rows; independent NumPy all assigned-row means/SSE. No product imports.",
                  policy="Official TTSAS uses <= lower and > upper; no-progress previous pass triggers first-pending creation. MBSAS means update only when assigning remaining rows in second pass.",
                  cases=cases)
    target = ROOT / "src/engine/fixtures/sequential-reference.json"
    target.write_text(json.dumps(output, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    print("Verified", len(cases) * 3, "official outcomes;", len(cases), "raw fixtures;", output["versions"])


if __name__ == "__main__":
    main()
