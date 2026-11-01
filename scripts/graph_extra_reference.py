"""Independent NetworkX modularity / NumPy density oracle for CNM and Fluid.
Only the published seed generator contract is shared. Product TS is not imported.
"""
from pathlib import Path
import json
import numpy as np
import networkx as nx

ROOT = Path(__file__).resolve().parents[1]


def canonical(labels):
    keys = {}
    return [keys.setdefault(int(c), len(keys)) for c in labels]


def prng(seed):
    state = seed & 0xffffffff
    while True:
        state = (state + 0x6d2b79f5) & 0xffffffff
        t = ((state ^ (state >> 15)) * (state | 1)) & 0xffffffff
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xffffffff)) & 0xffffffff
        yield ((t ^ (t >> 14)) & 0xffffffff) / 4294967296


def shuffle(n, random):
    result = list(range(n))
    for i in range(n - 1, 0, -1):
        j = int(next(random) * (i + 1))
        result[i], result[j] = result[j], result[i]
    return result


base_edges = [(0, 1, 1.), (1, 2, 1.), (0, 2, 1.), (3, 4, 1.), (4, 5, 1.), (3, 5, 1.), (2, 3, 1.)]
cases = [dict(name='unit-barbell', n=6, edges=base_edges),
         dict(name='weighted-loop', n=6, edges=[(a, b, .1 if (a, b) == (2, 3) else w) for a, b, w in base_edges] + [(0, 0, .3)]),
         dict(name='path', n=5, edges=[(i, i + 1, 1.) for i in range(4)])]
for case in cases:
    n = case['n']
    G = nx.Graph()
    G.add_nodes_from(range(n))
    for a, b, w in case['edges']:
        G.add_edge(a, b, weight=w)
    labels = list(range(n))
    def q(v):
        return nx.community.modularity(G, [{i for i, c in enumerate(v) if c == community} for community in sorted(set(v))])
    path = []
    while True:
        current = q(labels)
        candidates = []
        communities = sorted(set(labels))
        for i, a in enumerate(communities):
            for b in communities[i + 1:]:
                joined = [a if c == b else c for c in labels]
                candidates.append(dict(a=a, b=b, gain=q(joined) - current))
        candidates.sort(key=lambda v: (-round(v['gain'], 14), v['a'], v['b']))
        if not candidates or candidates[0]['gain'] <= 1e-14:
            break
        best = candidates[0]
        labels = [best['a'] if c == best['b'] else c for c in labels]
        path.append(dict(**best, labels=labels.copy(), before=current, after=q(labels)))
    result = nx.community.greedy_modularity_communities(G, weight='weight')
    reference_labels = [-1] * n
    for k, members in enumerate(result):
        for i in members:
            reference_labels[i] = k
    case['greedyLabels'] = canonical(labels)
    case['greedyPath'] = path
    case['networkxGreedyLabels'] = canonical(reference_labels)
    case['networkxGreedyQ'] = nx.community.modularity(G, result, weight='weight')
    if any(w != 1 or a == b for a, b, w in case['edges']):
        continue
    A = nx.to_numpy_array(G, weight=None) + np.eye(n)
    fluid_cases = []
    for k in [1, 2, n]:
        random = prng(42)
        seeds = shuffle(n, random)[:k]
        labels = np.full(n, -1, dtype=int)
        for c, node in enumerate(seeds):
            labels[node] = c
        decisions = []
        for iteration in range(100):
            changes = 0
            for node in shuffle(n, random):
                # Independent high-level vector computation and full recount.
                counts = np.bincount(labels[labels >= 0], minlength=k)
                densities = 1 / counts
                membership = np.stack([labels == c for c in range(k)], axis=1)
                scores = (A[node] @ membership) * densities
                if scores.max() == 0:
                    continue
                maximum = scores.max()
                best = np.flatnonzero(np.abs(scores - maximum) <= np.finfo(float).eps * 64 * max(1, abs(maximum)))
                previous = int(labels[node])
                chosen = previous if previous in best else int(best[int(next(random) * len(best))])
                record = dict(node=node, previous=previous, chosen=chosen, scores=scores.tolist(), beforeCounts=counts.tolist(), beforeDensity=densities.tolist(), beforeLabels=labels.tolist(), iteration=iteration)
                if chosen != previous:
                    labels[node] = chosen
                    changes += 1
                record['afterLabels'] = labels.tolist()
                decisions.append(record)
            if changes == 0:
                break
        nx_partition = nx.community.asyn_fluidc(G, k, max_iter=100, seed=42)
        nx_labels = [-1] * n
        for c, members in enumerate(nx_partition):
            for i in members:
                nx_labels[i] = c
        fluid_cases.append(dict(k=k, seed=42, seeds=seeds, decisions=decisions, labels=labels.tolist(), counts=np.bincount(labels, minlength=k).tolist(), networkxLabels=canonical(nx_labels)))
    case['fluid'] = fluid_cases

result = dict(versions=dict(numpy=np.__version__, networkx=nx.__version__), note='Fluid exact relative-machine-epsilon maxima; NetworkX uses 1e-4 ties, so same PRNG/partition is not claimed generally. NumPy recomputes membership/counts independently.', cases=cases)
(ROOT / 'src/engine/fixtures/graph-extra-reference.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print('Wrote graph-extra-reference.json', result['versions'])
