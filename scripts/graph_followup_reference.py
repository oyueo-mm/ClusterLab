"""Verification only: NumPy full walk kernels/explicit Ward SSE, igraph and NetworkX.

No product imports or copied external algorithm code. Existing scoped igraph is
optional to locate, but required to regenerate the author comparison fields.
"""
import itertools
import json
from pathlib import Path
import random
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".local/community-reference-runtime"))
import igraph as ig
import networkx as nx
import numpy as np


def canonical_edges(edges):
    result = {}
    for a, b, w in edges:
        if w:
            key = tuple(sorted((a, b)))
            result[key] = result.get(key, 0) + w
    return [(a, b, w) for (a, b), w in sorted(result.items())]


def partitions(n):
    def visit(labels, maximum):
        if len(labels) == n:
            yield labels
        else:
            for value in range(maximum + 2):
                yield from visit(labels + [value], max(maximum, value))
    yield from visit([0], 0)


def walk_fixture(name, n, raw_edges, steps):
    edges = canonical_edges(raw_edges)
    graph = nx.Graph()
    graph.add_nodes_from(range(n))
    graph.add_weighted_edges_from(edges)
    original = nx.to_numpy_array(graph, nodelist=list(range(n)), weight="weight")
    counts = np.count_nonzero(original, axis=1)
    strengths = original.sum(axis=1)
    loops = np.divide(strengths, counts, out=np.ones(n), where=counts != 0)
    adjacency = original + np.diag(loops)
    degrees = adjacency.sum(axis=1)
    transition = adjacency / degrees[:, None]
    powers = [np.linalg.matrix_power(transition, s).tolist() for s in range(1, steps + 1)]
    probability = np.array(powers[-1])
    # Independently recompute within-group SSE. No incremental Ward update.
    subsets = {mask: [i for i in range(n) if mask & (1 << i)] for mask in range(1, 1 << n)}
    means = {mask: probability[rows].mean(axis=0) for mask, rows in subsets.items()}
    sse = {mask: float((((probability[rows] - means[mask]) ** 2) / degrees).sum()) for mask, rows in subsets.items()}
    distances = {}
    for a, rows_a in subsets.items():
        for b, rows_b in subsets.items():
            if a >= b or a & b:
                continue
            if not any(original[i, j] > 0 for i in rows_a for j in rows_b):
                continue
            key = f"{a}|{b}"
            distances[key] = {
                "distance": float(np.linalg.norm((means[a] - means[b]) / np.sqrt(degrees))),
                "increase": (sse[a | b] - sse[a] - sse[b]) / n,
            }
    q = {}
    for labels in partitions(n):
        groups = [{i for i, c in enumerate(labels) if c == value} for value in sorted(set(labels))]
        q[",".join(map(str, labels))] = float(nx.community.modularity(graph, groups, weight="weight")) if graph.size(weight="weight") else 0
    author = ig.Graph(n=n, edges=[(a, b) for a, b, _ in edges], directed=False)
    author.es["weight"] = [w for _, _, w in edges]
    dendrogram = author.community_walktrap(weights="weight", steps=steps)
    cut = dendrogram.as_clustering()
    return {"name": name, "n": n, "rawEdges": raw_edges, "edges": edges, "steps": steps,
            "loopWeights": loops.tolist(), "walkDegrees": degrees.tolist(), "powers": powers,
            "subsetCandidates": distances, "partitionQ": q,
            "igraphMerges": dendrogram.merges, "igraphLabels": cut.membership,
            "igraphQ": float(cut.modularity)}


def clique_fixture(n, pairs, k):
    graph = nx.Graph()
    graph.add_nodes_from(range(n))
    graph.add_edges_from(pairs)
    cliques = [list(rows) for rows in itertools.combinations(range(n), k)
               if all(graph.has_edge(a, b) for a, b in itertools.combinations(rows, 2))]
    expected = sorted([sorted(c) for c in nx.community.k_clique_communities(graph, k)])
    # A second, direct all-pairs clique intersection component oracle.
    intersection = nx.Graph()
    intersection.add_nodes_from(range(len(cliques)))
    intersection.add_edges_from((a, b) for a in range(len(cliques)) for b in range(a)
                                if len(set(cliques[a]) & set(cliques[b])) == k - 1)
    direct = sorted([sorted(set().union(*(set(cliques[i]) for i in ids))) for ids in nx.connected_components(intersection)])
    assert expected == direct
    return {"n": n, "edges": pairs, "k": k, "cliques": cliques, "communities": expected}


barbell = [(0, 1, .9), (1, 2, 1.3), (0, 2, 1.8), (3, 4, 1.1), (4, 5, 1.7), (3, 5, 2.2), (2, 3, .07)]
walks = [walk_fixture("asymmetric-weighted-barbell", 6, barbell, 4),
         walk_fixture("weighted-path-one-step", 5, [(0, 1, .3), (1, 2, .7), (2, 3, 1.1), (3, 4, .2)], 1),
         walk_fixture("canonical-parallel", 6, barbell + [(1, 0, .4)], 3),
         walk_fixture("two-components-and-isolate", 7, barbell[:-1], 4),
         walk_fixture("unit-path-hand", 3, [(0, 1, 1), (1, 2, 1)], 1)]
cliques = []
possible = list(itertools.combinations(range(4), 2))
for mask in range(1 << len(possible)):
    pairs = [list(e) for i, e in enumerate(possible) if mask & (1 << i)]
    for k in [2, 3, 4]:
        cliques.append(clique_fixture(4, pairs, k))
rng = random.Random(246)
for _ in range(40):
    pairs = [list(e) for e in itertools.combinations(range(6), 2) if rng.random() < .48]
    for k in [3, 4]:
        cliques.append(clique_fixture(6, pairs, k))
cliques.append(clique_fixture(6, [(0, 1), (1, 2), (0, 2), (2, 3), (3, 4), (2, 4)], 3))
result = {"versions": {"numpy": np.__version__, "networkx": nx.__version__, "igraph": ig.__version__},
          "provenance": "NumPy dense matrix powers and explicit original-row Ward SSE; every small partition Q via NetworkX; canonical-weighted igraph author Walktrap; exhaustive clique subsets plus NetworkX CPM. Verification only; no product code imported.",
          "walks": walks, "cliqueCases": cliques}
target = ROOT / "src/engine/fixtures/graph-followup-reference.json"
target.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
print(f"Generated {len(walks)} Walktrap cases and {len(cliques)} CPM inputs with {result['versions']}.")
