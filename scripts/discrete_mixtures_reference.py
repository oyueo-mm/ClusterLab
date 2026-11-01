"""Independent NumPy/SciPy density + vectorized EM oracle; no product TS imports.
Seed generator matches only the initialization/reproducibility contract.
"""
from pathlib import Path
import sys, json, math
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'.local/spectral-reference-runtime'))
import numpy as np
import scipy
from scipy.stats import bernoulli, poisson, multinomial
from scipy.special import logsumexp

class Seed:
 def __init__(self,seed):self.a=seed&0xffffffff
 def next(self):
  self.a=(self.a+0x6d2b79f5)&0xffffffff;t=self.a
  t=((t^(t>>15))*(t|1))&0xffffffff
  t^=(t+(((t^(t>>7))*(t|61))&0xffffffff))&0xffffffff
  return ((t^(t>>14))&0xffffffff)/4294967296

def expectation(method, rows, parameters, weights):
 rows=np.asarray(rows,dtype=float);parameters=np.asarray(parameters,dtype=float);weights=np.asarray(weights,dtype=float)
 if method=='Bernoulli Mixture':logs=bernoulli.logpmf(rows[:,None,:],parameters[None,:,:]).sum(axis=2)
 elif method=='Poisson Mixture':logs=poisson.logpmf(rows[:,None,:],parameters[None,:,:]).sum(axis=2)
 else:logs=np.array([[multinomial.logpmf(row,n=int(row.sum()),p=p) for p in parameters]for row in rows])
 with np.errstate(divide='ignore'):weighted=logs+np.log(weights)
 normalizer=logsumexp(weighted,axis=1);r=np.exp(weighted-normalizer[:,None])
 return r,r.sum(axis=0),r.T@rows,float(normalizer.sum())

def maximize(method,r,counts,sums,previous):
 denominator=sums.sum(axis=1) if method=='Multinomial Mixture' else counts
 p=previous.copy();np.divide(sums,denominator[:,None],out=p,where=denominator[:,None]!=0)
 return p,counts/counts.sum()

def fixture(method,rows,parameters,weights):
 rows=np.asarray(rows,dtype=float);parameters=np.asarray(parameters,dtype=float)
 r,n,s,ll=expectation(method,rows,parameters,weights);updated,w=maximize(method,r,n,s,parameters)
 return dict(method=method,rows=rows.tolist(),parameters=parameters.tolist(),weights=weights,responsibilities=r.tolist(),counts=n.tolist(),sums=s.tolist(),logLikelihood=ll,nextParameters=updated.tolist(),nextWeights=w.tolist())

def cluster(method,rows,k,seed=42,iterations=40,tolerance=1e-9):
 rows=np.asarray(rows,dtype=float);n,d=rows.shape;state=Seed(seed);parameters=[]
 for c in range(k):
  p=np.array([.1+.8*state.next() if method=='Bernoulli Mixture' else (rows[:,j].mean()+1)*(.5+state.next()) if method=='Poisson Mixture' else .5+state.next() for j in range(d)])
  if method=='Multinomial Mixture':p=p/p.sum()
  parameters.append(p)
 parameters=np.array(parameters);weights=np.full(k,1/k);history=[];converged=False
 for iteration in range(1,iterations+1):
  r,n,s,previous=expectation(method,rows,parameters,weights)
  parameters,weights=maximize(method,r,n,s,parameters)
  r,n,s,ll=expectation(method,rows,parameters,weights);history.append(ll)
  if abs(ll-previous)<=tolerance*max(1,abs(previous)):converged=True;break
 return dict(method=method,rows=rows.tolist(),k=k,seed=seed,iterations=iterations,tolerance=tolerance,parameters=parameters.tolist(),weights=weights.tolist(),responsibilities=r.tolist(),labels=r.argmax(axis=1).tolist(),logLikelihood=ll,history=history,converged=converged,completedIterations=iteration)

binary=[[1,1,1],[1,1,0],[1,0,1],[1,1,1],[0,0,0],[0,0,1],[0,1,0],[0,0,0]]
counts=[[0,0],[0,1],[1,0],[1,1],[8,9],[9,8],[10,9],[9,10]]
profiles=[[10,1,0],[8,0,1],[12,1,0],[0,1,8],[1,0,10],[0,1,12],[0,0,0]]
steps=[fixture('Bernoulli Mixture',[[1,0],[0,1],[1,1],[0,0]],[[.8,.2],[.2,.8]],[.5,.5]),fixture('Poisson Mixture',[[0],[3]],[[1],[4]],[.5,.5]),fixture('Multinomial Mixture',[[2,0],[0,2],[1,1]],[[.8,.2],[.2,.8]],[.5,.5])]
cases=[cluster(method,rows,2,seed)for method,rows in [('Bernoulli Mixture',binary),('Poisson Mixture',counts),('Multinomial Mixture',profiles)]for seed in [7,42]]
logmass=[]
for x,lam in [(0,0),(1,0),(0,1000),(1,1),(15,12),(16,12),(100,100),(1000000,1000000),(250,1000)]:
 v=float(poisson.logpmf(x,lam));logmass.append(dict(x=x,rate=lam,logMass=v if math.isfinite(v) else None))
result=dict(metadata=dict(generator='independent NumPy vectorized E/M and scipy.stats logpmf',numpy=np.__version__,scipy=scipy.__version__,license='verification dependencies only; no product code copied'),steps=steps,clustering=cases,poissonLogMass=logmass)
path=root/'src/engine/fixtures/discrete-mixtures-reference.json';path.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n',encoding='utf8')
print(json.dumps(dict(output=str(path),numpy=np.__version__,scipy=scipy.__version__,steps=len(steps),clustering=len(cases))))
