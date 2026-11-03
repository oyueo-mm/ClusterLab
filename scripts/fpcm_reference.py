"""Independent NumPy direct-power FCM warm start and FPCM1997 AO; no product imports."""
from pathlib import Path
import json,platform
import numpy as np

def rng(seed):
 a=seed&0xffffffff
 while True:
  a=(a+0x6d2b79f5)&0xffffffff;t=((a^(a>>15))*(a|1))&0xffffffff
  t^=(t+(((t^(t>>7))*(t|61))&0xffffffff))&0xffffffff
  yield ((t^(t>>14))&0xffffffff)/4294967296
def initialize(x,k,seed):
 stream=rng(seed);ids=[int(next(stream)*len(x))]
 while len(ids)<k:
  ds=((x[:,None,:]-x[ids][None,:,:])**2).sum(2).min(1);ds[ids]=0;scale=ds.max();chosen=-1
  if scale>0:
   target=next(stream)*sum(float(v)/scale for v in ds)
   for i,v in enumerate(ds):
    if i in ids:continue
    target-=float(v)/scale
    if target<0:chosen=i;break
  if chosen<0:chosen=next(i for i in range(len(x)) if i not in ids)
  ids.append(chosen)
 return ids
def distance(x,v):return ((x[:,None,:]-v[None,:,:])**2).sum(2)
def normalize(ds,p):
 rows=[]
 for row in ds:
  zero=row==0
  if zero.any():rows.append(zero.astype(float)/zero.sum())
  else:
   w=row**(-1/(p-1));rows.append(w/w.sum())
 return np.asarray(rows)
def states(x,v,m,eta):
 ds=distance(x,v);u=normalize(ds,m);t=normalize(ds.T,eta).T;w=u**m+t**eta
 return ds,u,t,w
def objective(ds,u,t,m,eta):
 a=float(np.sum(u**m*ds));b=float(np.sum(t**eta*ds));return dict(fuzzyCost=a,typicalityCost=b,objective=a+b)
def run(case):
 x=np.asarray(case['values'],dtype=float);o=dict(k=2,seed=42,m=2,eta=2,warmIterations=30,iterations=60,tolerance=1e-9);o.update(case.get('params',{}))
 ids=initialize(x,o['k'],o['seed']);v=x[ids].copy();warm=[];wc=False
 for it in range(1,o['warmIterations']+1):
  u=normalize(distance(x,v),o['m']);w=u**o['m'];nxt=w.T@x/w.sum(0)[:,None];movement=float(np.linalg.norm(nxt-v,axis=1).max());v=nxt
  u=normalize(distance(x,v),o['m']);warm.append(dict(centroids=v.tolist(),memberships=u.tolist(),objective=float(np.sum(u**o['m']*distance(x,v)))))
  if movement<=o['tolerance']:wc=True;break
 baseline=v.copy();baselineU=u.copy();records=[];converged=False
 for it in range(1,o['iterations']+1):
  ds,u,t,w=states(x,v,o['m'],o['eta']);records.append(dict(phase='t-update',centroids=v.tolist(),memberships=u.tolist(),typicalities=t.tolist(),**objective(ds,u,t,o['m'],o['eta'])))
  nxt=w.T@x/w.sum(0)[:,None];movement=float(np.linalg.norm(nxt-v,axis=1).max());v=nxt
  records.append(dict(phase='mean-update',centroids=v.tolist(),memberships=u.tolist(),typicalities=t.tolist(),**objective(distance(x,v),u,t,o['m'],o['eta'])))
  if movement<=o['tolerance']:converged=True;break
 ds,u,t,w=states(x,v,o['m'],o['eta']);residual=float(np.linalg.norm(w.T@x/w.sum(0)[:,None]-v,axis=1).max())
 return dict(initialization=ids,warmStates=warm,warmCenters=baseline.tolist(),warmMemberships=baselineU.tolist(),warmConverged=wc,states=records,centroids=v.tolist(),memberships=u.tolist(),typicalities=t.tolist(),distancesSquared=ds.tolist(),effectiveWeights=w.sum(0).tolist(),iteration=it,converged=converged,fixedPointResidual=residual,**objective(ds,u,t,o['m'],o['eta']))
cases=[dict(name='hand-mini',values=[[0],[1],[4]]),dict(name='nd-zero-xy',values=[[0,0,0],[0,0,1],[0,0,4],[0,0,5]]),dict(name='outlier',values=[[-3],[-2.9],[-3.1],[3],[2.9],[3.1],[10]]),dict(name='unequal',values=[[0],[.1],[.2],[4],[5],[6],[7]],params=dict(m=1.7,eta=3)),dict(name='duplicates',values=[[0],[0],[1],[1]]),dict(name='constant',values=[[2,2],[2,2],[2,2]],params=dict(k=3)),dict(name='single',values=[[3]],params=dict(k=1)),dict(name='limits',values=[[0],[.5],[2],[7],[9]],params=dict(warmIterations=1,iterations=1,tolerance=0)),dict(name='seed-137',values=[[0],[1],[4],[5]],params=dict(seed=137)),dict(name='tiny',values=[[-2e-100],[-1e-100],[1e-100],[2e-100]],params=dict(tolerance=1e-110)),dict(name='large',values=[[1e100],[1.1e100],[4e100],[5e100]],params=dict(tolerance=1e90))]
x=np.array([[0.],[1.],[4.]]);v=np.array([[.5],[3.]]);ds,u,t,w=states(x,v,2,2);centers=w.T@x/w.sum(0)[:,None]
xr=np.repeat(x,3,axis=0);dr,ur,tr,wr=states(xr,v,2,2)
block=dict(values=x.tolist(),centroids=v.tolist(),distancesSquared=ds.tolist(),memberships=u.tolist(),typicalities=t.tolist(),nextCenters=centers.tolist(),afterWeights=objective(ds,u,t,2,2),afterMean=objective(distance(x,centers),u,t,2,2),replicatedTypicalities=tr.tolist(),replicatedNextCenters=(wr.T@xr/wr.sum(0)[:,None]).tolist())
out=dict(environment=dict(python=platform.python_version(),numpy=np.__version__,license='NumPy BSD-3-Clause; verification only',RExecuted=False,original1997FullText=False),block=block,cases=[dict(input=c,result=run(c)) for c in cases])
Path('docs/research/fpcm-reference.json').write_text(json.dumps(out,indent=2,allow_nan=False)+'\n',encoding='utf-8')
print('FPCM independent AO:',len(cases),'cases; hand block and replication effect')
