"""Independent NumPy/explicit mathematical oracles for the 2D prototype engines.

No product implementation is imported. References:
CURE (Guha/Rastogi/Shim 1998), Martinetz et al. Neural Gas (1993),
Fritzke original NIPS Growing Neural Gas (1995, not the reordered 1997 exposition).
Run: python scripts/prototypes_reference.py
"""
import json
from pathlib import Path
import numpy as np


def reps(x, count, shrink):
    mean = x.mean(axis=0)
    chosen = []
    while len(chosen) < min(count, len(x)):
        distances = np.sum((x - mean) ** 2, axis=1) if not chosen else np.min(np.sum((x[:, None, :] - x[chosen][None, :, :]) ** 2, axis=2), axis=1)
        distances[chosen] = -1
        chosen.append(int(np.argmax(distances)))
    return chosen, x[chosen] * (1 - shrink) + mean * shrink


cure_x = np.array([[0., 0.], [0., 2.], [4., 0.], [4., 2.]])
chosen, representative = reps(cure_x, 3, 0.25)
groups = [{"members": [i], "representatives": cure_x[[i]]} for i in range(len(cure_x))]
merges = []
while len(groups) > 2:
    pairs = [(float(np.min(np.sum((a['representatives'][:, None, :] - b['representatives'][None, :, :]) ** 2, axis=2))), i, j) for i, a in enumerate(groups) for j, b in enumerate(groups) if i < j]
    distance, a, b = min(pairs)
    members = sorted(groups[a]['members'] + groups[b]['members'])
    _, selected = reps(cure_x[members], 3, 0.25)
    merges.append(dict(left=groups[a]['members'], right=groups[b]['members'], distance=float(np.sqrt(distance))))
    groups[a] = dict(members=members, representatives=selected)
    groups.pop(b)

ng_centers = np.array([[0., 0.], [1., 0.], [2., 0.]])
ng_input = np.array([0.25, 0.])
ng_rank = np.argsort(np.argsort(np.sum((ng_centers - ng_input) ** 2, axis=1), kind='stable'), kind='stable')
ng_updated = ng_centers + 0.2 * np.exp(-ng_rank[:, None] / 2.) * (ng_input - ng_centers)

# GNG: two known centers, no initial edge. Input stream deliberately triggers
# connection creation, neighbor updates and a midpoint insertion after step 2.
nodes = [dict(id=0, pos=np.array([0., 0.]), error=0.), dict(id=1, pos=np.array([1., 0.]), error=0.)]
edges = []
signals = [[0.25, 0.], [0.75, 0.], [0.5, 0.5], [0.1, 0.2]]
next_id = 2
gng_states = []
for count, raw in enumerate(signals, 1):
    signal = np.array(raw)
    distance = [float(np.sum((n['pos'] - signal)**2)) for n in nodes]
    order = sorted(range(len(nodes)), key=lambda i: (distance[i], nodes[i]['id']))
    winner, second = nodes[order[0]], nodes[order[1]]
    neighbor_ids = set()
    for e in edges:
        if winner['id'] in e[:2]:
            e[2] += 1
            neighbor_ids.add(e[1] if e[0] == winner['id'] else e[0])
    winner['error'] += distance[order[0]]
    for n in nodes:
        rate = .2 if n is winner else .006 if n['id'] in neighbor_ids else 0.
        n['pos'] += rate * (signal - n['pos'])
    pair = sorted([winner['id'], second['id']])
    found = next((e for e in edges if e[:2] == pair), None)
    if found is None:
        edges.append(pair + [0])
    else:
        found[2] = 0
    edges = [e for e in edges if e[2] <= 2]
    connected = {x for e in edges for x in e[:2]}
    nodes = [n for n in nodes if n['id'] in connected]
    if count % 2 == 0 and len(nodes) < 4:
        q = max(nodes, key=lambda n: n['error'])
        adjacent = {e[1] if e[0] == q['id'] else e[0] for e in edges if q['id'] in e[:2]}
        f = max((n for n in nodes if n['id'] in adjacent), key=lambda n: n['error'])
        q['error'] *= .5
        f['error'] *= .5
        inserted = dict(id=next_id, pos=(q['pos']+f['pos'])/2, error=q['error'])
        next_id += 1
        edges = [e for e in edges if set(e[:2]) != {q['id'], f['id']}]
        edges += [sorted([q['id'], inserted['id']])+[0], sorted([f['id'], inserted['id']])+[0]]
        nodes.append(inserted)
    for n in nodes:
        n['error'] *= .995
    gng_states.append(dict(nodes=[dict(id=n['id'], x=float(n['pos'][0]), y=float(n['pos'][1]), error=float(n['error'])) for n in nodes], edges=[dict(a=e[0], b=e[1], age=e[2]) for e in edges]))

result = dict(oracle=f"Independent NumPy {np.__version__} mathematical calculations", cure=dict(points=cure_x.tolist(), shrink=.25, count=3, chosen=chosen, representatives=representative.tolist(), merges=merges, partition=[g['members'] for g in groups]), neuralgas=dict(centers=ng_centers.tolist(), input=ng_input.tolist(), rate=.2, lambda_=2, ranks=ng_rank.tolist(), updated=ng_updated.tolist()), growingneuralgas=dict(initial=[[0.,0.],[1.,0.]], signals=signals, learningRate=.2, maxAge=2, insertionInterval=2, maxNeurons=4, states=gng_states))
target = Path(__file__).resolve().parents[1] / 'src/engine/fixtures/prototypes-reference.json'
target.write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
print(f"Wrote {target.name}: {len(merges)} CURE merges, NG rank update, {len(gng_states)} GNG updates")
