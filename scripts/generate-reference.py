"""Independent fixtures. Run with the validation venv; no production dependency."""
import json
from pathlib import Path
import numpy as np
import sklearn
from sklearn.cluster import KMeans, DBSCAN, HDBSCAN, OPTICS, Birch, AgglomerativeClustering
from sklearn.mixture import GaussianMixture
from scipy.cluster.hierarchy import linkage
from sklearn.datasets import make_blobs, make_moons

cases = []
datasets = {
    'blobs': make_blobs(n_samples=36, centers=[[.2,.2],[.8,.2],[.5,.8]], cluster_std=.028, random_state=19)[0],
    'moons': make_moons(n_samples=42, noise=.012, random_state=5)[0] * .3 + .3,
    'uneven': np.concatenate([np.random.RandomState(8).normal([.2,.2],.012,(16,2)),np.random.RandomState(9).normal([.8,.7],.06,(20,2)),[[.02,.95],[.99,.02]]]),
}
for name,x in datasets.items():
    points = [{'x':float(v[0]),'y':float(v[1])} for v in x]
    specs = [('DBSCAN', DBSCAN(eps=.09,min_samples=4),{'epsilon':.09,'minPts':4}),
             ('HDBSCAN', HDBSCAN(min_cluster_size=5,min_samples=4),{'minSize':5,'minPts':4}),
             ('OPTICS', OPTICS(min_samples=4,max_eps=.7,cluster_method='dbscan',eps=.09),{'epsilon':.7,'threshold':.09,'minPts':4}),
             ('OPTICS', OPTICS(min_samples=4,min_cluster_size=5,max_eps=.7,xi=.08,cluster_method='xi'),{'epsilon':.7,'minPts':4,'minSize':5,'xi':.08,'extraction':'xi'})]
    for method in ['single','complete','average','ward']:
        specs.append(('AGNES',AgglomerativeClustering(n_clusters=3,linkage=method),{'k':3,'linkage':method}))
    if name=='blobs':
        specs += [('K-Means',KMeans(n_clusters=3,n_init=10,random_state=42),{'k':3}),
                  ('GMM',GaussianMixture(n_components=3,random_state=42,reg_covar=1e-6),{'k':3,'iterations':60}),
                  ('BIRCH',Birch(threshold=.06,branching_factor=4,n_clusters=None),{'threshold':.06,'branching':4})]
    for algorithm,model,params in specs:
        labels=model.fit_predict(x).tolist()
        case={'name':f'{name}-{algorithm}-{params.get("linkage",params.get("extraction","epsilon"))}', 'algorithm':algorithm,'points':points,'params':params,'labels':labels}
        if algorithm=='AGNES':case['heights']=linkage(x,method=params['linkage'])[:,2].tolist()
        if algorithm=='OPTICS':case.update(order=model.ordering_.tolist(),reach=[None if not np.isfinite(v) else float(v) for v in model.reachability_])
        cases.append(case)
Path('src/engine/fixtures').mkdir(parents=True,exist_ok=True)
Path('src/engine/fixtures/reference.json').write_text(json.dumps({'sklearn':sklearn.__version__,'cases':cases},indent=2),encoding='utf-8')
print(f'Generated {len(cases)} independent fixtures with sklearn {sklearn.__version__}')
