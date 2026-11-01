"""Independent reference generation; never imports browser implementation.

NetworkX/NumPy plus author leidenalg (verification only, not bundled).
Run: python scripts/community_reference.py
"""
from pathlib import Path
import sys
import json
from itertools import product

ROOT = Path(__file__).resolve().parents[1]
runtime = ROOT / '.local/community-reference-runtime'
if runtime.exists():
    sys.path.insert(0, str(runtime))
import numpy as np
import networkx as nx
import igraph as ig
import leidenalg as la


def canonical(labels):
    ids = {}
    return [ids.setdefault(c, len(ids)) for c in labels]


def labels_from(communities, n):
    labels = [-1] * n
    for c, group in enumerate(communities):
        for i in group:
            labels[i] = c
    return canonical(labels)


def all_partitions(n):
    def visit(labels):
        if len(labels) == n:
            yield labels
        else:
            for i in range(max(labels) + 2):
                yield from visit(labels + [i])
    return visit([0])


edges = [(0, 1, 1.), (1, 2, 1.), (0, 2, 1.), (3, 4, 1.), (4, 5, 1.), (3, 5, 1.), (2, 3, .1)]
cases = [dict(name='weak-bridge-triangles', n=6, edges=edges),
         dict(name='loops-duplicates-isolate', n=7, edges=edges + [(0, 0, .3), (0, 1, .4)]),
         dict(name='weighted-diamond', n=4, edges=[(0, 1, 2.), (0, 2, 1.), (1, 3, 1.), (2, 3, 2.), (1, 2, .5)])]
for case in cases:
    n = case['n']
    G = nx.Graph()
    G.add_nodes_from(range(n))
    for a, b, w in case['edges']:
        G.add_edge(a, b, weight=G.get_edge_data(a, b, {}).get('weight', 0) + w)
    all_costs = {}
    if n <= 6:
        for labels in all_partitions(n):
            groups = [{i for i, c in enumerate(labels) if c == k} for k in range(max(labels) + 1)]
            all_costs[','.join(map(str, labels))] = nx.community.modularity(G, groups)
    case['allPartitionQ'] = all_costs
    case['louvain'] = labels_from(nx.community.louvain_communities(G, seed=42, resolution=1), n)
    case['lpa'] = labels_from(nx.community.asyn_lpa_communities(G, weight='weight', seed=42), n)
    igraph = ig.Graph(n=n, edges=list(G.edges()), directed=False)
    weights = [G[a][b]['weight'] for a, b in G.edges()]
    partition = la.find_partition(igraph, la.RBConfigurationVertexPartition, weights=weights,
                                  resolution_parameter=1., n_iterations=-1, seed=42)
    case['leiden'] = canonical(partition.membership)
    case['leidenQ'] = nx.community.modularity(G, [{i for i, c in enumerate(case['leiden']) if c == k} for k in range(max(case['leiden']) + 1)])
    case['louvainQ'] = nx.community.modularity(G, [{i for i, c in enumerate(case['louvain']) if c == k} for k in range(max(case['louvain']) + 1)])
    if not any(a == b for a, b, _ in case['edges']):
        H = G.copy()
        for a, b in H.edges():
            H[a][b]['length'] = 1 / H[a][b]['weight']
        case['betweenness'] = [{'a': a, 'b': b, 'value': value} for (a, b), value in nx.edge_betweenness_centrality(H, normalized=False, weight='length').items()]
        removed = []
        while nx.number_connected_components(H) < min(3, n) and H.number_of_edges():
            scores = nx.edge_betweenness_centrality(H, normalized=False, weight='length')
            edge = min(scores, key=lambda e: (-scores[e], e))
            removed.append(list(edge))
            H.remove_edge(*edge)
        case['girvanRemoved'] = removed
        case['girvanLabels'] = labels_from(nx.connected_components(H), n)
    adjacency = nx.to_numpy_array(G, nodelist=list(range(n)), weight='weight') + np.eye(n)
    matrix = adjacency / adjacency.sum(axis=0)
    case['mclInitial'] = matrix.tolist()
    expanded = matrix @ matrix
    inflated = expanded ** 2
    inflated /= inflated.sum(axis=0)
    case['mclFirstExpanded'] = expanded.tolist()
    case['mclFirstInflated'] = inflated.tolist()
    for _ in range(200):
        after = (matrix @ matrix) ** 2
        after /= after.sum(axis=0)
        change = np.abs(after - matrix).max()
        matrix = after
        if change <= 1e-8:
            break
    case['mclFinal'] = matrix.tolist()
    case['mclResidual'] = float(change)

result = dict(versions=dict(numpy=np.__version__, networkx=nx.__version__, igraph=ig.__version__, leidenalg=la.__version__),
              policy='Weighted undirected; strengths, inverse lengths for GN; MCL adds unit loops, expansion2 inflation2; no product engine imports.', cases=cases)
target = ROOT / 'src/engine/fixtures/community-reference.json'
target.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print('Wrote community-reference.json:', result['versions'])
