"""Independent direct-power NumPy FCM -> fixed-scale PCM AO. No TS imports.
The product uses log-domain weighted means; these fixtures deliberately use
direct powers and matrix products on representable small/large numeric cases.
"""
from pathlib import Path
import json,platform
import numpy as np

def stream(seed):
    a=seed&0xffffffff
    while True:
        a=(a+0x6d2b79f5)&0xffffffff;t=((a^(a>>15))*(1|a))&0xffffffff
        t=(t+(((t^(t>>7))*(61|t))&0xffffffff))&0xffffffff^t
        yield ((t^(t>>14))&0xffffffff)/4294967296

def initialize(x,k,seed):
    rng=stream(seed);indices=[int(next(rng)*len(x))]
    while len(indices)<k:
        dist=((x[:,None,:]-x[indices][None,:,:])**2).sum(axis=2).min(axis=1)
        dist[indices]=0;scale=dist.max();chosen=-1
        if scale>0:
            target=next(rng)*sum(float(v)/scale for v in dist)
            for i,v in enumerate(dist):
                if i in indices:continue
                target-=float(v)/scale
                if target<0:chosen=i;break
        if chosen<0:chosen=next(i for i in range(len(x)) if i not in indices)
        indices.append(chosen)
    return indices

def d2(x,v):return ((x[:,None,:]-v[None,:,:])**2).sum(axis=2)
def membership(dist,m):
    rows=[]
    for ds in dist:
        zero=ds==0
        if zero.any():rows.append(zero.astype(float)/zero.sum())
        else:
            weights=ds**(-1/(m-1));rows.append(weights/weights.sum())
    return np.asarray(rows)
def centers(x,t,power):
    weights=t**power;mass=weights.sum(axis=0)
    if np.any(mass<=0):raise ValueError('weight loss')
    return weights.T@x/mass[:,None]
def typicality(dist,omega,eta):return 1/(1+(dist/omega[None,:])**(1/(eta-1)))
def objective(dist,t,omega,eta):
    distance=float(np.sum(t**eta*dist));penalty=float(np.sum(omega[None,:]*(1-t)**eta))
    return dict(distanceCost=distance,penaltyCost=penalty,objective=distance+penalty)

def run(case):
    x=np.asarray(case['values'],dtype=float);o=dict(k=2,seed=42,m=2,eta=2,kappa=1,mode='fcm',scale=1,warmIterations=30,iterations=60,tolerance=1e-9);o.update(case.get('params',{}))
    indices=initialize(x,o['k'],o['seed']);v=x[indices].copy();u=membership(d2(x,v),o['m']);warm=[];warm_converged=False
    for iteration in range(1,o['warmIterations']+1):
        nxt=centers(x,u,o['m']);movement=float(np.max(np.linalg.norm(nxt-v,axis=1)));v=nxt
        dist=d2(x,v);u=membership(dist,o['m']);warm.append(dict(iteration=iteration,centroids=v.tolist(),memberships=u.tolist(),objective=float(np.sum(u**o['m']*dist))))
        if movement<=o['tolerance']:warm_converged=True;break
    warm_centers=v.copy();warm_u=u.copy();dist=d2(x,v)
    omega=o['kappa']*np.sum(u**o['m']*dist,axis=0)/np.sum(u**o['m'],axis=0) if o['mode']=='fcm' else np.full(o['k'],o['scale'],dtype=float)
    if np.any(omega<=0) or not np.all(np.isfinite(omega)):raise ValueError('scale-nonpositive')
    states=[];converged=False
    for iteration in range(1,o['iterations']+1):
        dist=d2(x,v);t=typicality(dist,omega,o['eta']);states.append(dict(phase='typicality-update',iteration=iteration,centroids=v.tolist(),distances=dist.tolist(),typicalities=t.tolist(),**objective(dist,t,omega,o['eta'])))
        nxt=centers(x,t,o['eta']);movement=float(np.max(np.linalg.norm(nxt-v,axis=1)));v=nxt;dist=d2(x,v)
        states.append(dict(phase='mean-update',iteration=iteration,centroids=v.tolist(),distances=dist.tolist(),typicalities=t.tolist(),movement=movement,**objective(dist,t,omega,o['eta'])))
        if movement<=o['tolerance']:converged=True;reason='center-tolerance';break
    else:reason='iteration-limit'
    dist=d2(x,v);t=typicality(dist,omega,o['eta']);weight=(t**o['eta']).sum(axis=0)
    residual=float(np.max(np.linalg.norm(centers(x,t,o['eta'])-v,axis=1)))
    return dict(params=o,initialIndices=indices,warmStates=warm,warmConverged=warm_converged,warmCenters=warm_centers.tolist(),warmMemberships=warm_u.tolist(),scales=omega.tolist(),states=states,centroids=v.tolist(),typicalities=t.tolist(),distances=dist.tolist(),effectiveWeights=weight.tolist(),logEffectiveWeights=np.log(weight).tolist(),rowSums=t.sum(axis=1).tolist(),maxima=t.max(axis=1).tolist(),labels=t.argmax(axis=1).tolist(),counts=np.bincount(t.argmax(axis=1),minlength=o['k']).tolist(),iteration=iteration,converged=converged,stopReason=reason,fixedPointResidual=residual,**objective(dist,t,omega,o['eta']))

cases=[
 dict(name='formula-mini',values=[[0],[1],[4]]),
 dict(name='nd-original',values=[[0,0,0],[0,0,1],[0,0,4],[0,0,5]]),
 dict(name='outlier',values=[[-3],[-2.9],[-3.1],[3],[2.9],[3.1],[10]]),
 dict(name='unequal-scale',values=[[-.1],[0],[.1],[.2],[4],[5],[6],[7]]),
 dict(name='eta-1.5',values=[[0],[1],[4],[5],[9]],params=dict(eta=1.5,mode='manual',scale=2.5)),
 dict(name='different-m-eta',values=[[0],[1],[4],[5]],params=dict(m=1.7,eta=3,kappa=1.4)),
 dict(name='duplicate-zero-distances',values=[[0],[0],[1],[1]],params=dict(mode='manual',scale=2)),
 dict(name='constant-manual',values=[[2,2],[2,2],[2,2]],params=dict(k=3,mode='manual',scale=1)),
 dict(name='constant-auto-error',values=[[2,2],[2,2],[2,2]]),
 dict(name='single-manual',values=[[3]],params=dict(k=1,mode='manual',scale=1)),
 dict(name='one-iteration',values=[[0],[.5],[2],[7],[9]],params=dict(warmIterations=1,iterations=1,tolerance=0)),
 dict(name='seed-137',values=[[0],[1],[4],[5]],params=dict(seed=137)),
 dict(name='tiny-representable',values=[[-2e-100],[-1e-100],[1e-100],[2e-100]],params=dict(tolerance=1e-110)),
 dict(name='large-representable',values=[[1e100],[1.1e100],[4e100],[5e100]],params=dict(tolerance=1e90)),
]
records=[]
for case in cases:
    try:records.append(dict(input=case,result=run(case)))
    except ValueError as error:records.append(dict(input=case,expectedError=str(error)))
x=np.asarray([[0.],[1.],[4.]]);v=np.asarray([[.5],[3.]]);omega=np.asarray([1.,2.]);dist=d2(x,v);u=membership(dist,2);t=typicality(dist,omega,2);nxt=centers(x,t,2)
block=dict(values=x.tolist(),centroids=v.tolist(),distances=dist.tolist(),scales=omega.tolist(),memberships=u.tolist(),typicalities=t.tolist(),rowSums=t.sum(axis=1).tolist(),nextCenters=nxt.tolist(),beforeMove=objective(dist,t,omega,2),afterMove=objective(d2(x,nxt),t,omega,2))
grid=np.linspace(0,1,10001);costs=grid**2*4+(1-grid)**2;best=int(np.argmin(costs))
scalar=dict(distanceSquared=4,scale=1,eta=2,typicality=.2,objective=.8,gridMinimumTypicality=float(grid[best]),gridMinimumObjective=float(costs[best]),derivative=2*.2*4-2*(1-.2))
output=dict(environment=dict(python=platform.python_version(),numpy=np.__version__,license='NumPy BSD-3-Clause; verification only',RscriptAvailable=False,ppclustVersion='1.1.0.1',ppclustLicense='GPL (>=2)',ppclustExecuted=False,ppclustDocumentationSettings='oftype=1, sqeuclidean, FCM initialization; no claim of matching R random seed or termination'),block=block,scalar=scalar,cases=records)
Path('docs/research/pcm-reference.json').write_text(json.dumps(output,indent=2,allow_nan=False),encoding='utf-8')
print('Independent PCM:',len(records),'cases,',sum('result' in r for r in records),'successful AO runs, scalar/grid and existing FUZZY_FORMULAS block')
